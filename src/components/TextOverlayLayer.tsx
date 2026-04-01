import { useState, useRef, useCallback, useEffect } from "react";
import { TextOverlay } from "@/hooks/useBrickEditor";
import { X, GripVertical } from "lucide-react";

interface TextOverlayLayerProps {
  overlays: TextOverlay[];
  onUpdate: (id: string, updates: Partial<TextOverlay>) => void;
  onRemove: (id: string) => void;
  containerScale: number;
}

export default function TextOverlayLayer({ overlays, onUpdate, onRemove, containerScale }: TextOverlayLayerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Deselect when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-text-overlay]")) {
        setSelectedId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handlePointerDown = useCallback((e: React.PointerEvent, overlay: TextOverlay) => {
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
  }, []);

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

  const handleDoubleClick = useCallback((e: React.MouseEvent, overlay: TextOverlay) => {
    e.stopPropagation();
    setEditingId(overlay.id);
    setEditText(overlay.text);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingId && editText.trim()) {
      onUpdate(editingId, { text: editText.trim() });
    }
    setEditingId(null);
  }, [editingId, editText, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitEdit();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
    // Delete selected overlay
  }, [commitEdit]);

  // Delete with keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedId && !editingId && (e.key === "Delete" || e.key === "Backspace")) {
        // Don't delete if user is typing in an input elsewhere
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        onRemove(selectedId);
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedId, editingId, onRemove]);

  return (
    <>
      {overlays.map((t) => {
        const isSelected = selectedId === t.id;
        const isEditing = editingId === t.id;

        return (
          <div
            key={t.id}
            data-text-overlay
            className="absolute group"
            style={{
              left: t.x,
              top: t.y,
              cursor: draggingId === t.id ? "grabbing" : "grab",
              zIndex: isSelected ? 20 : 10,
              userSelect: "none",
            }}
            onPointerDown={(e) => handlePointerDown(e, t)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={(e) => handleDoubleClick(e, t)}
          >
            {/* Selection outline */}
            {isSelected && (
              <div
                className="absolute -inset-1.5 rounded border-2 border-primary/60 pointer-events-none"
                style={{ borderStyle: "dashed" }}
              />
            )}

            {/* Delete button */}
            {isSelected && !isEditing && (
              <button
                data-text-overlay
                className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:bg-destructive/80 transition-colors z-30"
                style={{ fontSize: 10 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(t.id);
                  setSelectedId(null);
                }}
              >
                <X size={10} />
              </button>
            )}

            {/* Text content or edit input */}
            {isEditing ? (
              <input
                ref={inputRef}
                data-text-overlay
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="bg-card/90 border border-primary rounded px-1 py-0.5 outline-none"
                style={{
                  fontSize: t.fontSize,
                  fontFamily: t.fontFamily,
                  fontWeight: t.bold ? "bold" : "normal",
                  fontStyle: t.italic ? "italic" : "normal",
                  color: t.color,
                  minWidth: 40,
                  lineHeight: 1.2,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                style={{
                  fontSize: t.fontSize,
                  fontFamily: t.fontFamily,
                  fontWeight: t.bold ? "bold" : "normal",
                  fontStyle: t.italic ? "italic" : "normal",
                  color: t.color,
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                  textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  display: "block",
                }}
              >
                {t.text}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
