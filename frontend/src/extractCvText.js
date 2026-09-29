import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isPdf(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isDocx(file) {
  return file.type === DOCX_TYPE || /\.docx$/i.test(file.name);
}

function isLegacyDoc(file) {
  return file.type === "application/msword" || /\.doc$/i.test(file.name);
}

async function extractFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n\n").trim();
}

async function extractFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

// Extrae el texto plano de un PDF o Word (.docx). Lanza un error legible
// cuando el formato no se puede procesar (p. ej. .doc antiguo).
export async function extractCvText(file) {
  if (!file) return "";

  if (isPdf(file)) {
    const text = await extractFromPdf(file);
    if (!text) {
      throw new Error("No se pudo extraer texto del PDF (¿es una imagen escaneada?)");
    }
    return text;
  }

  if (isDocx(file)) {
    const text = await extractFromDocx(file);
    if (!text) {
      throw new Error("No se pudo extraer texto del documento Word");
    }
    return text;
  }

  if (isLegacyDoc(file)) {
    throw new Error(
      "Los archivos .doc antiguos no son compatibles. Convierte a .docx o pega el texto."
    );
  }

  throw new Error("Formato de archivo no compatible para extraer texto");
}
