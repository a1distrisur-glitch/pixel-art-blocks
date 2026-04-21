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
  swatchSize = 28,
  className,
  align = "end",
  side = "bottom",
}: ColorPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  // Cerramos el popover cuando se abre el dialog para evitar capas superpuestas
  const wasOpenBeforeDialog = useRef(false);
  useEffect(() => {
    if (showAddDialog) {
      wasOpenBeforeDialog.current = open;
      setOpen(false);
    }
  }, [showAddDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = (hex: string) => {
    onAddColor(hex, hex);
    onColorChange(hex);
    setShowAddDialog(false);
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
        >
          <div className="grid grid-cols-7 gap-1.5">
            {colors.map((c, i) => (
              <button
                key={`${c.value}-${i}`}
                type="button"
                title={c.name}
                onClick={() => {
                  onColorChange(c.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-7 h-7 rounded-lg transition-all duration-150",
                  selectedColor === c.value
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-toolbar scale-110"
                    : "hover:scale-110 hover:ring-1 hover:ring-toolbar-muted/40",
                )}
                style={{
                  backgroundColor: c.value,
                  boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.2)",
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="w-7 h-7 rounded-lg border-2 border-dashed border-toolbar-foreground/40 flex items-center justify-center text-toolbar-foreground/70 hover:border-primary/50 hover:text-primary transition-colors"
              aria-label="Agregar color"
              title="Agregar color"
            >
              <Plus size={12} />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <BackgroundColorDialog
        open={showAddDialog}
        title="Agregar Color"
        initialColor={selectedColor || "#DC2626"}
        baseColor={selectedColor || "#DC2626"}
        onAccept={handleAccept}
        onCancel={() => setShowAddDialog(false)}
      />
    </>
  );
}