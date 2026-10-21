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

export const getWsUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Explicitly configured WebSocket URL
  if (import.meta.env.VITE_WS_URL) {
    const clean = import.meta.env.VITE_WS_URL.replace(/\/$/, "");
    return `${clean}${cleanPath}`;
  }

  // 2. Explicit external API URL (e.g. Render)
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("localhost")) {
    const clean = import.meta.env.VITE_API_URL.replace(/^http/, "ws").replace(/\/$/, "");
    return `${clean}${cleanPath}`;
  }

  // 3. Deployed on Vercel: Vercel serverless does not support persistent WebSockets,
  // so connect WebSockets to the active Render backend service
  if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    return `wss://cloudforge-a-cloud-native-collaborative.onrender.com${cleanPath}`;
  }

  // 4. Local development: target backend server on port 5000 directly
  if (isDev) {
    const backendHost = (envUrl || "http://localhost:5000")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    return `ws://${backendHost}${cleanPath}`;
  }

  // 5. Production same-host fallback
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const wsProtocol = isSecure ? "wss:" : "ws:";
  const host = typeof window !== "undefined" && window.location.host ? window.location.host : "localhost:5000";
  return `${wsProtocol}//${host}${cleanPath}`;
};

export default API_URL;