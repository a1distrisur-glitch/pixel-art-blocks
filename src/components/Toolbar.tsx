import { BrickColor, BrickSize, BrickOrientation, EditorTool, TextOverlay, ShapeType, ShapeFillMode } from "@/hooks/useBrickEditor";
import { SHAPE_LIST } from "@/lib/shapeRasterizer";
import {
  Eraser, MousePointer2, Trash2, Image, Eye, EyeOff,
  FilePlus2, Download, Move, ArrowRightLeft, ArrowUpDown, Save,
  FolderOpen, Plus, X, List, Undo2, Redo2, Layers, Grid3X3, Palette,
  ImageIcon, Wrench, FileDown, Type, Bold, Italic, ChevronDown, Sparkles,
  GripVertical, Paintbrush, SquareDashedBottom, Pipette, Shapes,
  Square, Circle, Triangle, Diamond, Pentagon, Hexagon, Star, Heart,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Minus, SlidersHorizontal, Crosshair, Scaling,
  Blocks, Instagram,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReferenceImageControls from "@/components/ReferenceImageControls";

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
  hasBricks: boolean;
  onNewProject: () => void;
  onExport: (includeRefImage?: boolean) => void;
  onExportPieceList: (nameOverride?: string) => void;
  onSaveProject: (nameOverride?: string) => void;
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
  cursorTrackerVisible: boolean;
  onCursorTrackerVisibleChange: (v: boolean) => void;
  pipettePrefilledColor: string | null;
  onPipettePrefilledClear: () => void;
  shapeType: ShapeType;
  onShapeTypeChange: (s: ShapeType) => void;
  shapeFillMode: ShapeFillMode;
  onShapeFillModeChange: (m: ShapeFillMode) => void;
  projectStarted: boolean;
  onProjectStart: (name: string) => void;
  projectName: string;
  onOpenWelcome: () => void;
  onRequestLoadProject?: () => void;
  onRequestClear?: () => void;
  onRequestSaveProject?: () => void;
  onRequestExportPieces?: () => void;
  onRequestRemoveImage?: () => void;
}

/* ────── Reusable sub-components ────── */

