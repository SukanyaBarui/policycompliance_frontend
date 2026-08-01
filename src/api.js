// // In `npm run dev`, Vite's dev-server proxy forwards the relative "/api"
// // path to the backend (see vite.config.js), so no env var is needed.
// // In Docker / any static build, there's no dev-server proxy, so we must
// // hit the backend directly via VITE_API_BASE (set in docker-compose.yml).
// const BASE = import.meta.env.VITE_API_BASE || "/api";

// function authHeaders(isJson = false) {
//     const token = localStorage.getItem("token");

//     const headers = {};

//     if (token) {
//         headers.Authorization = `Bearer ${token}`;
//     }

//     if (isJson) {
//         headers["Content-Type"] = "application/json";
//     }

//     return headers;
// }

// export async function apiFetch(url, options = {}) {
//     const token = options.token || localStorage.getItem("token");
//     const headers = {
//         "Content-Type": "application/json",
//         ...(options.headers || {}),
//     };
//     if (token) {
//         headers["Authorization"] = `Bearer ${token}`;
//     }
//     const res = await fetch(url, {
//         ...options,
//         headers,
//     });
//     if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         throw new Error(err.detail || `HTTP ${res.status}`);
//     }
//     return res.json();
// }

// export async function getHealth() {
//     const r = await fetch(`${BASE}/health`);
//     return r.json();
// }

// export async function getDashboard() {
//     const r = await fetch(`${BASE}/dashboard`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function getDashboardMetrics() {
//     const r = await fetch(`${BASE}/dashboard/metrics`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function getDashboardNarrative() {
//     const r = await fetch(`${BASE}/dashboard/narrative`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function getDashboardCapabilities() {
//     const r = await fetch(`${BASE}/dashboard/capabilities`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function getCopilotSuggestions() {
//     const r = await fetch(`${BASE}/copilot/suggestions`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function getCopilotExamples() {
//     const r = await fetch(`${BASE}/copilot/examples`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function askCopilot(prompt) {
//     const r = await fetch(`${BASE}/copilot/query`, {
//         method: "POST",
//         headers: authHeaders(true),
//         body: JSON.stringify({ prompt }),
//     });

//     if (!r.ok) {
//         throw new Error(`Copilot query failed (${r.status})`);
//     }

//     return r.json();
// }

// export async function getScans() {
//     const r = await fetch(`${BASE}/scans`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function getAudit() {
//     const r = await fetch(`${BASE}/audit`, {
//         headers: authHeaders(),
//     });

//     return r.json();
// }

// export async function scanFile(file) {
//     const fd = new FormData();
//     fd.append("file", file);

//     const r = await fetch(`${BASE}/scan`, {
//         method: "POST",
//         headers: authHeaders(),
//         body: fd,
//     });

//     if (!r.ok) {
//         throw new Error(`Scan failed (${r.status})`);
//     }

//     return r.json();
// }

// export const SEV = {
//     P1: { label: "Critical", color: "var(--p1)" },
//     P2: { label: "High", color: "var(--p2)" },
//     P3: { label: "Medium", color: "var(--p3)" },
//     P4: { label: "Low", color: "var(--p4)" },
// };

// export const REG_LABEL = {
//     gdpr: "GDPR",
//     iso27001: "ISO 27001",
//     sox: "SOX",
//     internal_security: "Internal Security",
//     internal_hr: "Internal HR",
// };

// API configuration
//
// Local development:
// Vite forwards "/api" requests to the backend through vite.config.js.
//
// Netlify, Docker, or static production builds:
// Set:
// VITE_API_BASE=https://policy-compliance-checker.onrender.com/api

const PRODUCTION_API_BASE =
    "https://policy-compliance-checker.onrender.com/api";

// const BASE = (
//     import.meta.env.VITE_API_BASE ||
//     (import.meta.env.DEV ? "/api" : PRODUCTION_API_BASE)
// ).replace(/\/+$/, "");

const BASE = PRODUCTION_API_BASE;

/**
 * Builds a complete API URL.
 *
 * Examples:
 * buildApiUrl("/health")
 * buildApiUrl("dashboard")
 * buildApiUrl("https://example.com/api/test")
 */
function buildApiUrl(path) {
    if (!path) {
        return BASE;
    }

    // Return absolute URLs unchanged.
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return `${BASE}${normalizedPath}`;
}

/**
 * Returns the token stored in localStorage.
 */
function getStoredToken() {
    return localStorage.getItem("token");
}

/**
 * Creates request headers.
 *
 * Do not manually add Content-Type when sending FormData.
 * The browser will automatically include the multipart boundary.
 */
