// Brick Editor v2
import { useEffect, useState, useCallback } from "react";
import { useBrickEditor } from "@/hooks/useBrickEditor";
import Toolbar from "@/components/Toolbar";
import BrickGrid from "@/components/BrickGrid";

export default function BrickEditor() {
  const editor = useBrickEditor();
  const [pipetteColor, setPipetteColor] = useState<string | null>(null);
  const clearPipetteColor = useCallback(() => setPipetteColor(null), []);
  const handleProjectStart = useCallback((name: string) => {
    editor.setProjectName(name);
    editor.setProjectStarted(true);
  }, [editor.setProjectName, editor.setProjectStarted]);
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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
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
      />
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
      />
    </div>
  );
}
