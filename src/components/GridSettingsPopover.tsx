import { useEffect, useState } from "react";
import { Grid3x3, Eye, EyeOff, Crosshair } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface GridSettingsPopoverProps {
  gridWidth: number;
  gridHeight: number;
  onGridSizeChange: (w: number, h: number) => void;
  gridVisible: boolean;
  onGridVisibleChange: (v: boolean) => void;
  cursorTrackerVisible: boolean;
  onCursorTrackerVisibleChange: (v: boolean) => void;
  buttonClassName?: string;
}

export default function GridSettingsPopover({
  gridWidth,
  gridHeight,
  onGridSizeChange,
  gridVisible,
  onGridVisibleChange,
  cursorTrackerVisible,
  onCursorTrackerVisibleChange,
  buttonClassName,
}: GridSettingsPopoverProps) {
  const inputClass =
    "h-7 w-[52px] px-1 rounded-md border border-toolbar-border bg-toolbar text-toolbar-foreground text-[11px] text-center outline-none focus:ring-1 focus:ring-primary";

  const [wText, setWText] = useState<string>(String(gridWidth));
  const [hText, setHText] = useState<string>(String(gridHeight));

  useEffect(() => setWText(String(gridWidth)), [gridWidth]);
  useEffect(() => setHText(String(gridHeight)), [gridHeight]);

  const clamp = (n: number) => Math.max(1, Math.min(96, n));

  const handleWChange = (raw: string) => {
    if (raw === "") {
      setWText("");
      return;
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const c = clamp(n);
    setWText(String(c));
    if (c !== gridWidth) onGridSizeChange(c, gridHeight);
  };

  const handleHChange = (raw: string) => {
    if (raw === "") {
      setHText("");
      return;
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const c = clamp(n);
    setHText(String(c));
    if (c !== gridHeight) onGridSizeChange(gridWidth, c);
  };

  const handleWBlur = () => {
    if (wText === "" || Number.isNaN(parseInt(wText, 10))) {
      setWText(String(gridWidth));
    }
  };
  const handleHBlur = () => {
    if (hText === "" || Number.isNaN(parseInt(hText, 10))) {
      setHText(String(gridHeight));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Cuadrícula"
          title="Cuadrícula"
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-md text-toolbar-foreground hover:bg-toolbar-hover transition-colors",
            buttonClassName,
          )}
        >
          <Grid3x3 size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-auto p-2 bg-toolbar border-toolbar-border"
      >
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-toolbar-foreground">H</span>
            <input
              type="number"
              min={1}
              max={96}
              value={wText}
              onChange={(e) => handleWChange(e.target.value)}
              onBlur={handleWBlur}
              className={inputClass}
            />
          </label>
          <span className="text-toolbar-foreground text-[10px]">×</span>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-toolbar-foreground">V</span>
            <input
              type="number"
              min={1}
              max={96}
              value={hText}
              onChange={(e) => handleHChange(e.target.value)}
              onBlur={handleHBlur}
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={() => onGridVisibleChange(!gridVisible)}
            title={gridVisible ? "Ocultar cuadrícula" : "Mostrar cuadrícula"}
            aria-label={gridVisible ? "Ocultar cuadrícula" : "Mostrar cuadrícula"}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
              gridVisible
                ? "bg-primary text-primary-foreground"
                : "text-toolbar-foreground hover:bg-toolbar-hover",
            )}
          >
            {gridVisible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            type="button"
            onClick={() => onCursorTrackerVisibleChange(!cursorTrackerVisible)}
            title={cursorTrackerVisible ? "Ocultar posición del cursor" : "Mostrar posición del cursor"}
            aria-label={cursorTrackerVisible ? "Ocultar posición del cursor" : "Mostrar posición del cursor"}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
              cursorTrackerVisible
                ? "bg-primary text-primary-foreground"
                : "text-toolbar-foreground hover:bg-toolbar-hover",
            )}
          >
            <Crosshair size={13} />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