function CollapsibleSection({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
  badge,
  titleClassName = "text-[13px]",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  titleClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-toolbar-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 ${titleClassName} font-semibold uppercase tracking-wider text-toolbar-foreground hover:bg-toolbar-section/50 transition-colors`}
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

/* ────── Shape Icon ────── */
function ShapeIcon({ type, size = 14 }: { type: ShapeType; size?: number }) {
  switch (type) {
    case "line": return <Minus size={size} />;
    case "rectangle": return <Square size={size} />;
    case "roundedRect": return <Square size={size} className="rounded-sm" />;
    case "ellipse": return <Circle size={size} />;
    case "triangle": return <Triangle size={size} />;
    case "rightTriangle": return <Triangle size={size} style={{ transform: "rotate(90deg)" }} />;
    case "diamond": return <Diamond size={size} />;
    case "pentagon": return <Pentagon size={size} />;
    case "hexagon": return <Hexagon size={size} />;
    case "arrowRight": return <ArrowRight size={size} />;
    case "arrowLeft": return <ArrowLeft size={size} />;
    case "arrowUp": return <ArrowUp size={size} />;
    case "arrowDown": return <ArrowDown size={size} />;
    case "star5": return <Star size={size} />;
    case "star6": return <Star size={size} className="rotate-[30deg]" />;
    case "heart": return <Heart size={size} />;
    default: return <Square size={size} />;
  }
}

/* ────── Main Toolbar ────── */

export default function Toolbar({
  selectedColor, onColorChange, selectedSize, onSizeChange,
  orientation, onOrientationChange, tool, onToolChange,
  gridWidth, gridHeight, onGridSizeChange, onClear,
  onImageUpload, hasImage, onRemoveImage,
  imageOpacity, onImageOpacityChange, imageVisible, onImageVisibleChange,
  hasBricks, onNewProject,
  onExport, onExportPieceList, onSaveProject, onLoadProject,
  imageEditMode, onImageEditModeChange,
  colors = [], onAddColor, onReplaceColor, onRemoveColor,
  onUndo, onRedo, canUndo, canRedo,
  gridVisible, onGridVisibleChange,
  cursorTrackerVisible, onCursorTrackerVisibleChange,
  pipettePrefilledColor, onPipettePrefilledClear,
  pixelText, onPixelTextChange,
  textFontSize, onTextFontSizeChange,
  textFontFamily, onTextFontFamilyChange,
  textBold, onTextBoldChange,
  textItalic, onTextItalicChange,
  textOverlays, onRemoveTextOverlay,
  shapeType, onShapeTypeChange,
  shapeFillMode, onShapeFillModeChange,
  projectStarted, onProjectStart, projectName, onOpenWelcome,
  onRequestLoadProject, onRequestClear, onRequestSaveProject, onRequestExportPieces, onRequestRemoveImage,
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const colorMapRef = useRef<HTMLDivElement>(null);
  
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showConfirmNewDialog, setShowConfirmNewDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  // Auto-fix image when any other tool/control is selected while in image edit mode.
  const runOrFix = useCallback((fn: () => void) => {
    if (imageEditMode) onImageEditModeChange(false);
    fn();
  }, [imageEditMode, onImageEditModeChange]);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  // Removal of reference image is handled by the global dialog in BrickEditor (via onRequestRemove)
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showExportPngDialog, setShowExportPngDialog] = useState(false);
  const [showPiecesDialog, setShowPiecesDialog] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showProjectNamePrompt, setShowProjectNamePrompt] = useState(false);
  const [projectNamePromptAction, setProjectNamePromptAction] = useState<"save" | "pieces" | "png" | null>(null);
  const [pendingAfterPromptAction, setPendingAfterPromptAction] = useState<(() => void) | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [gridWidthInput, setGridWidthInput] = useState(String(gridWidth));
  const [gridHeightInput, setGridHeightInput] = useState(String(gridHeight));
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

  // Removed auto-show welcome/grid/name dialogs on new project.
  // The welcome dialog is now only opened from the logo button.

  // Ensure the project has a name before running save/export-pieces.
  const ensureProjectName = useCallback((action: "save" | "pieces" | "png", afterAction?: () => void) => {
    if (projectName && projectName.trim()) {
      if (action === "save") onSaveProject();
      else if (action === "pieces") onExportPieceList();
      if (afterAction) afterAction();
      return;
    }
    setNameInput("");
    setProjectNamePromptAction(action);
    setPendingAfterPromptAction(() => afterAction ?? null);
    setShowProjectNamePrompt(true);
  }, [projectName, onSaveProject, onExportPieceList]);

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
      <div className="bg-toolbar toolbar-shadow flex flex-col w-[250px] shrink-0 animate-slide-in select-none h-screen min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-toolbar-border">
          <button
            type="button"
            onClick={onOpenWelcome}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src="/icon-192.png"
              alt="PixCool Art logo"
              className="w-7 h-7 rounded-lg shadow-sm shadow-primary/30 object-cover"
            />
            <span className="text-sm font-bold text-toolbar-foreground tracking-tight leading-none">PixCool Art</span>
          </button>
          <div className="ml-auto flex gap-1">
            <IconBtn onClick={onUndo} disabled={!canUndo} tooltip="Deshacer (Ctrl+Z)">
              <Undo2 size={22} />
            </IconBtn>
            <IconBtn onClick={onRedo} disabled={!canRedo} tooltip="Rehacer (Ctrl+Y)">
              <Redo2 size={22} />
            </IconBtn>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden toolbar-scroll">
          {/* Tools (no title) */}
          <section className="border-b border-toolbar-border px-4 pt-3 pb-2 space-y-1.5">
            <div className="flex gap-1 flex-nowrap">
              <ToolBtn active={tool === "shape"} onClick={() => runOrFix(() => onToolChange("shape"))} tooltip="Dibujar formas" disabled={false} className="flex-1 justify-center !px-1.5">
                <Shapes size={14} />
              </ToolBtn>
              <ToolBtn active={tool === "text"} onClick={() => runOrFix(() => onToolChange("text"))} tooltip="Agregar texto libre" disabled={false} className="flex-1 justify-center !px-1.5">
                <Type size={14} />
              </ToolBtn>
              <ToolBtn active={tool === "pipette"} onClick={() => runOrFix(() => onToolChange("pipette"))} tooltip="Capturar color de la imagen de referencia" disabled={false} className="flex-1 justify-center !px-1.5">
                <Pipette size={14} />
              </ToolBtn>
              <ToolBtn active={tool === "move"} onClick={() => runOrFix(() => onToolChange("move"))} tooltip="Seleccionar y mover bloques" disabled={false} className="flex-1 justify-center !px-1.5">
                <Move size={14} />
              </ToolBtn>
              <ToolBtn active={tool === "erase"} danger onClick={() => runOrFix(() => onToolChange("erase"))} tooltip="Borrar bloques" disabled={false} className="flex-1 justify-center !px-1.5">
                <Eraser size={14} />
              </ToolBtn>
            </div>

            {/* Orientation + Brick size row */}
            <div className="flex gap-1">
              <ToolBtn
                active={orientation === "horizontal"}
                onClick={() => onOrientationChange("horizontal")}
                tooltip="Orientación horizontal"
                disabled={selectedSize === 1}
                className="!text-[11px] !px-2 !py-1 flex-1 justify-center"
              >
                <ArrowRightLeft size={12} />
              </ToolBtn>
              <ToolBtn
                active={orientation === "vertical"}
                onClick={() => onOrientationChange("vertical")}
                tooltip="Orientación vertical"
                disabled={selectedSize === 1}
                className="!text-[11px] !px-2 !py-1 flex-1 justify-center"
              >
                <ArrowUpDown size={12} />
              </ToolBtn>
              {([3, 2, 1] as BrickSize[]).map((size) => (
                <ToolBtn key={size} active={selectedSize === size && tool === "place"} onClick={() => runOrFix(() => { onSizeChange(size); onToolChange("place"); })}
                  tooltip={`Bloque 1×${size}`}
                  className="!text-[11px] !px-2 !py-1 flex-1 justify-center">
                  1×{size}
                </ToolBtn>
              ))}
            </div>

            {/* Shape options */}
            {tool === "shape" && (
              <div className="mt-2 space-y-2 p-2.5 rounded-lg bg-toolbar-section/60 border border-toolbar-border/50">
                <div>
                  <p className="text-[10px] text-toolbar-foreground mb-1">Forma</p>
                  <div className="grid grid-cols-4 gap-1">
                    {SHAPE_LIST.map((s) => (
                      <Tooltip key={s.type}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onShapeTypeChange(s.type)}
                            className={`flex items-center justify-center w-full h-7 rounded-md text-xs transition-all ${
                              shapeType === s.type
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover"
                            }`}
                          >
                            <ShapeIcon type={s.type} size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{s.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-toolbar-foreground mb-1">Relleno</p>
                  <div className="flex gap-1">
                    <ToolBtn active={shapeFillMode === "outline"} onClick={() => onShapeFillModeChange("outline")}>
                      Contorno
                    </ToolBtn>
                    <ToolBtn active={shapeFillMode === "fill"} onClick={() => onShapeFillModeChange("fill")}>
                      Relleno
                    </ToolBtn>
                  </div>
                </div>
                <p className="text-[9px] text-toolbar-foreground/70 flex items-center gap-1">
                  <MousePointer2 size={9} /> Arrastra en la grilla para dibujar
                </p>
              </div>
            )}

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

          </section>


          {/* Colors */}
          <section className="border-b border-toolbar-border px-4 py-3 space-y-2">
            <div className="grid grid-cols-7 gap-1.5">
              {colors.map((c, i) => (
                <Tooltip key={`${c.value}-${i}`}>
                  <TooltipTrigger asChild>
                    <button
                      title={c.name}
                      onClick={() => runOrFix(() => { onColorChange(c.value); onToolChange("place"); })}
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
          </section>

          {/* Reference Image — its own section (below Colors) */}
          <section className="border-b border-toolbar-border last:border-b-0 px-4 py-3">
            <ReferenceImageControls
              hasImage={hasImage}
              imageVisible={imageVisible}
              imageOpacity={imageOpacity}
              imageEditMode={imageEditMode}
              onImageUpload={onImageUpload}
              onRemoveImage={onRemoveImage}
              onImageVisibleChange={onImageVisibleChange}
              onImageOpacityChange={onImageOpacityChange}
              onImageEditModeChange={onImageEditModeChange}
              variant="lateral"
              onRequestRemove={() => onRequestRemoveImage?.()}
            />
          </section>

          {/* Grid Size — single line, no title */}
          <section className="border-b border-toolbar-border px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-toolbar-foreground">H</span>
                <input type="number" min={4} max={64} value={gridWidth}
                  onChange={(e) => onGridSizeChange(parseInt(e.target.value) || 4, gridHeight)}
                  className={`${inputClass} !w-[42px] !px-1`} />
              </label>
              <span className="text-toolbar-foreground text-[10px]">×</span>
              <label className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-toolbar-foreground">V</span>
                <input type="number" min={4} max={64} value={gridHeight}
                  onChange={(e) => onGridSizeChange(gridWidth, parseInt(e.target.value) || 4)}
                  className={`${inputClass} !w-[42px] !px-1`} />
              </label>
              <ToolBtn
                active={gridVisible}
                onClick={() => onGridVisibleChange(!gridVisible)}
                tooltip={gridVisible ? "Ocultar cuadrícula" : "Mostrar cuadrícula"}
                className="ml-auto !px-1.5"
              >
                {gridVisible ? <Eye size={13} /> : <EyeOff size={13} />}
              </ToolBtn>
              <ToolBtn
                active={cursorTrackerVisible}
                onClick={() => onCursorTrackerVisibleChange(!cursorTrackerVisible)}
                tooltip={cursorTrackerVisible ? "Ocultar posición del cursor" : "Mostrar posición del cursor"}
                className="!px-1.5"
              >
                <Crosshair size={13} />
              </ToolBtn>
            </div>
          </section>

        </div>

        {/* Bottom actions — compact icon grid */}
        <div className="px-3 py-2.5 border-t border-toolbar-border">
          <div className="grid grid-cols-4 gap-1.5">
            <ActionBtn onClick={onRequestLoadProject ?? (() => { if (hasBricks || hasImage) setShowLoadDialog(true); else onLoadProject(); })} tooltip="Cargar proyecto">
              <FolderOpen size={14} />
            </ActionBtn>
            <ActionBtn variant="danger" onClick={onRequestClear ?? (() => setShowClearDialog(true))} tooltip="Eliminar todo">
              <Trash2 size={14} />
            </ActionBtn>
            <ActionBtn
              onClick={onRequestSaveProject ?? (() => { if (hasBricks || hasImage) setShowNewDialog(true); else onNewProject(); })}
              tooltip="Guardar proyecto"
            >
              <FilePlus2 size={14} />
            </ActionBtn>
            <ActionBtn variant="primary" onClick={onRequestExportPieces ?? (() => setShowPiecesDialog(true))} disabled={!hasBricks} tooltip="Exportar piezas">
              <Download size={14} />
            </ActionBtn>
          </div>
        </div>

        {/* New project dialog */}
        {showNewDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-6 text-center">Guardar Proyecto</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => setShowNewDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { setShowNewDialog(false); ensureProjectName("save"); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground transition-colors"
                  style={{ backgroundColor: 'hsl(217 91% 55%)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'hsl(217 91% 45%)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'hsl(217 91% 55%)')}>
                  Guardar
                </button>
                <button onClick={() => { setShowNewDialog(false); setShowConfirmNewDialog(true); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  Nuevo
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmNewDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-4 text-center">¿Desea Perder Los Cambios?</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => setShowConfirmNewDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { setShowConfirmNewDialog(false); onNewProject(); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  Sí, Nuevo
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Load project dialog */}
        {showLoadDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-2">¿Cargar proyecto?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Se perderán todos los bloques y la imagen de referencia actual.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowLoadDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { setShowLoadDialog(false); ensureProjectName("save", onLoadProject); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Guardar
                </button>
                <button onClick={() => { setShowLoadDialog(false); onLoadProject(); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  Cargar sin guardar
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Remove-image dialog moved to ProjectActionDialogs (single source of truth) */}

        {showPiecesDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-2">Exportar piezas</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Elige cómo deseas exportar la lista de piezas.
              </p>
              <div className="flex gap-2 justify-end flex-wrap">
                <button onClick={() => setShowPiecesDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { setShowPiecesDialog(false); ensureProjectName("pieces"); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors">
                  Piezas
                </button>
                <button onClick={() => { setShowPiecesDialog(false); ensureProjectName("png", () => { if (hasImage) setShowExportPngDialog(true); else onExport(false); }); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Imagen PNG
                </button>
              </div>
            </div>
          </div>
        )}

        {showExportPngDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-2">Exportar como PNG</h3>
              <p className="text-sm text-muted-foreground mb-5">
                ¿Desea agregar la imagen de referencia al PNG exportado?
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowExportPngDialog(false); onExport(true); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  Agregar
                </button>
                <button onClick={() => { setShowExportPngDialog(false); onExport(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  No Agregar
                </button>
              </div>
            </div>
          </div>
        )}

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


        {/* Project name prompt — shown when Saving/Exporting Pieces without a name */}
        {showProjectNamePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
            <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border">
              <h3 className="text-base font-semibold text-foreground mb-2">Nombre del proyecto</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Asigna un nombre a tu proyecto antes de continuar.
              </p>
              <input
                id="project-name-prompt-input"
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmed = nameInput.trim();
                    if (!trimmed) {
                      document.getElementById("project-name-prompt-input")?.focus();
                      return;
                    }
                    const action = projectNamePromptAction;
                    const after = pendingAfterPromptAction;
                    onProjectStart(trimmed);
                    setShowProjectNamePrompt(false);
                    setProjectNamePromptAction(null);
                    setPendingAfterPromptAction(null);
                    if (action === "save") onSaveProject(trimmed);
                    else if (action === "pieces") onExportPieceList(trimmed);
                    if (after) after();
                  }
                }}
                placeholder="Mi proyecto"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowProjectNamePrompt(false); setProjectNamePromptAction(null); setPendingAfterPromptAction(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const trimmed = nameInput.trim();
                    if (!trimmed) {
                      document.getElementById("project-name-prompt-input")?.focus();
                      return;
                    }
                    const action = projectNamePromptAction;
                    const after = pendingAfterPromptAction;
                    onProjectStart(trimmed);
                    setShowProjectNamePrompt(false);
                    setProjectNamePromptAction(null);
                    setPendingAfterPromptAction(null);
                    if (action === "save") onSaveProject(trimmed);
                    else if (action === "pieces") onExportPieceList(trimmed);
                    if (after) after();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
