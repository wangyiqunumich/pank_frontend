import policy from '../../schema/information_panel_schema.json';
import {componentViews} from './evidenceComponents';
// Registration controls presentation, never grants table ownership.
export function panelTabs(card,schema) {
  const components=componentViews(card,schema).filter(c=>policy.components[c.id]);
  const consumed=new Set(components.flatMap(c=>c.table_ids));
  return [
    ...components.map(c=>({id:`component:${c.id}`,title:policy.components[c.id].title,component:c})),
    ...(card.tables || []).filter(t=>policy.tables[t.id] && t.presentation!=='inline' && !consumed.has(t.id))
      .map(t=>({id:t.id,title:policy.tables[t.id].title,table:t}))
  ];
}
