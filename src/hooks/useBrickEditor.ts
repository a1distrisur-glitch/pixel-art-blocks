import { useState, useCallback, useRef } from "react";
import { ShapeType, ShapeFillMode } from "@/lib/shapeRasterizer";

export type { ShapeType, ShapeFillMode } from "@/lib/shapeRasterizer";

export type BrickSize = 1 | 2 | 3;
export type BrickOrientation = "horizontal" | "vertical";
export type EditorTool = "place" | "erase" | "text" | "move" | "pipette" | "shape" | "shapeEdit";

export interface PlacedBrick {
  id: string;
  row: number;
  col: number;
  size: BrickSize;
  orientation: BrickOrientation;
  color: string;
}

export interface TextOverlay {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
}

export interface ShapeOverlay {
  id: string;
  x: number;
  y: number;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  shapeType: ShapeType;
  fillMode: ShapeFillMode;
  color: string;
}

export interface ImageTransform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_BRICK_COLORS = [
  { name: "Rojo", value: "#DC2626" },
  { name: "Azul", value: "#2563EB" },
  { name: "Amarillo", value: "#EAB308" },
  { name: "Verde", value: "#16A34A" },
  { name: "Naranja", value: "#EA580C" },
  { name: "Blanco", value: "#F5F5F4" },
  { name: "Negro", value: "#1C1917" },
  { name: "Gris", value: "#78716C" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Celeste", value: "#06B6D4" },
  { name: "Marrón", value: "#92400E" },
  { name: "Lima", value: "#84CC16" },
  { name: "Violeta", value: "#7C3AED" },
  { name: "Crema", value: "#FFEBAA" },
];

export interface BrickColor {
  name: string;
  value: string;
}

const CELL_SIZE = 28;

const timestamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

// Helper: save blob using File System Access API with fallback
async function saveWithPicker(blob: Blob, suggestedName: string, description: string, accept: Record<string, string[]>) {
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{ description, accept }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
  }
  const link = document.createElement("a");
  link.download = suggestedName;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

// Helper: open file using File System Access API with fallback
function openWithPicker(accept: string): Promise<File | null> {
  if ("showOpenFilePicker" in window) {
    return (async () => {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ accept: { "*/*": accept.split(",") } }],
          multiple: false,
        });
        return await handle.getFile();
      } catch (e: any) {
        if (e?.name === "AbortError") return null;
      }
      return null;
    })();
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export function useBrickEditor(initialWidth = 32, initialHeight = 32) {
  const [gridWidth, setGridWidth] = useState(initialWidth);
  const [gridHeight, setGridHeight] = useState(initialHeight);
  const [projectName, setProjectName] = useState("");
  const [projectStarted, setProjectStarted] = useState(true);
  const [bricks, setBricksRaw] = useState<PlacedBrick[]>([]);
  const undoStack = useRef<PlacedBrick[][]>([]);
  const redoStack = useRef<PlacedBrick[][]>([]);

  const setBricks = useCallback((updater: PlacedBrick[] | ((prev: PlacedBrick[]) => PlacedBrick[])) => {
    setBricksRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      undoStack.current.push(prev);
      redoStack.current = [];
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setBricksRaw((prev) => {
      const last = undoStack.current.pop();
      if (last === undefined) return prev;
      redoStack.current.push(prev);
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setBricksRaw((prev) => {
      const next = redoStack.current.pop();
      if (next === undefined) return prev;
      undoStack.current.push(prev);
      return next;
    });
  }, []);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  const [colors, setColors] = useState<BrickColor[]>(DEFAULT_BRICK_COLORS);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_BRICK_COLORS[0].value);
  const [selectedSize, setSelectedSize] = useState<BrickSize>(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [cursorTrackerVisible, setCursorTrackerVisible] = useState(true);
  const [orientation, setOrientation] = useState<BrickOrientation>("horizontal");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageOpacity, setImageOpacity] = useState(0.8);
  const [imageVisible, setImageVisible] = useState(true);
  const [imageLocked, setImageLocked] = useState(false);
  const [imageEditMode, setImageEditMode] = useState(false);
  const [imageTransform, setImageTransform] = useState<ImageTransform>({
    x: 0, y: 0, width: 0, height: 0,
  });
  const [extraImages, setExtraImages] = useState<{ src: string; transform: ImageTransform }[]>([]);
  const [tool, setTool] = useState<EditorTool>("place");
  const idCounter = useRef(0);

  // Text overlays (free text)
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [pixelText, setPixelText] = useState("");
  const [textFontSize, setTextFontSize] = useState(16);
  const [textFontFamily, setTextFontFamily] = useState("Arial");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [shapeFillMode, setShapeFillMode] = useState<ShapeFillMode>("outline");
  const [shapeOverlays, setShapeOverlays] = useState<ShapeOverlay[]>([]);

  const getCellOccupant = useCallback(
    (row: number, col: number): PlacedBrick | undefined => {
      return bricks.find((b) => {
        if (b.orientation === "vertical") {
          return b.col === col && row >= b.row && row < b.row + b.size;
        }
        return b.row === row && col >= b.col && col < b.col + b.size;
      });
    },
    [bricks]
  );

  const canPlace = useCallback(
    (row: number, col: number, size: BrickSize, dir: BrickOrientation): boolean => {
      if (dir === "vertical") {
        if (row + size > gridHeight) return false;
        for (let r = row; r < row + size; r++) {
          if (getCellOccupant(r, col)) return false;
        }
      } else {
        if (col + size > gridWidth) return false;
        for (let c = col; c < col + size; c++) {
          if (getCellOccupant(row, c)) return false;
        }
      }
      return true;
    },
    [gridWidth, gridHeight, getCellOccupant]
  );

  const placeBrick = useCallback(
    (row: number, col: number) => {
      if (tool === "erase") {
        const occupant = getCellOccupant(row, col);
        if (occupant) {
          setBricks((prev) => prev.filter((b) => b.id !== occupant.id));
        }
        return;
      }
      if (tool === "text") {
        // Add a free text overlay at the click position (not snapped to grid)
        const newOverlay: TextOverlay = {
          id: `text-${idCounter.current++}`,
          x: col * CELL_SIZE,
          y: row * CELL_SIZE,
          text: pixelText || "Texto",
          fontSize: textFontSize,
          color: selectedColor,
          fontFamily: textFontFamily,
          bold: textBold,
          italic: textItalic,
        };
        setTextOverlays((prev) => [...prev, newOverlay]);
        setTool("place");
        return;
      }
      if (!canPlace(row, col, selectedSize, orientation)) return;
      const newBrick: PlacedBrick = {
        id: `brick-${idCounter.current++}`,
        row,
        col,
        size: selectedSize,
        orientation,
        color: selectedColor,
      };
      setBricks((prev) => [...prev, newBrick]);
    },
    [tool, selectedSize, selectedColor, orientation, canPlace, getCellOccupant, pixelText, gridWidth, gridHeight, textFontSize, textFontFamily, textBold, textItalic]
  );

  const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const removeTextOverlay = useCallback((id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addShapeOverlay = useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    const r1 = Math.min(startRow, endRow);
    const c1 = Math.min(startCol, endCol);
    const newOverlay: ShapeOverlay = {
      id: `shape-${idCounter.current++}`,
      x: c1 * CELL_SIZE,
      y: r1 * CELL_SIZE,
      startRow,
      startCol,
      endRow,
      endCol,
      shapeType,
      fillMode: shapeFillMode,
      color: selectedColor,
    };
    setShapeOverlays((prev) => [...prev, newOverlay]);
  }, [shapeType, shapeFillMode, selectedColor]);

  const updateShapeOverlay = useCallback((id: string, updates: Partial<ShapeOverlay>) => {
    setShapeOverlays((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const removeShapeOverlay = useCallback((id: string) => {
    setShapeOverlays((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setBricks([]);
    setTextOverlays([]);
    setShapeOverlays([]);
  }, [setBricks]);

  const handleImageUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    // Push the currently active image (if any) to extras as a lower layer
    setReferenceImage((prevSrc) => {
      if (prevSrc) {
        setImageTransform((prevT) => {
          if (prevT.width > 0 && prevT.height > 0) {
            setExtraImages((prevExtras) => [...prevExtras, { src: prevSrc, transform: prevT }]);
          }
          return prevT;
        });
      }
      return url;
    });
    setImageVisible(true);
    setImageLocked(false);
    setImageOpacity(0.9);
    const img = new window.Image();
    img.onload = () => {
      setGridWidth((gw) => {
        setGridHeight((gh) => {
          const gridPxW = gw * CELL_SIZE;
          const gridPxH = gh * CELL_SIZE;
          const scale = Math.min(gridPxW / img.naturalWidth, gridPxH / img.naturalHeight);
          const w = img.naturalWidth * scale;
          const h = img.naturalHeight * scale;
          setImageTransform({
            x: (gridPxW - w) / 2,
            y: (gridPxH - h) / 2,
            width: w,
            height: h,
          });
          return gh;
        });
        return gw;
      });
    };
    img.src = url;
  }, []);

  const removeImage = useCallback(() => {
    // Elimina la imagen actualmente seleccionada y promueve la última capa previa
    // (si existe) como nueva imagen de referencia activa, para que pueda moverse,
    // ocultarse o eliminarse igual que cualquier referencia.
    setExtraImages((prevExtras) => {
      if (prevExtras.length > 0) {
        const next = prevExtras[prevExtras.length - 1];
        setReferenceImage(next.src);
        setImageTransform(next.transform);
        setImageVisible(true);
        setImageLocked(false);
        return prevExtras.slice(0, -1);
      }
      setReferenceImage(null);
      setImageTransform({ x: 0, y: 0, width: 0, height: 0 });
      setImageVisible(true);
      setImageLocked(false);
      setImageEditMode(false);
      return prevExtras;
    });
  }, []);

  const updateGridSize = useCallback((w: number, h: number) => {
    const newW = Math.max(1, Math.min(96, w));
    const newH = Math.max(1, Math.min(96, h));
    setGridWidth(newW);
    setGridHeight(newH);
    setBricks((prev) =>
      prev.filter((b) => {
        const endCol = b.orientation === "vertical" ? b.col + 1 : b.col + b.size;
        const endRow = b.orientation === "vertical" ? b.row + b.size : b.row + 1;
        return endCol <= newW && endRow <= newH;
      })
    );
  }, [setBricks]);

  const addColor = useCallback((name: string, value: string) => {
    setColors((prev) => [...prev, { name, value }]);
  }, []);

  const replaceColor = useCallback((index: number, name: string, value: string) => {
    setColors((prev) => {
      const next = [...prev];
      const oldValue = next[index]?.value;
      next[index] = { name, value };
      if (oldValue && oldValue === selectedColor) {
        setSelectedColor(value);
      }
      return next;
    });
  }, [selectedColor]);

  const removeColor = useCallback((index: number) => {
    setColors((prev) => {
      if (prev.length <= 1) return prev;
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed && removed.value === selectedColor) {
        setSelectedColor(next[0].value);
      }
      return next;
    });
  }, [selectedColor]);

  const newProject = useCallback(() => {
    setBricksRaw([]);
    undoStack.current = [];
    redoStack.current = [];
    setReferenceImage(null);
    setExtraImages([]);
    setImageVisible(true);
    setImageLocked(false);
    setImageOpacity(0.8);
    setImageTransform({ x: 0, y: 0, width: 0, height: 0 });
    setGridWidth(initialWidth);
    setGridHeight(initialHeight);
    setColors(DEFAULT_BRICK_COLORS);
    setSelectedColor(DEFAULT_BRICK_COLORS[0].value);
    setSelectedSize(1);
    setOrientation("horizontal");
    setTool("place");
    setShapeType("rectangle");
    setShapeFillMode("outline");
    setShapeOverlays([]);
    setTextOverlays([]);
    setPixelText("");
    setProjectName("");
    setProjectStarted(true);
  }, [initialWidth, initialHeight]);

  const moveBricks = useCallback((brickIds: string[], deltaRow: number, deltaCol: number) => {
    setBricks((prev) => {
      return prev.map((b) => {
        if (!brickIds.includes(b.id)) return b;
        const newRow = b.row + deltaRow;
        const newCol = b.col + deltaCol;
        // bounds check
        const endRow = b.orientation === "vertical" ? newRow + b.size : newRow + 1;
        const endCol = b.orientation === "vertical" ? newCol + 1 : newCol + b.size;
        if (newRow < 0 || newCol < 0 || endRow > gridHeight || endCol > gridWidth) return b;
        return { ...b, row: newRow, col: newCol };
      });
    });
  }, [gridWidth, gridHeight, setBricks]);

  const hasBricks = bricks.length > 0;
  const hasContent = hasBricks || textOverlays.length > 0 || shapeOverlays.length > 0;

  const exportAsPng = useCallback((includeRefImage?: boolean) => {
    const prefix = projectName ? `${projectName} ` : "";
    const defaultName = `${prefix}Pixcool-art ${timestamp()}.png`;
    const scale = 2;
    const gridPxW = gridWidth * CELL_SIZE;
    const gridPxH = gridHeight * CELL_SIZE;

    const counts: Record<string, { color: string; colorName: string; size: BrickSize; count: number }> = {};
    let minCol = Infinity, minRow = Infinity, maxCol = -Infinity, maxRow = -Infinity;
    for (const b of bricks) {
      const cName = colors.find((c) => c.value === b.color)?.name ?? b.color;
      const key = `${b.color}-${b.size}`;
      if (!counts[key]) counts[key] = { color: b.color, colorName: cName, size: b.size, count: 0 };
      counts[key].count++;
      const isVert = b.orientation === "vertical";
      const bw = isVert ? 1 : b.size;
      const bh = isVert ? b.size : 1;
      if (b.col < minCol) minCol = b.col;
      if (b.row < minRow) minRow = b.row;
      if (b.col + bw - 1 > maxCol) maxCol = b.col + bw - 1;
      if (b.row + bh - 1 > maxRow) maxRow = b.row + bh - 1;
    }
    const occupiedW = bricks.length > 0 ? maxCol - minCol + 1 : 0;
    const occupiedH = bricks.length > 0 ? maxRow - minRow + 1 : 0;
    const legendRows = Object.values(counts).sort((a, b) => a.colorName.localeCompare(b.colorName) || a.size - b.size);
    const sizeLabel = (s: BrickSize) => s === 1 ? "1x1" : `1x${s}`;

    const legendItemH = 22;
    const legendPadding = 12;
    const swatchH = 14;
    const swatchUnitW = 14;
    const legendColW = 200;
    const cols = Math.max(1, Math.floor(gridPxW / legendColW));
    const rows = Math.ceil(legendRows.length / cols);
    const brandH = 28;
    const dimH = bricks.length > 0 ? 16 : 0;
    const legendH = legendRows.length > 0 ? legendPadding * 2 + 20 + rows * legendItemH + 8 + dimH + brandH : brandH + legendPadding * 2 + dimH;

    const canvas = document.createElement("canvas");
    canvas.width = gridPxW * scale;
    canvas.height = (gridPxH + legendH) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);

    const drawRestAndSave = () => {
      const studR = CELL_SIZE * 0.38 * 0.5;
      for (const b of bricks) {
        const x = b.col * CELL_SIZE;
        const y = b.row * CELL_SIZE;
        const isVert = b.orientation === "vertical";
        const w = isVert ? CELL_SIZE : b.size * CELL_SIZE;
        const h = isVert ? b.size * CELL_SIZE : CELL_SIZE;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, w - 2, h * 0.25, 1.5);
        ctx.fill();
        for (let i = 0; i < b.size; i++) {
          const cx = isVert ? x + CELL_SIZE / 2 : x + i * CELL_SIZE + CELL_SIZE / 2;
          const cy = isVert ? y + i * CELL_SIZE + CELL_SIZE / 2 : y + CELL_SIZE / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, studR, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      for (const t of textOverlays) {
        ctx.fillStyle = t.color;
        ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
        ctx.fillText(t.text, t.x, t.y + t.fontSize);
      }
      if (legendRows.length > 0) {
        const ly = gridPxH;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, ly, gridPxW, legendH);
        ctx.strokeStyle = "#d4d4d4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(gridPxW, ly);
        ctx.stroke();
        ctx.fillStyle = "#1c1917";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("Leyenda de Piezas", legendPadding, ly + legendPadding + 11);
        const startY = ly + legendPadding + 24;
        const studMiniR = 3;
        legendRows.forEach((item, i) => {
          const colIdx = Math.floor(i / rows);
          const rowIdx = i % rows;
          const ix = legendPadding + colIdx * legendColW;
          const iy = startY + rowIdx * legendItemH;
          const swatchW = swatchUnitW * item.size;
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.roundRect(ix, iy, swatchW, swatchH, 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.2)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
          for (let s = 0; s < item.size; s++) {
            const sx = ix + s * swatchUnitW + swatchUnitW / 2;
            const sy = iy + swatchH / 2;
            ctx.beginPath();
            ctx.arc(sx, sy, studMiniR, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
          ctx.fillStyle = "#1c1917";
          ctx.font = "10px sans-serif";
          ctx.fillText(`${item.colorName}  ${sizeLabel(item.size)}  x${item.count}`, ix + swatchW + 6, iy + 11);
        });
      }
      {
        const by = gridPxH + legendH - brandH - legendPadding + 4;
        const lx = legendPadding;
        if (bricks.length > 0) {
          ctx.fillStyle = "#1c1917";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText(`Alto: ${occupiedH} por Ancho: ${occupiedW}`, lx, by - 4);
        }
        const ly2 = by + 4;
        const bs = 6;
        const logoColors = ["#DC2626", "#2563EB", "#EAB308", "#16A34A"];
        logoColors.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.roundRect(lx + (i % 2) * bs, ly2 + Math.floor(i / 2) * bs, bs * 2, bs - 1, 1);
          ctx.fill();
        });
        ctx.fillStyle = "#78716C";
        ctx.font = "bold 10px sans-serif";
        const brandText1 = "PixCool Art";
        const brandSpacing = "          ";
        const brandText2 = "Realizado por Ing. Jesús Linares";
        ctx.fillText(brandText1, lx + bs * 4 + 4, by + 14);
        const text1Width = ctx.measureText(brandText1 + brandSpacing).width;
        ctx.font = "9px sans-serif";
        ctx.fillText(brandText2, lx + bs * 4 + 4 + text1Width, by + 14);
      }
      canvas.toBlob((blob) => {
        if (!blob) return;
        saveWithPicker(blob, defaultName, "Imagen PNG", { "image/png": [".png"] });
      }, "image/png");
    };

    ctx.fillStyle = "#f5f5f4";
    ctx.fillRect(0, 0, gridPxW, gridPxH);

    if (includeRefImage && referenceImage && imageTransform.width > 0) {
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = imageOpacity;
        ctx.drawImage(img, imageTransform.x, imageTransform.y, imageTransform.width, imageTransform.height);
        ctx.globalAlpha = 1.0;
        drawRestAndSave();
      };
      img.src = referenceImage;
    } else {
      drawRestAndSave();
    }
  }, [gridWidth, gridHeight, bricks, colors, textOverlays, projectName, referenceImage, imageTransform, imageOpacity]);

  const exportPieceList = useCallback((nameOverride?: string) => {
    const effectiveName = nameOverride ?? projectName;
    const sizeLabel = (s: BrickSize) => s === 1 ? "1x1" : `1x${s}`;
    const counts: Record<string, { color: string; colorName: string; size: BrickSize; count: number }> = {};
    let minCol = Infinity, minRow = Infinity, maxCol = -Infinity, maxRow = -Infinity;
    for (const b of bricks) {
      const cName = colors.find((c) => c.value === b.color)?.name ?? b.color;
      const key = `${b.color}-${b.size}`;
      if (!counts[key]) {
        counts[key] = { color: b.color, colorName: cName, size: b.size, count: 0 };
      }
      counts[key].count++;
      const isVert = b.orientation === "vertical";
      const bw = isVert ? 1 : b.size;
      const bh = isVert ? b.size : 1;
      if (b.col < minCol) minCol = b.col;
      if (b.row < minRow) minRow = b.row;
      if (b.col + bw - 1 > maxCol) maxCol = b.col + bw - 1;
      if (b.row + bh - 1 > maxRow) maxRow = b.row + bh - 1;
    }
    const occupiedW = bricks.length > 0 ? maxCol - minCol + 1 : 0;
    const occupiedH = bricks.length > 0 ? maxRow - minRow + 1 : 0;
    const rows = Object.values(counts).sort((a, b) => a.colorName.localeCompare(b.colorName) || a.size - b.size);

    const totalsBySize: Record<string, number> = {};
    const totalsByColor: Record<string, number> = {};

    let csv = "\uFEFFDimensiones ocupadas,Ancho (celdas),Alto (celdas)\n";
    csv += `,${occupiedW},${occupiedH}\n\n`;
    csv += "Color,Hex,Tamano,Cantidad\n";
    for (const r of rows) {
      const sl = sizeLabel(r.size);
      csv += `${r.colorName},${r.color},${sl},${r.count}\n`;
      totalsBySize[sl] = (totalsBySize[sl] || 0) + r.count;
      totalsByColor[r.colorName] = (totalsByColor[r.colorName] || 0) + r.count;
    }

    csv += "\nTotal por Tamano\n";
    csv += "Tamano,Cantidad\n";
    for (const [size, count] of Object.entries(totalsBySize).sort()) {
      csv += `${size},${count}\n`;
    }

    csv += "\nTotal por Color\n";
    csv += "Color,Cantidad\n";
    for (const [color, count] of Object.entries(totalsByColor).sort()) {
      csv += `${color},${count}\n`;
    }

    const grandTotal = Object.values(totalsByColor).reduce((a, b) => a + b, 0);
    csv += `\nTotal General,,${grandTotal}\n`;
    csv += `\nPixCool Art          Realizado por Ing. Jesús Linares\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const prefix = effectiveName ? `${effectiveName} ` : "";
    saveWithPicker(blob, `${prefix}lista-de-piezas ${timestamp()}.csv`, "Archivo CSV", { "text/csv": [".csv"] });
  }, [bricks, colors, projectName]);

  const saveProject = useCallback((nameOverride?: string) => {
    const effectiveName = nameOverride ?? projectName;
    const prefix = effectiveName ? `${effectiveName} ` : "";
    const fileName = `${prefix}pixcool-art-project ${timestamp()}.json`;
    const doSave = (imageData: string | null) => {
      const project = {
        version: 5,
        projectName: effectiveName,
        gridWidth,
        gridHeight,
        bricks,
        textOverlays,
        shapeOverlays,
        colors,
        selectedColor,
        selectedSize,
        orientation,
        referenceImage: imageData,
        imageOpacity,
        imageVisible,
        imageLocked,
        imageTransform,
      };
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
      saveWithPicker(blob, fileName, "Proyecto PixCool", { "application/json": [".json"] });
    };

    if (referenceImage) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          doSave(canvas.toDataURL("image/png"));
        } else {
          doSave(null);
        }
      };
      img.onerror = () => doSave(null);
      img.src = referenceImage;
    } else {
      doSave(null);
    }
  }, [gridWidth, gridHeight, bricks, textOverlays, shapeOverlays, colors, selectedColor, selectedSize, orientation, referenceImage, imageOpacity, imageVisible, imageLocked, imageTransform, projectName]);

  const loadProject = useCallback(async () => {
    const file = await openWithPicker(".json");
    if (!file) return;
    const text = await file.text();
    try {
      const project = JSON.parse(text);
      if (!project.bricks || !project.gridWidth || !project.gridHeight) return;
      setGridWidth(project.gridWidth);
      setGridHeight(project.gridHeight);

      const loadedBricks: PlacedBrick[] = (project.bricks as PlacedBrick[]).map((b, i) => ({
        ...b,
        id: `brick-${idCounter.current + i}`,
      }));
      idCounter.current += loadedBricks.length;
      setBricks(loadedBricks);

      // Load text overlays
      if (project.textOverlays && Array.isArray(project.textOverlays)) {
        setTextOverlays(project.textOverlays);
      } else {
        setTextOverlays([]);
      }

      // Load shape overlays
      if (project.shapeOverlays && Array.isArray(project.shapeOverlays)) {
        setShapeOverlays(project.shapeOverlays);
      } else {
        setShapeOverlays([]);
      }

      // Load custom colors
      if (project.colors && Array.isArray(project.colors) && project.colors.length > 0) {
        setColors(project.colors);
      }

      if (project.selectedColor) setSelectedColor(project.selectedColor);
      if (project.selectedSize) setSelectedSize(project.selectedSize);
      if (project.orientation) setOrientation(project.orientation);
      if (project.referenceImage) {
        setReferenceImage(project.referenceImage);
        setExtraImages([]);
        if (project.imageTransform) setImageTransform(project.imageTransform);
        if (project.imageOpacity !== undefined) setImageOpacity(project.imageOpacity);
        if (project.imageVisible !== undefined) setImageVisible(project.imageVisible);
        if (project.imageLocked !== undefined) setImageLocked(project.imageLocked);
      } else {
        setReferenceImage(null);
        setExtraImages([]);
      }
      setTool("place");
      setProjectStarted(true);
      if (project.projectName) setProjectName(project.projectName);
    } catch {
      // invalid file
    }
  }, []);

  return {
    gridWidth,
    gridHeight,
    bricks,
    hasBricks,
    hasContent,
    colors,
    addColor,
    replaceColor,
    removeColor,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    referenceImage,
    extraImages,
    imageOpacity,
    setImageOpacity,
    imageVisible,
    setImageVisible,
    imageLocked,
    setImageLocked,
    imageEditMode,
    setImageEditMode,
    imageTransform,
    setImageTransform,
    gridVisible,
    setGridVisible,
    cursorTrackerVisible,
    setCursorTrackerVisible,
    tool,
    setTool,
    placeBrick,
    clearAll,
    canPlace,
    getCellOccupant,
    handleImageUpload,
    removeImage,
    updateGridSize,
    newProject,
    projectStarted,
    setProjectStarted,
    projectName,
    setProjectName,
    exportAsPng,
    orientation,
    exportPieceList,
    setOrientation,
    saveProject,
    loadProject,
    undo,
    redo,
    canUndo,
    canRedo,
    moveBricks,
    // Text tools
    textOverlays,
    pixelText,
    setPixelText,
    textFontSize,
    setTextFontSize,
    textFontFamily,
    setTextFontFamily,
    textBold,
    setTextBold,
    textItalic,
    setTextItalic,
    updateTextOverlay,
    removeTextOverlay,
    // Shape tools
    shapeType,
    setShapeType,
    shapeFillMode,
    setShapeFillMode,
    shapeOverlays,
    addShapeOverlay,
    updateShapeOverlay,
    removeShapeOverlay,
  };
}
