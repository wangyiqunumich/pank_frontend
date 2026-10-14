export function integratedBrowserLink(config, datasetId, gene) {
  const url = new URL(config.url);
  for (const key of [config.parameters.dataset, ...(config.parameters.dataset_aliases || [])]) url.searchParams.set(key, datasetId);
  for (const key of [config.parameters.gene, ...(config.parameters.gene_aliases || [])]) url.searchParams.set(key, gene);
  return url.href;
}
