import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { PlacedBrick, BrickSize, BrickOrientation, ImageTransform, EditorTool, TextOverlay } from "@/hooks/useBrickEditor";
import ReferenceImageOverlay from "@/components/ReferenceImageOverlay";
import TextOverlayLayer from "@/components/TextOverlayLayer";

interface BrickGridProps {
  width: number;
  height: number;
  bricks: PlacedBrick[];
  selectedColor: string;
  selectedSize: BrickSize;
  orientation: BrickOrientation;
  tool: EditorTool;
  gridVisible: boolean;
  referenceImage: string | null;
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
}

const CELL_SIZE = 28;
const RULER_SIZE = 20;
const STUD_RATIO = 0.38;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

export default function BrickGrid({
  width, height, bricks, selectedColor, selectedSize, orientation, tool, gridVisible,
  referenceImage, imageEditMode, imageOpacity, imageVisible, imageLocked,
  imageTransform, onImageTransformChange, onCellClick, canPlace, getCellOccupant,
  textOverlays, onUpdateTextOverlay, onRemoveTextOverlay, onMoveBricks, onPipetteColor,
}: BrickGridProps) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Draggable zoom bar state
  const [zoomBarPos, setZoomBarPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingZoomBar, setIsDraggingZoomBar] = useState(false);
  const zoomBarDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Move tool state
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
  const [selectedBrickIds, setSelectedBrickIds] = useState<string[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const gridW = width * CELL_SIZE;
  const gridH = height * CELL_SIZE;

  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 64;
    const fitZoom = Math.min((clientWidth - padding) / gridW, (clientHeight - padding) / gridH, 1);
    setZoom(Math.max(MIN_ZOOM, fitZoom));
    setPan({ x: 0, y: 0 });
  }, [gridW, gridH]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.005)));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

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
    if (tool === "pipette") {
      // Sample color from reference image at pixel position
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
          // Map grid pixel to image pixel
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
      // Check if clicking inside existing selection to drag
      if (selectedBrickIds.length > 0) {
        const rect = getSelectionRect();
        if (rect && row >= rect.r1 && row <= rect.r2 && col >= rect.c1 && col <= rect.c2) {
          setIsDraggingSelection(true);
          setDragStart({ row, col });
          return;
        }
      }
      // Start new selection
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
    if (tool === "move") {
      if (isSelecting) {
        setSelectionEnd({ row, col });
      }
      return;
    }
    if (isMouseDown && !isPanning && tool !== "text") onCellClick(row, col);
  }, [isMouseDown, onCellClick, isPanning, tool, isSelecting]);

  const handleMouseUp = useCallback(() => {
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
  }, [tool, isSelecting, selectionStart, selectionEnd, getSelectionRect, getBricksInRect, isDraggingSelection, dragStart, hoverCell, selectedBrickIds, onMoveBricks]);

  const resetView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 64;
    const fitZoom = Math.min((clientWidth - padding) / gridW, (clientHeight - padding) / gridH, 1);
    setZoom(Math.max(MIN_ZOOM, fitZoom));
    setPan({ x: 0, y: 0 });
  }, [gridW, gridH]);

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
            onMouseDown={() => handleMouseDown(r, c)}
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

  return (
    <div ref={containerRef}
      className="flex-1 overflow-auto flex items-center justify-center relative workspace-dots min-h-0 min-w-0"
      style={{ background: "hsl(var(--workspace))", cursor: isPanning ? "grabbing" : "default" }}
      onWheel={handleWheel}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      onMouseLeave={() => { setHoverCell(null); setIsMouseDown(false); setIsPanning(false); setIsSelecting(false); }}
    >
      {/* Zoom controls — draggable, always visible */}
      <div
        className="sticky z-20 flex items-center gap-0.5 bg-card/95 glass-panel border border-border rounded-lg px-1.5 py-1 zoom-control-shadow"
        style={{
          position: "fixed",
          ...(zoomBarPos
            ? { left: zoomBarPos.x, top: zoomBarPos.y }
            : { bottom: 16, right: 16 }),
          touchAction: "none",
        }}
      >
        <button
          className="w-7 h-7 flex items-center justify-center text-foreground/60 hover:text-foreground rounded-md hover:bg-muted transition-colors"
          style={{ cursor: isDraggingZoomBar ? "grabbing" : "grab" }}
          title="Mover barra"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingZoomBar(true);
            const barEl = (e.currentTarget as HTMLElement).parentElement!;
            const rect = barEl.getBoundingClientRect();
            const containerRect = containerRef.current!.getBoundingClientRect();
            const currentX = rect.left - containerRect.left;
            const currentY = rect.top - containerRect.top;
            zoomBarDragStart.current = { x: e.clientX, y: e.clientY, posX: currentX, posY: currentY };
            if (!zoomBarPos) setZoomBarPos({ x: currentX, y: currentY });
            const onMove = (ev: MouseEvent) => {
              const dx = ev.clientX - zoomBarDragStart.current.x;
              const dy = ev.clientY - zoomBarDragStart.current.y;
              setZoomBarPos({ x: zoomBarDragStart.current.posX + dx, y: zoomBarDragStart.current.posY + dy });
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="5" cy="3" r="1" fill="currentColor"/>
            <circle cx="9" cy="3" r="1" fill="currentColor"/>
            <circle cx="5" cy="7" r="1" fill="currentColor"/>
            <circle cx="9" cy="7" r="1" fill="currentColor"/>
            <circle cx="5" cy="11" r="1" fill="currentColor"/>
            <circle cx="9" cy="11" r="1" fill="currentColor"/>
          </svg>
        </button>
        <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          className="w-7 h-7 flex items-center justify-center text-foreground/60 hover:text-foreground rounded-md hover:bg-muted transition-colors text-sm font-bold"
          title="Alejar">−</button>
        <button onClick={resetView}
          className="px-2 h-7 text-[11px] font-medium text-foreground/70 hover:text-foreground hover:bg-muted rounded-md transition-colors min-w-[46px] font-mono"
          title="Ajustar a ventana">{zoomPercent}%</button>
        <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          className="w-7 h-7 flex items-center justify-center text-foreground/60 hover:text-foreground rounded-md hover:bg-muted transition-colors text-sm font-bold"
          title="Acercar">+</button>
      </div>

      <div className="relative animate-fade-in"
        style={{
          width: gridW + RULER_SIZE, height: gridH + RULER_SIZE,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}>
        {/* Horizontal ruler (top) */}
        <div className="absolute flex" style={{ left: RULER_SIZE, top: 0, height: RULER_SIZE, width: gridW }}>
          {Array.from({ length: width }).map((_, i) => (
            <div key={i} className="flex items-center justify-center font-mono select-none"
              style={{
                width: CELL_SIZE, height: RULER_SIZE,
                fontSize: 9, color: hoverCell?.col === i ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.4)',
                fontWeight: hoverCell?.col === i ? 700 : 400,
                background: hoverCell?.col === i ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                borderBottom: '1px solid hsl(var(--border))',
              }}>
              {i + 1}
            </div>
          ))}
        </div>
        {/* Vertical ruler (left) */}
        <div className="absolute flex flex-col" style={{ left: 0, top: RULER_SIZE, width: RULER_SIZE, height: gridH }}>
          {Array.from({ length: height }).map((_, i) => (
            <div key={i} className="flex items-center justify-center font-mono select-none"
              style={{
                width: RULER_SIZE, height: CELL_SIZE,
                fontSize: 9, color: hoverCell?.row === i ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.4)',
                fontWeight: hoverCell?.row === i ? 700 : 400,
                background: hoverCell?.row === i ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                borderRight: '1px solid hsl(var(--border))',
              }}>
              {i + 1}
            </div>
          ))}
        </div>
        {/* Corner */}
        <div className="absolute" style={{ width: RULER_SIZE, height: RULER_SIZE, top: 0, left: 0, borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} />
        {/* Grid area */}
        <div className="absolute" style={{ left: RULER_SIZE, top: RULER_SIZE, width: gridW, height: gridH }}>
          {/* Grid shadow */}
          <div className="absolute -inset-1 rounded-lg" style={{ boxShadow: "0 4px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }} />
          <div className="absolute inset-0 bg-card rounded-sm" />
          {referenceImage && (
            <ReferenceImageOverlay src={referenceImage} opacity={imageOpacity} visible={imageVisible}
              locked={imageLocked} transform={imageTransform} onTransformChange={onImageTransformChange} />
          )}
          <svg width={gridW} height={gridH} viewBox={`0 0 ${gridW} ${gridH}`} className="relative"
            style={{ userSelect: "none", pointerEvents: imageEditMode ? "none" : "auto" }}>
            {cells}
            {brickElements}
            {selectedBrickHighlights}
            {selectionRectElement}
            {hoverPreview}
            {erasePreview}
          </svg>
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
  );
}
