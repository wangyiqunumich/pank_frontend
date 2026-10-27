# Graph toolbar design assets

Original SVG exports from the PanKgraph UI Figma file
`FPC09Wef9r7URcgcRvq8pd`, downloaded October 22, 2026.

- `compact-*`: collapsed toolbar, node `2713:1359`.
- `expanded-*`: expanded toolbar, node `2713:959`.
- `preview-*`: single-cell preview, node `2713:839`.

Retain the SVGs' intrinsic dimensions. The compact chevron is mirrored for the
collapsed state; the expanded state uses the opposite direction as requested.
Click-menu controls are intentionally omitted. Mode describes the backend's
current presentation; this update does not add a new mode-switching API.

October 27 refresh: `legend-chevron.svg` is the original export from node
`2713:956`. Legend and zoom are bottom-anchored per the implementation request;
their placement intentionally overrides the current Figma canvas positions.

Design references:
[canvas and preview](https://www.figma.com/design/FPC09Wef9r7URcgcRvq8pd/Pankgraph-UI?node-id=2713-839),
[collapsed controls](https://www.figma.com/design/FPC09Wef9r7URcgcRvq8pd/Pankgraph-UI?node-id=2713-1238).
