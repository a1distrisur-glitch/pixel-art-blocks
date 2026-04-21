import { ReactNode, useState } from "react";
import {
  Undo2, Redo2, Menu, Eraser, Move, Type,
  Shapes, Pipette, Paintbrush,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { EditorTool, BrickColor } from "@/hooks/useBrickEditor";
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
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-12 rounded-lg text-[10px] font-medium transition-colors ${
        active
          ? danger
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground"
          : "text-toolbar-foreground hover:bg-toolbar-hover"
      }`}
    >
      {children}
      <span className="leading-none">{label}</span>
    </button>
  );
}

export default function MobileToolbar({
  tool, onToolChange, onUndo, onRedo, canUndo, canRedo,
  selectedColor, onColorChange, colors,
  fullToolbar, imageEditMode, projectName, onOpenWelcome, topActions,
}: MobileToolbarProps) {
  const [colorSheetOpen, setColorSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const guarded = (next: EditorTool) => () => {
    if (imageEditMode) return; // mirror desktop behavior; user can fix image from More menu
    onToolChange(next);
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

        <TopBtn label="Deshacer" onClick={onUndo} disabled={!canUndo}><Undo2 size={18} /></TopBtn>
        <TopBtn label="Rehacer" onClick={onRedo} disabled={!canRedo}><Redo2 size={18} /></TopBtn>
        {topActions}
      </header>

      {/* Spacer so canvas doesn't sit under the top bar */}
      <div aria-hidden className="h-12 shrink-0" />

      {/* Bottom tools bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-stretch gap-0.5 px-1.5 pt-1 pb-[max(env(safe-area-inset-bottom),6px)] bg-toolbar border-t border-toolbar-border toolbar-shadow">
        <BottomTool active={tool === "place"} onClick={guarded("place")} label="Pintar">
          <Paintbrush size={18} />
        </BottomTool>
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

        {/* Active color → opens color sheet */}
        <Sheet open={colorSheetOpen} onOpenChange={setColorSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Elegir color"
              className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-12 rounded-lg text-[10px] font-medium text-toolbar-foreground hover:bg-toolbar-hover transition-colors"
            >
              <span
                className="w-6 h-6 rounded-md ring-1 ring-toolbar-border"
                style={{ backgroundColor: selectedColor, boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.2)" }}
              />
              <span className="leading-none">Color</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-toolbar border-toolbar-border max-h-[60vh]">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={16} className="text-toolbar-foreground" />
              <span className="text-sm font-semibold text-toolbar-foreground">Paleta</span>
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 overflow-y-auto pr-1">
              {colors.map((c, i) => (
                <button
                  key={`${c.value}-${i}`}
                  type="button"
                  title={c.name}
                  onClick={() => { onColorChange(c.value); onToolChange("place"); setColorSheetOpen(false); }}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    selectedColor === c.value
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-toolbar"
                      : "hover:ring-1 hover:ring-toolbar-muted/50"
                  }`}
                  style={{
                    backgroundColor: c.value,
                    boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] text-toolbar-foreground/60">
              Para añadir o editar colores, abre el menú completo.
            </p>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}