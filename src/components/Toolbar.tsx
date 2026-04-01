import { BrickColor, BrickSize, BrickOrientation, EditorTool, TextOverlay } from "@/hooks/useBrickEditor";
import {
  Eraser, MousePointer2, Trash2, Image, Eye, EyeOff, Lock, Unlock,
  FilePlus2, Download, Move, ArrowRightLeft, ArrowUpDown, Save,
  FolderOpen, Plus, X, List, Undo2, Redo2, Layers, Grid3X3, Palette,
  ImageIcon, Wrench, FileDown, Type, Bold, Italic, ChevronDown, Sparkles,
  GripVertical, Paintbrush, SquareDashedBottom, Pipette,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHex = (value: string): string | null => {
  let next = value.trim().toUpperCase();
  if (!next) return null;
  if (!next.startsWith("#")) next = `#${next}`;
  if (next.length === 4) {
    next = `#${next[1]}${next[1]}${next[2]}${next[2]}${next[3]}${next[3]}`;
  }
  return /^#[0-9A-F]{6}$/.test(next) ? next : null;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((ch) => clamp(Math.round(ch), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

const rgbToHsv = (r: number, g: number, b: number) => {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb), delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  const hh = ((h % 360) + 360) % 360, ss = clamp(s, 0, 100) / 100, vv = clamp(v, 0, 100) / 100;
  const c = vv * ss, x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m = vv - c;
  let rr = 0, gg = 0, bb = 0;
  if (hh < 60) [rr, gg, bb] = [c, x, 0];
  else if (hh < 120) [rr, gg, bb] = [x, c, 0];
  else if (hh < 180) [rr, gg, bb] = [0, c, x];
  else if (hh < 240) [rr, gg, bb] = [0, x, c];
  else if (hh < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  return { r: (rr + m) * 255, g: (gg + m) * 255, b: (bb + m) * 255 };
};

const hexToHsv = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, v: 100 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
};

const hsvToHex = (h: number, s: number, v: number) => {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
};

interface ToolbarProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  selectedSize: BrickSize;
  onSizeChange: (size: BrickSize) => void;
  orientation: BrickOrientation;
  onOrientationChange: (o: BrickOrientation) => void;
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
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
  gridWidth: number;
  gridHeight: number;
  onGridSizeChange: (w: number, h: number) => void;
  onClear: () => void;
  onImageUpload: (file: File) => void;
  hasImage: boolean;
  onRemoveImage: () => void;
  imageOpacity: number;
  onImageOpacityChange: (v: number) => void;
  imageVisible: boolean;
  onImageVisibleChange: (v: boolean) => void;
  imageLocked: boolean;
  onImageLockedChange: (v: boolean) => void;
  hasBricks: boolean;
  onNewProject: () => void;
  onExport: () => void;
  onExportPieceList: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  imageEditMode: boolean;
  onImageEditModeChange: (v: boolean) => void;
  colors: BrickColor[];
  onAddColor: (name: string, value: string) => void;
  onReplaceColor: (index: number, name: string, value: string) => void;
  onRemoveColor: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  gridVisible: boolean;
  onGridVisibleChange: (v: boolean) => void;
  pipettePrefilledColor: string | null;
  onPipettePrefilledClear: () => void;
}

/* ────── Reusable sub-components ────── */

