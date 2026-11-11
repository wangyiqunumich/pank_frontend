import { buildCohortPlot, nearestCohortTrace } from './functionalCohortGeometry';

const data = {
  times: [0, 10, 20, 30],
  series: [
    { donor_id: 'first', values: [0, 2, null, 4] },
    { donor_id: 'second', values: [8, 6, 4, 2] },
    { donor_id: 'missing', values: [null, null, null, null] },
  ],
  mean: [4, 4, 4, 3], stimuli: [[0, 10, 'Basal'], [10, 30, 'Stimulus']],
};

test('raw traces keep zeroes, break at missing values, and use the supplied mean and stimulus intervals', () => {
  const plot = buildCohortPlot(data, 600, 300);
  expect(plot.curves.map(curve => curve.id)).toEqual(['first', 'second']);
  expect(plot.curves[0].points[0].value).toBe(0);
  expect(plot.curves[0].points[2]).toBeNull();
  expect(plot.curves[0].path.match(/M/g)).toHaveLength(2);
  expect(plot.meanPath).not.toMatch(/NaN|Infinity/);
  expect(plot.stimuli[1]).toMatchObject({ label: 'Stimulus', end: plot.right });
});

test('segment picking identifies a donor between samples without joining missing measurements', () => {
  const plot = buildCohortPlot(data, 600, 300);
  const [first, second] = plot.curves;
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let point = midpoint(second.points[0], second.points[1]);
  expect(nearestCohortTrace(plot.curves, point.x, point.y).curve.id).toBe('second');
  point = midpoint(first.points[1], first.points[3]);
  expect(nearestCohortTrace([first], point.x, point.y)).toBeNull();
  expect(nearestCohortTrace(plot.curves, first.points[0].x, first.points[0].y).sample.value).toBe(0);
});

test('zero-only and empty cohorts retain finite, usable axes', () => {
  for (const series of [[], [{ donor_id: 'zero', values: [0, 0, 0, 0] }]]) {
    const plot = buildCohortPlot({ ...data, series, mean: [] }, 320, 280);
    expect(plot.yTicks.every(tick => Number.isFinite(tick.position))).toBe(true);
    expect(plot.yTicks.at(-1).value).toBeGreaterThan(0);
  }
});
