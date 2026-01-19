import { PDFDocument, rgb } from "pdf-lib";

export type PdfAction = {
  type: "rect";
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export async function applyActionsAndGeneratePdf(
  file: File,
  actions: PdfAction[],
  canvasWidth: number,
  canvasHeight: number,
) {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);

  // Group actions by page for better performance
  const actionsByPage = new Map<number, PdfAction[]>();
  actions.forEach((action) => {
    if (action.type === "rect") {
      const pageActions = actionsByPage.get(action.page) || [];
      pageActions.push(action);
      actionsByPage.set(action.page, pageActions);
    }
  });

  // Apply actions to each page
  actionsByPage.forEach((pageActions, pageNum) => {
    const page = pdfDoc.getPage(pageNum - 1);
    const { width: pdfW, height: pdfH } = page.getSize();

    // Calculate scale factors
    const scaleX = pdfW / canvasWidth;
    const scaleY = pdfH / canvasHeight;

    pageActions.forEach((action) => {
      // Scale canvas coordinates to PDF coordinates
      const pdfX = action.x * scaleX;
      const pdfWidth = action.w * scaleX;
      const pdfHeight = action.h * scaleY;

      // IMPORTANT: PDF uses bottom-left origin, canvas uses top-left
      // So we need to flip the Y coordinate
      const pdfY = pdfH - action.y * scaleY - pdfHeight;

      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
        color: rgb(1, 1, 1), // white
        borderWidth: 0,
      });
    });
  });

  return await pdfDoc.save();
}
