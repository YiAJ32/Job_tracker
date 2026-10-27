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

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...baseHeaders() },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body, res.status));
  }
  if (res.status === 204) return null;
  return res.json();
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

export const login = (data) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify(data) });

export const getMe = () => request("/api/auth/me");

export const getProfile = () => request("/api/profile");

export const updateProfile = (data) =>
  request("/api/profile", { method: "PATCH", body: JSON.stringify(data) });

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/profile/photo`, {
    method: "POST",
    headers: baseHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body, res.status));
  }
  return res.json();
}

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

export async function uploadCv(id, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/applications/${id}/cv`, {
    method: "POST",
    headers: baseHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body, res.status));
  }
  return res.json();
}

export const deleteCv = (id) =>
  request(`/api/applications/${id}/cv`, { method: "DELETE" });

export async function fetchCvBlob(id) {
  const res = await fetch(`${API_URL}/api/applications/${id}/cv`, { headers: baseHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body, res.status));
  }
  const blob = await res.blob();
  return { blob, contentType: res.headers.get("Content-Type") };
}
