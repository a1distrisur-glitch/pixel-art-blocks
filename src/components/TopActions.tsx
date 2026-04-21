import { FolderOpen, Trash2, FilePlus2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopActionsProps {
  hasBricks: boolean;
  hasImage: boolean;
  onLoadProject: () => void;
  onClear: () => void;
  onSaveProject: () => void;
  onExportPieces: () => void;
  onOpenWelcome: () => void;
  /** Visual variant: "floating" for desktop overlay, "inline" for top bars */
  variant?: "floating" | "inline";
  className?: string;
}

interface BtnProps {
  onClick: () => void;
  title: string;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
  children: React.ReactNode;
}

function Btn({ onClick, title, variant = "default", disabled, children }: BtnProps) {
  const styles =
    variant === "danger"
      ? "text-destructive hover:bg-destructive/10"
      : variant === "primary"
      ? "text-primary hover:bg-primary/10"
      : "text-toolbar-foreground hover:bg-toolbar-hover";
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none",
        styles,
      )}
    >
      {children}
    </button>
  );
}

export default function TopActions({
  hasBricks,
  hasImage,
  onLoadProject,
  onClear,
  onSaveProject,
  onExportPieces,
  onOpenWelcome,
  variant = "floating",
  className,
}: TopActionsProps) {
  const wrapper =
    variant === "floating"
      ? "fixed top-3 right-3 z-30 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-toolbar/95 backdrop-blur border border-toolbar-border toolbar-shadow"
      : "flex items-center gap-0.5";

  return (
    <div className={cn(wrapper, className)}>
      {variant === "floating" && (
        <button
          type="button"
          aria-label="Abrir bienvenida"
          title="Abrir bienvenida"
          onClick={onOpenWelcome}
          className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-toolbar-hover transition-colors"
        >
          <img src="/icon-192.png" alt="PixCool Art" className="w-6 h-6 rounded-md object-cover" />
        </button>
      )}
      <Btn title="Cargar proyecto" onClick={onLoadProject}>
        <FolderOpen size={18} />
      </Btn>
      <Btn title="Eliminar todo" variant="danger" onClick={onClear}>
        <Trash2 size={18} />
      </Btn>
      <Btn title="Guardar proyecto" onClick={onSaveProject}>
        <FilePlus2 size={18} />
      </Btn>
      <Btn title="Exportar piezas" variant="primary" onClick={onExportPieces} disabled={!hasBricks}>
        <Download size={18} />
      </Btn>
    </div>
  );
}
