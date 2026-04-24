import { useRef, useState } from "react";
import { Eye, EyeOff, Image as ImageIcon, Move, SlidersHorizontal, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ReferenceImageTopBarControlsProps {
  hasImage: boolean;
  imageVisible: boolean;
  imageOpacity: number;
  imageEditMode: boolean;
  onImageUpload: (file: File) => void;
  onImageVisibleChange: (value: boolean) => void;
  onImageOpacityChange: (value: number) => void;
  onImageEditModeChange: (value: boolean) => void;
  onRequestRemove: () => void;
  compact?: boolean;
  className?: string;
}

interface IconControlButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

function IconControlButton({
  label,
  onClick,
  children,
  active,
  danger,
  disabled,
  compact,
}: IconControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30",
        compact ? "h-8 w-8" : "h-9 w-9",
        active
          ? danger
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground"
          : danger
            ? "bg-destructive/20 text-toolbar-foreground hover:bg-destructive/30"
            : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover",
      )}
    >
      <span className="flex items-center justify-center">{children}</span>
    </button>
  );
}

export default function ReferenceImageTopBarControls({
  hasImage,
  imageVisible,
  imageOpacity,
  imageEditMode,
  onImageUpload,
  onImageVisibleChange,
  onImageOpacityChange,
  onImageEditModeChange,
  onRequestRemove,
  compact = false,
  className,
}: ReferenceImageTopBarControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [opacityOpen, setOpacityOpen] = useState(false);
  const iconSize = compact ? 14 : 16;

  return (
    <div className={cn("flex items-center gap-1 shrink-0", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImageUpload(file);
          event.target.value = "";
        }}
      />

      <IconControlButton
        label="Cargar imagen de referencia"
        onClick={() => fileRef.current?.click()}
        active={hasImage}
        compact={compact}
      >
        <ImageIcon size={iconSize} />
      </IconControlButton>

      <IconControlButton
        label={imageVisible ? "Ocultar imagen de referencia" : "Mostrar imagen de referencia"}
        onClick={() => onImageVisibleChange(!imageVisible)}
        active={hasImage && !imageVisible}
        disabled={!hasImage}
        compact={compact}
      >
        {imageVisible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
      </IconControlButton>

      <IconControlButton
        label={imageEditMode ? "Fijar imagen de referencia" : "Mover imagen de referencia"}
        onClick={() => onImageEditModeChange(!imageEditMode)}
        active={imageEditMode}
        disabled={!hasImage}
        compact={compact}
      >
        <Move size={iconSize} />
      </IconControlButton>

      <Popover open={opacityOpen} onOpenChange={setOpacityOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Opacidad de imagen de referencia"
            title="Opacidad de imagen de referencia"
            disabled={!hasImage}
            className={cn(
              "shrink-0 rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30",
              compact ? "h-8 w-8" : "h-9 w-9",
              opacityOpen
                ? "bg-primary text-primary-foreground"
                : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover",
            )}
          >
            <span className="flex items-center justify-center">
              <SlidersHorizontal size={iconSize} />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={8} className="w-44 bg-toolbar border-toolbar-border p-3">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-toolbar-foreground">Opacidad</p>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={imageOpacity}
              onChange={(event) => onImageOpacityChange(parseFloat(event.target.value))}
              className="opacity-slider w-full"
            />
          </div>
        </PopoverContent>
      </Popover>

      <IconControlButton
        label="Eliminar imagen de referencia"
        onClick={onRequestRemove}
        danger
        disabled={!hasImage}
        compact={compact}
      >
        <Trash2 size={iconSize} />
      </IconControlButton>
    </div>
  );
}