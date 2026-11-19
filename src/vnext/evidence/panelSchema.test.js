import React from 'react';
import {render,screen} from '@testing-library/react';
import {bundled,panelSchema} from './panelSchema';
import {GraphInfoPanelSurface,GraphInfoPanelHeader} from '../GraphInfoPanel';
import {RecordFooter} from './ProductionRecord';
import {panelTabs} from './panelTabs';
import {compactSummary} from './compactSections';
const schema=()=>({panel_presentation:JSON.parse(JSON.stringify(bundled))});
test('API policy controls title, actions, surface, footer independently of bundled defaults',()=>{
 const s=schema();s.panel_presentation.header.expanded_title_align='right';s.panel_presentation.header.title_max_lines=1;
 s.panel_presentation.header.controls.close.label='Dismiss record';s.panel_presentation.header.controls.close.aria_label='Dismiss record';
 s.panel_presentation.header.controls.minimize.aria_label='Exit expanded record';
 s.panel_presentation.footer.fields=[{key:'data_source',label:'Study'}];
 render(<GraphInfoPanelSurface schema={s} visible mode="expanded" position={{x:0,y:0}}><GraphInfoPanelHeader title="Gene">Gene</GraphInfoPanelHeader><RecordFooter schema={s} provenance={{data_source:'Example',data_version:'secret-test-version'}}/></GraphInfoPanelSurface>);
 expect(screen.getByTestId('graph-info-title').style.textAlign).toBe('right');
 expect(screen.getByTestId('graph-info-title').style.WebkitLineClamp).toBe('1');
 expect(screen.getByLabelText('Exit expanded record')).toBeTruthy();expect(screen.queryByLabelText('Dismiss record')).toBeNull();
 expect(screen.getByText('Study: Example')).toBeTruthy();expect(screen.queryByText(/secret-test-version/)).toBeNull();
});
test('shared source and license are shown once without losing distinct versions or duplicating a link',()=>{
 const url='https://example.org/source';
 const info={data_source:'Example publisher',data_source_url:url,license:'unknown',license_url:url};
 const {container}=render(<RecordFooter provenance={[{...info,data_version:'Release A'},{...info,data_version:'Release B'}]}/>);
 const footer=container.querySelector('footer');
 expect(footer.textContent.match(/Data Source: Example publisher/g)).toHaveLength(1);
 expect(footer.textContent.match(/License: unknown/g)).toHaveLength(1);
 expect(footer.textContent).toContain('Release A, Release B');
 expect(footer.querySelectorAll('a')).toHaveLength(1);
 expect(footer.querySelector('a').href).toBe(url);
});
test('owned tabs and compact summaries use supplied API declarations',()=>{
 const s=schema();s.panel_presentation.tables.accessions.title='External records';
 expect(panelTabs({tables:[{id:'accessions'}]},s)[0].title).toBe('External records');
 s.panel_presentation.compact_summaries.custom={rows:'rows',values:'values',columns:[{key:'x',label:'Measured'}],max_columns:1};
 expect(compactSummary({widget:'custom',rows:[{values:{x:0}}]},s.panel_presentation).columns[0].label).toBe('Measured');
 expect(panelSchema(s)).toBe(s.panel_presentation);
});

test('older API schemas retain their own display settings and receive the new record declarations',()=>{
 const s=schema();
 delete s.panel_presentation.record_view;
 delete s.panel_presentation.value_labels.treatment;
 s.panel_presentation.header.title_align='left';
 const policy=panelSchema(s);
 expect(policy).toBe(panelSchema(s));
 expect(policy.header.title_align).toBe('left');
 expect(policy.record_view).toEqual(bundled.record_view);
 expect(policy.value_labels.treatment.no_treatment).toBe('Untreated');
 expect(s.panel_presentation.record_view).toBeUndefined();
});

test('compact panel keeps asynchronously loaded content within the remaining viewport',()=>{
 const {container}=render(<GraphInfoPanelSurface visible mode="hover" position={{x:100,y:194}}>Loaded evidence</GraphInfoPanelSurface>);
 expect(container.querySelector('section').style.maxHeight).toContain('calc(100dvh - 194px - 12px)');
});
