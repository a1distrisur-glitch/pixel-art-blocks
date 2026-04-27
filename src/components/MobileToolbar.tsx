import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  Undo2, Redo2, Eraser, Move, Type,
  Shapes, Pipette, Paintbrush, ArrowRightLeft, ArrowUpDown,
  MousePointer2, Bold, Italic, X, Trash2, Plus, LogOut,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * useTouchTooltip
 * Returns state + handlers to attach directly to a button to provide:
 *  - Hover tooltip on mouse devices (delegated to Radix)
 *  - Tap corto (<500ms): tooltip aparece y se oculta solo a 1.5s; click se ejecuta normal
 *  - Long-press (>=500ms): tooltip aparece al cumplir el umbral y CANCELA el click
 */
function useTouchTooltip() {
  const [open, setOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const autoHideTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const clearTimers = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (autoHideTimer.current !== null) {
      window.clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
  };

  useEffect(() => () => clearTimers(), []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      longPressFired.current = false;
      clearTimers();
      longPressTimer.current = window.setTimeout(() => {
        longPressFired.current = true;
        setOpen(true);
      }, 500);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      if (longPressFired.current) {
        e.preventDefault();
        e.stopPropagation();
        if (autoHideTimer.current !== null) window.clearTimeout(autoHideTimer.current);
        autoHideTimer.current = window.setTimeout(() => setOpen(false), 600);
      } else {
        if (longPressTimer.current !== null) {
          window.clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setOpen(true);
        if (autoHideTimer.current !== null) window.clearTimeout(autoHideTimer.current);
        autoHideTimer.current = window.setTimeout(() => setOpen(false), 1500);
      }
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      clearTimers();
      setOpen(false);
      longPressFired.current = false;
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      clearTimers();
      setOpen(false);
      longPressFired.current = false;
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (longPressFired.current) {
        e.preventDefault();
        e.stopPropagation();
        longPressFired.current = false;
      }
    },
  };

  return { open, setOpen, handlers };
}

import type { EditorTool, BrickColor, BrickSize, BrickOrientation, TextOverlay, ShapeType, ShapeFillMode } from "@/hooks/useBrickEditor";
import { SHAPE_LIST } from "@/lib/shapeRasterizer";
import ShapeIcon from "@/components/ShapeIcon";
import ColorPickerButton from "@/components/ColorPickerButton";
import ReferenceImageControls from "@/components/ReferenceImageControls";
import ReferenceImageTopBarControls from "@/components/ReferenceImageTopBarControls";

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
  onReplaceColor: (index: number, name: string, value: string) => void;
  onRemoveColor: (index: number) => void;
  selectedSize: BrickSize;
  onSizeChange: (s: BrickSize) => void;
  orientation: BrickOrientation;
  onOrientationChange: (o: BrickOrientation) => void;
  shapeType: ShapeType;
  onShapeTypeChange: (s: ShapeType) => void;
  shapeFillMode: ShapeFillMode;
  onShapeFillModeChange: (m: ShapeFillMode) => void;
  pixelText: string;
  onPixelTextChange: (v: string) => void;
  textFontSize: number;
  onTextFontSizeChange: (v: number) => void;
  textFontFamily: string;
  onTextFontFamilyChange: (v: string) => void;
  textBold: boolean;
  onTextBoldChange: (v: boolean) => void;
  textItalic: boolean;
  onTextItalicChange: (v: boolean) => void;
  textOverlays: TextOverlay[];
  onRemoveTextOverlay: (id: string) => void;
  imageEditMode: boolean;
  projectName: string;
  onOpenWelcome: () => void;
  topActions?: ReactNode;
  hasImage: boolean;
  imageVisible: boolean;
  imageOpacity: number;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  onImageVisibleChange: (v: boolean) => void;
  onImageOpacityChange: (v: number) => void;
  onImageEditModeChange: (v: boolean) => void;
  onRequestRemoveImage: () => void;
  onClear: () => void;
  pipettePrefilledColor?: string | null;
  onPipettePrefilledClear?: () => void;
  gridSettingsSlot?: ReactNode;
}

