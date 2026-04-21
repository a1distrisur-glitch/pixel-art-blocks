

# Guardar regla crítica en memoria del proyecto

Voy a registrar como **regla permanente (constraint)** que el flex lateral (`Toolbar.tsx` de escritorio) y sus conexiones con los demás controles son **intocables** salvo petición explícita tuya. Cualquier cambio futuro que pueda afectar al flex lateral deberá ser notificado con claridad antes de ejecutarse.

## Cambios

### 1. Crear `mem://constraints/flex-lateral-sagrado.md`
Memoria de tipo `constraint` con el contenido:

- **Regla:** No modificar `src/components/Toolbar.tsx` (flex lateral de escritorio) ni sus conexiones (props, handlers, cableado con `useBrickEditor`, `BrickEditor.tsx`, `ReferenceImageControls`, diálogos) sin instrucción explícita del usuario.
- **Si una tarea pudiera afectar al flex lateral indirectamente:** detenerse, avisar con claridad notoria, y pedir aprobación antes de tocarlo.
- **Por qué:** El usuario considera esta sección y su cableado críticos y estables; cambios no autorizados rompen la confianza y la fiabilidad.

### 2. Crear `mem://index.md`
Índice de memoria con sección **Core** (siempre aplicada) que incluye la regla resumida en una línea, más una referencia al archivo de constraint:

```text
# Project Memory

## Core
NO modificar Toolbar.tsx (flex lateral) ni sus conexiones sin pedirme permiso explícito. Si una tarea lo afecta indirectamente, AVISAR con claridad notoria antes de tocarlo.

## Memories
- [Flex lateral sagrado](mem://constraints/flex-lateral-sagrado.md) — Toolbar.tsx y su cableado son intocables sin autorización explícita
```

## Resultado

A partir de aprobar este plan, en cada turno futuro aplicaré la regla automáticamente: ningún cambio tocará `Toolbar.tsx` ni su cableado (props desde `BrickEditor.tsx`, conexión con `ReferenceImageControls`, handlers del hook) sin que tú lo indiques expresamente, y cualquier tarea que pudiera rozarlo se detendrá para avisarte primero.

