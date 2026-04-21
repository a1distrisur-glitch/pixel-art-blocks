import { ReactNode, useState } from "react";
import {
  Undo2, Redo2, Menu, Eraser, Move, Type,
  Shapes, Pipette, Paintbrush, ArrowRightLeft, ArrowUpDown,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EditorTool, BrickColor, BrickSize, BrickOrientation } from "@/hooks/useBrickEditor";
import ColorPickerButton from "@/components/ColorPickerButton";

interface MobileToolbarProps {
  tool: EditorTool;
  onToolChange: (t: EditorTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedColor: string;
  onColorChange: (hex: string) => void;
  colors: BrickColor[];
  onAddColor: (name: string, value: string) => void;
  selectedSize: BrickSize;
  onSizeChange: (s: BrickSize) => void;
  orientation: BrickOrientation;
  onOrientationChange: (o: BrickOrientation) => void;
  fullToolbar: ReactNode;
  imageEditMode: boolean;
  projectName: string;
  onOpenWelcome: () => void;
  topActions?: ReactNode;
}

function TopBtn({
  onClick, disabled, label, children,
}: { onClick: () => void; disabled?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center w-10 h-10 rounded-lg text-toolbar-foreground bg-toolbar-section hover:bg-toolbar-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
    >
      {children}
    </button>
  );
}

function BottomTool({
  active, danger, onClick, label, children,
}: { active?: boolean; danger?: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-colors ${
        active
          ? danger
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground"
          : "text-toolbar-foreground hover:bg-toolbar-hover"
      }`}
    >
      {children}
    </button>
  );
}

function PopBtn({
  active, disabled, onClick, label, children,
}: { active?: boolean; disabled?: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center flex-1 h-9 rounded-md text-xs font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover"
      }`}
    >
      {children}
    </button>
  );
}

export default function MobileToolbar({
  tool, onToolChange, onUndo, onRedo, canUndo, canRedo,
  selectedColor, onColorChange, colors, onAddColor,
  selectedSize, onSizeChange, orientation, onOrientationChange,
  fullToolbar, imageEditMode, projectName, onOpenWelcome, topActions,
}: MobileToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paintOpen, setPaintOpen] = useState(false);

  const guarded = (next: EditorTool) => () => {
    if (imageEditMode) return; // mirror desktop behavior; user can fix image from More menu
    onToolChange(next);
  };

  const handleSizeSelect = (size: BrickSize) => {
    if (imageEditMode) return;
    onSizeChange(size);
    onToolChange("place");
    setPaintOpen(false);
  };

  const handleOrientationSelect = (o: BrickOrientation) => {
    if (imageEditMode) return;
    onOrientationChange(o);
  };

  return (
    <>
      {/* Top compact bar */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center gap-1.5 px-2 h-12 bg-toolbar border-b border-toolbar-border toolbar-shadow">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menú completo"
              className="flex items-center justify-center w-10 h-10 rounded-lg text-toolbar-foreground hover:bg-toolbar-hover transition-colors"
            >
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] bg-toolbar border-toolbar-border">
            <div className="h-full overflow-hidden">{fullToolbar}</div>
          </SheetContent>
        </Sheet>

        <button
          type="button"
          onClick={onOpenWelcome}
          className="flex items-center gap-1.5 min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Abrir bienvenida"
        >
          <img src="/icon-192.png" alt="PixCool Art" className="w-6 h-6 rounded-md shrink-0" />
          <span className="text-xs font-semibold text-toolbar-foreground truncate">
            {projectName?.trim() || "PixCool Art"}
          </span>
        </button>

        <ColorPickerButton
          selectedColor={selectedColor}
          colors={colors}
          onColorChange={(hex) => { onColorChange(hex); if (!imageEditMode) onToolChange("place"); }}
          onAddColor={onAddColor}
          swatchSize={28}
          align="end"
          side="bottom"
        />
        <TopBtn label="Deshacer" onClick={onUndo} disabled={!canUndo}><Undo2 size={18} /></TopBtn>
        <TopBtn label="Rehacer" onClick={onRedo} disabled={!canRedo}><Redo2 size={18} /></TopBtn>
        {topActions}
      </header>

      {/* Spacer so canvas doesn't sit under the top bar */}
      <div aria-hidden className="h-12 shrink-0" />

      {/* Bottom tools bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-stretch gap-0.5 px-1.5 pt-1 pb-[max(env(safe-area-inset-bottom),6px)] bg-toolbar border-t border-toolbar-border toolbar-shadow">
        <Popover open={paintOpen} onOpenChange={setPaintOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Pintar"
              title="Pintar"
              className={`flex items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-colors ${
                tool === "place"
                  ? "bg-primary text-primary-foreground"
                  : "text-toolbar-foreground hover:bg-toolbar-hover"
              }`}
            >
              <Paintbrush size={18} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-[260px] p-2 bg-toolbar border-toolbar-border"
          >
            <div className="flex gap-1">
              <PopBtn
                active={orientation === "horizontal"}
                disabled={selectedSize === 1 || imageEditMode}
                onClick={() => handleOrientationSelect("horizontal")}
                label="Orientación horizontal"
              >
                <ArrowRightLeft size={14} />
              </PopBtn>
              <PopBtn
                active={orientation === "vertical"}
                disabled={selectedSize === 1 || imageEditMode}
                onClick={() => handleOrientationSelect("vertical")}
                label="Orientación vertical"
              >
                <ArrowUpDown size={14} />
              </PopBtn>
              {([3, 2, 1] as BrickSize[]).map((size) => (
                <PopBtn
                  key={size}
                  active={selectedSize === size && tool === "place"}
                  disabled={imageEditMode}
                  onClick={() => handleSizeSelect(size)}
                  label={`Bloque 1×${size}`}
                >
                  1×{size}
                </PopBtn>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <BottomTool active={tool === "erase"} danger onClick={guarded("erase")} label="Borrar">
          <Eraser size={18} />
        </BottomTool>
        <BottomTool active={tool === "move"} onClick={guarded("move")} label="Mover">
          <Move size={18} />
        </BottomTool>
        <BottomTool active={tool === "shape"} onClick={guarded("shape")} label="Formas">
          <Shapes size={18} />
        </BottomTool>
        <BottomTool active={tool === "text"} onClick={guarded("text")} label="Texto">
          <Type size={18} />
        </BottomTool>
        <BottomTool active={tool === "pipette"} onClick={guarded("pipette")} label="Pipeta">
          <Pipette size={18} />
        </BottomTool>

      </nav>
    </>
  );
}
