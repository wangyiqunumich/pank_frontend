import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import functionalDataApi from '../utils/functionalDataApi';
import FunctionalDataPage from './FunctionalDataPage';

jest.mock('../components/AgentSidebar', () => () => null);
jest.mock('../components/FunctionalCohortPlot', () => ({ data }) => <output data-testid="trace-type">{data.trace_type}</output>);
jest.mock('../utils/functionalDataApi', () => ({
  getSummary: jest.fn(), getDonors: jest.fn(), getCohortTraces: jest.fn(), getTraitSummaryPng: jest.fn(),
}));
const payload = type => ({ trace_type: type, times: [0, 10], series: [{ donor_id: 'rrid', values: [1, 2] }], mean: [1, 2], stimuli: [] });

test('response changes cancel old raw requests and a late response cannot replace the selected cohort', async () => {
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:trait'); URL.revokeObjectURL = jest.fn();
  const pending = [];
  let resolveSummary;
  functionalDataApi.getSummary.mockImplementation(() => new Promise(resolve => { resolveSummary = resolve; }));
  functionalDataApi.getDonors.mockResolvedValue({ count: 1, donors: [{ donor_id: 'rrid', id: 'PKBD' }] });
  functionalDataApi.getTraitSummaryPng.mockResolvedValue(new Blob());
  functionalDataApi.getCohortTraces.mockImplementation((type, filters, { signal }) => new Promise(resolve => pending.push({ type, signal, resolve })));
  const { unmount } = render(<MemoryRouter><FunctionalDataPage /></MemoryRouter>);
  try {
    expect(functionalDataApi.getCohortTraces).not.toHaveBeenCalled();
    await act(async () => resolveSummary({ summary: { available_donors: 1, trace_types: ['ins_ieq', 'gcg_ieq'] },
      options: {}, ranges: { age: { min: 3, max: 68 }, bmi: { min: 13.7, max: 47.6 } }, traits: ['INS-IEQ G 16.7 SI'] }));
    await waitFor(() => expect(pending.length).toBeGreaterThan(0));
    expect(functionalDataApi.getCohortTraces).toHaveBeenLastCalledWith('ins_ieq', expect.objectContaining({ age_max: 68, bmi_min: 13.7 }), expect.any(Object));
    fireEvent.mouseDown(screen.getAllByRole('combobox')[3]);
    fireEvent.click(await screen.findByRole('option', { name: 'GCG IEQ' }));
    await waitFor(() => expect(pending.some(request => request.type === 'gcg_ieq')).toBe(true));
    const old = pending.filter(request => request.type === 'ins_ieq');
    expect(old.every(request => request.signal.aborted)).toBe(true);
    await act(async () => pending.findLast(request => request.type === 'gcg_ieq').resolve(payload('gcg_ieq')));
    expect(screen.getByTestId('trace-type').textContent).toBe('gcg_ieq');
    await act(async () => old.forEach(request => request.resolve(payload('ins_ieq'))));
    expect(screen.getByTestId('trace-type').textContent).toBe('gcg_ieq');
  } finally {
    unmount(); URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  }
});
