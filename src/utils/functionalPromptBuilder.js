const FUNCTIONAL_CORE_RULES = `
Rules:
- Do not search Neo4j PanKgraph except when extra donor metadata is needed to support the answer.
- Use the functional data API only as a supporting data source.
- Use the functional data interpretation skill to interpret the plot.
- Cover key trends and the biological effects of key stimuli.
- Focus on biological/functional interpretation, data quality, trends, stimulus response, and donor variability.
`.trim();

function buildCohortTracesQuery(filters = {}) {
  return new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
}

function describeTraceType(traceType) {
  const labels = {
    ins_content: 'insulin secretion by content',
    ins_ieq: 'insulin secretion by IEQ',
    gcg_content: 'glucagon secretion by content',
    gcg_ieq: 'glucagon secretion by IEQ',
  };

  return labels[traceType] || String(traceType || 'selected trace').replaceAll('_', ' ');
}

function buildInterpretationTitle(filters = {}) {
  const traceDescription = describeTraceType(filters.trace_type);
  const donorFilters = [
    filters.disease && `disease ${filters.disease}`,
    filters.center && `center ${filters.center}`,
    filters.age_min != null && filters.age_max != null && `age ${filters.age_min}-${filters.age_max}`,
    filters.bmi_min != null && filters.bmi_max != null && `BMI ${filters.bmi_min}-${filters.bmi_max}`,
  ].filter(Boolean).join(', ');

  return `Interpretation of functional data: ${traceDescription}${donorFilters ? ` for ${donorFilters}` : ''}`;
}

function summarizeCohortTraceData(data = {}) {
  const series = Array.isArray(data.series) ? data.series : [];
  const mean = Array.isArray(data.mean) ? data.mean : [];
  const times = Array.isArray(data.times) ? data.times : [];
  const meanValues = mean.filter((value) => value !== null && value !== undefined);
  const maxMean = meanValues.length ? Math.max(...meanValues) : null;
  const minMean = meanValues.length ? Math.min(...meanValues) : null;
  const peakIndex = maxMean == null ? -1 : mean.indexOf(maxMean);

  return {
    trace_type: data.trace_type,
    y_label: data.y_label,
    time_range_minutes: {
      start: times[0] ?? null,
      end: times[times.length - 1] ?? null,
    },
    donor_count: series.length,
    donors_with_values: series.filter((item) => (item.values || []).some((value) => value != null)).length,
    mean_range: {
      min: minMean,
      max: maxMean,
      peak_time_minutes: peakIndex >= 0 ? times[peakIndex] ?? null : null,
    },
    stimuli: (data.stimuli || []).map(([start, end, label]) => ({ start, end, label })),
  };
}

export function buildFunctionalPlotPrompt({ filters = {}, currentData = {} }) {
  const queryString = buildCohortTracesQuery(filters);
  const title = buildInterpretationTitle(filters);
  const summary = summarizeCohortTraceData(currentData);

  return `
Title:
${title}

${FUNCTIONAL_CORE_RULES}

API:
GET https://functional.pankgraph.org/api/charts/cohort-traces?${queryString}
`.trim();
}
