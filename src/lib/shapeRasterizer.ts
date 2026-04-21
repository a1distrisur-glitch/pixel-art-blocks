// Shape rasterization: returns array of {row, col} cells for a given shape within a bounding box

export type ShapeType =
  | "line"
  | "rectangle"
  | "roundedRect"
  | "ellipse"
  | "triangle"
  | "rightTriangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "arrowRight"
  | "arrowLeft"
  | "arrowUp"
  | "arrowDown"
  | "star5"
  | "star6"
  | "heart";

export type ShapeFillMode = "outline" | "fill" | "both";

interface Cell { row: number; col: number; }

function unique(cells: Cell[]): Cell[] {
  const set = new Set<string>();
  return cells.filter((c) => {
    const k = `${c.row},${c.col}`;
    if (set.has(k)) return false;
    set.add(k);
    return true;
  });
}

// Bresenham line
function lineCells(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cells: Cell[] = [];
  let dr = Math.abs(r2 - r1), dc = Math.abs(c2 - c1);
  let sr = r1 < r2 ? 1 : -1, sc = c1 < c2 ? 1 : -1;
  let err = dc - dr;
  let r = r1, c = c1;
  while (true) {
    cells.push({ row: r, col: c });
    if (r === r2 && c === c2) break;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c += sc; }
    if (e2 < dc) { err += dc; r += sr; }
  }
  return cells;
}

// Rectangle outline
function rectOutline(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cells: Cell[] = [];
  for (let c = c1; c <= c2; c++) { cells.push({ row: r1, col: c }); cells.push({ row: r2, col: c }); }
  for (let r = r1 + 1; r < r2; r++) { cells.push({ row: r, col: c1 }); cells.push({ row: r, col: c2 }); }
  return cells;
}

function rectFill(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) cells.push({ row: r, col: c });
  return cells;
}

// Ellipse (midpoint algorithm)
function ellipseOutline(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cx = (c1 + c2) / 2, cy = (r1 + r2) / 2;
  const rx = (c2 - c1) / 2, ry = (r2 - r1) / 2;
  if (rx < 0.5 || ry < 0.5) return lineCells(r1, c1, r2, c2);
  const cells: Cell[] = [];
  const plot = (r: number, c: number) => cells.push({ row: Math.round(r), col: Math.round(c) });
  // Plot 4 quadrants
  for (let angle = 0; angle <= 360; angle += 0.5) {
    const rad = (angle * Math.PI) / 180;
    plot(cy + ry * Math.sin(rad), cx + rx * Math.cos(rad));
  }
  return unique(cells);
}

function ellipseFill(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cx = (c1 + c2) / 2, cy = (r1 + r2) / 2;
  const rx = (c2 - c1) / 2, ry = (r2 - r1) / 2;
  if (rx < 0.5 || ry < 0.5) return lineCells(r1, c1, r2, c2);
  const cells: Cell[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const dx = (c - cx) / rx, dy = (r - cy) / ry;
      if (dx * dx + dy * dy <= 1.05) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

// Polygon helper: rasterize polygon outline and fill
function polygonOutline(points: [number, number][]): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < points.length; i++) {
    const [r1, c1] = points[i];
    const [r2, c2] = points[(i + 1) % points.length];
    cells.push(...lineCells(Math.round(r1), Math.round(c1), Math.round(r2), Math.round(c2)));
  }
  return unique(cells);
}

function polygonFill(points: [number, number][], r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (pointInPolygon(r, c, points)) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function pointInPolygon(r: number, c: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ri, ci] = poly[i], [rj, cj] = poly[j];
    if ((ri > r) !== (rj > r) && c < ((cj - ci) * (r - ri)) / (rj - ri) + ci) inside = !inside;
  }
  return inside;
}

// Rounded rectangle
function roundedRectOutline(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const w = c2 - c1, h = r2 - r1;
  const radius = Math.max(1, Math.min(Math.floor(Math.min(w, h) / 4), 3));
  const cells: Cell[] = [];
  // Top/bottom edges (minus corners)
  for (let c = c1 + radius; c <= c2 - radius; c++) { cells.push({ row: r1, col: c }); cells.push({ row: r2, col: c }); }
  // Left/right edges (minus corners)
  for (let r = r1 + radius; r <= r2 - radius; r++) { cells.push({ row: r, col: c1 }); cells.push({ row: r, col: c2 }); }
  // Corners (quarter circles)
  const corners = [[r1 + radius, c1 + radius], [r1 + radius, c2 - radius], [r2 - radius, c1 + radius], [r2 - radius, c2 - radius]];
  for (let angle = 0; angle <= 90; angle++) {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.round(radius * Math.cos(rad));
    const dy = Math.round(radius * Math.sin(rad));
    cells.push({ row: corners[0][0] - dy, col: corners[0][1] - dx }); // top-left
    cells.push({ row: corners[1][0] - dy, col: corners[1][1] + dx }); // top-right
    cells.push({ row: corners[2][0] + dy, col: corners[2][1] - dx }); // bottom-left
    cells.push({ row: corners[3][0] + dy, col: corners[3][1] + dx }); // bottom-right
  }
  return unique(cells);
}

