const isDev = import.meta.env.DEV;
const envUrl = import.meta.env.VITE_API_URL;

// In unified single-deployment (Vercel fullstack), production uses same-origin relative calls ("")
// If VITE_API_URL is explicitly set to an external URL, use that.
let targetUrl = "";
if (isDev) {
  targetUrl = envUrl || "http://localhost:5000";
} else {
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    targetUrl = envUrl;
  } else {
    targetUrl = "";
  }
}

const API_URL = targetUrl.replace(/\/$/, "");

export const getAuthToken = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cf_auth_token") || "";
};

export const getAuthHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export default API_URL;