function TopBtn({
  onClick, disabled, label, children,
}: { onClick: () => void; disabled?: boolean; label: string; children: ReactNode }) {
  const { open, setOpen, handlers } = useTouchTooltip();
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          {...handlers}
          className="flex items-center justify-center flex-1 min-w-0 h-12 rounded-lg text-toolbar-foreground bg-toolbar-section hover:bg-toolbar-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function BottomTool({
  active, danger, onClick, label, children,
}: { active?: boolean; danger?: boolean; onClick: () => void; label: string; children: ReactNode }) {
  const { open, setOpen, handlers } = useTouchTooltip();
  const cls = active
    ? danger
      ? "bg-destructive text-destructive-foreground"
      : "bg-primary text-primary-foreground"
    : danger
      ? "bg-destructive/20 text-toolbar-foreground hover:bg-destructive/30"
      : "text-toolbar-foreground hover:bg-toolbar-hover";
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          {...handlers}
          className={`flex items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-colors ${cls}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function PopBtn({
  active, disabled, onClick, label, children, className,
}: { active?: boolean; disabled?: boolean; onClick: () => void; label: string; children: ReactNode; className?: string }) {
  const { open, setOpen, handlers } = useTouchTooltip();
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          {...handlers}
          className={`flex items-center justify-center flex-1 h-9 rounded-md text-xs font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none ${
            active
              ? "bg-primary text-primary-foreground"
              : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover"
          } ${className ?? ""}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * PopTriggerBtn — botón que actúa como PopoverTrigger (asChild) Y muestra tooltip.
 * Long-press: muestra tooltip y CANCELA el click (no abre el popover).
 * Tap corto: abre el popover y muestra el tooltip ~1.5s.
 */
const PopTriggerBtn = React.forwardRef<HTMLButtonElement, {
  active: boolean;
  label: string;
  className?: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ active, label, className, children, ...rest }, ref) => {
    const { open, setOpen, handlers } = useTouchTooltip();
    return (
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            type="button"
            aria-label={label}
            {...rest}
            {...handlers}
            className={`flex items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-toolbar-foreground hover:bg-toolbar-hover"
            } ${className ?? ""}`}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    );
  }
);
PopTriggerBtn.displayName = "PopTriggerBtn";

const inputCls = "w-full h-8 px-2 rounded-md bg-toolbar-section border border-toolbar-border text-xs text-toolbar-foreground placeholder:text-toolbar-muted focus:outline-none focus:ring-1 focus:ring-primary";