// Triangle (isosceles, point at top center)
function trianglePoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const topC = (c1 + c2) / 2;
  return [[r1, topC], [r2, c2], [r2, c1]];
}

// Right triangle
function rightTrianglePoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  return [[r1, c1], [r2, c2], [r2, c1]];
}

// Diamond
function diamondPoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const midR = (r1 + r2) / 2, midC = (c1 + c2) / 2;
  return [[r1, midC], [midR, c2], [r2, midC], [midR, c1]];
}

// Pentagon
function pentagonPoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const cx = (c1 + c2) / 2, cy = (r1 + r2) / 2;
  const rx = (c2 - c1) / 2, ry = (r2 - r1) / 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (-90 + i * 72) * Math.PI / 180;
    pts.push([cy + ry * Math.sin(angle), cx + rx * Math.cos(angle)]);
  }
  return pts;
}

// Hexagon
function hexagonPoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const cx = (c1 + c2) / 2, cy = (r1 + r2) / 2;
  const rx = (c2 - c1) / 2, ry = (r2 - r1) / 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (-90 + i * 60) * Math.PI / 180;
    pts.push([cy + ry * Math.sin(angle), cx + rx * Math.cos(angle)]);
  }
  return pts;
}

// Star helper
function starPoints(r1: number, c1: number, r2: number, c2: number, n: number): [number, number][] {
  const cx = (c1 + c2) / 2, cy = (r1 + r2) / 2;
  const rx = (c2 - c1) / 2, ry = (r2 - r1) / 2;
  const innerRatio = 0.4;
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const angle = (-90 + i * (360 / (n * 2))) * Math.PI / 180;
    const ratio = i % 2 === 0 ? 1 : innerRatio;
    pts.push([cy + ry * ratio * Math.sin(angle), cx + rx * ratio * Math.cos(angle)]);
  }
  return pts;
}

// Arrow right
function arrowRightPoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const h = r2 - r1, w = c2 - c1;
  const shaftTop = r1 + h * 0.3, shaftBot = r2 - h * 0.3;
  const headStart = c1 + w * 0.6;
  return [[shaftTop, c1], [shaftTop, headStart], [r1, headStart], [(r1 + r2) / 2, c2], [r2, headStart], [shaftBot, headStart], [shaftBot, c1]];
}

function arrowLeftPoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const h = r2 - r1, w = c2 - c1;
  const shaftTop = r1 + h * 0.3, shaftBot = r2 - h * 0.3;
  const headEnd = c2 - w * 0.6;
  return [[shaftTop, c2], [shaftTop, headEnd], [r1, headEnd], [(r1 + r2) / 2, c1], [r2, headEnd], [shaftBot, headEnd], [shaftBot, c2]];
}

function arrowUpPoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const h = r2 - r1, w = c2 - c1;
  const shaftLeft = c1 + w * 0.3, shaftRight = c2 - w * 0.3;
  const headEnd = r1 + h * 0.4;
  return [[r1, (c1 + c2) / 2], [headEnd, c2], [headEnd, shaftRight], [r2, shaftRight], [r2, shaftLeft], [headEnd, shaftLeft], [headEnd, c1]];
}

function arrowDownPoints(r1: number, c1: number, r2: number, c2: number): [number, number][] {
  const h = r2 - r1, w = c2 - c1;
  const shaftLeft = c1 + w * 0.3, shaftRight = c2 - w * 0.3;
  const headStart = r2 - h * 0.4;
  return [[r1, shaftLeft], [r1, shaftRight], [headStart, shaftRight], [headStart, c2], [r2, (c1 + c2) / 2], [headStart, c1], [headStart, shaftLeft]];
}

