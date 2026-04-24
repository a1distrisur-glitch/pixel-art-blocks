import { useCallback, useRef, useState } from "react";
import { ImageTransform } from "@/hooks/useBrickEditor";

interface ReferenceImageOverlayProps {
  src: string;
  opacity: number;
  visible: boolean;
  locked: boolean;
  transform: ImageTransform;
  onTransformChange: (t: ImageTransform) => void;
}

// Detect if the primary input is coarse (touch) — used to enlarge handles for fingers.
const isCoarsePointer =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

export default function ReferenceImageOverlay({
  src,
  opacity,
  visible,
  locked,
  transform,
  onTransformChange,
}: ReferenceImageOverlayProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; pointerId: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; origTX: number; origTY: number; corner: string; pointerId: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (locked) return;
      // Only respond to primary button for mouse; touch/pen always pass.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: transform.x,
        origY: transform.y,
        pointerId: e.pointerId,
      };
      setIsDragging(true);

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        onTransformChange({
          ...transform,
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        });
      };
      const onUp = (ev: PointerEvent) => {
        if (dragRef.current && ev.pointerId !== dragRef.current.pointerId) return;
        dragRef.current = null;
        setIsDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [locked, transform, onTransformChange]
  );

  const handleResizeDown = useCallback(
    (corner: string, e: React.PointerEvent) => {
      if (locked) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: transform.width,
        origH: transform.height,
        origTX: transform.x,
        origTY: transform.y,
        corner,
        pointerId: e.pointerId,
      };

      const onMove = (ev: PointerEvent) => {
        if (!resizeRef.current || ev.pointerId !== resizeRef.current.pointerId) return;
        const r = resizeRef.current;
        const dx = ev.clientX - r.startX;
        const dy = ev.clientY - r.startY;
        let newW = r.origW;
        let newH = r.origH;
        let newX = r.origTX;
        let newY = r.origTY;

        // Edge handles (non-proportional)
        if (corner === "e") {
          newW = Math.max(40, r.origW + dx);
        } else if (corner === "w") {
          newW = Math.max(40, r.origW - dx);
          newX = r.origTX + (r.origW - newW);
        } else if (corner === "s") {
          newH = Math.max(40, r.origH + dy);
        } else if (corner === "n") {
          newH = Math.max(40, r.origH - dy);
          newY = r.origTY + (r.origH - newH);
        }
        // Corner handles (proportional)
        else {
          const aspect = r.origW / r.origH;
          if (corner === "se") {
            newW = Math.max(40, r.origW + dx);
            newH = newW / aspect;
          } else if (corner === "sw") {
            newW = Math.max(40, r.origW - dx);
            newH = newW / aspect;
            newX = r.origTX + (r.origW - newW);
          } else if (corner === "ne") {
            newW = Math.max(40, r.origW + dx);
            newH = newW / aspect;
            newY = r.origTY + (r.origH - newH);
          } else if (corner === "nw") {
            newW = Math.max(40, r.origW - dx);
            newH = newW / aspect;
            newX = r.origTX + (r.origW - newW);
            newY = r.origTY + (r.origH - newH);
          }
        }

        onTransformChange({ x: newX, y: newY, width: newW, height: newH });
      };
      const onUp = (ev: PointerEvent) => {
        if (resizeRef.current && ev.pointerId !== resizeRef.current.pointerId) return;
        resizeRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [locked, transform, onTransformChange]
  );

  if (!visible) return null;

  // Larger handles on coarse-pointer (touch) devices for finger usability.
  const cornerSize = isCoarsePointer ? 22 : 10;
  const cornerOffset = -(cornerSize / 2);
  const edgeThickness = isCoarsePointer ? 18 : 8;
  const edgeLength = isCoarsePointer ? 36 : 20;
  const edgeOffset = -(edgeThickness / 2);

  const corners = ["nw", "ne", "sw", "se"];
  const cornerPositions: Record<string, React.CSSProperties & { cursor: string }> = {
    nw: { top: cornerOffset, left: cornerOffset, cursor: "nwse-resize", width: cornerSize, height: cornerSize, borderRadius: 3 },
    ne: { top: cornerOffset, right: cornerOffset, cursor: "nesw-resize", width: cornerSize, height: cornerSize, borderRadius: 3 },
    sw: { bottom: cornerOffset, left: cornerOffset, cursor: "nesw-resize", width: cornerSize, height: cornerSize, borderRadius: 3 },
    se: { bottom: cornerOffset, right: cornerOffset, cursor: "nwse-resize", width: cornerSize, height: cornerSize, borderRadius: 3 },
  };

  const edges = ["n", "s", "w", "e"];
  const edgePositions: Record<string, React.CSSProperties & { cursor: string }> = {
    n: { top: edgeOffset, left: "50%", transform: "translateX(-50%)", width: edgeLength, height: edgeThickness, cursor: "ns-resize", borderRadius: 3 },
    s: { bottom: edgeOffset, left: "50%", transform: "translateX(-50%)", width: edgeLength, height: edgeThickness, cursor: "ns-resize", borderRadius: 3 },
    w: { left: edgeOffset, top: "50%", transform: "translateY(-50%)", width: edgeThickness, height: edgeLength, cursor: "ew-resize", borderRadius: 3 },
    e: { right: edgeOffset, top: "50%", transform: "translateY(-50%)", width: edgeThickness, height: edgeLength, cursor: "ew-resize", borderRadius: 3 },
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: transform.x,
        top: transform.y,
        width: transform.width,
        height: transform.height,
        // Disable browser gestures (scroll/zoom) while interacting when unlocked.
        touchAction: locked ? "auto" : "none",
      }}
    >
      <img
        src={src}
        alt="Referencia"
        className="w-full h-full select-none"
        style={{
          opacity,
          cursor: locked ? "default" : isDragging ? "grabbing" : "grab",
          pointerEvents: locked ? "none" : "auto",
          touchAction: locked ? "auto" : "none",
        }}
        draggable={false}
        onPointerDown={handlePointerDown}
      />
      {/* Resize handles — only when unlocked */}
      {!locked && (
        <>
          {/* Border outline */}
          <div
            className="absolute inset-0 border-2 border-dashed pointer-events-none"
            style={{ borderColor: "hsl(220 70% 50% / 0.5)" }}
          />
          {corners.map((c) => {
            const pos = cornerPositions[c];
            return (
              <div
                key={c}
                className="absolute"
                style={{
                  ...pos,
                  backgroundColor: "hsl(220 70% 50%)",
                  touchAction: "none",
                }}
                onPointerDown={(e) => handleResizeDown(c, e)}
              />
            );
          })}
          {edges.map((edge) => {
            const pos = edgePositions[edge];
            return (
              <div
                key={edge}
                className="absolute"
                style={{
                  ...pos,
                  backgroundColor: "hsl(220 70% 50%)",
                  touchAction: "none",
                }}
                onPointerDown={(e) => handleResizeDown(edge, e)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
