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

export default function ReferenceImageOverlay({
  src,
  opacity,
  visible,
  locked,
  transform,
  onTransformChange,
}: ReferenceImageOverlayProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number; origTX: number; origTY: number; corner: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (locked) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: transform.x,
        origY: transform.y,
      };
      setIsDragging(true);

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        onTransformChange({
          ...transform,
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        });
      };
      const onUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [locked, transform, onTransformChange]
  );

  const handleResizeDown = useCallback(
    (corner: string, e: React.MouseEvent) => {
      if (locked) return;
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
      };
      setIsResizing(true);

      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
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
      const onUp = () => {
        resizeRef.current = null;
        setIsResizing(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [locked, transform, onTransformChange]
  );

  if (!visible) return null;

  const corners = ["nw", "ne", "sw", "se"];
  const cornerPositions: Record<string, React.CSSProperties & { cursor: string }> = {
    nw: { top: -5, left: -5, cursor: "nwse-resize", width: 10, height: 10, borderRadius: 2 },
    ne: { top: -5, right: -5, cursor: "nesw-resize", width: 10, height: 10, borderRadius: 2 },
    sw: { bottom: -5, left: -5, cursor: "nesw-resize", width: 10, height: 10, borderRadius: 2 },
    se: { bottom: -5, right: -5, cursor: "nwse-resize", width: 10, height: 10, borderRadius: 2 },
  };

  const edges = ["n", "s", "w", "e"];
  const edgePositions: Record<string, React.CSSProperties & { cursor: string }> = {
    n: { top: -4, left: "50%", transform: "translateX(-50%)", width: 20, height: 8, cursor: "ns-resize", borderRadius: 2 },
    s: { bottom: -4, left: "50%", transform: "translateX(-50%)", width: 20, height: 8, cursor: "ns-resize", borderRadius: 2 },
    w: { left: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: 20, cursor: "ew-resize", borderRadius: 2 },
    e: { right: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: 20, cursor: "ew-resize", borderRadius: 2 },
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: transform.x,
        top: transform.y,
        width: transform.width,
        height: transform.height,
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
        }}
        draggable={false}
        onMouseDown={handleMouseDown}
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
                }}
                onMouseDown={(e) => handleResizeDown(c, e)}
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
                }}
                onMouseDown={(e) => handleResizeDown(edge, e)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
