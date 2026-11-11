const numeric = Number.isFinite;
const numberLabel = value => Number(value.toPrecision(4)).toString();

function ticks(min, max, count) {
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round((end - start) / step) + 1 }, (_, index) => start + index * step);
}

function linePath(points) {
  let path = '', connected = false;
  points.forEach(point => {
    if (!point) { connected = false; return; }
    path += `${connected ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    // A zero-length round-capped segment also displays an isolated measurement.
    if (!connected) path += `l0,0`;
    connected = true;
  });
  return path;
}

export function buildCohortPlot(data, width, height) {
  const times = data.times || [];
  const series = data.series || [];
  const stimuli = data.stimuli || [];
  const mean = data.mean || [];
  const values = [...series.flatMap(row => row.values || []), ...mean].filter(numeric);
  const finiteTimes = times.filter(numeric);
  const timeBounds = [...finiteTimes, ...stimuli.flatMap(([start, end]) => [start, end]).filter(numeric)];
  const xMin = Math.min(0, ...timeBounds), xMax = Math.max(1, ...timeBounds);
  const yMin = Math.min(0, ...values), yMax = Math.max(0, ...values);
  const yTicks = ticks(yMin, yMax === yMin ? yMin + 1 : yMax, 5);
  const left = width < 420 ? 68 : 78, right = width - 16;
  const top = 72, bottom = height - 40;
  const scaleX = value => left + (value - xMin) / (xMax - xMin) * (right - left);
  const scaleY = value => bottom - (value - yTicks[0]) / (yTicks[yTicks.length - 1] - yTicks[0]) * (bottom - top);
  const points = values => times.map((time, index) => numeric(time) && numeric(values[index])
    ? { x: scaleX(time), y: scaleY(values[index]), time, value: values[index] } : null);
  const curves = series.map(row => {
    const plotted = points(row.values || []);
    return { id: row.donor_id, points: plotted, path: linePath(plotted) };
  }).filter(curve => curve.path);
  return {
    left, right, top, bottom, curves,
    meanPath: linePath(points(mean)),
    xTicks: ticks(xMin, xMax, width < 450 ? 4 : 7).filter(value => value >= xMin && value <= xMax)
      .map(value => ({ value, label: numberLabel(value), position: scaleX(value) })),
    yTicks: yTicks.map(value => ({ value, label: numberLabel(value), position: scaleY(value) })),
    stimuli: stimuli.map(([start, end, label], index) => ({
      label, index, start: scaleX(start), end: scaleX(end),
    })),
  };
}

export function nearestCohortTrace(curves, x, y, radius = 9) {
  let nearest = null, distance = radius * radius;
  curves.forEach(curve => {
    curve.points.forEach((point, index) => {
      if (!point) return;
      const next = curve.points[index + 1] || point;
      if (x < Math.min(point.x, next.x) - radius || x > Math.max(point.x, next.x) + radius) return;
      const dx = next.x - point.x, dy = next.y - point.y;
      const length = dx * dx + dy * dy;
      const fraction = length ? Math.max(0, Math.min(1, ((x - point.x) * dx + (y - point.y) * dy) / length)) : 0;
      const current = (x - point.x - fraction * dx) ** 2 + (y - point.y - fraction * dy) ** 2;
      if (current >= distance) return;
      distance = current;
      nearest = { curve, sample: fraction < 0.5 ? point : next };
    });
  });
  return nearest;
}
