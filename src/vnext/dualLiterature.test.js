import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LiteratureSections, { LiteratureInfo } from './LiteratureSections';
import { applyRunEvent, canFollowUp, groundedLiterature, withLiteratureReferences } from './contracts';
import { useResourcePanels } from './Resources';
import QuestionAnswerPage from './ResultComponent';
jest.mock('react-markdown', () => ({ children }) => <span>{children}</span>);
jest.mock('remark-gfm', () => () => {});

const literature = { status: 'running', sources: {
  hirn: { status: 'complete', answer: 'HIRN answer', references: [{pmid:'12345678',title:'Shared paper'}] },
  glkb: { status: 'running', references: [] }
}, references: [{number:1, pmid:'12345678',title:'Shared paper', keys:['pmid:12345678'],sources:['hirn']}] };

test('source sections show independent progress, HIRN focus, and glkb.org link', () => {
  render(<LiteratureSections literature={literature} references={[]} />);
  expect(screen.getByText('HIRN answer')).toBeTruthy();
  expect(screen.getByText('Loading GLKB literature…')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name:'About GLKB Literature'}));
  expect(screen.getByRole('link', {name:'GLKB'}).getAttribute('href')).toBe('https://glkb.org/');
  expect(screen.getByRole('link', {name:'GLKB'}).getAttribute('target')).toBe('_blank');
  expect(screen.getByText(/A broader literature view/)).toBeTruthy();
});

test('references deduplicate and retain server numbering and HIRN provenance', () => {
  const late = {...literature, sources: {...literature.sources, glkb: {status:'complete',answer:'Other',references:[{pmid:'12345678',title:'Shared paper'}, {pmid:'23456789'}]}}, references:[...literature.references, {number:2,pmid:'23456789',keys:['pmid:23456789'],sources:['glkb']}]};
  const refs=Object.values(withLiteratureReferences({references:{a:{pmid:'12345678'}}},late,'runA').references);
  expect(refs.length).toBe(2);
  expect(refs.map(ref=>ref.citation_number)).toEqual([1,2]);
  expect(refs[0].sources).toEqual(expect.arrayContaining(['hirn','glkb']));
  expect(refs[0].anchorId).toBe('runA-reference-1');
  expect(Object.values(withLiteratureReferences({},late,'runB').references)[0].anchorId).toBe('runB-reference-1');
});

test('readiness does not mark the run complete and late sources preserve readiness', () => {
  let run={status:'running',event_sequence:0};
  run=applyRunEvent(run,{seq:1,type:'followup_ready',payload:{followup_ready:true}});
  expect(canFollowUp(run)).toBe(true); expect(run.status).toBe('running');
  run=applyRunEvent(run,{seq:2,type:'literature_sources',payload:literature});
  expect(run.followup_ready).toBe(true); expect(run.literature.sources.glkb.status).toBe('running');
  expect(groundedLiterature({...run,plan:{steps:[],plan_mode:'literature_only'}})).toEqual(literature);
});

function ReferencesFixture() {
  const panels=useResourcePanels(withLiteratureReferences({},literature,'runA'));
  return <QuestionAnswerPage data={{styleVariant:'pank1',questionId:'Q1',title:'Q',aiOverview:{sections:[]},evidences:{title:'Supporting Material',tabs:panels.tabs}}} contentAnchorPrefix="runA" />;
}
test('HIRN label belongs to the reference item', () => {
  render(<ReferencesFixture />);
  const paper=screen.getByRole('link',{name:/Shared paper/});
  expect(paper.textContent).toContain('HIRN');
  expect(paper.id).toBe('runA-reference-1');
});
