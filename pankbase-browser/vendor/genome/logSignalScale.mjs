import { scaleSymlog } from 'd3';

// On nonnegative ATAC signals the symlog transform with constant 1 is
// log(1 + x). Changing the log base cancels in the normalized pixel fraction.
export function atacLogScales(maximum, height) {
  const position = scaleSymlog().constant(1).domain([maximum, 0]).range([2, height]).clamp(true);
  const middle = Math.expm1(Math.log1p(maximum) / 2);
  position.atacTicks = height >= 50 ? [maximum, 0, Number(middle.toPrecision(1))] : [maximum, 0];
  return {
    axisScale: position, valueToY: position, min: 0, max: maximum, zeroLine: height,
    valueToOpacity: position.copy().range([1, 0]),
  };
}
