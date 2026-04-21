import { useState, useRef, useCallback, useEffect } from "react";
import { ShapeOverlay, EditorTool } from "@/hooks/useBrickEditor";
import { X } from "lucide-react";
import { ShapeType, ShapeFillMode } from "@/lib/shapeRasterizer";

interface ShapeOverlayLayerProps {
  overlays: ShapeOverlay[];
  onUpdate: (id: string, updates: Partial<ShapeOverlay>) => void;
  onRemove: (id: string) => void;
  containerScale: number;
  tool?: EditorTool;
}

const CELL_SIZE = 28;

function renderShapeSVGPath(
  shape: ShapeType,
  fillMode: ShapeFillMode,
  x: number,
  y: number,
  w: number,
  h: number,
): { path: string; isClosed: boolean } {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  switch (shape) {
    case "line":
      return { path: `M ${x} ${y} L ${x + w} ${y + h}`, isClosed: false };

    case "rectangle":
      return { path: `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`, isClosed: true };

    case "roundedRect": {
      const r = Math.min(w, h) * 0.15;
      return {
        path: `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`,
        isClosed: true,
      };
    }

    case "ellipse":
      return {
        path: `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`,
        isClosed: true,
      };

    case "triangle": {
      const topX = cx;
      const topY = y;
      return { path: `M ${topX} ${topY} L ${x + w} ${y + h} L ${x} ${y + h} Z`, isClosed: true };
    }

    case "rightTriangle":
      return { path: `M ${x} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`, isClosed: true };

    case "diamond":
      return { path: `M ${cx} ${y} L ${x + w} ${cy} L ${cx} ${y + h} L ${x} ${cy} Z`, isClosed: true };

    case "pentagon": {
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (-90 + i * 72) * Math.PI / 180;
        pts.push(`${cx + rx * Math.cos(angle)} ${cy + ry * Math.sin(angle)}`);
      }
      return { path: `M ${pts.join(" L ")} Z`, isClosed: true };
    }

    case "hexagon": {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (-90 + i * 60) * Math.PI / 180;
        pts.push(`${cx + rx * Math.cos(angle)} ${cy + ry * Math.sin(angle)}`);
      }
      return { path: `M ${pts.join(" L ")} Z`, isClosed: true };
    }

    case "arrowRight": {
      const shaftTop = y + h * 0.3, shaftBot = y + h * 0.7;
      const headStart = x + w * 0.6;
      return {
        path: `M ${x} ${shaftTop} L ${headStart} ${shaftTop} L ${headStart} ${y} L ${x + w} ${cy} L ${headStart} ${y + h} L ${headStart} ${shaftBot} L ${x} ${shaftBot} Z`,
        isClosed: true,
      };
    }

    case "arrowLeft": {
      const shaftTop = y + h * 0.3, shaftBot = y + h * 0.7;
      const headEnd = x + w * 0.4;
      return {
        path: `M ${x + w} ${shaftTop} L ${headEnd} ${shaftTop} L ${headEnd} ${y} L ${x} ${cy} L ${headEnd} ${y + h} L ${headEnd} ${shaftBot} L ${x + w} ${shaftBot} Z`,
        isClosed: true,
      };
    }

    case "arrowUp": {
      const shaftLeft = x + w * 0.3, shaftRight = x + w * 0.7;
      const headEnd = y + h * 0.4;
      return {
        path: `M ${cx} ${y} L ${x + w} ${headEnd} L ${shaftRight} ${headEnd} L ${shaftRight} ${y + h} L ${shaftLeft} ${y + h} L ${shaftLeft} ${headEnd} L ${x} ${headEnd} Z`,
        isClosed: true,
      };
    }

    case "arrowDown": {
      const shaftLeft = x + w * 0.3, shaftRight = x + w * 0.7;
      const headStart = y + h * 0.6;
      return {
        path: `M ${shaftLeft} ${y} L ${shaftRight} ${y} L ${shaftRight} ${headStart} L ${x + w} ${headStart} L ${cx} ${y + h} L ${x} ${headStart} L ${shaftLeft} ${headStart} Z`,
        isClosed: true,
      };
    }

    case "star5":
    case "star6": {
      const n = shape === "star5" ? 5 : 6;
      const innerRatio = 0.4;
      const pts: string[] = [];
      for (let i = 0; i < n * 2; i++) {
        const angle = (-90 + i * (360 / (n * 2))) * Math.PI / 180;
        const ratio = i % 2 === 0 ? 1 : innerRatio;
        pts.push(`${cx + rx * ratio * Math.cos(angle)} ${cy + ry * ratio * Math.sin(angle)}`);
      }
      return { path: `M ${pts.join(" L ")} Z`, isClosed: true };
    }

    case "heart": {
      return {
        path: `M ${cx} ${y + h * 0.35} C ${cx} ${y}, ${x + w} ${y}, ${x + w} ${y + h * 0.35} C ${x + w} ${y + h * 0.65}, ${cx} ${y + h * 0.85}, ${cx} ${y + h} C ${cx} ${y + h * 0.85}, ${x} ${y + h * 0.65}, ${x} ${y + h * 0.35} C ${x} ${y}, ${cx} ${y}, ${cx} ${y + h * 0.35} Z`,
        isClosed: true,
      };
    }

    default:
      return { path: `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`, isClosed: true };
  }
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export default function ShapeOverlayLayer({ overlays, onUpdate, onRemove, containerScale, tool }: ShapeOverlayLayerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const resizeRef = useRef<{
    id: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    sRow: number;
    sCol: number;
    eRow: number;
    eCol: number;
  } | null>(null);

  // Always allow selecting/editing shapes by clicking on them
  const isEditMode = tool !== "shape";

  // Deselect when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-shape-overlay]")) {
        setSelectedId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Clear selection when leaving edit mode
  useEffect(() => {
    if (!isEditMode) setSelectedId(null);
  }, [isEditMode]);

  // Delete with keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        onRemove(selectedId);
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedId, onRemove]);

  const handlePointerDown = useCallback((e: React.PointerEvent, overlay: ShapeOverlay) => {
    if (!isEditMode) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(overlay.id);
    setDraggingId(overlay.id);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: overlay.x,
      oy: overlay.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isEditMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId) return;
    const dx = (e.clientX - dragStart.current.x) / containerScale;
    const dy = (e.clientY - dragStart.current.y) / containerScale;
    onUpdate(draggingId, {
      x: dragStart.current.ox + dx,
      y: dragStart.current.oy + dy,
    });
  }, [draggingId, containerScale, onUpdate]);

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Resize handlers (window-level for smooth tracking)
  const handleResizeDown = useCallback((handle: ResizeHandle, overlay: ShapeOverlay, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Cancel any drag in progress so resize takes over cleanly
    setDraggingId(null);
    const r1 = Math.min(overlay.startRow, overlay.endRow);
    const r2 = Math.max(overlay.startRow, overlay.endRow);
    const c1 = Math.min(overlay.startCol, overlay.endCol);
    const c2 = Math.max(overlay.startCol, overlay.endCol);
    resizeRef.current = {
      id: overlay.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      ox: overlay.x,
      oy: overlay.y,
      sRow: r1,
      sCol: c1,
      eRow: r2,
      eCol: c2,
    };

    const pointerId = e.pointerId;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const r = resizeRef.current;
      if (!r) return;
      const dx = (ev.clientX - r.startX) / containerScale;
      const dy = (ev.clientY - r.startY) / containerScale;
      const dCol = Math.round(dx / CELL_SIZE);
      const dRow = Math.round(dy / CELL_SIZE);

      let sRow = r.sRow, eRow = r.eRow, sCol = r.sCol, eCol = r.eCol;

      if (r.handle.includes("n")) sRow = Math.min(r.eRow - 1, r.sRow + dRow);
      if (r.handle.includes("s")) eRow = Math.max(r.sRow + 1, r.eRow + dRow);
      if (r.handle.includes("w")) sCol = Math.min(r.eCol - 1, r.sCol + dCol);
      if (r.handle.includes("e")) eCol = Math.max(r.sCol + 1, r.eCol + dCol);

      onUpdate(r.id, {
        startRow: sRow,
        startCol: sCol,
        endRow: eRow,
        endCol: eCol,
        x: sCol * CELL_SIZE,
        y: sRow * CELL_SIZE,
      });
    };
    const cleanup = () => {
      resizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      window.removeEventListener("mouseup", cleanup);
      window.removeEventListener("blur", cleanup);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
    window.addEventListener("mouseup", cleanup);
    window.addEventListener("blur", cleanup);
  }, [containerScale, onUpdate]);

  const cornerPositions: Record<ResizeHandle, React.CSSProperties & { cursor: string }> = {
    nw: { top: -5, left: -5, cursor: "nwse-resize", width: 10, height: 10, borderRadius: 2 },
    ne: { top: -5, right: -5, cursor: "nesw-resize", width: 10, height: 10, borderRadius: 2 },
    sw: { bottom: -5, left: -5, cursor: "nesw-resize", width: 10, height: 10, borderRadius: 2 },
    se: { bottom: -5, right: -5, cursor: "nwse-resize", width: 10, height: 10, borderRadius: 2 },
    n: { top: -4, left: "50%", transform: "translateX(-50%)", width: 20, height: 8, cursor: "ns-resize", borderRadius: 2 },
    s: { bottom: -4, left: "50%", transform: "translateX(-50%)", width: 20, height: 8, cursor: "ns-resize", borderRadius: 2 },
    w: { left: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: 20, cursor: "ew-resize", borderRadius: 2 },
    e: { right: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: 20, cursor: "ew-resize", borderRadius: 2 },
  };

  return (
    <>
      {overlays.map((s) => {
        const isSelected = selectedId === s.id && isEditMode;
        const w = Math.abs(s.endCol - s.startCol) * CELL_SIZE;
        const h = Math.abs(s.endRow - s.startRow) * CELL_SIZE;
        const minW = Math.max(w, CELL_SIZE);
        const minH = Math.max(h, CELL_SIZE);

        const { path, isClosed } = renderShapeSVGPath(s.shapeType, s.fillMode, 0, 0, minW, minH);

        return (
          <div
            key={s.id}
            data-shape-overlay
            className="absolute"
            style={{
              left: s.x,
              top: s.y,
              width: minW,
              height: minH,
              cursor: !isEditMode ? "default" : draggingId === s.id ? "grabbing" : "grab",
              zIndex: isSelected ? 20 : 10,
              userSelect: "none",
              pointerEvents: isEditMode ? "auto" : "none",
            }}
            onMouseDown={(e) => { if (isEditMode) e.stopPropagation(); }}
            onMouseUp={(e) => { if (isEditMode) e.stopPropagation(); }}
            onClick={(e) => { if (isEditMode) e.stopPropagation(); }}
            onPointerDown={(e) => handlePointerDown(e, s)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Selection outline */}
            {isSelected && (
              <div
                className="absolute -inset-1.5 rounded border-2 border-primary/60 pointer-events-none"
                style={{ borderStyle: "dashed" }}
              />
            )}

            {/* Delete button */}
            {isSelected && (
              <button
                data-shape-overlay
                className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:bg-destructive/80 transition-colors z-30"
                style={{ fontSize: 10 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(s.id);
                  setSelectedId(null);
                }}
              >
                <X size={10} />
              </button>
            )}

            {/* Shape SVG */}
            <svg width={minW} height={minH} viewBox={`0 0 ${minW} ${minH}`} className="absolute inset-0 pointer-events-none">
              <path
                d={path}
                fill={isClosed && s.fillMode === "fill" ? s.color : "none"}
                stroke={s.fillMode === "fill" && isClosed ? "none" : s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            {/* 8-point resize anchors */}
            {isSelected && (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as ResizeHandle[]).map((handle) => (
              <div
                key={handle}
                data-shape-overlay
                className="absolute z-30"
                style={{
                  ...cornerPositions[handle],
                  backgroundColor: "hsl(var(--primary))",
                  border: "1px solid hsl(var(--background))",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => handleResizeDown(handle, s, e)}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
