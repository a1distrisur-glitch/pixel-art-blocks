import { cn } from "@/lib/utils";
import ColorPickerButton from "@/components/ColorPickerButton";
import GridSettingsPopover from "@/components/GridSettingsPopover";
import ReferenceImageTopBarControls from "@/components/ReferenceImageTopBarControls";
import ProjectMenuButton from "@/components/ProjectMenuButton";
import type { BrickColor } from "@/hooks/useBrickEditor";

interface TopActionsProps {
  hasBricks: boolean;
  hasImage: boolean;
  imageEditMode: boolean;
  imageVisible: boolean;
  imageOpacity: number;
  onImageUpload: (file: File) => void;
  onImageVisibleChange: (v: boolean) => void;
  onImageOpacityChange: (v: number) => void;
  onImageEditModeChange: (v: boolean) => void;
  onRequestRemoveImage: () => void;
  onLoadProject: () => void;
  onClear: () => void;
  onSaveProject: () => void;
  onExportPieces: () => void;
  onExit: () => void;
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



export default function TopActions({
  hasBricks,
  hasImage,
  imageEditMode,
  imageVisible,
  imageOpacity,
  onImageUpload,
  onImageVisibleChange,
  onImageOpacityChange,
  onImageEditModeChange,
  onRequestRemoveImage,
  onLoadProject,
  onClear,
  onSaveProject,
  onExportPieces,
  onExit,
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
        <ReferenceImageTopBarControls
          hasImage={hasImage}
          imageVisible={imageVisible}
          imageOpacity={imageOpacity}
          imageEditMode={imageEditMode}
          onImageUpload={onImageUpload}
          onImageVisibleChange={onImageVisibleChange}
          onImageOpacityChange={onImageOpacityChange}
          onImageEditModeChange={onImageEditModeChange}
          onRequestRemove={onRequestRemoveImage}
        />
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
      <ProjectMenuButton
        hasBricks={hasBricks}
        onLoadProject={onLoadProject}
        onSaveProject={onSaveProject}
        onExportPieces={onExportPieces}
      />
    </div>
  );
}
