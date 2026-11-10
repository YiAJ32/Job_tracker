export const ALLOWED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];
// El mismo límite que valida el backend (MAX_CV_BYTES)
export const MAX_CV_BYTES = 5 * 1024 * 1024;

export function hasAllowedCvExtension(filename) {
  const lower = filename.toLowerCase();
  return ALLOWED_CV_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Devuelve la clave de traducción del error, o null si el archivo sirve
export function cvFileError(file) {
  if (!hasAllowedCvExtension(file.name)) return "cv.onlyPdfWord";
  if (file.size > MAX_CV_BYTES) return "cv.tooLarge";
  return null;
}
