import { extent, scaleLinear, zoomIdentity } from 'd3';
export function originScale(values, range, zoom = 1) {
  const finite = values.filter(Number.isFinite);
  const [lo = 0, hi = 1] = extent(finite);
  const domain = [Math.min(0, lo), Math.max(0, hi)];
  if (domain[0] === domain[1]) domain[1] = domain[0] + 1;
  const base = scaleLinear().domain(domain).nice().range(range);
  const origin = base(0);
  // D3's standard rescaling, constrained to a fixed zero anchor.
  return zoomIdentity.translate(origin, 0).scale(Math.max(1, Math.min(16, zoom))).translate(-origin, 0).rescaleX(base);
}
