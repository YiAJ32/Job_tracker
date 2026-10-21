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

async function request(path, options) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Error ${res.status}`);
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
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Error ${res.status}`);
  }
  return res.json();
}

export const deleteCv = (id) =>
  request(`/api/applications/${id}/cv`, { method: "DELETE" });

export async function fetchCvBlob(id) {
  const res = await fetch(`${API_URL}/api/applications/${id}/cv`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Error ${res.status}`);
  }
  const blob = await res.blob();
  return { blob, contentType: res.headers.get("Content-Type") };
}