function createHeaders({
    token,
    isJson = false,
    additionalHeaders = {},
} = {}) {
    const accessToken = token || getStoredToken();

    const headers = {
        ...additionalHeaders,
    };

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    if (isJson && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

/**
 * Parses an API response safely.
 */
async function parseResponse(response) {
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();

    return text || null;
}

/**
 * Extracts a readable API error message.
 */
function getErrorMessage(data, status) {
    if (typeof data === "string" && data.trim()) {
        return data;
    }

    if (data && typeof data === "object") {
        if (typeof data.detail === "string") {
            return data.detail;
        }

        if (Array.isArray(data.detail)) {
            return data.detail
                .map((item) => {
                    if (typeof item === "string") {
                        return item;
                    }

                    if (item?.msg) {
                        return item.msg;
                    }

                    return JSON.stringify(item);
                })
                .join(", ");
        }

        if (typeof data.message === "string") {
            return data.message;
        }

        if (typeof data.error === "string") {
            return data.error;
        }
    }

    return `Request failed with status ${status}`;
}

/**
 * Common API request handler.
 *
 * Usage:
 *
 * apiFetch("/dashboard")
 *
 * apiFetch("/auth/token", {
 *     method: "POST",
 *     body: JSON.stringify({
 *         identifier: email,
 *         password,
 *     }),
 * })
 */
export async function apiFetch(path, options = {}) {
    const {
        token,
        headers: customHeaders = {},
        body,
        ...fetchOptions
    } = options;

    const isFormData =
        typeof FormData !== "undefined" && body instanceof FormData;

    const isJsonBody =
        body !== undefined &&
        body !== null &&
        !isFormData &&
        typeof body === "string";

    const response = await fetch(buildApiUrl(path), {
        ...fetchOptions,
        body,
        headers: createHeaders({
            token,
            isJson: isJsonBody,
            additionalHeaders: customHeaders,
        }),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
        const error = new Error(
            getErrorMessage(data, response.status),
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

/**
 * User login.
 */
export async function login(identifier, password) {
    return apiFetch("/auth/token", {
        method: "POST",
        body: JSON.stringify({
            identifier,
            password,
        }),
    });
}

/**
 * Save authentication tokens after login.
 *
 * Supports common backend response keys:
 * access_token, token and refresh_token.
 */
export function saveAuthTokens(loginResponse) {
    const accessToken =
        loginResponse?.access_token ||
        loginResponse?.token;

    const refreshToken = loginResponse?.refresh_token;

    if (accessToken) {
        localStorage.setItem("token", accessToken);
    }

    if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
    }
}

/**
 * Remove authentication tokens.
 */
export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
}

/**
 * Check whether a token exists.
 */
export function isAuthenticated() {
    return Boolean(getStoredToken());
}

/**
 * Health check.
 */
export async function getHealth() {
    return apiFetch("/health");
}

/**
 * Dashboard summary.
 */
export async function getDashboard() {
    return apiFetch("/dashboard");
}

/**
 * Dashboard metrics.
 */
export async function getDashboardMetrics() {
    return apiFetch("/dashboard/metrics");
}

/**
 * Dashboard narrative.
 */
export async function getDashboardNarrative() {
    return apiFetch("/dashboard/narrative");
}

/**
 * Dashboard capabilities.
 */
export async function getDashboardCapabilities() {
    return apiFetch("/dashboard/capabilities");
}

/**
 * Copilot suggestions.
 */
export async function getCopilotSuggestions() {
    return apiFetch("/copilot/suggestions");
}

/**
 * Copilot examples.
 */
export async function getCopilotExamples() {
    return apiFetch("/copilot/examples");
}

/**
 * Submit a query to Copilot.
 */
export async function askCopilot(prompt) {
    return apiFetch("/copilot/query", {
        method: "POST",
        body: JSON.stringify({
            prompt,
        }),
    });
}

/**
 * Get scan records.
 */
export async function getScans() {
    return apiFetch("/scans");
}

/**
 * Get audit records.
 */
export async function getAudit() {
    return apiFetch("/audit");
}

/**
 * Upload and scan a file.
 */
export async function scanFile(file) {
    if (!file) {
        throw new Error("Please select a file.");
    }

    const formData = new FormData();
    formData.append("file", file);

    return apiFetch("/scan", {
        method: "POST",
        body: formData,
    });
}

/**
 * Refresh the access token.
 */
export async function refreshToken() {
    const storedRefreshToken =
        localStorage.getItem("refresh_token");

    if (!storedRefreshToken) {
        throw new Error("Refresh token is not available.");
    }

    const response = await apiFetch("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({
            refresh_token: storedRefreshToken,
        }),
    });

    saveAuthTokens(response);

    return response;
}

/**
 * Request a password-reset OTP.
 */
export async function forgotPassword(identifier) {
    return apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
            identifier,
        }),
    });
}

/**
 * Send an email verification OTP.
 */
export async function sendVerificationOtp(email) {
    return apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({
            email,
        }),
    });
}

/**
 * Verify an email OTP.
 */
export async function verifyEmailOtp(email, otp) {
    return apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
            email,
            otp,
        }),
    });
}

/**
 * Reset a user's password.
 */
export async function resetPassword(
    identifier,
    otp,
    newPassword,
) {
    return apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
            identifier,
            otp,
            new_password: newPassword,
        }),
    });
}

/**
 * Change the currently authenticated user's password.
 */
export async function changePassword(
    oldPassword,
    newPassword,
) {
    return apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword,
        }),
    });
}

/**
 * Google authentication.
 */
export async function loginWithGoogle(credential) {
    return apiFetch("/auth/google", {
        method: "POST",
        body: JSON.stringify({
            credential,
        }),
    });
}

/**
 * Severity display configuration.
 */
export const SEV = {
    P1: {
        label: "Critical",
        color: "var(--p1)",
    },
    P2: {
        label: "High",
        color: "var(--p2)",
    },
    P3: {
        label: "Medium",
        color: "var(--p3)",
    },
    P4: {
        label: "Low",
        color: "var(--p4)",
    },
};

/**
 * Regulation labels.
 */
export const REG_LABEL = {
    gdpr: "GDPR",
    iso27001: "ISO 27001",
    sox: "SOX",
    internal_security: "Internal Security",
    internal_hr: "Internal HR",
};

export { BASE as API_BASE };