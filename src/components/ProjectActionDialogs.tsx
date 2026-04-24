import { useCallback, useState } from "react";

type ProjectNameAction = "save" | "pieces" | "png";

interface ProjectActionDialogsProps {
  showSaveDialog: boolean;
  onSaveDialogChange: (open: boolean) => void;
  showConfirmNewDialog: boolean;
  onConfirmNewDialogChange: (open: boolean) => void;
  showLoadDialog: boolean;
  onLoadDialogChange: (open: boolean) => void;
  showClearDialog: boolean;
  onClearDialogChange: (open: boolean) => void;
  showPiecesDialog: boolean;
  onPiecesDialogChange: (open: boolean) => void;
  showExportPngDialog: boolean;
  onExportPngDialogChange: (open: boolean) => void;
  showRemoveImageDialog: boolean;
  onRemoveImageDialogChange: (open: boolean) => void;
  showExitDialog: boolean;
  onExitDialogChange: (open: boolean) => void;
  hasImage: boolean;
  projectName: string;
  onProjectStart: (name: string) => void;
  onNewProject: () => void;
  onLoadProject: () => void;
  onClear: () => void;
  onSaveProject: (nameOverride?: string) => void;
  onExportPieceList: (nameOverride?: string) => void;
  onExport: (includeRefImage?: boolean) => void;
  onRemoveImage: () => void;
  onExit: () => void;
}

const panelClass = "bg-toolbar text-toolbar-foreground rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-toolbar-border";
const titleClass = "text-base font-semibold text-toolbar-foreground mb-2";
const descriptionClass = "text-sm text-toolbar-foreground/75 mb-5";
const secondaryBtn = "px-4 py-2 rounded-lg text-sm font-medium bg-toolbar-section text-toolbar-foreground hover:bg-toolbar-hover transition-colors";
const primaryBtn = "px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors";
const dangerBtn = "px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors";
const successBtn = "px-4 py-2 rounded-lg text-sm font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors";

