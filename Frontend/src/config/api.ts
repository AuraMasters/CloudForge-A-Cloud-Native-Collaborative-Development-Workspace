const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = rawUrl.replace(/\/$/, "");

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