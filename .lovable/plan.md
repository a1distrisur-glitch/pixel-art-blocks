## Cambio: Color por defecto violeta en el botón Color del flex superior

### Resumen
Cambiar el color seleccionado por defecto de Rojo (`#DC2626`) a Violeta (`#7C3AED`), tanto al iniciar la app como al reiniciar la paleta o crear un nuevo proyecto. La paleta mantiene su orden actual.

### Cambios técnicos

**Archivo: `src/hooks/useBrickEditor.ts`**

1. **Línea 168** — Estado inicial de `selectedColor`:
   ```ts
   // Antes:
   const [selectedColor, setSelectedColor] = useState(DEFAULT_BRICK_COLORS[0].value);
   // Después:
   const [selectedColor, setSelectedColor] = useState("#7C3AED");
   ```
   Se usa el HEX directo del Violeta ya existente en `DEFAULT_BRICK_COLORS` (índice 12) para no depender del orden de la paleta.

2. **Línea 423** — Reset de paleta / nuevo proyecto:
   ```ts
   // Antes:
   setSelectedColor(DEFAULT_BRICK_COLORS[0].value);
   // Después:
   setSelectedColor("#7C3AED");
   ```

### Resultado esperado
- Al cargar el editor, el botón Color del flex superior muestra Violeta (`#7C3AED`) como color activo.
- Al reiniciar la paleta o crear un proyecto nuevo, vuelve a Violeta en lugar de Rojo.
- La paleta `DEFAULT_BRICK_COLORS` conserva su orden actual (Violeta sigue en el índice 12).
- Sin cambios en otros archivos.