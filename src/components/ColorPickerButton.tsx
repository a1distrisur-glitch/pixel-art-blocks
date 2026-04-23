import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BackgroundColorDialog from "@/components/BackgroundColorDialog";
import type { BrickColor } from "@/hooks/useBrickEditor";
import { cn } from "@/lib/utils";

interface ColorPickerButtonProps {
  selectedColor: string;
  colors: BrickColor[];
  onColorChange: (hex: string) => void;
  onAddColor: (name: string, value: string) => void;
  onReplaceColor?: (index: number, name: string, value: string) => void;
  onRemoveColor?: (index: number) => void;
  /** Tamaño del swatch en px (default 28 para flotante desktop, 32 para móvil) */
  swatchSize?: number;
  className?: string;
  /** Donde abrir el popover */
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

export default function ColorPickerButton({
  selectedColor,
  colors,
  onColorChange,
  onAddColor,
  onReplaceColor,
  onRemoveColor,
  swatchSize = 28,
  className,
  align = "end",
  side = "bottom",
}: ColorPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<string>(selectedColor || "#DC2626");
  // Cerramos el popover cuando se abre el dialog para evitar capas superpuestas
  useEffect(() => {
    if (dialogMode) setOpen(false);
  }, [dialogMode]);

  const closeDialog = () => {
    setDialogMode(null);
    setEditIndex(null);
  };

  const canEdit = !!(onReplaceColor || onRemoveColor);

  // ───── Gesto unificado (pointer events) ─────
  // - Long press (>= 400ms, mov < 10px) → editar
  // - Click derecho (button === 2)       → editar
  // - Doble click                        → editar
  // - Click corto                        → seleccionar color
  const longPressTimer = useRef<number | null>(null);
  const clickTimer = useRef<number | null>(null);
  const gestureTriggered = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const triggerEdit = (i: number, value: string) => {
    if (!canEdit) return;
    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    gestureTriggered.current = true;
    setEditIndex(i);
    setEditInitial(value);
    setDialogMode("edit");
  };

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent, i: number, value: string) => {
    gestureTriggered.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      triggerEdit(i, value);
      return;
    }
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      triggerEdit(i, value);
    }, 400);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current || longPressTimer.current === null) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (dx * dx + dy * dy > 100) clearLongPress(); // ~10px
  };

  const handlePointerUp = () => {
    clearLongPress();
  };

  const handleClick = (i: number, value: string) => {
    if (gestureTriggered.current) {
      gestureTriggered.current = false;
      return;
    }
    // Diferimos selección/cierre por si llega un dblclick (que abrirá editor)
    if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      onColorChange(value);
      setOpen(false);
    }, 220);
  };

  const handleAccept = (hex: string) => {
    if (dialogMode === "edit" && editIndex !== null && onReplaceColor) {
      onReplaceColor(editIndex, hex, hex);
      onColorChange(hex);
    } else {
      onAddColor(hex, hex);
      onColorChange(hex);
    }
    closeDialog();
  };

  const handleDelete = () => {
    if (editIndex !== null && onRemoveColor) {
      onRemoveColor(editIndex);
    }
    closeDialog();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Color seleccionado"
            title="Color seleccionado"
            className={cn(
              "flex items-center justify-center rounded-md ring-1 ring-toolbar-border hover:ring-primary/50 transition-all",
              className,
            )}
            style={{
              width: swatchSize,
              height: swatchSize,
              backgroundColor: selectedColor,
              boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2)",
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          align={align}
          side={side}
          sideOffset={6}
          className="w-[260px] p-3 bg-toolbar border-toolbar-border z-50"
          onInteractOutside={(e) => {
            // Evita que el popover se cierre mientras se abre el dialog de edición
            if (dialogMode) e.preventDefault();
          }}
        >
          <div className="grid grid-cols-7 gap-1.5">
            {colors.map((c, i) => (
              <button
                key={`${c.value}-${i}`}
                type="button"
                title={c.name}
                onClick={() => handleClick(i, c.value)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerEdit(i, c.value);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerEdit(i, c.value);
                }}
                onPointerDown={(e) => handlePointerDown(e, i, c.value)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                  backgroundColor: c.value,
                  boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.2)",
                  touchAction: "none",
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                }}
                className={cn(
                  "w-7 h-7 rounded-lg transition-all duration-150",
                  selectedColor === c.value
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-toolbar scale-110"
                    : "hover:scale-110 hover:ring-1 hover:ring-toolbar-muted/40",
                )}
              />
            ))}
            <button
              type="button"
              onClick={() => {
                setEditInitial(selectedColor || "#DC2626");
                setDialogMode("add");
              }}
              className="w-7 h-7 rounded-lg border-2 border-dashed border-toolbar-foreground/40 flex items-center justify-center text-toolbar-foreground/70 hover:border-primary/50 hover:text-primary transition-colors"
              aria-label="Agregar color"
              title="Agregar color"
            >
              <Plus size={12} />
            </button>
          </div>
          {canEdit && (
            <p className="mt-2 pt-2 border-t border-toolbar-border text-[10px] text-toolbar-foreground text-center">
              Editar/Borrar: doble click, click derecho o mantén pulsado
            </p>
          )}
        </PopoverContent>
      </Popover>

      <BackgroundColorDialog
        open={dialogMode !== null}
        title={dialogMode === "edit" ? "Editar Color" : "Agregar Color"}
        initialColor={editInitial}
        baseColor={editInitial}
        onAccept={handleAccept}
        onCancel={closeDialog}
        onRemove={dialogMode === "edit" && onRemoveColor ? handleDelete : undefined}
        removeLabel="Eliminar Color"
      />
    </>
  );
}
