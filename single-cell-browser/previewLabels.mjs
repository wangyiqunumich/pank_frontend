// A dozen cluster labels only; cell coordinates and rendering remain untouched.
export function layoutPreviewLabels(clusters, width, height, measure, { font_size = 8, gap = 3, names = {} } = {}) {
  const placed = [];
  const lineHeight = font_size + 1;
  for (const cluster of clusters) {
    const lines = (names[cluster.label] || cluster.label).split('\n');
    const w = Math.max(...lines.map(measure)) + 4, h = lines.length * lineHeight + 2;
    const px = cluster.projection.x, py = cluster.projection.y;
    const candidates = [[px, py]];
    for (let radius = 10; radius < Math.max(width, height); radius += 8) {
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) candidates.push([px + dx * radius, py + dy * radius]);
    }
    let best, bestScore = Infinity;
    for (const [x, y] of candidates) {
      const cx = Math.max(w / 2 + 2, Math.min(width - w / 2 - 2, x));
      const cy = Math.max(h / 2 + 2, Math.min(height - h / 2 - 2, y));
      const box = { x: cx - w / 2, y: cy - h / 2, w, h };
      const overlap = placed.some(label => box.x < label.box.x + label.box.w + gap && box.x + w + gap > label.box.x && box.y < label.box.y + label.box.h + gap && box.y + h + gap > label.box.y);
      const score = Math.hypot(cx - px, cy - py) + (overlap ? width * height : 0);
      if (score < bestScore) { bestScore = score; best = { ...cluster, lines, x: cx, y: cy, box, lineHeight }; }
      if (score === 0) break;
    }
    placed.push(best);
  }
  return placed;
}
