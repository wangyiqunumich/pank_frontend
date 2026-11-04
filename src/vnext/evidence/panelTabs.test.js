import {panelTabs} from './panelTabs';
test('only approved owned tabs appear, with the requested names',()=>{
 const card={tables:[{id:'placements'},{id:'metadata_donor'},{id:'metadata_sample'},{id:'metadata_sample_source'},{id:'ccc_contexts'},{id:'unregistered'}],component_views:[]};
 expect(panelTabs(card,{}).map(t=>t.title)).toEqual(['Genomic coordinates','Source annotations','Sample crosswalk','Source memberships','Cell–cell context summary']);
});
test('component consumes owned tables exactly once and registry alone grants nothing',()=>{
 const card={tables:[{id:'placements'}],component_views:[{id:'chr_index',table_ids:['placements','not-owned'],renderer:'table'}]};
 const tabs=panelTabs(card,{});expect(tabs).toHaveLength(1);expect(tabs[0].title).toBe('Genomic coordinates');expect(tabs[0].component.table_ids).toEqual(['placements']);
 expect(panelTabs({...card,tables:[]},{})).toEqual([]);
});
