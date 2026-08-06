import { TextDecoder, TextEncoder } from 'util';

import finalEventFixture from '../fixtures/hirnFinalEvent.json';
import {
  DEFAULT_HIRN_API_BASE,
  DOCUMENTED_HIRN_API_BASE,
  HirnHttpError,
  HirnIncompleteStreamError,
  HirnMalformedStreamError,
  HirnRequestCancelledError,
  askHirn,
  parseSseBlock,
} from './hirnLiteratureApi';

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

function createStreamResponse(chunks, responseOverrides = {}) {
  const encoder = new TextEncoder();
  let index = 0;
  const cancel = jest.fn().mockResolvedValue(undefined);

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: {
      getReader: () => ({
        cancel,
        read: jest.fn(async () => {
          if (index >= chunks.length) return { done: true };
          const value = encoder.encode(chunks[index]);
          index += 1;
          return { done: false, value };
        }),
      }),
    },
    ...responseOverrides,
    cancel,
  };
}

test('parses a complete HIRN SSE event', () => {
  const event = parseSseBlock(
    'data: {"step":"Complete","response":"Answer","references":[],"done":true}',
  );

  expect(event).toEqual({
    step: 'Complete',
    response: 'Answer',
    references: [],
    done: true,
  });
});

test('joins multiline data and ignores SSE metadata, keepalives, and [DONE]', () => {
  expect(parseSseBlock(': keepalive')).toBeNull();
  expect(parseSseBlock('event: done\ndata: [DONE]')).toBeNull();
  expect(
    parseSseBlock(
      'event: message\r\nid: 7\r\ndata: {"step":"Complete",\r\ndata: "done":true}',
    ),
  ).toEqual({ step: 'Complete', done: true });
});

test('reports malformed and non-object JSON events without exposing raw data', () => {
  expect(() => parseSseBlock('data: {not-json}')).toThrow(
    HirnMalformedStreamError,
  );
  expect(() => parseSseBlock('data: ["unexpected"]')).toThrow(
    /non-object JSON event/,
  );
});

test('assembles arbitrary network chunks and preserves the complete fixture', async () => {
  const serializedFixture = JSON.stringify(finalEventFixture);
  const response = createStreamResponse([
    ': keepalive\r',
    '\n\r\ndata: {"step":"Sear',
    'ching","content":"Searching PubMed"}\n\n',
    'data: [DONE]\n\n',
    `data: ${serializedFixture.slice(0, 90)}`,
    `${serializedFixture.slice(90)}\n\n`,
  ]);
  const fetchImpl = jest.fn().mockResolvedValue(response);
  const onEvent = jest.fn();
  const signal = new AbortController().signal;

  const finalEvent = await askHirn('  What is ZnT8?  ', {
    apiBase: 'https://proxy.example.test/hirn/',
    fetchImpl,
    onEvent,
    signal,
  });

  expect(finalEvent).toEqual(finalEventFixture);
  expect(onEvent.mock.calls.map(([event]) => event.step)).toEqual([
    'Searching',
    'Complete',
  ]);
  expect(fetchImpl).toHaveBeenCalledWith(
    'https://proxy.example.test/hirn/stream',
    expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        question: 'What is ZnT8?',
        messages: [],
        max_articles: 10,
      }),
      signal,
    }),
  );
  expect(response.cancel).toHaveBeenCalledTimes(1);
});

test('sends optional messages and session ID and clamps the article count', async () => {
  const response = createStreamResponse([
    'data: {"response":"Answer","done":true}\n\n',
  ]);
  const fetchImpl = jest.fn().mockResolvedValue(response);
  const messages = [{ role: 'user', content: 'Earlier question' }];

  await askHirn('Question', {
    fetchImpl,
    messages,
    sessionId: 'session-1',
    maxArticles: 100,
  });

  const request = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(request).toEqual({
    question: 'Question',
    messages,
    max_articles: 30,
    session_id: 'session-1',
  });
});

test('uses the documented API URL when no environment override is configured', () => {
  expect(DEFAULT_HIRN_API_BASE).toBe(
    process.env.REACT_APP_HIRN_LITERATURE_API_URL?.trim() ||
      DOCUMENTED_HIRN_API_BASE,
  );
});

test('rejects HTTP errors with status and a safe server detail', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    clone() {
      return this;
    },
    json: jest.fn().mockResolvedValue({ detail: 'Please retry shortly.' }),
  });

  const error = await askHirn('Question', { fetchImpl }).catch(
    (requestError) => requestError,
  );

  expect(error).toBeInstanceOf(HirnHttpError);
  expect(error).toMatchObject({
    name: 'HirnHttpError',
    code: 'HTTP_ERROR',
    status: 503,
    message:
      'HIRN request failed with HTTP 503 Service Unavailable: Please retry shortly.',
  });
});

test('rejects malformed stream events and cancels the reader', async () => {
  const response = createStreamResponse(['data: {bad-json}\n\n']);

  await expect(
    askHirn('Question', { fetchImpl: async () => response }),
  ).rejects.toBeInstanceOf(HirnMalformedStreamError);
  expect(response.cancel).toHaveBeenCalledTimes(1);
});

test('rejects a stream that closes before an event with done true', async () => {
  const response = createStreamResponse([
    'data: {"step":"Searching","content":"PubMed"}\n\n',
    'data: [DONE]\n\n',
  ]);

  await expect(
    askHirn('Question', { fetchImpl: async () => response }),
  ).rejects.toBeInstanceOf(HirnIncompleteStreamError);
});

test('rejects a successful response without a readable body as malformed', async () => {
  await expect(
    askHirn('Question', {
      fetchImpl: async () => ({ ok: true, status: 200, body: null }),
    }),
  ).rejects.toMatchObject({
    code: 'MALFORMED_STREAM',
    message: 'HIRN returned no readable response stream.',
  });
});

test('turns platform abort failures into a recognizable cancellation error', async () => {
  const platformAbort = new Error('The operation was aborted.');
  platformAbort.name = 'AbortError';

  const error = await askHirn('Question', {
      fetchImpl: jest.fn().mockRejectedValue(platformAbort),
    }).catch((requestError) => requestError);

  expect(error).toBeInstanceOf(HirnRequestCancelledError);
  expect(error).toMatchObject({ name: 'AbortError', code: 'ABORTED' });
});

test('does not fetch when the supplied signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetchImpl = jest.fn();

  await expect(
    askHirn('Question', { fetchImpl, signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError', code: 'ABORTED' });
  expect(fetchImpl).not.toHaveBeenCalled();
});
