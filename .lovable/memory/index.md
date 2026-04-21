# Memory: index.md
Updated: now

# Project Memory

## Core
- Editor grid default size is 32x32.
- On project load, reassign unique IDs to all blocks and sync global ID counter to prevent export/deletion conflicts.
- New Project does NOT show welcome/grid-size/name dialogs; project starts immediately. Welcome dialog only opens via the logo button.
- Save Project and Export Piece List prompt for project name first if none assigned, then continue with the normal save/export flow.

## Memories
- [Grid Default Size](mem://features/grid/tamano-predeterminado) — El tamaño de la cuadrícula por defecto es 32x32
- [Grid Resize Behavior](mem://features/grid/comportamiento-redimensionado) — Al redimensionar, mantener bloques dentro de los límites y eliminar los que quedan fuera
- [Load ID Synchronization](mem://technical/estado/sincronizacion-ids-carga) — Reasignar IDs de bloques y sincronizar contador global al cargar proyectos
