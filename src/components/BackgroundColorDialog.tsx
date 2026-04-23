import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

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

interface BackgroundColorDialogProps {
  open: boolean;
  title: string;
  initialColor: string;
  /** Resolved color shown as "Actual" when initialColor is null/transparent — typically the current rendered fallback */
  baseColor: string;
  onAccept: (hex: string) => void;
  onCancel: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}

export default function BackgroundColorDialog({
  open,
  title,
  initialColor,
  baseColor,
  onAccept,
  onCancel,
  onRemove,
  removeLabel = "Eliminar Fondo",
}: BackgroundColorDialogProps) {
  const initial = normalizeHex(initialColor) ?? "#FFFFFF";
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [value, setValue] = useState(100);
  const [hexInput, setHexInput] = useState(initial);
  const colorMapRef = useRef<HTMLDivElement>(null);

  const activeHex = hsvToHex(hue, saturation, value);

  useEffect(() => {
    if (!open) return;
    const normalized = normalizeHex(initialColor) ?? "#FFFFFF";
    const next = hexToHsv(normalized);
    setHue(next.h);
    setSaturation(next.s);
    setValue(next.v);
    setHexInput(normalized);
  }, [open, initialColor]);

  useEffect(() => {
    setHexInput(activeHex);
  }, [activeHex]);

  const updateFromMapPointer = useCallback((clientX: number, clientY: number) => {
    if (!colorMapRef.current) return;
    const rect = colorMapRef.current.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    setSaturation((x / rect.width) * 100);
    setValue(100 - (y / rect.height) * 100);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-toolbar-border bg-toolbar p-5 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
          <button onClick={onCancel}
            className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-[1fr_100px] gap-4">
          <div>
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
            <div className="mt-3">
              <input type="range" min={0} max={360} value={hue}
                onChange={(e) => setHue(Number(e.target.value))}
                className="hue-slider w-full" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-medium text-white mb-1">Actual</p>
              <div className="h-10 rounded-lg border border-input" style={{ backgroundColor: baseColor }} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-white mb-1">Nuevo</p>
              <div className="h-10 rounded-lg border border-input" style={{ backgroundColor: activeHex }} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-white">HEX</label>
              <input type="text" value={hexInput}
                onChange={(e) => {
                  const raw = e.target.value.toUpperCase();
                  setHexInput(raw);
                  const parsed = normalizeHex(raw);
                  if (!parsed) return;
                  const nextHsv = hexToHsv(parsed);
                  setHue(nextHsv.h); setSaturation(nextHsv.s); setValue(nextHsv.v);
                }}
                className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-[13px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {onRemove ? (
            <button onClick={onRemove}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm">
              {removeLabel}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button onClick={() => onAccept(normalizeHex(hexInput) ?? activeHex)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
