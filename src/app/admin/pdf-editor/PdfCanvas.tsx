"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfPage } from "./utils/pdfLoader";
import { PdfAction } from "./utils/pdfEditor";

type Props = {
  file: File;
  pageNumber: number;
  onPageChange: (page: number) => void;
  actions: PdfAction[];
  setActions: (a: PdfAction[]) => void;
  onCanvasDimensionsChange?: (width: number, height: number) => void;
};

export default function PdfCanvas({
  file,
  pageNumber,
  onPageChange,
  actions,
  setActions,
  onCanvasDimensionsChange,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  /* --------------------------------------------------
     KEYBOARD SHORTCUTS - CTRL+Z FOR UNDO
  -------------------------------------------------- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (actions.length > 0) {
          setActions(actions.slice(0, -1));
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions, setActions]);

  /* --------------------------------------------------
     CREATE NEW CANVAS ON FILE / PAGE CHANGE
  -------------------------------------------------- */
  useEffect(() => {
    if (!wrapperRef.current) return;

    // remove old canvas completely
    wrapperRef.current.innerHTML = "";

    const newCanvas = document.createElement("canvas");
    wrapperRef.current.appendChild(newCanvas);

    setCanvasEl(newCanvas);
  }, [file, pageNumber]);

  /* --------------------------------------------------
     LOAD PDF SAFELY
  -------------------------------------------------- */
  useEffect(() => {
    if (!canvasEl) return;

    loadPdfPage(file, pageNumber, canvasEl).then((res) => {
      if (!res || !overlayRef.current) return;

      overlayRef.current.width = canvasEl.width;
      overlayRef.current.height = canvasEl.height;
      setTotalPages(res.totalPages);
      
      // Pass canvas dimensions to parent
      if (onCanvasDimensionsChange) {
        onCanvasDimensionsChange(canvasEl.width, canvasEl.height);
      }
      
      // Redraw all white rectangles for current page
      redrawActions();
    });
  }, [canvasEl, file, pageNumber]);

  /* --------------------------------------------------
     REDRAW WHEN ACTIONS CHANGE
  -------------------------------------------------- */
  useEffect(() => {
    redrawActions();
  }, [actions]);

  /* --------------------------------------------------
     REDRAW SAVED ACTIONS ON OVERLAY
  -------------------------------------------------- */
  function redrawActions() {
    if (!overlayRef.current) return;
    
    const ctx = overlayRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    
    // Draw all white rectangles for current page
    actions
      .filter(a => a.page === pageNumber && a.type === "rect")
      .forEach(a => {
        ctx.fillStyle = "white";
        ctx.fillRect(a.x, a.y, a.w, a.h);
        
        // Add subtle border to see white rectangles clearly
        ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(a.x, a.y, a.w, a.h);
      });
  }

  function getMousePos(e: React.MouseEvent) {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    setStart(getMousePos(e));
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!start || !overlayRef.current) return;

    const ctx = overlayRef.current.getContext("2d")!;
    const { x, y } = getMousePos(e);

    // Redraw existing actions first
    redrawActions();
    
    // Then draw current selection rectangle
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(start.x, start.y, x - start.x, y - start.y);
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!start || !overlayRef.current) return;

    const { x, y } = getMousePos(e);

    const rect = {
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      w: Math.abs(x - start.x),
      h: Math.abs(y - start.y),
    };

    if (rect.w > 5 && rect.h > 5) {
      setActions([
        ...actions,
        { type: "rect" as const, page: pageNumber, ...rect },
      ].slice(-6));
    }

    setStart(null);
  }

  return (
    <div className="space-y-4">
      <div className="relative inline-block border bg-white">
        <div ref={wrapperRef} />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0 cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 items-center">
          <button
            disabled={pageNumber === 1}
            onClick={() => onPageChange(pageNumber - 1)}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span>
            Page {pageNumber} / {totalPages}
          </span>

          <button
            disabled={pageNumber === totalPages}
            onClick={() => onPageChange(pageNumber + 1)}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}