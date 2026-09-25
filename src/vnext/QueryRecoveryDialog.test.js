import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import QueryRecoveryDialog,{queryRecovery} from './QueryRecoveryDialog';
import {projectionForRun} from './contracts';
test('empty plan explains internal failure; original question retained and retry does not revise',()=>{
 const run={question:'How many HPAP stage 3 islet donors?',status:'awaiting_confirmation',plan:{steps:[],clarification:'Please provide a concrete entity or graph question.'}};
 const retry=jest.fn(),revise=jest.fn(),cancel=jest.fn();
 render(<QueryRecoveryDialog issue={queryRecovery(run,'graph_release_mismatch')} question={run.question} onRetry={retry} onRevise={revise} onCancel={cancel}/>);
 expect(screen.getByRole('alertdialog')).toBeTruthy();expect(screen.getByText(run.question)).toBeTruthy();
 expect(screen.getAllByRole('button',{name:'Retry original question'})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Retry original question'}));expect(retry).toHaveBeenCalledTimes(1);expect(revise).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Tell us what to change'),{target:{value:'Use spleen instead'}});
 fireEvent.click(screen.getByRole('button',{name:'Apply changes'}));expect(revise).toHaveBeenCalledWith('Use spleen instead');
 fireEvent.click(screen.getByRole('button',{name:'Cancel query'}));expect(cancel).toHaveBeenCalledTimes(1);
});
test('retryable failures show one original-question retry action',()=>{
 const issue=queryRecovery({status:'failed',plan:{steps:[{}]},error:{category:'service_or_retrieval_failure'}});
 render(<QueryRecoveryDialog issue={issue} question="Find islet donors" onRetry={jest.fn()} onRevise={jest.fn()}/>);
 expect(screen.getAllByRole('button',{name:'Retry original question'})).toHaveLength(1);
 expect(screen.queryByRole('button',{name:'Try again'})).toBeNull();
});
test('suggestions require explicit submission and do not prefill original question',()=>{
 const issue=queryRecovery({status:'awaiting_confirmation',plan:{steps:[{semantic_issues:['Requested stage cannot be uniquely matched.']}],clarification:'Which stage?'}});
 const revise=jest.fn();render(<QueryRecoveryDialog issue={issue} question="T1D stage donors" onRevise={revise}/>);
 const input=screen.getByLabelText('Tell us what to change');expect(input.value).toBe('');
 fireEvent.click(screen.getByRole('button',{name:/Show each recorded T1D stage/}));expect(input.value).toMatch(/keep the tissue and assay filters unchanged/);expect(revise).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:/Use stage [13]/})).toBeNull();
});
test('no missing-version projection; genuine empty evidence and release mismatch stay distinct',()=>{
 expect(projectionForRun({run_id:'x',status:'awaiting_confirmation',preview:{status:'not_requested',evidence:{graph_version:null}}})).toBeNull();
 expect(projectionForRun({run_id:'x',status:'awaiting_confirmation',preview:{status:'empty',evidence:{graph_version:'v1'}}})).toEqual({run_id:'x',phase:'preview'});
 expect(queryRecovery({status:'completed',plan:{steps:[{}]},preview:{evidence:{graph_version:'old'}}},'graph_release_mismatch').category).toBe('release_mismatch');
 expect(queryRecovery({status:'completed',plan:{steps:[{}]},evidence:{nodes:[],graph_version:'v1'}})).toBeNull();
});


test('specific clarification survives a failed preview and downstream generic error',()=>{
 const run={status:'awaiting_confirmation',plan:{steps:[{semantic_issues:['Which stage did you intend?']}],clarification:'Which stage?'},preview:{status:'failed'}};
 const issue=queryRecovery(run,'graph_release_mismatch');
 expect(issue.category).toBe('clarification_required');
 expect(issue.message).toBe('Which stage did you intend?');
 expect(issue.retryable).toBe(false);
 expect(issue.suggestions).toHaveLength(1);
});