export default function MobileToolbar({
  tool, onToolChange, onUndo, onRedo, canUndo, canRedo,
  selectedColor, onColorChange, colors, onAddColor, onReplaceColor, onRemoveColor,
  selectedSize, onSizeChange, orientation, onOrientationChange,
  shapeType, onShapeTypeChange, shapeFillMode, onShapeFillModeChange,
  pixelText, onPixelTextChange,
  textFontSize, onTextFontSizeChange,
  textFontFamily, onTextFontFamilyChange,
  textBold, onTextBoldChange,
  textItalic, onTextItalicChange,
  textOverlays, onRemoveTextOverlay,
  imageEditMode, projectName, onOpenWelcome, topActions,
  hasImage, imageVisible, imageOpacity,
  onImageUpload, onRemoveImage, onImageVisibleChange,
  onImageOpacityChange, onImageEditModeChange,
  onRequestRemoveImage,
  onClear,
  pipettePrefilledColor, onPipettePrefilledClear,
  gridSettingsSlot,
}: MobileToolbarProps) {
  const [paintOpen, setPaintOpen] = useState(false);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [refImageOpen, setRefImageOpen] = useState(false);
  const [fontSizeText, setFontSizeText] = useState<string>(String(textFontSize));
  useEffect(() => setFontSizeText(String(textFontSize)), [textFontSize]);

  const ensureImageFixed = () => {
    if (imageEditMode) onImageEditModeChange(false);
  };

  const activateTool = (next: EditorTool) => {
    ensureImageFixed();
    onToolChange(next);
  };

  const handleShapeOpenChange = (open: boolean) => {
    setShapeOpen(open);
    if (open) activateTool("shape");
  };

  const handleTextOpenChange = (open: boolean) => {
    setTextOpen(open);
    if (open) {
      activateTool("text");
    } else {
      // When closing the text popover, revert to brick tool to avoid accidental text placement
      onToolChange("place");
    }
  };

  const guarded = (next: EditorTool) => () => {
    activateTool(next);
  };

  const handleSizeSelect = (size: BrickSize) => {
    ensureImageFixed();
    onSizeChange(size);
    onToolChange("place");
    setPaintOpen(false);
  };

  const handleOrientationSelect = (o: BrickOrientation) => {
    ensureImageFixed();
    onOrientationChange(o);
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Top compact bar */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-stretch gap-0.5 px-1.5 pt-1 pb-1 bg-toolbar border-b border-toolbar-border toolbar-shadow">
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
          compact
          expand
        />

        <ColorPickerButton
          selectedColor={selectedColor}
          colors={colors}
          onColorChange={(hex) => { ensureImageFixed(); onColorChange(hex); onToolChange("place"); }}
          onAddColor={onAddColor}
          onReplaceColor={onReplaceColor}
          onRemoveColor={onRemoveColor}
          swatchSize={28}
          expand
          align="end"
          side="bottom"
          prefilledColor={pipettePrefilledColor}
          onPrefilledClear={onPipettePrefilledClear}
        />

        <TopBtn label="Deshacer" onClick={onUndo} disabled={!canUndo}><Undo2 size={18} /></TopBtn>
        <TopBtn label="Rehacer" onClick={onRedo} disabled={!canRedo}><Redo2 size={18} /></TopBtn>
        {topActions}
      </header>

      {/* Spacer so canvas doesn't sit under the top bar */}
      <div aria-hidden className="h-14 shrink-0" />

      {/* Bottom tools bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-stretch gap-0.5 px-1.5 pt-1 pb-[max(env(safe-area-inset-bottom),6px)] bg-toolbar border-t border-toolbar-border toolbar-shadow">
        {/* Pintar */}
        <Popover open={paintOpen} onOpenChange={setPaintOpen}>
          <PopoverTrigger asChild>
            <PopTriggerBtn active={tool === "place"} label="Pintar">
              <Paintbrush size={18} />
            </PopTriggerBtn>
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
                disabled={selectedSize === 1}
                onClick={() => handleOrientationSelect("horizontal")}
                label="Orientación horizontal"
              >
                <ArrowRightLeft size={14} />
              </PopBtn>
              <PopBtn
                active={orientation === "vertical"}
                disabled={selectedSize === 1}
                onClick={() => handleOrientationSelect("vertical")}
                label="Orientación vertical"
              >
                <ArrowUpDown size={14} />
              </PopBtn>
              {([3, 2, 1] as BrickSize[]).map((size) => (
                <PopBtn
                  key={size}
                  active={selectedSize === size && tool === "place"}
                  disabled={false}
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

        {/* Formas */}
        <Popover open={shapeOpen} onOpenChange={handleShapeOpenChange}>
          <PopoverTrigger asChild>
            <PopTriggerBtn active={tool === "shape"} label="Formas">
              <Shapes size={18} />
            </PopTriggerBtn>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            sideOffset={8}
            className="w-[280px] p-2.5 bg-toolbar border-toolbar-border space-y-2"
          >
            <div>
              <p className="text-[10px] text-toolbar-foreground mb-1">Forma</p>
              <div className="grid grid-cols-4 gap-1">
                {SHAPE_LIST.map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    aria-label={s.label}
                    title={s.label}
                    onClick={() => {
                      activateTool("shape");
                      onShapeTypeChange(s.type);
                      setShapeOpen(false);
                    }}
                    className={`flex items-center justify-center w-full h-8 rounded-md text-xs transition-all ${
                      shapeType === s.type
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover"
                    }`}
                  >
                    <ShapeIcon type={s.type} size={14} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-toolbar-foreground mb-1">Relleno</p>
              <div className="flex gap-1">
                <PopBtn active={shapeFillMode === "outline"} onClick={() => {
                  activateTool("shape");
                  onShapeFillModeChange("outline");
                }} label="Contorno">
                  Contorno
                </PopBtn>
                <PopBtn active={shapeFillMode === "fill"} onClick={() => {
                  activateTool("shape");
                  onShapeFillModeChange("fill");
                }} label="Relleno">
                  Relleno
                </PopBtn>
              </div>
            </div>
            <p className="text-[18px] text-toolbar-foreground/70 flex items-center gap-1">
              <MousePointer2 size={18} /> Arrastra en la grilla para dibujar
            </p>
          </PopoverContent>
        </Popover>

        {/* Texto */}
        <Popover open={textOpen} onOpenChange={handleTextOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Texto"
              title="Texto"
              className={`flex items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-colors ${
                tool === "text"
                  ? "bg-primary text-primary-foreground"
                  : "text-toolbar-foreground hover:bg-toolbar-hover"
              }`}
            >
              <Type size={18} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            sideOffset={8}
            className="w-[280px] p-2.5 bg-toolbar border-toolbar-border space-y-2"
          >
            <div className="relative">
              <input
                type="text"
                value={pixelText}
                 onChange={(e) => {
                   activateTool("text");
                   onPixelTextChange(e.target.value);
                 }}
                placeholder="Escribe tu texto…"
                className={`${inputCls} ${pixelText ? "pr-7" : ""}`}
              />
              {pixelText && (
                <button
                  type="button"
                  aria-label="Borrar texto"
                  title="Borrar texto"
                  onClick={() => onPixelTextChange("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-sm text-toolbar-foreground/70 hover:text-toolbar-foreground hover:bg-toolbar-hover transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[10px] text-toolbar-foreground">Tamaño</span>
                <input
                  type="number"
                  min={1}
                  max={96}
                  value={fontSizeText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setFontSizeText("");
                      return;
                    }
                    const n = parseInt(raw, 10);
                    if (Number.isNaN(n)) return;
                    const c = Math.max(1, Math.min(96, n));
                    setFontSizeText(String(c));
                    activateTool("text");
                    if (c !== textFontSize) onTextFontSizeChange(c);
                  }}
                  onBlur={() => {
                    if (fontSizeText === "" || Number.isNaN(parseInt(fontSizeText, 10))) {
                      setFontSizeText(String(textFontSize));
                    }
                  }}
                  className={`${inputCls} mt-0.5`}
                />
              </label>
              <label className="flex-1">
                <span className="text-[10px] text-toolbar-foreground">Fuente</span>
                <select
                  value={textFontFamily}
                   onChange={(e) => {
                     activateTool("text");
                     onTextFontFamilyChange(e.target.value);
                   }}
                  className={`${inputCls} mt-0.5`}
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Impact">Impact</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                </select>
              </label>
            </div>
             <div className="flex items-center gap-1">
                <PopBtn active={textBold} onClick={() => {
                  activateTool("text");
                  onTextBoldChange(!textBold);
                }} label="Negrita" className="!flex-none !w-10">
                 <Bold size={14} />
               </PopBtn>
                <PopBtn active={textItalic} onClick={() => {
                  activateTool("text");
                  onTextItalicChange(!textItalic);
                }} label="Cursiva" className="!flex-none !w-10">
                 <Italic size={14} />
               </PopBtn>
               <button
                 type="button"
                 aria-label="Colocar texto"
                 title="Colocar texto"
                 onClick={() => {
                   activateTool("text");
                   setTextOpen(false);
                 }}
                className="flex items-center justify-center gap-1 flex-1 h-8 px-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
               >
                 <Plus size={14} />
                 <span>Colocar</span>
               </button>
               <button
                 type="button"
                 aria-label="Salir del modo texto"
                 title="Salir"
                 onClick={() => {
                   onToolChange("place");
                   setTextOpen(false);
                 }}
                className="flex items-center justify-center gap-1 flex-1 h-8 px-2 rounded-md bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover transition-colors text-xs font-medium border border-toolbar-border"
               >
                 <LogOut size={14} />
                 <span>Salir</span>
               </button>
             </div>
            {textOverlays && textOverlays.length > 0 && (
              <div className="pt-1 border-t border-toolbar-border">
                <p className="text-[10px] text-toolbar-foreground mb-1">Textos ({textOverlays.length})</p>
                <div className="space-y-0.5 max-h-32 overflow-y-auto toolbar-scroll">
                  {textOverlays.map((t) => (
                    <div key={t.id} className="flex items-center gap-1 text-[10px] text-toolbar-foreground bg-toolbar-section rounded-md px-2 py-1">
                      <Type size={9} className="opacity-40 shrink-0" />
                      <span className="flex-1 truncate">{t.text}</span>
                      <button
                        type="button"
                        aria-label="Eliminar texto"
                        onClick={() => onRemoveTextOverlay(t.id)}
                        className="text-destructive hover:text-destructive/80 p-0.5 rounded"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <BottomTool active={tool === "pipette"} onClick={guarded("pipette")} label="Pipeta">
          <Pipette size={18} />
        </BottomTool>

        <BottomTool danger onClick={onClear} label="Eliminar todo">
          <Trash2 size={18} />
        </BottomTool>

        {gridSettingsSlot}

      </nav>
    </TooltipProvider>
  );
}
