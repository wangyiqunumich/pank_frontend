# Goal: Graph viewer controls and reliable module fullscreen

This revision supersedes the earlier scMap toolbar acceptance. The reference is the **Graph viewer**, including its actual SVG assets, control order, compact/expanded modes, hover/info state, fit, download and reset. Source header → sub-tabs → filters → visual → fixed information footer remains the layout contract. External link labels remain `PanKbase xxx browser`. Native PanKgraph functional data remains unchanged.

Baseline: xuteng/react `c2392f9009828466c18e5a80349f6e74b2f969df`.
Source branch: `codex/techdemo-graph-controls`.

## Per-module checklist

| Module | Required correction | Acceptance |
|---|---|---|
| Shared | Use actual Graph viewer assets and action order; distinct exit icon; expanded labels; usable disabled states | React uses GraphToolbar directly. Vue adapter shares its icon exports and CSS. Unsupported actions are not simulated. |
| Knowledge Graph | Preserve existing fit, info, zoom, download, reset and fullscreen | Graph toolbar and camera regression tests pass. |
| scBrowser | Shared toolbar; actual camera zoom/fit/reset; information toggle; expression/source fullscreen | 448,935 cells, CFTR maximum 5.83 retained; map and expression controls exercised. |
| Genome | Symmetric plot margins; no reserved toolbar column; stable viewport-fitting signal height; user density selection | 12px side margins, actual signal redraw; Fit panel / Compact / Medium / Large; width/height checked in normal and fullscreen. |
| DE | Graph toolbar, real plot zoom/reset, hover switch, heatmap/source controls | Beta 13,191 genes retained; normal/fullscreen and reset checked. |
| Functional | Toolbar floats on actual image, including wide screens; real image zoom/pan/reset/export | Frame follows the original image aspect ratio; native PanKgraph curves and 407 donors retained. |
| PCA | Graph toolbar, coordinate zoom/reset, hover switch, source fullscreen | Acinar 178 source samples retained; PCA map and Source fullscreen checked. |
| Fullscreen | Correct enter/exit state, Escape from embedded frames, stable browsing context, resize notification | Native dialog preserves iframe/canvas nodes. Browser-specific fullscreen state is synchronized; iframe key handling sends validated protocol messages. |

## Two review rounds

Round 1: Chrome desktop and Safari (existing non-100% page zoom), normal/fullscreen/return, action ordering and expanded controls. Found and corrected: separate imitation toolbar, unchanged fullscreen icon, missing reset/info behavior, reserved plot padding, unbounded transient Genome height allocation.

Round 2: narrow viewport (390×844), plot versus Source/Tracks sub-tabs, fit versus explicit track density, exports, hover toggle and repeated fullscreen. Found and corrected: Functional controls still floated on the full container rather than the actual square image; Genome Tracks needed its own scroll owner after removing nested plot scrollbars. Downloaded Genome SVG contains native annotation and signal layers. Remaining checks and deployed release are recorded below before closing the goal.

## Implementation entry points

- `src/vnext/GraphToolbar.js`, `GraphToolbar.css`, `graphToolbarIcons.js`: authoritative controls and assets.
- `src/vnext/BrowserToolbar.js`: React module adapter.
- `pankbase-browser/BrowserToolbar.vue`: Vue adapter with matching order, sections, assets and measured compact density.
- `src/components/PersistentGraphViewport.js`: stable native dialog and embedded resize notification.
- `pankbase-browser/vendor/genome/AtacSeq.vue`, `browserBridge.mjs`: native renderer sizing, data-domain zoom, track height selection.
- `src/vnext/BrowserImagePlot.js`: actual image-sized control frame, zoom and pan.

`Fit to view` restores the fitted camera / genomic context. `Reset view` also restores the view's information/density options; it preserves the selected dataset and source records. Image/Genome info opens a source interpretation note; scatter/map info toggles real hover readouts. Tables and Source pages offer fullscreen, with existing data exports retained. Long track lists and tables intentionally scroll. No CSS stretching of scientific coordinates or signal values is used.
