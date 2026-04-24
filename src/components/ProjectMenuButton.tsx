import { Menu, FolderOpen, FilePlus2, Download, LogOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ProjectMenuButtonProps {
  hasBricks: boolean;
  onLoadProject: () => void;
  onSaveProject: () => void;
  onExportPieces: () => void;
  onExit: () => void;
}

interface ItemProps {
  onClick: () => void;
  title: string;
  variant?: "default" | "primary";
  disabled?: boolean;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}

function Item({ onClick, title, variant = "default", disabled, active, icon, label }: ItemProps) {
  const styles = active
    ? "bg-primary text-primary-foreground"
    : variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "text-toolbar-foreground hover:bg-toolbar-hover";
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 w-full px-2.5 h-9 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none",
        styles,
      )}
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

export default function ProjectMenuButton({
  hasBricks,
  onLoadProject,
  onSaveProject,
  onExportPieces,
  onExit,
}: ProjectMenuButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Menú de proyecto"
          title="Proyecto"
          className="flex items-center justify-center w-9 h-9 rounded-md text-toolbar-foreground hover:bg-toolbar-hover transition-colors"
        >
          <Menu size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-52 p-1.5 bg-toolbar border-toolbar-border"
      >
        <div className="flex flex-col gap-0.5">
          <Item
            title="Cargar proyecto"
            label="Cargar proyecto"
            onClick={onLoadProject}
            icon={<FolderOpen size={16} />}
          />
          <Item
            title="Guardar proyecto"
            label="Guardar proyecto"
            onClick={onSaveProject}
            icon={<FilePlus2 size={16} />}
          />
          <Item
            title="Exportar piezas"
            label="Exportar piezas"
            variant="primary"
            onClick={onExportPieces}
            disabled={!hasBricks}
            active={hasBricks}
            icon={<Download size={16} />}
          />
          <Item
            title="Salir"
            label="Salir"
            onClick={onExit}
            icon={<LogOut size={16} />}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
