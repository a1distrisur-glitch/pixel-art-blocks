import { FolderOpen, Trash2, FilePlus2, Download, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ColorPickerButton from "@/components/ColorPickerButton";
import GridSettingsPopover from "@/components/GridSettingsPopover";
import type { BrickColor } from "@/hooks/useBrickEditor";

interface TopActionsProps {
  hasBricks: boolean;
  hasImage: boolean;
  imageEditMode?: boolean;
  onLoadProject: () => void;
  onClear: () => void;
  onSaveProject: () => void;
  onExportPieces: () => void;
  onOpenWelcome: () => void;
  selectedColor: string;
  colors: BrickColor[];
  onColorChange: (hex: string) => void;
  onAddColor: (name: string, value: string) => void;
  onReplaceColor: (index: number, name: string, value: string) => void;
  onRemoveColor: (index: number) => void;
  gridWidth: number;
  gridHeight: number;
  onGridSizeChange: (w: number, h: number) => void;
  gridVisible: boolean;
  onGridVisibleChange: (v: boolean) => void;
  cursorTrackerVisible: boolean;
  onCursorTrackerVisibleChange: (v: boolean) => void;
  /** Visual variant: "floating" for desktop overlay, "inline" for top bars */
  variant?: "floating" | "inline";
  className?: string;
}

interface BtnProps {
  onClick: () => void;
  title: string;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function Btn({ onClick, title, variant = "default", disabled, active, children }: BtnProps) {
  const styles = active
    ? "bg-primary text-primary-foreground"
    : variant === "danger"
      ? "text-destructive hover:bg-destructive/10"
      : variant === "primary"
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "text-toolbar-foreground hover:bg-toolbar-hover";
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none",
        styles,
      )}
    >
      {children}
    </button>
  );
}

export default function TopActions({
  hasBricks,
  hasImage,
  imageEditMode,
  onLoadProject,
  onClear,
  onSaveProject,
  onExportPieces,
  onOpenWelcome,
  selectedColor,
  colors,
  onColorChange,
  onAddColor,
  onReplaceColor,
  onRemoveColor,
  gridWidth,
  gridHeight,
  onGridSizeChange,
  gridVisible,
  onGridVisibleChange,
  cursorTrackerVisible,
  onCursorTrackerVisibleChange,
  variant = "floating",
  className,
}: TopActionsProps) {
  const wrapper =
    variant === "floating"
      ? "fixed top-3 right-3 z-30 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-toolbar/95 backdrop-blur border border-toolbar-border toolbar-shadow"
      : "flex items-center gap-0.5";

  return (
    <div className={cn(wrapper, className)}>
      {variant === "floating" && (
        <button
          type="button"
          aria-label="Abrir bienvenida"
          title="Abrir bienvenida"
          onClick={onOpenWelcome}
          className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-toolbar-hover transition-colors"
        >
          <img src="/icon-192.png" alt="PixCool Art" className="w-6 h-6 rounded-md object-cover" />
        </button>
      )}
      {variant === "floating" && (
        <ColorPickerButton
          selectedColor={selectedColor}
          colors={colors}
          onColorChange={onColorChange}
          onAddColor={onAddColor}
          onReplaceColor={onReplaceColor}
          onRemoveColor={onRemoveColor}
          swatchSize={28}
          align="end"
          side="bottom"
        />
      )}
      <GridSettingsPopover
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        onGridSizeChange={onGridSizeChange}
        gridVisible={gridVisible}
        onGridVisibleChange={onGridVisibleChange}
        cursorTrackerVisible={cursorTrackerVisible}
        onCursorTrackerVisibleChange={onCursorTrackerVisibleChange}
      />
      <Btn
        title="Imagen de referencia"
        active={hasImage}
        onClick={() => {}}
      >
        <ImageIcon size={18} />
      </Btn>
      <Btn title="Cargar proyecto" onClick={onLoadProject}>
        <FolderOpen size={18} />
      </Btn>
      <Btn title="Eliminar todo" variant="danger" onClick={onClear}>
        <Trash2 size={18} />
      </Btn>
      <Btn title="Guardar proyecto" onClick={onSaveProject}>
        <FilePlus2 size={18} />
      </Btn>
      <Btn
        title="Exportar piezas"
        variant="primary"
        onClick={onExportPieces}
        disabled={!hasBricks}
        active={hasBricks}
      >
        <Download size={18} />
      </Btn>
    </div>
  );
}
