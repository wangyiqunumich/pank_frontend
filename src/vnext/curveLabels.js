// Place edge text using the live renderer's node outlines and measured label sizes.
const labelOnly = { includeEdges: false, includeNodes: false, includeOverlays: false,
  includeUnderlays: false, includeSourceLabels: false, includeTargetLabels: false };
const middle = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function curvePoint(start, controls, end, fraction) {
  const position = fraction * controls.length;
  const i = Math.floor(position), t = position - i, p = controls[i];
  const a = i ? middle(controls[i - 1], p) : start;
  const b = i + 1 < controls.length ? middle(p, controls[i + 1]) : end;
  return { x: (1-t)**2 * a.x + 2*t*(1-t)*p.x + t*t*b.x,
    y: (1-t)**2 * a.y + 2*t*(1-t)*p.y + t*t*b.y };
}

export function placeCurveLabels(cy) {
  if (cy.headless() || !cy.container()) return;
  const occupied = cy.nodes().map(n => n.boundingBox({ includeOverlays: false }));
  const labels = cy.edges().filter(e => e.style('label') && e.style('curve-style') === 'unbundled-bezier');
  const placements = [];
  for (const edge of labels.sort((a,b) => a.id().localeCompare(b.id()))) {
    const controls = edge.controlPoints();
    if (!controls?.length) continue;
    const size = edge.boundingBox(labelOnly), mid = edge.midpoint();
    const start = edge.sourceEndpoint(), end = edge.targetEndpoint();
    const w = size.w / 2 + .5, h = size.h / 2 + .5;
    let chosen;
    // Stay on the edge whenever possible, then try nearby label rows.
    for (const row of [0, -1, 1, -2, 2, -3, 3]) {
      for (const fraction of [.5, .62, .38, .72, .28, .8, .2]) {
        const p = curvePoint(start, controls, end, fraction);
        p.y += row * (2*h + 1);
        const box = { x1:p.x-w, y1:p.y-h, x2:p.x+w, y2:p.y+h };
        if (!occupied.some(b => b.x1 < box.x2 && b.x2 > box.x1 && b.y1 < box.y2 && b.y2 > box.y1)) {
          chosen = p;
          occupied.push(box);
          break;
        }
      }
      if (chosen) break;
    }
    if (chosen) placements.push([edge, chosen.x-mid.x, chosen.y-mid.y]);
    else occupied.push(size);
  }
  cy.batch(() => placements.forEach(([edge,x,y]) => edge.style({ 'text-margin-x':x, 'text-margin-y':y })));
}
