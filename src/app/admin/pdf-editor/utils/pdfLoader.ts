import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

let currentRenderTask: any = null;

export async function loadPdfPage(
  file: File,
  pageNumber: number,
  canvas: HTMLCanvasElement,
): Promise<{ totalPages: number } | undefined> {
  // cancel previous render safely
  if (currentRenderTask) {
    try {
      currentRenderTask.cancel();
    } catch {}
    currentRenderTask = null;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale: 1.5 });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // ✅ pdf.js v5 correct render API
  const renderTask = page.render({
    canvas,
    viewport,
  });

  currentRenderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name !== "RenderingCancelledException") {
      console.error(err);
    }
  } finally {
    if (currentRenderTask === renderTask) {
      currentRenderTask = null;
    }
  }

  return {
    totalPages: pdf.numPages,
  };
}
