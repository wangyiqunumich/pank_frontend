import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import Diagnostics from './Diagnostics';
import {queryRecovery} from './QueryRecoveryDialog';
const d={code:'E03.ENTITY_CHOICE_UNVERIFIED',module:'M04',message:'Identity selection could not be verified.',reason:'entity_choice_requires_resolve_entities',attempts:{claude_calls:3,lookup_batches:1},outcome:'planning_repair_exhausted',run_id:'run-1'};
test('specific cause expands on demand and copying excludes unrelated data',async()=>{
 const writeText=jest.fn().mockResolvedValue();Object.assign(navigator,{clipboard:{writeText}});
 const issue=queryRecovery({status:'failed',diagnostics:[d],plan:{recovery:{category:'planning_failure',message:'Generic'}}});
 render(<Diagnostics items={[{...issue.diagnostics[0],secret:'never-copy'}]}/>);
 expect(screen.queryByText(/E03.ENTITY_CHOICE_UNVERIFIED/)).toBeNull();
 const toggle=screen.getByRole('button',{name:'Error E03 details'});
 expect(toggle.getAttribute('aria-expanded')).toBe('false');
 fireEvent.click(toggle);
 expect(toggle.getAttribute('aria-expanded')).toBe('true');
 expect(screen.getAllByText(/E03.ENTITY_CHOICE_UNVERIFIED/)[0]).toBeTruthy();
 fireEvent.click(screen.getByText('Copy diagnostics'));
 await waitFor(()=>expect(writeText).toHaveBeenCalled());
 expect(writeText.mock.calls[0][0]).toContain('run-1');expect(writeText.mock.calls[0][0]).not.toContain('never-copy');
 fireEvent.click(toggle);
 expect(screen.queryByText('Copy diagnostics')).toBeNull();
});
test('a nonblocking diagnostic does not create a recovery dialog',()=>{
 expect(queryRecovery({status:'completed',plan:{steps:[{}]},diagnostics:[{...d,code:'E01.UNAVAILABLE',blocking:false}]})).toBeNull();
});
