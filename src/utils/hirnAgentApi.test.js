import { TextDecoder, TextEncoder } from 'util';

import {
  askHirnAgent,
  getHirnAgentUsageStatus,
  parseAgentSseBlock,
} from './hirnAgentApi';

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

function streamResponse(chunks) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => index < chunks.length
          ? { done: false, value: encoder.encode(chunks[index++]) }
          : { done: true },
        cancel: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };
}

test('parses named agent SSE events', () => {
  expect(parseAgentSseBlock('event: planning\ndata: {"variants":["one"]}')).toEqual({
    type: 'planning',
    payload: { variants: ['one'] },
  });
});

test('returns the exact selected HIRN result and alternatives from complete', async () => {
  const complete = {
    selected_attempt_id: 'r1-1',
    selected: {
      attempt_id: 'r1-1',
      query: 'IFIH1 beta cells',
      result: { response: 'Raw HIRN answer', references: [{ id: '123' }] },
    },
    alternatives: [],
  };
  const response = streamResponse([
    'event: planning\ndata: {"variants":["one","two","three"]}\n\n',
    `event: complete\ndata: ${JSON.stringify(complete)}\n\n`,
  ]);
  const fetchImpl = jest.fn().mockResolvedValue(response);
  const onEvent = jest.fn();

  const result = await askHirnAgent('MDA5?', [], { fetchImpl, onEvent });

  expect(result).toEqual(complete);
  expect(result.selected.result.response).toBe('Raw HIRN answer');
  expect(onEvent.mock.calls.map(([type]) => type)).toEqual(['planning', 'complete']);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
    question: 'MDA5?',
    conversation: [],
  });
});

test('reads usage warning status', async () => {
  const payload = { warning_active: true, estimated_monthly_cost_usd: 100.1 };
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
  await expect(getHirnAgentUsageStatus({ fetchImpl })).resolves.toEqual(payload);
});