export default function ProjectActionDialogs({
  showSaveDialog,
  onSaveDialogChange,
  showConfirmNewDialog,
  onConfirmNewDialogChange,
  showLoadDialog,
  onLoadDialogChange,
  showClearDialog,
  onClearDialogChange,
  showPiecesDialog,
  onPiecesDialogChange,
  showExportPngDialog,
  onExportPngDialogChange,
  showRemoveImageDialog,
  onRemoveImageDialogChange,
  showExitDialog,
  onExitDialogChange,
  hasImage,
  projectName,
  onProjectStart,
  onNewProject,
  onLoadProject,
  onClear,
  onSaveProject,
  onExportPieceList,
  onExport,
  onRemoveImage,
  onExit,
}: ProjectActionDialogsProps) {
  const [showProjectNamePrompt, setShowProjectNamePrompt] = useState(false);
  const [projectNamePromptAction, setProjectNamePromptAction] = useState<ProjectNameAction | null>(null);
  const [pendingAfterPromptAction, setPendingAfterPromptAction] = useState<(() => void) | null>(null);
  const [nameInput, setNameInput] = useState("");

  const ensureProjectName = useCallback((action: ProjectNameAction, afterAction?: () => void) => {
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

  const acceptProjectName = useCallback(() => {
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
  }, [nameInput, onExportPieceList, onProjectStart, onSaveProject, pendingAfterPromptAction, projectNamePromptAction]);

  return (
    <>
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="save-project-dialog-title">
            <h3 id="save-project-dialog-title" className="text-base font-semibold text-toolbar-foreground mb-6 text-center">Guardar Proyecto</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              <button type="button" onClick={() => onSaveDialogChange(false)} className={secondaryBtn}>Cancelar</button>
              <button type="button" onClick={() => { onSaveDialogChange(false); ensureProjectName("save"); }} className={primaryBtn}>Guardar</button>
              <button type="button" onClick={() => { onSaveDialogChange(false); onConfirmNewDialogChange(true); }} className={dangerBtn}>Nuevo</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="confirm-new-dialog-title">
            <h3 id="confirm-new-dialog-title" className="text-base font-semibold text-toolbar-foreground mb-4 text-center">¿Desea Perder Los Cambios?</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              <button type="button" onClick={() => onConfirmNewDialogChange(false)} className={secondaryBtn}>Cancelar</button>
              <button type="button" onClick={() => { onConfirmNewDialogChange(false); onNewProject(); }} className={dangerBtn}>Sí, Nuevo</button>
            </div>
          </div>
        </div>
      )}

      {showLoadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="load-project-dialog-title">
            <h3 id="load-project-dialog-title" className={titleClass}>¿Cargar proyecto?</h3>
            <p className={descriptionClass}>Se perderán todos los bloques y la imagen de referencia actual.</p>
            <div className="flex gap-2 justify-end flex-nowrap items-center">
              <button type="button" onClick={() => onLoadDialogChange(false)} className={secondaryBtn}>Cancelar</button>
              <button type="button" onClick={() => { onLoadDialogChange(false); ensureProjectName("save", onLoadProject); }} className={primaryBtn}>Guardar</button>
              <button type="button" onClick={() => { onLoadDialogChange(false); onLoadProject(); }} className={`${dangerBtn} whitespace-nowrap`}>Cargar Sin Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="clear-dialog-title">
            <h3 id="clear-dialog-title" className={titleClass}>¿Limpiar todo?</h3>
            <p className={descriptionClass}>Se eliminarán todos los bloques colocados en el lienzo.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => onClearDialogChange(false)} className={secondaryBtn}>Cancelar</button>
              <button type="button" onClick={() => { onClearDialogChange(false); onClear(); }} className={dangerBtn}>Limpiar</button>
            </div>
          </div>
        </div>
      )}

      {showPiecesDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="pieces-dialog-title">
            <h3 id="pieces-dialog-title" className={titleClass}>Exportar piezas</h3>
            <p className={descriptionClass}>Elige cómo deseas exportar la lista de piezas.</p>
            <div className="flex gap-2 justify-end flex-wrap">
              <button type="button" onClick={() => onPiecesDialogChange(false)} className={secondaryBtn}>Cancelar</button>
              <button type="button" onClick={() => { onPiecesDialogChange(false); ensureProjectName("pieces"); }} className={successBtn}>Piezas</button>
              <button type="button" onClick={() => { onPiecesDialogChange(false); ensureProjectName("png", () => { if (hasImage) onExportPngDialogChange(true); else onExport(false); }); }} className={primaryBtn}>Imagen PNG</button>
            </div>
          </div>
        </div>
      )}

      {showExportPngDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="export-png-dialog-title">
            <h3 id="export-png-dialog-title" className={titleClass}>Exportar como PNG</h3>
            <p className={descriptionClass}>¿Desea agregar la imagen de referencia al PNG exportado?</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { onExportPngDialogChange(false); onExport(true); }} className={secondaryBtn}>Agregar</button>
              <button type="button" onClick={() => { onExportPngDialogChange(false); onExport(false); }} className={primaryBtn}>No Agregar</button>
            </div>
          </div>
        </div>
      )}

      {showRemoveImageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="remove-image-dialog-title">
            <h3 id="remove-image-dialog-title" className={titleClass}>¿Eliminar imagen de referencia?</h3>
            <p className={descriptionClass}>Se eliminará la imagen de referencia del lienzo.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => onRemoveImageDialogChange(false)} className={secondaryBtn}>Cancelar</button>
              <button type="button" onClick={() => { onRemoveImageDialogChange(false); onRemoveImage(); }} className={dangerBtn}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div
            className="bg-toolbar-section rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-toolbar-border"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-dialog-title"
          >
            <h3 id="exit-dialog-title" className="text-base font-semibold text-white mb-2 text-center">
              ¿Salir de la aplicación?
            </h3>
            <p className="text-sm text-white/90 mb-5 text-center">
              Se cerrará el editor. Los cambios no guardados se perderán.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => onExitDialogChange(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-toolbar text-white hover:bg-toolbar-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onExitDialogChange(false); onExit(); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className={panelClass} role="dialog" aria-modal="true" aria-labelledby="project-name-dialog-title">
            <h3 id="project-name-dialog-title" className={titleClass}>Nombre del proyecto</h3>
            <p className="text-sm text-toolbar-foreground/75 mb-4">Asigna un nombre a tu proyecto antes de continuar.</p>
            <input
              id="project-name-prompt-input"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") acceptProjectName(); }}
              placeholder="Mi proyecto"
              className="w-full rounded-lg border border-toolbar-border bg-toolbar-section px-3 py-2 text-sm text-toolbar-foreground placeholder:text-toolbar-muted focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowProjectNamePrompt(false); setProjectNamePromptAction(null); setPendingAfterPromptAction(null); }} className={secondaryBtn}>Cancelar</button>
              <button type="button" onClick={acceptProjectName} className={primaryBtn}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}