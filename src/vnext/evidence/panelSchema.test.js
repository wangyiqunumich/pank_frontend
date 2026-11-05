import React from 'react';
import {render,screen} from '@testing-library/react';
import {bundled,panelSchema} from './panelSchema';
import {GraphInfoPanelSurface,GraphInfoPanelHeader} from '../GraphInfoPanel';
import {RecordFooter} from './ProductionRecord';
import {panelTabs} from './panelTabs';
import {compactSummary} from './compactSections';
const schema=()=>({panel_presentation:JSON.parse(JSON.stringify(bundled))});
test('API policy controls title, actions, surface, footer independently of bundled defaults',()=>{
 const s=schema();s.panel_presentation.header.title_align='left';s.panel_presentation.header.title_max_lines=1;
 s.panel_presentation.header.controls.close.label='Dismiss record';s.panel_presentation.header.controls.close.aria_label='Dismiss record';
 s.panel_presentation.footer.fields=[{key:'data_source',label:'Study'}];
 render(<GraphInfoPanelSurface schema={s} visible mode="expanded" position={{x:0,y:0}}><GraphInfoPanelHeader title="Gene">Gene</GraphInfoPanelHeader><RecordFooter schema={s} provenance={{data_source:'Example',data_version:'secret-test-version'}}/></GraphInfoPanelSurface>);
 expect(screen.getByTestId('graph-info-title').style.textAlign).toBe('left');
 expect(screen.getByTestId('graph-info-title').style.WebkitLineClamp).toBe('1');
 expect(screen.getByLabelText('Dismiss record')).toBeTruthy();expect(screen.getByText('Study: Example')).toBeTruthy();expect(screen.queryByText(/secret-test-version/)).toBeNull();
});
test('owned tabs and compact summaries use supplied API declarations',()=>{
 const s=schema();s.panel_presentation.tables.accessions.title='External records';
 expect(panelTabs({tables:[{id:'accessions'}]},s)[0].title).toBe('External records');
 s.panel_presentation.compact_summaries.custom={rows:'rows',values:'values',columns:[{key:'x',label:'Measured'}],max_columns:1};
 expect(compactSummary({widget:'custom',rows:[{values:{x:0}}]},s.panel_presentation).columns[0].label).toBe('Measured');
 expect(panelSchema(s)).toBe(s.panel_presentation);
});

test('compact panel keeps asynchronously loaded content within the remaining viewport',()=>{
 const {container}=render(<GraphInfoPanelSurface visible mode="hover" position={{x:100,y:194}}>Loaded evidence</GraphInfoPanelSurface>);
 expect(container.querySelector('section').style.maxHeight).toContain('calc(100dvh - 194px - 12px)');
});
