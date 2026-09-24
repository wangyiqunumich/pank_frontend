import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AgentResultLayout } from '../SearchResult/AgentResult';
jest.mock('https://cdn.jsdelivr.net/npm/igv@3.0.2/dist/igv.esm.min.js', () => ({}), {virtual:true});
jest.mock('../constants/apiEndpoints', () => ({PLANNER_AGENT_BASE_URL:'https://example.test'}));
jest.mock('../components/SupportingMaterial', () => ({AlertMessage:() => null}));
jest.mock('../SearchResult/result', () => () => <div>Legacy result</div>);
jest.mock('../components/AgentSidebar', () => () => <aside>Existing sidebar</aside>);
const followUp = jest.fn();
const meta = {anchorPrefix:'recorded', isQuestionComplete:true, isPlanning:false, hideFloatingSearchBar:false,
  followUpHandler:followUp, questions:[
    {id:'a',query:'Recorded INS question',anchorPrefix:'previous',anchorId:'previous-question-1'},
    {id:'b',query:'Recorded SST question',anchorPrefix:'recorded',anchorId:'recorded-question-1'},
  ]};
function RecordedResult({onContentMeta}) {
  useEffect(() => { Promise.resolve().then(() => onContentMeta(meta)); }, []);
  return <div><div id="previous-question-1">Saved INS answer</div><div id="recorded-question-1">Saved SST answer</div></div>;
}
beforeEach(()=>{
  followUp.mockClear();
  localStorage.clear();
  localStorage.setItem('pank_feedback_auto_prompt_disabled_v1','1');
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});
test('native shell follows recorded question anchors and sends free follow-ups through the adapter', async () => {
  render(<MemoryRouter initialEntries={['/result-new2?provider=vnext&run_id=b']}><AgentResultLayout ResultView={RecordedResult} allowSearch showFloatingSearchBar questionCharacterLimit={6000} /></MemoryRouter>);
  expect(await screen.findByRole('button',{name:'Q1 Recorded INS question'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Q2 Recorded SST question'})).toBeTruthy();
  expect(screen.queryByText(/How Does The SNP Rs2402203/)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Q1 Recorded INS question'}));
  expect(document.getElementById('previous-question-1').scrollIntoView).toHaveBeenCalled();
  const input=screen.getByLabelText('Follow-up question');
  await waitFor(()=>expect(input.disabled).toBe(false));
  fireEvent.change(input,{target:{value:'What about glucagon?'}});
  fireEvent.keyPress(input,{key:'Enter',charCode:13});
  expect(followUp).toHaveBeenCalledWith('What about glucagon?');
  await waitFor(()=>expect(input.value).toBe(''));
  followUp.mockResolvedValueOnce(false);
  fireEvent.change(input,{target:{value:'Failed follow-up'}});
  fireEvent.keyPress(input,{key:'Enter',charCode:13});
  await waitFor(()=>expect(followUp).toHaveBeenCalledTimes(2));
  expect(input.value).toBe('Failed follow-up');
  fireEvent.change(input,{target:{value:'a'.repeat(6001)}});
  fireEvent.keyPress(input,{key:'Enter',charCode:13});
  expect(followUp).toHaveBeenCalledTimes(2);
  expect(input.value).toHaveLength(6001);
  expect(screen.getByText(/Please shorten your question to 6,000/)).toBeTruthy();
});