function CollapsibleSection({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-toolbar-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-toolbar-foreground hover:bg-toolbar-section/50 transition-colors"
      >
        <Icon size={13} />
        <span className="flex-1 text-left">{title}</span>
        {badge}
        <ChevronDown
          size={12}
          className={`opacity-70 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </section>
  );
}

function ToolBtn({
  active, danger, children, tooltip, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; danger?: boolean; tooltip?: string }) {
  const btn = (
    <button
      {...props}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
        active
          ? danger
            ? "bg-destructive text-destructive-foreground shadow-sm"
            : "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover"
      } ${props.disabled ? "opacity-30 pointer-events-none" : ""} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function IconBtn({
  active, children, tooltip, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tooltip?: string }) {
  const btn = (
    <button
      {...props}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover hover:text-toolbar-foreground"
      } ${props.disabled ? "opacity-30 pointer-events-none" : ""} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function ActionBtn({
  children, variant = "default", tooltip, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "default" | "danger";
  tooltip?: string;
}) {
  const variantClass = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
    accent: "bg-accent text-accent-foreground hover:bg-accent/90",
    default: "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover",
    danger: "text-toolbar-foreground bg-destructive/20 hover:bg-destructive/30",
  }[variant];

  const btn = (
    <button
      {...props}
      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:pointer-events-none ${variantClass} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/* ────── Main Toolbar ────── */

export default function Toolbar({
  selectedColor, onColorChange, selectedSize, onSizeChange,
  orientation, onOrientationChange, tool, onToolChange,
  gridWidth, gridHeight, onGridSizeChange, onClear,
  onImageUpload, hasImage, onRemoveImage,
  imageOpacity, onImageOpacityChange, imageVisible, onImageVisibleChange,
  imageLocked, onImageLockedChange, hasBricks, onNewProject,
  onExport, onExportPieceList, onSaveProject, onLoadProject,
  imageEditMode, onImageEditModeChange,
  colors = [], onAddColor, onReplaceColor, onRemoveColor,
  onUndo, onRedo, canUndo, canRedo,
  gridVisible, onGridVisibleChange,
  pipettePrefilledColor, onPipettePrefilledClear,
  pixelText, onPixelTextChange,
  textFontSize, onTextFontSizeChange,
  textFontFamily, onTextFontFamilyChange,
  textBold, onTextBoldChange,
  textItalic, onTextItalicChange,
  textOverlays, onRemoveTextOverlay,
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const colorMapRef = useRef<HTMLDivElement>(null);
  
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showFixImageDialog, setShowFixImageDialog] = useState(false);
  const [pendingTool, setPendingTool] = useState<EditorTool | null>(null);
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [colorDialogMode, setColorDialogMode] = useState<"add" | "edit">("add");
  const [colorEditIndex, setColorEditIndex] = useState<number | null>(null);
  const [baseColorValue, setBaseColorValue] = useState("#DC2626");
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [value, setValue] = useState(100);
  const [hexInput, setHexInput] = useState("#FF0000");
  const [colorNameInput, setColorNameInput] = useState("");

  const activeHex = hsvToHex(hue, saturation, value);

  useEffect(() => { setHexInput(activeHex); }, [activeHex]);

  const openColorDialog = useCallback(
    (mode: "add" | "edit", initialColor: string, index?: number) => {
      const normalized = normalizeHex(initialColor) ?? "#FF0000";
      const nextHsv = hexToHsv(normalized);
      setColorDialogMode(mode);
      setColorEditIndex(index ?? null);
      setBaseColorValue(normalized);
      setHue(nextHsv.h);
      setSaturation(nextHsv.s);
      setValue(nextHsv.v);
      setHexInput(normalized);
      setColorNameInput(mode === "edit" && index !== undefined ? (colors[index]?.name ?? "") : "");
      setShowColorDialog(true);
    }, [colors],
  );

  // Auto-open add color dialog when pipette picks a color
  useEffect(() => {
    if (pipettePrefilledColor) {
      openColorDialog("add", pipettePrefilledColor);
      onPipettePrefilledClear();
    }
  }, [pipettePrefilledColor, onPipettePrefilledClear, openColorDialog]);

  const closeColorDialog = useCallback(() => {
    setShowColorDialog(false);
    setColorEditIndex(null);
  }, []);

  const updateFromMapPointer = useCallback((clientX: number, clientY: number) => {
    if (!colorMapRef.current) return;
    const rect = colorMapRef.current.getBoundingClientRect();
    setSaturation((clamp(clientX - rect.left, 0, rect.width) / rect.width) * 100);
    setValue((1 - clamp(clientY - rect.top, 0, rect.height) / rect.height) * 100);
  }, []);

  const applyColorSelection = useCallback(() => {
    const picked = normalizeHex(hexInput) ?? activeHex;
    const name = colorNameInput.trim() || picked;
    if (colorDialogMode === "add") {
      onAddColor(name, picked);
      onColorChange(picked);
      closeColorDialog();
      return;
    }
    if (colorEditIndex === null) return;
    onReplaceColor(colorEditIndex, name, picked);
    onColorChange(picked);
    closeColorDialog();
  }, [activeHex, closeColorDialog, colorDialogMode, colorEditIndex, colorNameInput, hexInput, onAddColor, onColorChange, onReplaceColor]);

  const inputClass = "w-full rounded-lg border border-toolbar-border bg-toolbar-section px-2.5 py-1.5 text-xs text-toolbar-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-toolbar toolbar-shadow flex flex-col w-[260px] shrink-0 animate-slide-in select-none h-screen min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-toolbar-border">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm shadow-primary/30">
            <Sparkles size={14} className="text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-toolbar-foreground tracking-tight leading-none">PixCool Art</span>
            <span className="text-[9px] text-toolbar-muted leading-tight mt-0.5">Editor de Pixel Art</span>
          </div>
          <div className="ml-auto flex gap-1">
            <IconBtn onClick={onUndo} disabled={!canUndo} tooltip="Deshacer (Ctrl+Z)" className="!w-14 !h-14">
              <Undo2 size={24} />
            </IconBtn>
            <IconBtn onClick={onRedo} disabled={!canRedo} tooltip="Rehacer (Ctrl+Y)" className="!w-14 !h-14">
              <Redo2 size={24} />
            </IconBtn>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden toolbar-scroll">
          {/* Tools */}
          <CollapsibleSection icon={Wrench} title="Herramienta">
            <div className="flex gap-1">
              <ToolBtn active={tool === "place"} onClick={() => { if (imageEditMode) { setPendingTool("place"); setShowFixImageDialog(true); } else onToolChange("place"); }} tooltip="Colocar bloques" disabled={false} className={imageEditMode ? "opacity-30" : ""}>
                <Paintbrush size={14} /> Colocar
              </ToolBtn>
              <ToolBtn active={tool === "erase"} danger onClick={() => { if (imageEditMode) { setPendingTool("erase"); setShowFixImageDialog(true); } else onToolChange("erase"); }} tooltip="Borrar bloques" disabled={false} className={imageEditMode ? "opacity-30" : ""}>
                <Eraser size={14} /> Borrar
              </ToolBtn>
              <ToolBtn active={tool === "move"} onClick={() => { if (imageEditMode) { setPendingTool("move"); setShowFixImageDialog(true); } else onToolChange("move"); }} tooltip="Seleccionar y mover bloques" disabled={false} className={imageEditMode ? "opacity-30" : ""}>
                <Move size={14} /> Mover
              </ToolBtn>
            </div>
            <div className="flex gap-1 mt-1">
              <ToolBtn active={tool === "text"} onClick={() => { if (imageEditMode) { setPendingTool("text"); setShowFixImageDialog(true); } else onToolChange("text"); }} tooltip="Agregar texto libre" disabled={false} className={imageEditMode ? "opacity-30" : ""}>
                <Type size={14} /> Texto
              </ToolBtn>
              <ToolBtn active={tool === "pipette"} onClick={() => { if (imageEditMode) { setPendingTool("pipette"); setShowFixImageDialog(true); } else onToolChange("pipette"); }} tooltip="Capturar color de la imagen de referencia" disabled={false} className={imageEditMode ? "opacity-30" : ""}>
                <Pipette size={14} /> Pipeta
              </ToolBtn>
            </div>

            {/* Text options */}
            {tool === "text" && (
              <div className="mt-2 space-y-2 p-2.5 rounded-lg bg-toolbar-section/60 border border-toolbar-border/50">
                <input
                  type="text"
                  value={pixelText}
                  onChange={(e) => onPixelTextChange(e.target.value)}
                  placeholder="Escribe tu texto…"
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[10px] text-toolbar-foreground">Tamaño</span>
                    <input type="number" min={8} max={120} value={textFontSize}
                      onChange={(e) => onTextFontSizeChange(parseInt(e.target.value) || 16)}
                      className={`${inputClass} mt-0.5`} />
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px] text-toolbar-foreground">Fuente</span>
                    <select value={textFontFamily}
                      onChange={(e) => onTextFontFamilyChange(e.target.value)}
                      className={`${inputClass} mt-0.5`}>
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
                  <IconBtn active={textBold} onClick={() => onTextBoldChange(!textBold)} tooltip="Negrita">
                    <Bold size={14} />
                  </IconBtn>
                  <IconBtn active={textItalic} onClick={() => onTextItalicChange(!textItalic)} tooltip="Cursiva">
                    <Italic size={14} />
                  </IconBtn>
                </div>
                <p className="text-[9px] text-toolbar-foreground/70 flex items-center gap-1">
                  <MousePointer2 size={9} /> Clic en la grilla para colocar
                </p>
              </div>
            )}

            {/* Text overlays list */}
            {textOverlays && textOverlays.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-toolbar-foreground mb-1">Textos ({textOverlays.length})</p>
                <div className="space-y-0.5 max-h-24 overflow-y-auto">
                  {textOverlays.map((t) => (
                    <div key={t.id} className="flex items-center gap-1 text-[10px] text-toolbar-foreground bg-toolbar-section rounded-md px-2 py-1">
                      <Type size={9} className="opacity-40 shrink-0" />
                      <span className="flex-1 truncate">{t.text}</span>
                      <button onClick={() => onRemoveTextOverlay(t.id)}
                        className="text-destructive hover:text-destructive/80 p-0.5 rounded">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Image — inside Herramienta */}
            <div className="mt-2 pt-2 border-t border-toolbar-border/50">
              <p className="text-[10px] text-toolbar-foreground font-medium mb-1.5 flex items-center gap-1">
                <ImageIcon size={11} /> Imagen de referencia
                {hasImage && <span className="w-2 h-2 rounded-full bg-accent animate-pulse ml-auto" />}
              </p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
              <div className="flex gap-1">
                <ToolBtn onClick={() => fileRef.current?.click()} tooltip={hasImage ? "Cambiar imagen" : "Cargar imagen"}>
                  <Image size={13} /> {hasImage ? "Cambiar" : "Cargar"}
                </ToolBtn>
                {hasImage && (
                  <ToolBtn active={imageEditMode} onClick={() => onImageEditModeChange(!imageEditMode)}
                    tooltip={imageEditMode ? "Fijar imagen" : "Mover/redimensionar imagen"}>
                    <Move size={13} /> {imageEditMode ? "Fijar" : "Mover"}
                  </ToolBtn>
                )}
              </div>
              {hasImage && (
                <>
                  <div className="flex gap-1 mt-1.5">
                    <IconBtn active={imageVisible} onClick={() => onImageVisibleChange(!imageVisible)}
                      tooltip={imageVisible ? "Ocultar imagen" : "Mostrar imagen"}>
                      {imageVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </IconBtn>
                    <IconBtn active={imageLocked} onClick={() => onImageLockedChange(!imageLocked)}
                      tooltip={imageLocked ? "Desbloquear posición" : "Fijar posición"}>
                      {imageLocked ? <Lock size={13} /> : <Unlock size={13} />}
                    </IconBtn>
                    <IconBtn onClick={onRemoveImage} className="!text-toolbar-foreground" tooltip="Quitar imagen">
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                  <div className="mt-2">
                    <label className="text-[10px] text-toolbar-foreground flex items-center justify-between">
                      Opacidad
                      <span className="text-toolbar-foreground font-medium">{Math.round(imageOpacity * 100)}%</span>
                    </label>
                    <input type="range" min={0.05} max={1} step={0.05}
                      value={imageOpacity}
                      onChange={(e) => onImageOpacityChange(parseFloat(e.target.value))}
                      className="opacity-slider w-full mt-1" />
                  </div>
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* Block Size */}
          <CollapsibleSection icon={Layers} title="Tamaño de bloque">
            <div className="flex gap-1">
              {([1, 2, 3] as BrickSize[]).map((size) => (
                <ToolBtn key={size} active={selectedSize === size} onClick={() => onSizeChange(size)}
                  tooltip={`Bloque 1×${size}`}>
                  <SquareDashedBottom size={13} /> 1×{size}
                </ToolBtn>
              ))}
            </div>
            {selectedSize > 1 && (
              <div className="flex gap-1 mt-1.5">
                <ToolBtn active={orientation === "horizontal"} onClick={() => onOrientationChange("horizontal")}
                  tooltip="Orientación horizontal">
                  <ArrowRightLeft size={12} /> Horizontal
                </ToolBtn>
                <ToolBtn active={orientation === "vertical"} onClick={() => onOrientationChange("vertical")}
                  tooltip="Orientación vertical">
                  <ArrowUpDown size={12} /> Vertical
                </ToolBtn>
              </div>
            )}
          </CollapsibleSection>

          {/* Colors */}
          <CollapsibleSection
            icon={Palette}
            title="Paleta"
            badge={
              <span className="text-[9px] bg-toolbar-section text-toolbar-foreground px-1.5 py-0.5 rounded-full">
                {colors.length}
              </span>
            }
          >
            <div className="grid grid-cols-7 gap-1.5">
              {colors.map((c, i) => (
                <Tooltip key={`${c.value}-${i}`}>
                  <TooltipTrigger asChild>
                    <button
                      title={c.name}
                      onClick={() => onColorChange(c.value)}
                      onContextMenu={(e) => { e.preventDefault(); openColorDialog("edit", c.value, i); }}
                      className={`w-[28px] h-[28px] rounded-lg transition-all duration-150 ${
                        selectedColor === c.value
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-toolbar scale-110"
                          : "hover:scale-110 hover:ring-1 hover:ring-toolbar-muted/40"
                      }`}
                      style={{
                        backgroundColor: c.value,
                        boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.2)",
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{c.name}</TooltipContent>
                </Tooltip>
              ))}
              {/* Add color button inline */}
              <button
                onClick={() => openColorDialog("add", selectedColor || "#DC2626")}
                className="w-[28px] h-[28px] rounded-lg border-2 border-dashed border-toolbar-foreground/40 flex items-center justify-center text-toolbar-foreground/70 hover:border-primary/50 hover:text-primary transition-colors"
              >
               <Plus size={12} />
              </button>
            </div>
            <p className="text-[9px] text-toolbar-foreground/60 mt-1">Clic derecho para editar color</p>
          </CollapsibleSection>

          {/* Grid Size */}
          <CollapsibleSection icon={Grid3X3} title="Cuadrícula" defaultOpen={false}>
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={gridVisible} onChange={(e) => onGridVisibleChange(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[hsl(var(--primary))] cursor-pointer rounded" />
                <span className="text-[10px] text-toolbar-foreground">{gridVisible ? "Visible" : "Oculta"}</span>
              </label>
            </div>
            <div className="flex gap-2 items-end">
              <label className="flex-1">
                <span className="text-[10px] text-toolbar-foreground">Ancho</span>
                <input type="number" min={4} max={64} value={gridWidth}
                  onChange={(e) => onGridSizeChange(parseInt(e.target.value) || 4, gridHeight)}
                  className={inputClass} />
              </label>
              <span className="text-toolbar-foreground text-xs pb-1.5">×</span>
              <label className="flex-1">
                <span className="text-[10px] text-toolbar-foreground">Alto</span>
                <input type="number" min={4} max={64} value={gridHeight}
                  onChange={(e) => onGridSizeChange(gridWidth, parseInt(e.target.value) || 4)}
                  className={inputClass} />
              </label>
            </div>
          </CollapsibleSection>

        </div>

        {/* Bottom actions — compact icon grid */}
        <div className="px-3 py-2.5 border-t border-toolbar-border">
          <div className="grid grid-cols-3 gap-1.5">
            <ActionBtn variant="primary" onClick={onExport} disabled={!hasBricks} tooltip="Exportar como PNG">
              <Download size={14} /> PNG
            </ActionBtn>
            <ActionBtn variant="primary" onClick={onExportPieceList} disabled={!hasBricks} tooltip="Lista de piezas"
              className="!bg-primary/80 hover:!bg-primary/70">
              <List size={14} /> Piezas
            </ActionBtn>
            <ActionBtn onClick={onSaveProject} disabled={!hasBricks} tooltip="Guardar proyecto">
              <Save size={14} /> Guardar
            </ActionBtn>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            <ActionBtn onClick={onLoadProject} tooltip="Cargar proyecto">
              <FolderOpen size={14} /> Cargar
            </ActionBtn>
            <ActionBtn variant="danger" onClick={() => setShowClearDialog(true)} tooltip="Limpiar todo">
              <Trash2 size={13} />
            </ActionBtn>
            <ActionBtn
              onClick={() => { if (hasBricks) setShowNewDialog(true); else onNewProject(); }}
              tooltip="Nuevo proyecto"
            >
              <FilePlus2 size={14} /> Nuevo
            </ActionBtn>
          </div>
        </div>

        {/* New project dialog */}
        {showNewDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-2">¿Nuevo proyecto?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Se perderán todos los bloques y la imagen de referencia actual.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { setShowNewDialog(false); onNewProject(); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  Nuevo proyecto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear all dialog */}
        {showClearDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-2">¿Limpiar todo?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Se eliminarán todos los bloques colocados en el lienzo.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowClearDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { setShowClearDialog(false); onClear(); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Color picker dialog */}
        {showColorDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {colorDialogMode === "add" ? "Agregar color" : "Editar color"}
                </h3>
                <button onClick={closeColorDialog}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-[1fr_100px] gap-4">
                <div>
                  {/* SV Map */}
                  <div ref={colorMapRef}
                    className="relative h-48 w-full rounded-lg border border-input cursor-crosshair touch-none overflow-hidden"
                    style={{ backgroundColor: `hsl(${hue} 100% 50%)` }}
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); updateFromMapPointer(e.clientX, e.clientY); }}
                    onPointerMove={(e) => { if (e.buttons !== 1) return; updateFromMapPointer(e.clientX, e.clientY); }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                    <div className="absolute h-4 w-4 rounded-full border-2 border-white shadow-lg"
                      style={{ left: `${saturation}%`, top: `${100 - value}%`, transform: "translate(-50%, -50%)", backgroundColor: activeHex }} />
                  </div>
                  {/* Hue slider */}
                  <div className="mt-3">
                    <input type="range" min={0} max={360} value={hue}
                      onChange={(e) => setHue(Number(e.target.value))}
                      className="hue-slider w-full" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Actual</p>
                    <div className="h-10 rounded-lg border border-input" style={{ backgroundColor: baseColorValue }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Nuevo</p>
                    <div className="h-10 rounded-lg border border-input" style={{ backgroundColor: activeHex }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Nombre</label>
                    <input type="text" value={colorNameInput}
                      onChange={(e) => setColorNameInput(e.target.value)}
                      placeholder="Ej: Rojo Fuego"
                      autoFocus
                      ref={(el) => { if (el && showColorDialog) setTimeout(() => el.focus(), 50); }}
                      className="mt-1 w-full rounded-lg border-2 border-ring bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">HEX</label>
                    <input type="text" value={hexInput}
                      onChange={(e) => {
                        const raw = e.target.value.toUpperCase();
                        setHexInput(raw);
                        const parsed = normalizeHex(raw);
                        if (!parsed) return;
                        const nextHsv = hexToHsv(parsed);
                        setHue(nextHsv.h); setSaturation(nextHsv.s); setValue(nextHsv.v);
                      }}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                {colorDialogMode === "edit" && colorEditIndex !== null ? (
                  <button onClick={() => { onRemoveColor(colorEditIndex); closeColorDialog(); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    Eliminar
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button onClick={closeColorDialog}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                    Cancelar
                  </button>
                  <button onClick={applyColorSelection}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fix Image Dialog */}
        {showFixImageDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in-0">
            <div className="bg-background rounded-2xl shadow-2xl border border-border p-6 w-[320px] space-y-4 animate-in zoom-in-95">
              <h3 className="text-sm font-semibold text-foreground text-center">¿Desea fijar la imagen?</h3>
              <div className="flex gap-2 justify-center">
                <button onClick={() => { setShowFixImageDialog(false); setPendingTool(null); }}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  No
                </button>
                <button onClick={() => {
                  onImageEditModeChange(false);
                  if (pendingTool) onToolChange(pendingTool);
                  setShowFixImageDialog(false);
                  setPendingTool(null);
                }}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                  Sí
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
