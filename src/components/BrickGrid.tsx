import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { PlacedBrick, BrickSize, BrickOrientation, ImageTransform, EditorTool, TextOverlay, ShapeOverlay, ShapeType, ShapeFillMode } from "@/hooks/useBrickEditor";
import ReferenceImageOverlay from "@/components/ReferenceImageOverlay";
import TextOverlayLayer from "@/components/TextOverlayLayer";
import ShapeOverlayLayer from "@/components/ShapeOverlayLayer";
import BackgroundColorDialog from "@/components/BackgroundColorDialog";
import { rasterizeShape, renderShapeSVGPath } from "@/lib/shapeRasterizer";
import { ArrowRightLeft, ArrowUpDown, Check, Eraser, Move } from "lucide-react";

interface BrickGridProps {
  width: number;
  height: number;
  bricks: PlacedBrick[];
  selectedColor: string;
  selectedSize: BrickSize;
  orientation: BrickOrientation;
  onSizeChange: (size: BrickSize) => void;
  onOrientationChange: (o: BrickOrientation) => void;
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  gridVisible: boolean;
  cursorTrackerVisible: boolean;
  referenceImage: string | null;
  extraImages?: { src: string; transform: ImageTransform }[];
  imageEditMode: boolean;
  imageOpacity: number;
  imageVisible: boolean;
  imageLocked: boolean;
  imageTransform: ImageTransform;
  onImageTransformChange: (t: ImageTransform) => void;
  onCellClick: (row: number, col: number) => void;
  canPlace: (row: number, col: number, size: BrickSize, dir: BrickOrientation) => boolean;
  getCellOccupant: (row: number, col: number) => PlacedBrick | undefined;
  textOverlays: TextOverlay[];
  onUpdateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  onRemoveTextOverlay: (id: string) => void;
  onMoveBricks: (brickIds: string[], deltaRow: number, deltaCol: number) => void;
  onPipetteColor: (hex: string) => void;
  shapeType: ShapeType;
  shapeFillMode: ShapeFillMode;
  onAddShapeOverlay: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
  shapeOverlays: ShapeOverlay[];
  onUpdateShapeOverlay: (id: string, updates: Partial<ShapeOverlay>) => void;
  onRemoveShapeOverlay: (id: string) => void;
  onUndo?: () => void;
}

const CELL_SIZE = 28;
const RULER_SIZE = 20;
const STUD_RATIO = 0.38;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

