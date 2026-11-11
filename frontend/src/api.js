import { getLanguage, t } from "./i18n";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "job-tracker-token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sin localStorage la sesión dura solo hasta recargar
  }
}

// Token de sesión y el idioma elegido, para que el backend responda los errores en ese idioma
function baseHeaders() {
  const token = getToken();
  return {
    "Accept-Language": getLanguage(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// FastAPI devuelve un texto en "detail", o una lista cuando falla la validación de datos
function errorMessage(body, status) {
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) return t("common.invalidData");
  return t("common.errorStatus", { status });
}

// Se llama cuando el backend rechaza el token (vencido o invalidado por un cambio de contraseña)
let unauthorizedHandler = null;

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

// Hace el fetch y convierte las respuestas con error en un Error con el mensaje del backend
async function send(path, options = {}) {
  const sentToken = Boolean(getToken());
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    // fetch solo falla así cuando no hay conexión con el backend ("Failed to fetch")
    const error = new Error(t("common.networkError"));
    error.status = 0;
    throw error;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Solo un 401 con token es una sesión vencida; sin token es, por ejemplo, un login fallido
    if (res.status === 401 && sentToken) {
      setToken(null);
      unauthorizedHandler?.();
    }
    // El status permite reaccionar a errores puntuales, como una cuenta sin confirmar (403)
    const error = new Error(errorMessage(body, res.status));
    error.status = res.status;
    throw error;
  }
  return res;
}

async function request(path, options) {
  const res = await send(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...baseHeaders() },
  });
  if (res.status === 204) return null;
  return res.json();
}

async function upload(path, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await send(path, { method: "POST", headers: baseHeaders(), body: formData });
  return res.json();
}

// Solo enlaces http(s): un "javascript:" guardado por otro usuario ejecutaría código al hacer clic
export function safeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export const listStatuses = () => request("/api/statuses");

export const listApplications = () => request("/api/applications");

export const createApplication = (data) =>
  request("/api/applications", { method: "POST", body: JSON.stringify(data) });

export const updateApplication = (id, data) =>
  request(`/api/applications/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteApplication = (id) =>
  request(`/api/applications/${id}`, { method: "DELETE" });

export const register = (data) =>
  request("/api/auth/register", { method: "POST", body: JSON.stringify(data) });

export const verifyEmail = (data) =>
  request("/api/auth/verify", { method: "POST", body: JSON.stringify(data) });

export const resendCode = (email) =>
  request("/api/auth/resend-code", { method: "POST", body: JSON.stringify({ email }) });

export const forgotPassword = (email) =>
  request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

export const resetPassword = (data) =>
  request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(data) });

export const login = (data) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify(data) });

export const getMe = () => request("/api/auth/me");

export const getProfile = () => request("/api/profile");

export const updateProfile = (data) =>
  request("/api/profile", { method: "PATCH", body: JSON.stringify(data) });

export const uploadPhoto = (file) => upload("/api/profile/photo", file);

export const deletePhoto = () => request("/api/profile/photo", { method: "DELETE" });

// El backend devuelve rutas relativas (/api/users/...); el <img> necesita la URL completa
export const photoUrl = (path) => (path ? `${API_URL}${path}` : null);

export const listCompanies = () => request("/api/companies");

export const createCompany = (data) =>
  request("/api/companies", { method: "POST", body: JSON.stringify(data) });

export const listReviews = (companyId) => request(`/api/companies/${companyId}/reviews`);

export const saveMyReview = (companyId, data) =>
  request(`/api/companies/${companyId}/reviews/me`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteMyReview = (companyId) =>
  request(`/api/companies/${companyId}/reviews/me`, { method: "DELETE" });

export const evaluateMatch = (cvText, jobDescription) =>
  request("/api/match", {
    method: "POST",
    body: JSON.stringify({ cv_text: cvText, job_description: jobDescription }),
  });

export const uploadCv = (id, file) => upload(`/api/applications/${id}/cv`, file);

export const deleteCv = (id) =>
  request(`/api/applications/${id}/cv`, { method: "DELETE" });

export async function fetchCvBlob(id) {
  const res = await send(`/api/applications/${id}/cv`, { headers: baseHeaders() });
  const blob = await res.blob();
  return { blob, contentType: res.headers.get("Content-Type") };
}
