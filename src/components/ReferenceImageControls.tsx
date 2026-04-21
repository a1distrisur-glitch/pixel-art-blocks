import { useRef, useState } from "react";
import { Trash2, Eye, EyeOff, Move, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ReferenceImageControlsProps {
  hasImage: boolean;
  imageVisible: boolean;
  imageOpacity: number;
  imageEditMode: boolean;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  onImageVisibleChange: (v: boolean) => void;
  onImageOpacityChange: (v: number) => void;
  onImageEditModeChange: (v: boolean) => void;
  /** "lateral" = sidebar styling, "compact" = mobile bottom bar styling */
  variant?: "lateral" | "compact";
  /** When provided, clicking the trash button calls this instead of opening the built-in dialog */
  onRequestRemove?: () => void;
}

function CtrlBtn({
  active,
  danger,
  disabled,
  onClick,
  tooltip,
  children,
  className = "",
}: {
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
  className?: string;
}) {
  const btn = (
    <button
      type="button"
      aria-label={tooltip}
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
        active
          ? danger
            ? "bg-destructive text-destructive-foreground shadow-sm"
            : "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : danger
            ? "bg-destructive/20 hover:bg-destructive/30 text-toolbar-foreground"
            : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover"
      } ${disabled ? "opacity-30 pointer-events-none" : ""} ${className}`}
    >
      {children}
    </button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default function ReferenceImageControls({
  hasImage,
  imageVisible,
  imageOpacity,
  imageEditMode,
  onImageUpload,
  onRemoveImage,
  onImageVisibleChange,
  onImageOpacityChange,
  onImageEditModeChange,
  variant = "lateral",
  onRequestRemove,
}: ReferenceImageControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const iconSize = variant === "compact" ? 14 : 13;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImageUpload(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-1 flex-nowrap">
          <CtrlBtn
            danger
            disabled={!hasImage}
            onClick={() => hasImage && setShowRemoveDialog(true)}
            tooltip="Eliminar imagen"
          >
            <Trash2 size={iconSize} />
          </CtrlBtn>
          <CtrlBtn
            disabled={!hasImage}
            onClick={() => hasImage && onImageVisibleChange(!imageVisible)}
            tooltip={imageVisible ? "Ocultar imagen" : "Mostrar imagen"}
          >
            {imageVisible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
          </CtrlBtn>
          <CtrlBtn
            active={imageEditMode}
            disabled={!hasImage}
            onClick={() => hasImage && onImageEditModeChange(!imageEditMode)}
            tooltip={imageEditMode ? "Fijar imagen" : "Mover/redimensionar imagen"}
          >
            <Move size={iconSize} />
          </CtrlBtn>
          <CtrlBtn
            active={showOpacitySlider}
            disabled={!hasImage}
            onClick={() => hasImage && setShowOpacitySlider((v) => !v)}
            tooltip="Ajustar opacidad"
          >
            <SlidersHorizontal size={iconSize} />
          </CtrlBtn>
          <CtrlBtn onClick={() => fileRef.current?.click()} tooltip="Cargar imagen">
            <ImageIcon size={iconSize} />
          </CtrlBtn>
        </div>

        {hasImage && showOpacitySlider && (
          <div className="mt-2">
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={imageOpacity}
              onChange={(e) => onImageOpacityChange(parseFloat(e.target.value))}
              className="opacity-slider w-full"
            />
          </div>
        )}

        {showRemoveDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-4 text-center">
                ¿Eliminar imagen de referencia?
              </h3>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowRemoveDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowRemoveDialog(false);
                    onRemoveImage();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
