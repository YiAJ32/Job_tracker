export const ALLOWED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"];

export function hasAllowedCvExtension(filename) {
  const lower = filename.toLowerCase();
  return ALLOWED_CV_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
