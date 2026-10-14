import schema from './schema/result_page_schema.json';

export const SC_CONFIG = schema.main_visuals.items.single_cell_browser;
export function resolveScWordings(wording = SC_CONFIG.wording) {
  return Object.fromEntries(Object.entries(wording).map(([key, value]) => [key, typeof value === 'string' ? value.replaceAll('{display_release}', wording.display_release) : value]));
}
export const SC_WORDING = resolveScWordings();
