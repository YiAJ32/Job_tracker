const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
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
