// Brick Editor v2
import { useEffect, useState, useCallback } from "react";
import { useBrickEditor } from "@/hooks/useBrickEditor";
import Toolbar from "@/components/Toolbar";
import BrickGrid from "@/components/BrickGrid";
import MobileToolbar from "@/components/MobileToolbar";
import TopActions from "@/components/TopActions";
import WelcomeDialog from "@/components/WelcomeDialog";
import ProjectActionDialogs from "@/components/ProjectActionDialogs";
import { useBreakpoint } from "@/hooks/use-breakpoint";

export default function BrickEditor() {
  const editor = useBrickEditor();
  const [pipetteColor, setPipetteColor] = useState<string | null>(null);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showConfirmNewDialog, setShowConfirmNewDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPiecesDialog, setShowPiecesDialog] = useState(false);
  const [showExportPngDialog, setShowExportPngDialog] = useState(false);
  const [showRemoveImageDialog, setShowRemoveImageDialog] = useState(false);
  const clearPipetteColor = useCallback(() => setPipetteColor(null), []);
  const openWelcomeDialog = useCallback(() => setShowWelcomeDialog(true), []);
  const closeWelcomeDialog = useCallback(() => setShowWelcomeDialog(false), []);
  const isCompact = useBreakpoint(1024);
  const handleProjectStart = useCallback((name: string) => {
    editor.setProjectName(name);
    editor.setProjectStarted(true);
  }, [editor.setProjectName, editor.setProjectStarted]);

  const openLoadDialog = useCallback(() => {
    if (editor.hasBricks || !!editor.referenceImage) setShowLoadDialog(true);
    else editor.loadProject();
  }, [editor.hasBricks, editor.referenceImage, editor.loadProject]);

  const openClearDialog = useCallback(() => setShowClearDialog(true), []);

  const openSaveDialog = useCallback(() => {
    if (editor.hasBricks || !!editor.referenceImage) setShowSaveDialog(true);
    else editor.newProject();
  }, [editor.hasBricks, editor.referenceImage, editor.newProject]);

  const openPiecesDialog = useCallback(() => setShowPiecesDialog(true), []);
  const openRemoveImageDialog = useCallback(() => setShowRemoveImageDialog(true), []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor.undo, editor.redo]);

  const toolbarEl = (
    <Toolbar
        selectedColor={editor.selectedColor}
        onColorChange={editor.setSelectedColor}
        selectedSize={editor.selectedSize}
        onSizeChange={editor.setSelectedSize}
        orientation={editor.orientation}
        onOrientationChange={editor.setOrientation}
        tool={editor.tool}
        onToolChange={editor.setTool}
        gridWidth={editor.gridWidth}
        gridHeight={editor.gridHeight}
        onGridSizeChange={editor.updateGridSize}
        onClear={editor.clearAll}
        onImageUpload={editor.handleImageUpload}
        hasImage={!!editor.referenceImage}
        onRemoveImage={editor.removeImage}
        imageOpacity={editor.imageOpacity}
        onImageOpacityChange={editor.setImageOpacity}
        imageVisible={editor.imageVisible}
        onImageVisibleChange={editor.setImageVisible}
        imageEditMode={editor.imageEditMode}
        onImageEditModeChange={editor.setImageEditMode}
        hasBricks={editor.hasBricks}
        onNewProject={editor.newProject}
        onExport={editor.exportAsPng}
        onExportPieceList={editor.exportPieceList}
        onSaveProject={editor.saveProject}
        onLoadProject={editor.loadProject}
        colors={editor.colors}
        onAddColor={editor.addColor}
        onReplaceColor={editor.replaceColor}
        onRemoveColor={editor.removeColor}
        onUndo={editor.undo}
        onRedo={editor.redo}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        gridVisible={editor.gridVisible}
        onGridVisibleChange={editor.setGridVisible}
        cursorTrackerVisible={editor.cursorTrackerVisible}
        onCursorTrackerVisibleChange={editor.setCursorTrackerVisible}
        pixelText={editor.pixelText}
        onPixelTextChange={editor.setPixelText}
        textFontSize={editor.textFontSize}
        onTextFontSizeChange={editor.setTextFontSize}
        textFontFamily={editor.textFontFamily}
        onTextFontFamilyChange={editor.setTextFontFamily}
        textBold={editor.textBold}
        onTextBoldChange={editor.setTextBold}
        textItalic={editor.textItalic}
        onTextItalicChange={editor.setTextItalic}
        textOverlays={editor.textOverlays}
        onRemoveTextOverlay={editor.removeTextOverlay}
        pipettePrefilledColor={pipetteColor}
        onPipettePrefilledClear={clearPipetteColor}
        shapeType={editor.shapeType}
        onShapeTypeChange={editor.setShapeType}
        shapeFillMode={editor.shapeFillMode}
        onShapeFillModeChange={editor.setShapeFillMode}
        projectStarted={editor.projectStarted}
        onProjectStart={handleProjectStart}
        projectName={editor.projectName}
        onOpenWelcome={openWelcomeDialog}
        onRequestLoadProject={openLoadDialog}
        onRequestClear={openClearDialog}
        onRequestSaveProject={openSaveDialog}
        onRequestExportPieces={openPiecesDialog}
        onRequestRemoveImage={openRemoveImageDialog}
    />
  );

  const grid = (
    <BrickGrid
        width={editor.gridWidth}
        height={editor.gridHeight}
        bricks={editor.bricks}
        selectedColor={editor.selectedColor}
        selectedSize={editor.selectedSize}
        orientation={editor.orientation}
        onSizeChange={editor.setSelectedSize}
        onOrientationChange={editor.setOrientation}
        tool={editor.tool}
        onToolChange={editor.setTool}
        gridVisible={editor.gridVisible}
        cursorTrackerVisible={editor.cursorTrackerVisible}
        referenceImage={editor.referenceImage}
        extraImages={editor.extraImages}
        imageEditMode={editor.imageEditMode}
        imageOpacity={editor.imageOpacity}
        imageVisible={editor.imageVisible}
        imageLocked={editor.imageLocked}
        imageTransform={editor.imageTransform}
        onImageTransformChange={editor.setImageTransform}
        onCellClick={editor.placeBrick}
        canPlace={editor.canPlace}
        getCellOccupant={editor.getCellOccupant}
        textOverlays={editor.textOverlays}
        onUpdateTextOverlay={editor.updateTextOverlay}
        onRemoveTextOverlay={editor.removeTextOverlay}
        onMoveBricks={editor.moveBricks}
        onPipetteColor={setPipetteColor}
        shapeType={editor.shapeType}
        shapeFillMode={editor.shapeFillMode}
        onAddShapeOverlay={editor.addShapeOverlay}
        shapeOverlays={editor.shapeOverlays}
        onUpdateShapeOverlay={editor.updateShapeOverlay}
        onRemoveShapeOverlay={editor.removeShapeOverlay}
        onUndo={editor.undo}
    />
  );

  const topActions = (
    <TopActions
      hasBricks={editor.hasBricks}
      hasImage={!!editor.referenceImage}
      imageEditMode={editor.imageEditMode}
      imageVisible={editor.imageVisible}
      imageOpacity={editor.imageOpacity}
      onImageUpload={editor.handleImageUpload}
      onImageVisibleChange={editor.setImageVisible}
      onImageOpacityChange={editor.setImageOpacity}
      onImageEditModeChange={editor.setImageEditMode}
      onRequestRemoveImage={openRemoveImageDialog}
      onLoadProject={openLoadDialog}
      onClear={openClearDialog}
      onSaveProject={openSaveDialog}
      onExportPieces={openPiecesDialog}
      onOpenWelcome={openWelcomeDialog}
      selectedColor={editor.selectedColor}
      colors={editor.colors}
      onColorChange={editor.setSelectedColor}
      onAddColor={editor.addColor}
      onReplaceColor={editor.replaceColor}
      onRemoveColor={editor.removeColor}
      gridWidth={editor.gridWidth}
      gridHeight={editor.gridHeight}
      onGridSizeChange={editor.updateGridSize}
      gridVisible={editor.gridVisible}
      onGridVisibleChange={editor.setGridVisible}
      cursorTrackerVisible={editor.cursorTrackerVisible}
      onCursorTrackerVisibleChange={editor.setCursorTrackerVisible}
      variant={isCompact ? "inline" : "floating"}
    />
  );

  const projectActionDialogs = (
    <ProjectActionDialogs
      showSaveDialog={showSaveDialog}
      onSaveDialogChange={setShowSaveDialog}
      showConfirmNewDialog={showConfirmNewDialog}
      onConfirmNewDialogChange={setShowConfirmNewDialog}
      showLoadDialog={showLoadDialog}
      onLoadDialogChange={setShowLoadDialog}
      showClearDialog={showClearDialog}
      onClearDialogChange={setShowClearDialog}
      showPiecesDialog={showPiecesDialog}
      onPiecesDialogChange={setShowPiecesDialog}
      showExportPngDialog={showExportPngDialog}
      onExportPngDialogChange={setShowExportPngDialog}
      showRemoveImageDialog={showRemoveImageDialog}
      onRemoveImageDialogChange={setShowRemoveImageDialog}
      hasImage={!!editor.referenceImage}
      projectName={editor.projectName}
      onProjectStart={handleProjectStart}
      onNewProject={editor.newProject}
      onLoadProject={editor.loadProject}
      onClear={editor.clearAll}
      onSaveProject={editor.saveProject}
      onExportPieceList={editor.exportPieceList}
      onExport={editor.exportAsPng}
      onRemoveImage={editor.removeImage}
    />
  );

  if (isCompact) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <MobileToolbar
          tool={editor.tool}
          onToolChange={editor.setTool}
          onUndo={editor.undo}
          onRedo={editor.redo}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          selectedColor={editor.selectedColor}
          onColorChange={editor.setSelectedColor}
          colors={editor.colors}
          onAddColor={editor.addColor}
          onReplaceColor={editor.replaceColor}
          onRemoveColor={editor.removeColor}
          selectedSize={editor.selectedSize}
          onSizeChange={editor.setSelectedSize}
          orientation={editor.orientation}
          onOrientationChange={editor.setOrientation}
          shapeType={editor.shapeType}
          onShapeTypeChange={editor.setShapeType}
          shapeFillMode={editor.shapeFillMode}
          onShapeFillModeChange={editor.setShapeFillMode}
          pixelText={editor.pixelText}
          onPixelTextChange={editor.setPixelText}
          textFontSize={editor.textFontSize}
          onTextFontSizeChange={editor.setTextFontSize}
          textFontFamily={editor.textFontFamily}
          onTextFontFamilyChange={editor.setTextFontFamily}
          textBold={editor.textBold}
          onTextBoldChange={editor.setTextBold}
          textItalic={editor.textItalic}
          onTextItalicChange={editor.setTextItalic}
          textOverlays={editor.textOverlays}
          onRemoveTextOverlay={editor.removeTextOverlay}
          fullToolbar={toolbarEl}
          imageEditMode={editor.imageEditMode}
          projectName={editor.projectName}
          onOpenWelcome={openWelcomeDialog}
          topActions={topActions}
          hasImage={!!editor.referenceImage}
          imageVisible={editor.imageVisible}
          imageOpacity={editor.imageOpacity}
          onImageUpload={editor.handleImageUpload}
          onRemoveImage={editor.removeImage}
          onImageVisibleChange={editor.setImageVisible}
          onImageOpacityChange={editor.setImageOpacity}
          onImageEditModeChange={editor.setImageEditMode}
          onRequestRemoveImage={openRemoveImageDialog}
      />
        <main className="flex-1 min-h-0 min-w-0 flex bg-workspace">{grid}</main>
        <WelcomeDialog open={showWelcomeDialog} onClose={closeWelcomeDialog} />
        {projectActionDialogs}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {toolbarEl}
      <div className="flex-1 min-w-0 relative">
        {grid}
        {topActions}
      </div>
      <WelcomeDialog open={showWelcomeDialog} onClose={closeWelcomeDialog} />
      {projectActionDialogs}
    </div>
  );
}
