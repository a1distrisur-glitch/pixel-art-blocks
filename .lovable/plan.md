## Tooltips en versión móvil (Long-press + Tap corto)

### Resumen
Replicar el sistema de tooltips de escritorio (Radix `Tooltip`) en la versión móvil — barra inferior y flex superior. Doble activación táctil: **tap corto** muestra tooltip ~1.5s y ejecuta la acción; **long-press** (≥500ms) muestra tooltip mientras se mantiene presionado y **cancela** el click (no ejecuta la acción).

### Comportamiento

| Gesto | Tooltip | Acción del botón |
|---|---|---|
| Hover (mouse) | Aparece tras 300ms | — |
| Tap corto (<500ms) | Aparece y se oculta solo a los 1.5s | Se ejecuta normal |
| Long-press (≥500ms) | Aparece al cumplir 500ms, persiste mientras se mantiene | NO se ejecuta al soltar |
| Tap fuera | Cierra cualquier tooltip abierto | — |

### Implementación

**Nuevo componente helper en `src/components/MobileToolbar.tsx`** (`MobileTooltip`):
- Envuelve children con `Tooltip` controlado (`open` state).
- Maneja `onPointerDown` / `onPointerUp` / `onPointerCancel` / `onPointerLeave`:
  - Al `pointerdown` arranca timer de 500ms → si se cumple, marca `longPress=true` y abre tooltip.
  - En `pointerup`: si fue long-press, llama `e.preventDefault()` y `e.stopPropagation()` para evitar el click, mantiene tooltip abierto unos ms y luego cierra.
  - Si fue tap corto, abre tooltip y programa cierre a 1.5s.
- Reutiliza `TooltipContent` con el mismo styling (`text-xs`, `side`).

**Cambios en `src/components/MobileToolbar.tsx`**:
1. Importar `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` desde `@/components/ui/tooltip`.
2. Envolver todo el componente `MobileToolbar` con `<TooltipProvider delayDuration={300}>` (para hover desktop si existiera).
3. Modificar los componentes internos `TopBtn`, `BottomTool`, `PopBtn` para envolver el `<button>` con `MobileTooltip` usando el `label` como contenido.
4. Para los botones `PopoverTrigger` (Pintar/Formas/Texto) y los botones inline (Colocar/Salir/Borrar texto, shape buttons): envolver también con `MobileTooltip`.
5. Mantener `aria-label` y `title` (accesibilidad / fallback).

**Cambios en `src/components/TopActions.tsx` y `ColorPickerButton.tsx` / `ProjectMenuButton.tsx`**:
- No requieren cambios — ya usan tooltips Radix desde `Toolbar.tsx`. Pero como en móvil estos botones se renderizan dentro de `MobileToolbar`, hay que verificar que el `TooltipProvider` envuelva también esos slots. Como `MobileToolbar` ya wrappea su `<header>` y `<nav>` completos, los `topActions` y `gridSettingsSlot` heredan el provider. Solo asegurar que `ColorPickerButton` y `ProjectMenuButton` triggers tengan tooltip funcional en táctil.

### Archivos a modificar
- `src/components/MobileToolbar.tsx` — agregar `MobileTooltip` helper, envolver con `TooltipProvider`, aplicar a `TopBtn`/`BottomTool`/`PopBtn` y triggers de Popover.

### Resultado esperado
- En móvil, mantener presionado cualquier botón muestra una burbuja con la descripción (mismo look que escritorio) sin disparar la acción.
- Un tap rápido ejecuta la acción y muestra una vista breve del tooltip.
- Funciona con mouse en navegador móvil/desktop también.