test('run recovery preserves verified availability and alternatives over stale plan failure',()=>{
 const issue=queryRecovery({status:'awaiting_confirmation',recovery:{category:'no_matching_data',title:'No stage 2 donors in this release',message:'The recorded donor stages in this graph release do not include stage 2.',retryable:false,suggestions:[{label:'Check stage 3 instead',instruction:'Change only the T1D stage to stage 3; retain the islet and RNA assay filters.'}]},plan:{steps:[],recovery:{category:'planning_failure',message:'Retry the question'}}},'request_failed');
 expect(issue.category).toBe('no_matching_data');
 expect(issue.retryable).toBe(false);
 const revise=jest.fn();
 render(<QueryRecoveryDialog issue={issue} question="Find stage 2 islet samples" onRevise={revise}/>);
 expect(screen.queryByRole('button',{name:'Retry original question'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Check stage 3 instead'}));
 expect(revise).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Apply changes'}));
 expect(revise).toHaveBeenCalledWith('Change only the T1D stage to stage 3; retain the islet and RNA assay filters.');
});

test.each(['plan','preview','error'])('uses structured recovery from %s without creating unverified stage options',source=>{
 const diagnosis={category:'clarification_required',title:'Select a recorded tissue',message:'Two tissue names matched. Choose the intended tissue.',retryable:false,suggestions:['Keep only the spleen.',{label:'Duplicate',instruction:'Keep only the spleen.'},{label:'Keep PLN',instruction:'Keep only the pancreatic lymph node.'},'Drop the tissue filter.',{label:'Missing instruction'},null]};
 const run={status:'awaiting_confirmation',plan:{steps:[{}]}};
 run[source]={...run[source],recovery:diagnosis};
 const issue=queryRecovery(run,'failed');
 expect(issue.suggestions).toEqual(['Keep only the spleen.',{label:'Keep PLN',instruction:'Keep only the pancreatic lymph node.'}]);
});

test('structured recovery needs a usable explanation before it can mask a known clarification',()=>{
 const issue=queryRecovery({status:'awaiting_confirmation',recovery:{category:'broken'},plan:{steps:[{}],clarification:'Which tissue should be checked?'}},'error');
 expect(issue.message).toBe('Which tissue should be checked?');
});

test.each([
 ['timeout',true,'time limit'],
 ['rate_limited',true,'temporarily limited'],
 ['budget_exhausted',false,'operator updates the budget'],
 ['authentication',false,'authenticate'],
 ['query_validation',true,'did not preserve'],
 ['graph_identity',false,'could not verify'],
 ['graph_release_mismatch',false,'does not match the release'],
 ['billing',false,'billing status'],
])('explains %s without treating a service problem as missing biological data',(category,retryable,description)=>{
 const issue=queryRecovery({status:'failed',plan:{steps:[{}]},error:{category}});
 expect(issue.category).toBe(category);
 expect(issue.message).toContain(description);
 expect(issue.retryable).toBe(retryable);
 expect(issue.suggestions).toEqual([]);
});

test.each(['cancelled','superseded'])('%s suppresses stale recovery',status=>{
 expect(queryRecovery({status,recovery:{category:'clarification_required',message:'Choose a tissue'}})).toBeNull();
});


test('known run failure is not masked by a generic frontend request error',()=>{
 const issue=queryRecovery({status:'failed',plan:{steps:[{}]},error:{category:'budget_exhausted'}},'request_failed');
 expect(issue.category).toBe('budget_exhausted');
 expect(issue.retryable).toBe(false);
 expect(issue.message).toContain('operator updates the budget');
});


test('an active preview is not interrupted by a failure popup before remaining attempts finish',()=>{
 const run={status:'planning',plan:{steps:[{}]},preview:{status:'failed',preparation_complete:false}};
 expect(queryRecovery(run)).toBeNull();
 run.preview.preparation_complete=true;
 expect(queryRecovery(run).category).toBe('service_or_retrieval_failure');
});


test('valid literature-only and saved summary plans are not missing-step failures', () => {
  for (const plan_mode of ['literature_only', 'session_summary']) {
    for (const status of ['awaiting_confirmation', 'running', 'completed']) {
      expect(queryRecovery({status,plan:{plan_mode,steps:[],clarification:null}})).toBeNull();
    }
  }
});