// Heart
function heartPoints(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cx = (c1 + c2) / 2, w = c2 - c1, h = r2 - r1;
  const cells: Cell[] = [];
  for (let angle = 0; angle <= 360; angle += 0.5) {
    const rad = (angle * Math.PI) / 180;
    // Heart parametric
    const x = 16 * Math.pow(Math.sin(rad), 3);
    const y = -(13 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad));
    const col = Math.round(cx + (x / 16) * (w / 2));
    const row = Math.round(r1 + h * 0.1 + ((y + 17) / 34) * h * 0.9);
    cells.push({ row, col });
  }
  return unique(cells);
}

function heartFill(r1: number, c1: number, r2: number, c2: number): Cell[] {
  const cx = (c1 + c2) / 2, w = c2 - c1, h = r2 - r1;
  const cells: Cell[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      // Normalize to heart space
      const nx = ((c - cx) / (w / 2)) * 16;
      const ny = ((r - r1 - h * 0.1) / (h * 0.9)) * 34 - 17;
      // Heart implicit equation: (x² + y² - 1)³ - x²y³ ≤ 0
      const sx = nx / 16, sy = -ny / 17;
      const v = (sx * sx + sy * sy - 1);
      if (v * v * v - sx * sx * sy * sy * sy <= 0.05) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export function rasterizeShape(
  shape: ShapeType,
  fillMode: ShapeFillMode,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): Cell[] {
  const r1 = Math.min(startRow, endRow);
  const r2 = Math.max(startRow, endRow);
  const c1 = Math.min(startCol, endCol);
  const c2 = Math.max(startCol, endCol);

  if (r1 === r2 && c1 === c2) return [{ row: r1, col: c1 }];

  switch (shape) {
    case "line":
      return lineCells(startRow, startCol, endRow, endCol);

    case "rectangle": {
      if (fillMode === "outline") return unique(rectOutline(r1, c1, r2, c2));
      if (fillMode === "fill") return rectFill(r1, c1, r2, c2);
      return unique([...rectFill(r1, c1, r2, c2)]);
    }

    case "roundedRect": {
      if (fillMode === "outline") return roundedRectOutline(r1, c1, r2, c2);
      if (fillMode === "fill") return rectFill(r1, c1, r2, c2); // fill is same as rect
      return unique([...rectFill(r1, c1, r2, c2)]);
    }

    case "ellipse": {
      if (fillMode === "outline") return ellipseOutline(r1, c1, r2, c2);
      if (fillMode === "fill") return ellipseFill(r1, c1, r2, c2);
      return unique([...ellipseFill(r1, c1, r2, c2)]);
    }

    case "triangle": {
      const pts = trianglePoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "rightTriangle": {
      const pts = rightTrianglePoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "diamond": {
      const pts = diamondPoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "pentagon": {
      const pts = pentagonPoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "hexagon": {
      const pts = hexagonPoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "arrowRight": {
      const pts = arrowRightPoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "arrowLeft": {
      const pts = arrowLeftPoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "arrowUp": {
      const pts = arrowUpPoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "arrowDown": {
      const pts = arrowDownPoints(r1, c1, r2, c2);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "star5": {
      const pts = starPoints(r1, c1, r2, c2, 5);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "star6": {
      const pts = starPoints(r1, c1, r2, c2, 6);
      if (fillMode === "outline") return polygonOutline(pts);
      if (fillMode === "fill") return unique(polygonFill(pts, r1, c1, r2, c2));
      return unique([...polygonFill(pts, r1, c1, r2, c2), ...polygonOutline(pts)]);
    }

    case "heart": {
      if (fillMode === "outline") return heartPoints(r1, c1, r2, c2);
      if (fillMode === "fill") return heartFill(r1, c1, r2, c2);
      return unique([...heartFill(r1, c1, r2, c2), ...heartPoints(r1, c1, r2, c2)]);
    }

    default:
      return [];
  }
}

export const SHAPE_LIST: { type: ShapeType; label: string }[] = [
  { type: "line", label: "Línea" },
  { type: "rectangle", label: "Rectángulo" },
  { type: "roundedRect", label: "Rect. redondeado" },
  { type: "ellipse", label: "Elipse" },
  { type: "triangle", label: "Triángulo" },
  { type: "rightTriangle", label: "Triáng. recto" },
  { type: "diamond", label: "Rombo" },
  { type: "pentagon", label: "Pentágono" },
  { type: "hexagon", label: "Hexágono" },
  { type: "arrowRight", label: "Flecha →" },
  { type: "arrowLeft", label: "Flecha ←" },
  { type: "arrowUp", label: "Flecha ↑" },
  { type: "arrowDown", label: "Flecha ↓" },
  { type: "star5", label: "Estrella 5" },
  { type: "star6", label: "Estrella 6" },
  { type: "heart", label: "Corazón" },
];
