import { ReactNode, useState } from "react";
import {
  Undo2, Redo2, Eraser, Move, Type,
  Shapes, Pipette, Paintbrush, ArrowRightLeft, ArrowUpDown,
  MousePointer2, Bold, Italic, X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  // Shape props
  shapeType: ShapeType;
  onShapeTypeChange: (s: ShapeType) => void;
  shapeFillMode: ShapeFillMode;
  onShapeFillModeChange: (m: ShapeFillMode) => void;
  // Text props
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
  // Reference image
  hasImage: boolean;
  imageVisible: boolean;
  imageOpacity: number;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  onImageVisibleChange: (v: boolean) => void;
  onImageOpacityChange: (v: number) => void;
  onImageEditModeChange: (v: boolean) => void;
  onRequestRemoveImage: () => void;
  pipettePrefilledColor?: string | null;
  onPipettePrefilledClear?: () => void;
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
  active, disabled, onClick, label, children, className,
}: { active?: boolean; disabled?: boolean; onClick: () => void; label: string; children: ReactNode; className?: string }) {
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
      } ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

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
  pipettePrefilledColor, onPipettePrefilledClear,
}: MobileToolbarProps) {
  const [paintOpen, setPaintOpen] = useState(false);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [refImageOpen, setRefImageOpen] = useState(false);

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
    if (open) activateTool("text");
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
    <>
      {/* Top compact bar */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center gap-1.5 px-2 h-12 bg-toolbar border-b border-toolbar-border toolbar-shadow">
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
        />

        <ColorPickerButton
          selectedColor={selectedColor}
          colors={colors}
          onColorChange={(hex) => { ensureImageFixed(); onColorChange(hex); onToolChange("place"); }}
          onAddColor={onAddColor}
          onReplaceColor={onReplaceColor}
          onRemoveColor={onRemoveColor}
          swatchSize={28}
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
      <div aria-hidden className="h-12 shrink-0" />

      {/* Bottom tools bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-stretch gap-0.5 px-1.5 pt-1 pb-[max(env(safe-area-inset-bottom),6px)] bg-toolbar border-t border-toolbar-border toolbar-shadow">
        {/* Pintar */}
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
            <button
              type="button"
              aria-label="Formas"
              title="Formas"
              className={`flex items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-colors ${
                tool === "shape"
                  ? "bg-primary text-primary-foreground"
                  : "text-toolbar-foreground hover:bg-toolbar-hover"
              }`}
            >
              <Shapes size={18} />
            </button>
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
            <p className="text-[9px] text-toolbar-foreground/70 flex items-center gap-1">
              <MousePointer2 size={9} /> Arrastra en la grilla para dibujar
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
            <input
              type="text"
              value={pixelText}
               onChange={(e) => {
                 activateTool("text");
                 onPixelTextChange(e.target.value);
               }}
              placeholder="Escribe tu texto…"
              className={inputCls}
            />
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[10px] text-toolbar-foreground">Tamaño</span>
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={textFontSize}
                   onChange={(e) => {
                     activateTool("text");
                     onTextFontSizeChange(parseInt(e.target.value) || 16);
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
            <div className="flex gap-1">
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
            </div>
            <p className="text-[9px] text-toolbar-foreground/70 flex items-center gap-1">
              <MousePointer2 size={9} /> Clic en la grilla para colocar
            </p>
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

      </nav>
    </>
  );
}
