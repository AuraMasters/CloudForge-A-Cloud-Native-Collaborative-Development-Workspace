const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = rawUrl.replace(/\/$/, "");

export default API_URL;