export default function BrickGrid({
  width, height, bricks, selectedColor, selectedSize, orientation, onSizeChange, onOrientationChange, tool, onToolChange, gridVisible, cursorTrackerVisible,
  referenceImage, extraImages = [], imageEditMode, imageOpacity, imageVisible, imageLocked,
  imageTransform, onImageTransformChange, onCellClick, canPlace, getCellOccupant,
  textOverlays, onUpdateTextOverlay, onRemoveTextOverlay, onMoveBricks, onPipetteColor,
  shapeType, shapeFillMode, onAddShapeOverlay, shapeOverlays, onUpdateShapeOverlay, onRemoveShapeOverlay,
  onUndo,
}: BrickGridProps) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Draggable zoom bar state — default top-left
  const [zoomBarPos, setZoomBarPos] = useState<{ x: number; y: number }>({ x: 12, y: 12 });
  const [isDraggingZoomBar, setIsDraggingZoomBar] = useState(false);
  const zoomBarDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const [zoomBarHidden, setZoomBarHidden] = useState(false);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Move tool state
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
  const [selectedBrickIds, setSelectedBrickIds] = useState<string[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Shape drawing state
  const [shapeStart, setShapeStart] = useState<{ row: number; col: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ row: number; col: number } | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);

  // Context menu (right-click on grid) for selecting brick size/orientation
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  // Custom backgrounds (null = use theme defaults)
  // Default workspace background
  const DEFAULT_WORKSPACE_BG = "#26293A";
  const [workspaceBg, setWorkspaceBg] = useState<string | null>(DEFAULT_WORKSPACE_BG);
  const [gridBg, setGridBg] = useState<string | null>(null);
  const [bgDialog, setBgDialog] = useState<null | "workspace" | "grid">(null);
  // Expose background-color actions globally so the ColorPickerButton popover
  // can trigger the same dialogs/reset as the workspace right-click menu.
  useEffect(() => {
    const openWorkspace = () => setBgDialog("workspace");
    const openGrid = () => setBgDialog("grid");
    const reset = () => { setWorkspaceBg(null); setGridBg(null); };
    window.addEventListener("pixcool:bg-open-workspace", openWorkspace as EventListener);
    window.addEventListener("pixcool:bg-open-grid", openGrid as EventListener);
    window.addEventListener("pixcool:bg-reset", reset as EventListener);
    return () => {
      window.removeEventListener("pixcool:bg-open-workspace", openWorkspace as EventListener);
      window.removeEventListener("pixcool:bg-open-grid", openGrid as EventListener);
      window.removeEventListener("pixcool:bg-reset", reset as EventListener);
    };
  }, []);
  useEffect(() => {
    if (!contextMenu) return;
    const onDown = () => { setContextMenu(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setContextMenu(null); } };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  // Reposition context menu so it stays inside the workspace bounds
  useEffect(() => {
    if (!contextMenu || !contextMenuRef.current || !containerRef.current) return;
    const menu = contextMenuRef.current;
    const container = containerRef.current;
    const margin = 6;
    const maxX = container.clientWidth - menu.offsetWidth - margin;
    const maxY = container.clientHeight - menu.offsetHeight - margin;
    const nextX = Math.max(margin, Math.min(contextMenu.x, maxX));
    const nextY = Math.max(margin, Math.min(contextMenu.y, maxY));
    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu({ x: nextX, y: nextY });
    }
  }, [contextMenu]);

  // Reposition workspace menu so it stays inside the workspace bounds
  useEffect(() => {
    if (!workspaceMenu || !workspaceMenuRef.current || !containerRef.current) return;
    const menu = workspaceMenuRef.current;
    const container = containerRef.current;
    const margin = 6;
    const maxX = container.clientWidth - menu.offsetWidth - margin;
    const maxY = container.clientHeight - menu.offsetHeight - margin;
    const nextX = Math.max(margin, Math.min(workspaceMenu.x, maxX));
    const nextY = Math.max(margin, Math.min(workspaceMenu.y, maxY));
    if (nextX !== workspaceMenu.x || nextY !== workspaceMenu.y) {
      setWorkspaceMenu({ x: nextX, y: nextY });
    }
  }, [workspaceMenu]);

  const gridW = width * CELL_SIZE;
  const gridH = height * CELL_SIZE;

  // Track whether the user manually changed the zoom; if so, we won't auto-fit on resize.
  const userZoomedRef = useRef(false);

  const fitToContainer = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    // Account for rulers + a comfortable padding so the grid is visually centered.
    const padding = 64 + RULER_SIZE * 2;
    const fitZoom = Math.min(
      (clientWidth - padding) / gridW,
      (clientHeight - padding) / gridH,
      1,
    );
    setZoom(Math.max(MIN_ZOOM, fitZoom));
    setPan({ x: 0, y: 0 });
  }, [gridW, gridH]);

  // Auto-fit when grid size changes (and on initial mount)
  useEffect(() => {
    userZoomedRef.current = false;
    fitToContainer();
  }, [gridW, gridH, fitToContainer]);

  // Re-fit on container resize, but only if the user hasn't manually zoomed.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      if (!userZoomedRef.current) fitToContainer();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToContainer]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      userZoomedRef.current = true;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.005)));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  // Prevent native scroll/zoom from clamping the workspace at boundaries (e.g. wheel-up getting stuck).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener("wheel", prevent, { passive: false });
    return () => el.removeEventListener("wheel", prevent);
  }, []);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  // ───── Touch gestures: pinch-zoom, two-finger pan, long-press erase, two-finger tap undo ─────
  const touchStateRef = useRef<{
    mode: "none" | "single" | "multi";
    startDist: number;
    startZoom: number;
    startMid: { x: number; y: number };
    startPan: { x: number; y: number };
    startTime: number;
    moved: boolean;
    longPressTimer: number | null;
    longPressTarget: { row: number; col: number } | null;
    initialTouchClient: { x: number; y: number } | null;
    lastPaintedCell: { row: number; col: number } | null;
    painting: boolean;
  }>({
    mode: "none",
    startDist: 0,
    startZoom: 1,
    startMid: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
    startTime: 0,
    moved: false,
    longPressTimer: null,
    longPressTarget: null,
    initialTouchClient: null,
    lastPaintedCell: null,
    painting: false,
  });

  // Tools that support continuous touch painting (mirror desktop click-drag behaviour)
  const isPaintableTool = (t: EditorTool) => t === "place" || t === "erase";

  const distance = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const midpoint = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => ({
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  });

  const cancelLongPress = useCallback(() => {
    if (touchStateRef.current.longPressTimer !== null) {
      window.clearTimeout(touchStateRef.current.longPressTimer);
      touchStateRef.current.longPressTimer = null;
      touchStateRef.current.longPressTarget = null;
    }
  }, []);

  const cellFromClientPoint = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return null;
    // Find the inner grid <svg> via the actual element under the touch
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;
    const svg = el.closest("svg");
    if (!svg) return null;
    const svgRect = svg.getBoundingClientRect();
    const localX = clientX - svgRect.left;
    const localY = clientY - svgRect.top;
    // svg renders gridW × gridH at scale `zoom`
    const cellPx = CELL_SIZE * zoom;
    const col = Math.floor(localX / cellPx);
    const row = Math.floor(localY / cellPx);
    if (row < 0 || col < 0 || row >= height || col >= width) return null;
    return { row, col };
  }, [zoom, height, width]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches;
    if (t.length === 2) {
      cancelLongPress();
      touchStateRef.current.mode = "multi";
      touchStateRef.current.startDist = distance(t[0], t[1]);
      touchStateRef.current.startZoom = zoom;
      touchStateRef.current.startMid = midpoint(t[0], t[1]);
      touchStateRef.current.startPan = { x: pan.x, y: pan.y };
      touchStateRef.current.startTime = performance.now();
      touchStateRef.current.moved = false;
      userZoomedRef.current = true;
    } else if (t.length === 1) {
      touchStateRef.current.mode = "single";
      touchStateRef.current.startTime = performance.now();
      touchStateRef.current.moved = false;
      touchStateRef.current.initialTouchClient = { x: t[0].clientX, y: t[0].clientY };
      touchStateRef.current.lastPaintedCell = null;
      touchStateRef.current.painting = false;
      const target = cellFromClientPoint(t[0].clientX, t[0].clientY);
      // Tap-to-place: immediately place a brick on the touched cell (mirrors mouse-down)
      if (target && !imageEditMode && !isPanning && isPaintableTool(tool)) {
        onCellClick(target.row, target.col);
        touchStateRef.current.lastPaintedCell = target;
        touchStateRef.current.painting = true;
      }
      // Long-press to erase: only when not in image edit mode and not already erasing
      if (target && !imageEditMode && tool !== "erase") {
        const occupant = getCellOccupant(target.row, target.col);
        if (occupant) {
          touchStateRef.current.longPressTarget = target;
          touchStateRef.current.longPressTimer = window.setTimeout(() => {
            // Trigger erase: temporarily switch tool, place, restore
            const prevTool = tool;
            onToolChange("erase");
            setTimeout(() => {
              onCellClick(target.row, target.col);
              onToolChange(prevTool);
            }, 0);
            touchStateRef.current.longPressTimer = null;
          }, 500);
        }
      }
    }
  }, [zoom, pan, cancelLongPress, cellFromClientPoint, imageEditMode, getCellOccupant, tool, onToolChange, onCellClick, isPanning]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches;
    if (touchStateRef.current.mode === "multi" && t.length === 2) {
      e.preventDefault();
      touchStateRef.current.moved = true;
      const dist = distance(t[0], t[1]);
      const mid = midpoint(t[0], t[1]);
      const scaleFactor = dist / Math.max(1, touchStateRef.current.startDist);
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, touchStateRef.current.startZoom * scaleFactor));
      setZoom(newZoom);
      // Two-finger pan: translate by mid delta
      const dx = mid.x - touchStateRef.current.startMid.x;
      const dy = mid.y - touchStateRef.current.startMid.y;
      setPan({
        x: touchStateRef.current.startPan.x + dx,
        y: touchStateRef.current.startPan.y + dy,
      });
    } else if (touchStateRef.current.mode === "single" && t.length === 1) {
      const start = touchStateRef.current.initialTouchClient;
      if (start) {
        const moved = Math.hypot(t[0].clientX - start.x, t[0].clientY - start.y) > 8;
        if (moved) {
          touchStateRef.current.moved = true;
          cancelLongPress();
        }
      }
      // Continuous paint while finger is held and dragged across cells (mirrors mouse drag)
      if (touchStateRef.current.painting && isPaintableTool(tool) && !imageEditMode) {
        const cell = cellFromClientPoint(t[0].clientX, t[0].clientY);
        const last = touchStateRef.current.lastPaintedCell;
        if (cell && (!last || last.row !== cell.row || last.col !== cell.col)) {
          e.preventDefault();
          onCellClick(cell.row, cell.col);
          touchStateRef.current.lastPaintedCell = cell;
        }
      }
    }
  }, [cancelLongPress, tool, imageEditMode, cellFromClientPoint, onCellClick]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const elapsed = performance.now() - touchStateRef.current.startTime;
    if (touchStateRef.current.mode === "multi") {
      // Two-finger tap (no movement, quick) → undo
      if (!touchStateRef.current.moved && elapsed < 250 && onUndo) {
        onUndo();
      }
    }
    cancelLongPress();
    if (e.touches.length === 0) {
      touchStateRef.current.mode = "none";
      touchStateRef.current.initialTouchClient = null;
      touchStateRef.current.lastPaintedCell = null;
      touchStateRef.current.painting = false;
    }
  }, [cancelLongPress, onUndo]);
  // ──────────────────────────────────────────────────────────────────────────────

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleContainerMouseUp = useCallback(() => setIsPanning(false), []);

  // Clear selection when tool changes away from move
  useEffect(() => {
    if (tool !== "move") {
      setSelectionStart(null);
      setSelectionEnd(null);
      setSelectedBrickIds([]);
      setIsDraggingSelection(false);
      setIsSelecting(false);
    }
  }, [tool]);

  const getSelectionRect = useCallback(() => {
    if (!selectionStart || !selectionEnd) return null;
    const r1 = Math.min(selectionStart.row, selectionEnd.row);
    const r2 = Math.max(selectionStart.row, selectionEnd.row);
    const c1 = Math.min(selectionStart.col, selectionEnd.col);
    const c2 = Math.max(selectionStart.col, selectionEnd.col);
    return { r1, r2, c1, c2 };
  }, [selectionStart, selectionEnd]);

  const getBricksInRect = useCallback((r1: number, r2: number, c1: number, c2: number) => {
    return bricks.filter((b) => {
      const bEndRow = b.orientation === "vertical" ? b.row + b.size - 1 : b.row;
      const bEndCol = b.orientation === "vertical" ? b.col : b.col + b.size - 1;
      return b.row <= r2 && bEndRow >= r1 && b.col <= c2 && bEndCol >= c1;
    }).map((b) => b.id);
  }, [bricks]);

  const handleMouseDown = useCallback((row: number, col: number) => {
    if (isPanning) return;
    if (tool === "shape") {
      setShapeStart({ row, col });
      setShapeEnd({ row, col });
      setIsDrawingShape(true);
      return;
    }
    if (tool === "pipette") {
      if (referenceImage && imageVisible) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const gridPxX = col * CELL_SIZE + CELL_SIZE / 2;
          const gridPxY = row * CELL_SIZE + CELL_SIZE / 2;
          const imgX = ((gridPxX - imageTransform.x) / imageTransform.width) * img.naturalWidth;
          const imgY = ((gridPxY - imageTransform.y) / imageTransform.height) * img.naturalHeight;
          if (imgX < 0 || imgY < 0 || imgX >= img.naturalWidth || imgY >= img.naturalHeight) return;
          const pixel = ctx.getImageData(Math.floor(imgX), Math.floor(imgY), 1, 1).data;
          const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`.toUpperCase();
          onPipetteColor(hex);
        };
        img.src = referenceImage;
      }
      return;
    }
    if (tool === "move") {
      if (selectedBrickIds.length > 0) {
        const rect = getSelectionRect();
        if (rect && row >= rect.r1 && row <= rect.r2 && col >= rect.c1 && col <= rect.c2) {
          setIsDraggingSelection(true);
          setDragStart({ row, col });
          return;
        }
      }
      setSelectionStart({ row, col });
      setSelectionEnd({ row, col });
      setSelectedBrickIds([]);
      setIsSelecting(true);
      setIsDraggingSelection(false);
      return;
    }
    setIsMouseDown(true);
    onCellClick(row, col);
  }, [onCellClick, isPanning, tool, selectedBrickIds, getSelectionRect, referenceImage, imageVisible, imageTransform, onPipetteColor]);

  const handleMouseEnter = useCallback((row: number, col: number) => {
    setHoverCell({ row, col });
    if (tool === "shape" && isDrawingShape) {
      setShapeEnd({ row, col });
      return;
    }
    if (tool === "move") {
      if (isSelecting) {
        setSelectionEnd({ row, col });
      }
      return;
    }
    if (isMouseDown && !isPanning && tool !== "text") onCellClick(row, col);
  }, [isMouseDown, onCellClick, isPanning, tool, isSelecting, isDrawingShape]);

  const handleMouseUp = useCallback(() => {
    if (tool === "shape") {
      if (isDrawingShape && shapeStart && shapeEnd) {
        onAddShapeOverlay(shapeStart.row, shapeStart.col, shapeEnd.row, shapeEnd.col);
        onSizeChange(1);
        onToolChange("place");
      }
      setIsDrawingShape(false);
      setShapeStart(null);
      setShapeEnd(null);
      return;
    }
    if (tool === "move") {
      if (isSelecting && selectionStart && selectionEnd) {
        const rect = getSelectionRect();
        if (rect) {
          const ids = getBricksInRect(rect.r1, rect.r2, rect.c1, rect.c2);
          setSelectedBrickIds(ids);
        }
        setIsSelecting(false);
      }
      if (isDraggingSelection && dragStart && hoverCell) {
        const deltaRow = hoverCell.row - dragStart.row;
        const deltaCol = hoverCell.col - dragStart.col;
        if ((deltaRow !== 0 || deltaCol !== 0) && selectedBrickIds.length > 0) {
          onMoveBricks(selectedBrickIds, deltaRow, deltaCol);
          setSelectionStart((prev) => prev ? { row: prev.row + deltaRow, col: prev.col + deltaCol } : null);
          setSelectionEnd((prev) => prev ? { row: prev.row + deltaRow, col: prev.col + deltaCol } : null);
        }
        setIsDraggingSelection(false);
        setDragStart(null);
      }
      return;
    }
    setIsMouseDown(false);
    setIsPanning(false);
  }, [tool, isDrawingShape, shapeStart, shapeEnd, onAddShapeOverlay, onSizeChange, onToolChange, isSelecting, selectionStart, selectionEnd, getSelectionRect, getBricksInRect, isDraggingSelection, dragStart, hoverCell, selectedBrickIds, onMoveBricks]);

  const resetView = useCallback(() => {
    userZoomedRef.current = false;
    fitToContainer();
  }, [fitToContainer]);

  const zoomPercent = Math.round(zoom * 100);

  const cells = useMemo(() => {
    const result: JSX.Element[] = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        result.push(
          <rect key={`cell-${r}-${c}`}
            x={c * CELL_SIZE} y={r * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE}
            fill="transparent"
            stroke={gridVisible ? (referenceImage ? "hsl(225 20% 30%)" : "hsl(225 14% 82%)") : "transparent"}
            strokeWidth={referenceImage ? 0.8 : 0.5}
            strokeOpacity={referenceImage ? 0.55 : 1}
            style={{ cursor: isPanning ? "grabbing" : tool === "erase" ? "crosshair" : tool === "move" ? (isDraggingSelection ? "grabbing" : "crosshair") : tool === "pipette" ? "crosshair" : "pointer" }}
            onMouseDown={(e) => { if (e.button !== 0) return; handleMouseDown(r, c); }}
            onMouseEnter={() => handleMouseEnter(r, c)}
            onMouseUp={handleMouseUp}
          />
        );
      }
    }
    return result;
  }, [width, height, tool, referenceImage, gridVisible, isPanning, handleMouseDown, handleMouseEnter, handleMouseUp]);

  const brickElements = useMemo(() => {
    return bricks.map((b) => {
      const x = b.col * CELL_SIZE;
      const y = b.row * CELL_SIZE;
      const isVert = b.orientation === "vertical";
      const w = isVert ? CELL_SIZE : b.size * CELL_SIZE;
      const h = isVert ? b.size * CELL_SIZE : CELL_SIZE;
      const studR = CELL_SIZE * STUD_RATIO * 0.5;
      return (
        <g key={b.id} style={{ pointerEvents: "none" }}>
          <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={3} fill={b.color}
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={h * 0.28} rx={2} fill="rgba(255,255,255,0.2)" />
          {Array.from({ length: b.size }).map((_, i) => (
            <circle key={i}
              cx={isVert ? x + CELL_SIZE / 2 : x + i * CELL_SIZE + CELL_SIZE / 2}
              cy={isVert ? y + i * CELL_SIZE + CELL_SIZE / 2 : y + CELL_SIZE / 2}
              r={studR} fill="rgba(255,255,255,0.28)" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
          ))}
        </g>
      );
    });
  }, [bricks]);

  const hoverPreview = useMemo(() => {
    if (!hoverCell || tool === "erase") return null;
    const { row, col } = hoverCell;
    const valid = canPlace(row, col, selectedSize, orientation);
    const isVert = orientation === "vertical";
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const w = isVert ? CELL_SIZE : Math.min(selectedSize, width - col) * CELL_SIZE;
    const h = isVert ? Math.min(selectedSize, height - row) * CELL_SIZE : CELL_SIZE;
    return (
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={3}
        fill={valid ? selectedColor : "transparent"} opacity={valid ? 0.45 : 0}
        stroke={valid ? selectedColor : "hsl(0 72% 51%)"} strokeWidth={valid ? 0 : 1.5}
        strokeDasharray={valid ? "0" : "4 2"} pointerEvents="none" />
    );
  }, [hoverCell, tool, canPlace, selectedSize, orientation, selectedColor, width, height]);

  const erasePreview = useMemo(() => {
    if (!hoverCell || tool !== "erase") return null;
    const occupant = getCellOccupant(hoverCell.row, hoverCell.col);
    if (!occupant) return null;
    const x = occupant.col * CELL_SIZE;
    const y = occupant.row * CELL_SIZE;
    const isVert = occupant.orientation === "vertical";
    const w = isVert ? CELL_SIZE : occupant.size * CELL_SIZE;
    const h = isVert ? occupant.size * CELL_SIZE : CELL_SIZE;
    return (
      <rect x={x} y={y} width={w} height={h} fill="hsl(0 72% 51%)" opacity={0.25} pointerEvents="none" rx={3} />
    );
  }, [hoverCell, tool, getCellOccupant]);

  // Move tool: selection rectangle visual
  const selectionRectElement = useMemo(() => {
    if (tool !== "move") return null;
    const rect = getSelectionRect();
    if (!rect) return null;
    const x = rect.c1 * CELL_SIZE;
    const y = rect.r1 * CELL_SIZE;
    const w = (rect.c2 - rect.c1 + 1) * CELL_SIZE;
    const h = (rect.r2 - rect.r1 + 1) * CELL_SIZE;
    return (
      <rect x={x} y={y} width={w} height={h}
        fill="hsl(210 100% 56% / 0.1)" stroke="hsl(210 100% 56%)" strokeWidth={1.5}
        strokeDasharray="4 2" pointerEvents="none" rx={2} />
    );
  }, [tool, getSelectionRect]);

  // Shape tool: ghost preview as a thin vector outline of the exact shape
  const shapePreview = useMemo(() => {
    if (tool !== "shape" || !isDrawingShape || !shapeStart || !shapeEnd) return null;
    const r1 = Math.min(shapeStart.row, shapeEnd.row);
    const c1 = Math.min(shapeStart.col, shapeEnd.col);
    const r2 = Math.max(shapeStart.row, shapeEnd.row);
    const c2 = Math.max(shapeStart.col, shapeEnd.col);
    const x = c1 * CELL_SIZE;
    const y = r1 * CELL_SIZE;
    const w = Math.max((c2 - c1 + 1) * CELL_SIZE, CELL_SIZE);
    const h = Math.max((r2 - r1 + 1) * CELL_SIZE, CELL_SIZE);
    const { path } = renderShapeSVGPath(shapeType, shapeFillMode, x, y, w, h);
    return (
      <g pointerEvents="none">
        <path d={path} fill="none" stroke={selectedColor} strokeWidth={1.5} opacity={0.9} strokeLinejoin="round" strokeLinecap="round" />
        <rect x={x} y={y} width={w} height={h}
          fill="none" stroke={selectedColor} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} rx={2} />
      </g>
    );
  }, [tool, isDrawingShape, shapeStart, shapeEnd, selectedColor, shapeType, shapeFillMode]);

  // Move tool: highlight selected bricks
  const selectedBrickHighlights = useMemo(() => {
    if (tool !== "move" || selectedBrickIds.length === 0) return null;
    return bricks.filter((b) => selectedBrickIds.includes(b.id)).map((b) => {
      const x = b.col * CELL_SIZE;
      const y = b.row * CELL_SIZE;
      const isVert = b.orientation === "vertical";
      const w = isVert ? CELL_SIZE : b.size * CELL_SIZE;
      const h = isVert ? b.size * CELL_SIZE : CELL_SIZE;
      return (
        <rect key={`sel-${b.id}`} x={x} y={y} width={w} height={h}
          fill="transparent" stroke="hsl(210 100% 56%)" strokeWidth={2}
          pointerEvents="none" rx={3} />
      );
    });
  }, [tool, selectedBrickIds, bricks]);

  // Move tool: ghost preview of where selected bricks will land while dragging
  const moveGhostPreview = useMemo(() => {
    if (tool !== "move" || !isDraggingSelection || !dragStart || !hoverCell) return null;
    if (selectedBrickIds.length === 0) return null;
    const deltaRow = hoverCell.row - dragStart.row;
    const deltaCol = hoverCell.col - dragStart.col;
    if (deltaRow === 0 && deltaCol === 0) return null;
    const selected = bricks.filter((b) => selectedBrickIds.includes(b.id));
    return (
      <g pointerEvents="none">
        {selected.map((b) => {
          const isVert = b.orientation === "vertical";
          const w = isVert ? CELL_SIZE : b.size * CELL_SIZE;
          const h = isVert ? b.size * CELL_SIZE : CELL_SIZE;
          const x = (b.col + deltaCol) * CELL_SIZE;
          const y = (b.row + deltaRow) * CELL_SIZE;
          return (
            <rect
              key={`ghost-${b.id}`}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={b.color}
              fillOpacity={0.35}
              stroke="hsl(210 100% 56%)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              rx={3}
            />
          );
        })}
      </g>
    );
  }, [tool, isDraggingSelection, dragStart, hoverCell, selectedBrickIds, bricks]);

  return (
    <div className="flex-1 relative min-h-0 min-w-0">
      {/* Zoom controls — fixed overlay, always visible */}
      {!zoomBarHidden && (
      <div
        data-zoombar="true"
        className="absolute z-20 flex items-center gap-0.5 bg-toolbar/95 glass-panel border border-toolbar-border rounded-lg px-1.5 py-1 zoom-control-shadow text-toolbar-foreground"
        style={{
          left: zoomBarPos.x,
          top: zoomBarPos.y,
          touchAction: "none",
          cursor: isDraggingZoomBar ? "grabbing" : "grab",
        }}
        onMouseDown={(e) => {
          // Only initiate drag when pressing on the bar background, not on buttons
          if ((e.target as HTMLElement).closest("button")) return;
          e.preventDefault();
          setIsDraggingZoomBar(true);
          const barEl = e.currentTarget as HTMLElement;
          const rect = barEl.getBoundingClientRect();
          const barW = rect.width;
          const barH = rect.height;
          const wrapperEl = barEl.parentElement!;
          const wrapperRect = wrapperEl.getBoundingClientRect();
          zoomBarDragStart.current = { x: e.clientX, y: e.clientY, posX: rect.left - wrapperRect.left, posY: rect.top - wrapperRect.top };
          const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - zoomBarDragStart.current.x;
            const dy = ev.clientY - zoomBarDragStart.current.y;
            const wRect = wrapperEl.getBoundingClientRect();
            const newX = Math.min(Math.max(0, zoomBarDragStart.current.posX + dx), wRect.width - barW);
            const newY = Math.min(Math.max(0, zoomBarDragStart.current.posY + dy), wRect.height - barH);
            setZoomBarPos({ x: newX, y: newY });
          };
          const onUp = () => {
            setIsDraggingZoomBar(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <button
          className="w-7 h-7 flex items-center justify-center text-toolbar-foreground/60 hover:text-toolbar-foreground rounded-md hover:bg-toolbar-hover transition-colors"
          title="Ocultar barra de zoom"
          onClick={(e) => {
            e.stopPropagation();
            setZoomBarHidden(true);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="5" cy="3" r="1" fill="currentColor"/>
            <circle cx="9" cy="3" r="1" fill="currentColor"/>
            <circle cx="5" cy="7" r="1" fill="currentColor"/>
            <circle cx="9" cy="7" r="1" fill="currentColor"/>
            <circle cx="5" cy="11" r="1" fill="currentColor"/>
            <circle cx="9" cy="11" r="1" fill="currentColor"/>
          </svg>
        </button>
        <button onClick={() => { userZoomedRef.current = true; setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP)); }}
          className="w-7 h-7 flex items-center justify-center text-toolbar-foreground/60 hover:text-toolbar-foreground rounded-md hover:bg-toolbar-hover transition-colors text-sm font-bold"
          title="Alejar">−</button>
        <button onClick={resetView}
          className="px-2 h-7 text-[11px] font-medium text-toolbar-foreground/70 hover:text-toolbar-foreground hover:bg-toolbar-hover rounded-md transition-colors min-w-[46px] font-mono"
          title="Ajustar a ventana">{zoomPercent}%</button>
        <button onClick={() => { userZoomedRef.current = true; setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP)); }}
          className="w-7 h-7 flex items-center justify-center text-toolbar-foreground/60 hover:text-toolbar-foreground rounded-md hover:bg-toolbar-hover transition-colors text-sm font-bold"
          title="Acercar">+</button>
      </div>
      )}

      {zoomBarHidden && (
        <button
          className="absolute z-20 w-8 h-8 flex items-center justify-center bg-toolbar/95 glass-panel border border-toolbar-border rounded-lg zoom-control-shadow text-toolbar-foreground/70 hover:text-toolbar-foreground hover:bg-toolbar-hover transition-colors"
          style={{ left: zoomBarPos.x, top: zoomBarPos.y }}
          title="Mostrar barra de zoom"
          onClick={() => setZoomBarHidden(false)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="5" cy="3" r="1" fill="currentColor"/>
            <circle cx="9" cy="3" r="1" fill="currentColor"/>
            <circle cx="5" cy="7" r="1" fill="currentColor"/>
            <circle cx="9" cy="7" r="1" fill="currentColor"/>
            <circle cx="5" cy="11" r="1" fill="currentColor"/>
            <circle cx="9" cy="11" r="1" fill="currentColor"/>
          </svg>
        </button>
      )}

      {/* Cursor position tracker — sits right below the zoom bar */}
      {cursorTrackerVisible && (
        <div
          className="absolute z-20 bg-toolbar/95 glass-panel border border-toolbar-border rounded-lg px-2 py-1 zoom-control-shadow text-[11px] font-mono text-toolbar-foreground pointer-events-none select-none"
          style={{ left: zoomBarPos.x, top: zoomBarPos.y + 36 }}
        >
          {hoverCell
            ? `Fila ${hoverCell.row + 1} · Columna ${hoverCell.col + 1}`
            : "Fila — · Columna —"}
        </div>
      )}

      <div ref={containerRef}
        className="w-full h-full overflow-hidden flex items-center justify-center relative workspace-dots"
        style={{ background: workspaceBg ?? DEFAULT_WORKSPACE_BG, cursor: isPanning ? "grabbing" : "default", touchAction: "none" }}
        onWheel={handleWheel}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseLeave={() => { setHoverCell(null); setIsMouseDown(false); setIsPanning(false); setIsSelecting(false); setIsDrawingShape(false); }}
        onContextMenu={(e) => {
          // Only handle when right-click happens on the workspace itself (not on grid/SVG/overlays)
          if ((e.target as HTMLElement).closest("svg") || (e.target as HTMLElement).closest("[data-zoombar]")) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setWorkspaceMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >

      {/* Outer wrapper occupies the *scaled* dimensions so flex centering works correctly */}
      <div
        className="relative shrink-0"
        style={{
          width: (gridW + RULER_SIZE) * zoom,
          height: (gridH + RULER_SIZE) * zoom,
        }}
      >
      <div className="relative animate-fade-in"
        style={{
          width: gridW + RULER_SIZE, height: gridH + RULER_SIZE,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top left",
          willChange: "transform",
        }}>
        {/* Horizontal ruler (top) — fondo blanco fijo para máximo contraste sobre cualquier color de workspace */}
        <div className="absolute flex" style={{ left: RULER_SIZE, top: 0, height: RULER_SIZE, width: gridW, background: '#FFFFFF', borderBottom: '1px solid hsl(var(--border))' }}>
          {Array.from({ length: width }).map((_, i) => (
            <div key={i} className="flex items-center justify-center font-mono select-none"
              style={{
                width: CELL_SIZE, height: RULER_SIZE,
                fontSize: 9, color: hoverCell?.col === i ? 'hsl(var(--primary))' : '#1C1917',
                fontWeight: hoverCell?.col === i ? 700 : 500,
                background: hoverCell?.col === i ? 'hsl(var(--primary) / 0.12)' : 'transparent',
              }}>
              {i + 1}
            </div>
          ))}
        </div>
        {/* Vertical ruler (left) — fondo blanco fijo para máximo contraste sobre cualquier color de workspace */}
        <div className="absolute flex flex-col" style={{ left: 0, top: RULER_SIZE, width: RULER_SIZE, height: gridH, background: '#FFFFFF', borderRight: '1px solid hsl(var(--border))' }}>
          {Array.from({ length: height }).map((_, i) => (
            <div key={i} className="flex items-center justify-center font-mono select-none"
              style={{
                width: RULER_SIZE, height: CELL_SIZE,
                fontSize: 9, color: hoverCell?.row === i ? 'hsl(var(--primary))' : '#1C1917',
                fontWeight: hoverCell?.row === i ? 700 : 500,
                background: hoverCell?.row === i ? 'hsl(var(--primary) / 0.12)' : 'transparent',
              }}>
              {i + 1}
            </div>
          ))}
        </div>
        {/* Corner — fondo blanco para coincidir con las reglas */}
        <div className="absolute" style={{ width: RULER_SIZE, height: RULER_SIZE, top: 0, left: 0, background: '#FFFFFF', borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} />
        {/* Grid area */}
        <div className="absolute" style={{ left: RULER_SIZE, top: RULER_SIZE, width: gridW, height: gridH }}>
          {/* Grid shadow */}
          <div className="absolute -inset-1 rounded-lg" style={{ boxShadow: "0 4px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }} />
          <div className="absolute inset-0 rounded-sm" style={{ background: gridBg ?? "hsl(var(--card))" }} />
          {/* Lower image layers (previously loaded). Locked & non-interactive. */}
          {extraImages.map((layer, i) => (
            <div
              key={`extra-${i}`}
              className="absolute pointer-events-none"
              style={{
                left: layer.transform.x,
                top: layer.transform.y,
                width: layer.transform.width,
                height: layer.transform.height,
              }}
            >
              <img
                src={layer.src}
                alt=""
                draggable={false}
                className="w-full h-full select-none"
                style={{ opacity: imageVisible ? imageOpacity : 0 }}
              />
            </div>
          ))}
          {referenceImage && (
            <ReferenceImageOverlay src={referenceImage} opacity={imageOpacity} visible={imageVisible}
              locked={imageLocked} transform={imageTransform} onTransformChange={onImageTransformChange} />
          )}
          <svg width={gridW} height={gridH} viewBox={`0 0 ${gridW} ${gridH}`} className="relative"
            style={{ userSelect: "none", pointerEvents: imageEditMode ? "none" : "auto" }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const wrapperEl = containerRef.current;
              if (!wrapperEl) return;
              const wRect = wrapperEl.getBoundingClientRect();
              setContextMenu({
                x: e.clientX - wRect.left + wrapperEl.scrollLeft,
                y: e.clientY - wRect.top + wrapperEl.scrollTop,
              });
            }}>
            {cells}
            {brickElements}
            {selectedBrickHighlights}
            {selectionRectElement}
            {moveGhostPreview}
            {hoverPreview}
            {erasePreview}
            {shapePreview}
          </svg>
          {/* Interactive shape overlays */}
          <ShapeOverlayLayer
            overlays={shapeOverlays}
            onUpdate={onUpdateShapeOverlay}
            onRemove={onRemoveShapeOverlay}
            containerScale={zoom}
            tool={tool}
          />
          {/* Interactive text overlays */}
          <TextOverlayLayer
            overlays={textOverlays}
            onUpdate={onUpdateTextOverlay}
            onRemove={onRemoveTextOverlay}
            containerScale={zoom}
          />
        </div>
      </div>
      </div>
      {/* Right-click context menu: brick size & orientation */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-2xl p-1 animate-fade-in dark"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 176 }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          
          {([1, 2, 3] as BrickSize[]).map((s) => (
            <button
              key={`size-${s}`}
              className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
              onClick={() => { onSizeChange(s); onToolChange("place"); closeContextMenu(); }}
            >
              <span className="font-mono">1 × {s}</span>
              {tool === "place" && selectedSize === s && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
          <div className="-mx-1 my-1 h-px bg-zinc-700" />
          
          <button
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => { onOrientationChange("horizontal"); onToolChange("place"); closeContextMenu(); }}
          >
            <span className="flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5" />Horizontal</span>
            {tool === "place" && orientation === "horizontal" && <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => { onOrientationChange("vertical"); onToolChange("place"); closeContextMenu(); }}
          >
            <span className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Vertical</span>
            {tool === "place" && orientation === "vertical" && <Check className="h-3.5 w-3.5" />}
          </button>
          <div className="-mx-1 my-1 h-px bg-zinc-700" />
          
          <button
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => { onToolChange("erase"); closeContextMenu(); }}
          >
            <span className="flex items-center gap-2"><Eraser className="h-3.5 w-3.5" />Borrar</span>
            {tool === "erase" && <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => { onToolChange("move"); closeContextMenu(); }}
          >
            <span className="flex items-center gap-2"><Move className="h-3.5 w-3.5" />Mover</span>
            {tool === "move" && <Check className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      {/* Workspace right-click menu (outside grid): background colors */}
      {workspaceMenu && (
        <div
          ref={workspaceMenuRef}
          className="absolute z-50 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-2xl p-1 animate-fade-in dark"
          style={{ left: workspaceMenu.x, top: workspaceMenu.y, minWidth: 200 }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => { setBgDialog("workspace"); closeWorkspaceMenu(); }}
          >
            <span>Color de fondo</span>
            <span className="inline-block w-4 h-4 rounded-sm border border-zinc-600" style={{ background: workspaceBg ?? "hsl(var(--workspace))" }} />
          </button>
          <button
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => { setBgDialog("grid"); closeWorkspaceMenu(); }}
          >
            <span>Color área cuadriculada</span>
            <span className="inline-block w-4 h-4 rounded-sm border border-zinc-600" style={{ background: gridBg ?? "hsl(var(--card))" }} />
          </button>
          <div className="-mx-1 my-1 h-px bg-zinc-700" />
          <button
            className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-800 hover:text-white transition-colors"
            onClick={() => { setWorkspaceBg(null); setGridBg(null); closeWorkspaceMenu(); }}
          >
            Restablecer colores
          </button>
        </div>
      )}
      <BackgroundColorDialog
        open={bgDialog === "workspace"}
        title="Color de fondo"
        initialColor={workspaceBg ?? "#1a1a1a"}
        baseColor={workspaceBg ?? "hsl(var(--workspace))"}
        onAccept={(hex) => { setWorkspaceBg(hex); setBgDialog(null); }}
        onCancel={() => setBgDialog(null)}
        onRemove={() => { setWorkspaceBg(null); setBgDialog(null); }}
      />
      <BackgroundColorDialog
        open={bgDialog === "grid"}
        title="Color área cuadriculada"
        initialColor={gridBg ?? "#ffffff"}
        baseColor={gridBg ?? "hsl(var(--card))"}
        onAccept={(hex) => { setGridBg(hex); setBgDialog(null); }}
        onCancel={() => setBgDialog(null)}
        onRemove={() => { setGridBg(null); setBgDialog(null); }}
      />
    </div>
    </div>
  );
}
