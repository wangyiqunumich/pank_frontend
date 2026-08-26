export const DOCUMENTED_HIRN_AGENT_API_BASE =
  'https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api/agent';

const configuredAgentApiBase = process.env.REACT_APP_HIRN_AGENT_API_URL?.trim();

export const DEFAULT_HIRN_AGENT_API_BASE =
  configuredAgentApiBase || DOCUMENTED_HIRN_AGENT_API_BASE;

const normalizeBase = (value) => String(value || DOCUMENTED_HIRN_AGENT_API_BASE)
  .trim()
  .replace(/\/+$/, '');

export class HirnAgentApiError extends Error {
  constructor(message, code = 'AGENT_ERROR', cause) {
    super(message);
    this.name = 'HirnAgentApiError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

const isAbort = (error, signal) => Boolean(
  signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR'
);

function parseAgentSseBlock(block) {
  const lines = String(block || '').replace(/\r\n|\r/g, '\n').split('\n');
  const eventLine = lines.find((line) => line.startsWith('event:'));
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!data) return null;
  try {
    return {
      type: eventLine ? eventLine.slice(6).trim() : 'message',
      payload: JSON.parse(data),
    };
  } catch (error) {
    throw new HirnAgentApiError(
      'HIRN Agent returned a malformed response stream.',
      'MALFORMED_STREAM',
      error,
    );
  }
}

export async function getHirnAgentUsageStatus(options = {}) {
  const availableFetch = options.fetchImpl ?? fetch;
  const apiBase = normalizeBase(options.apiBase ?? DEFAULT_HIRN_AGENT_API_BASE);
  let response;
  try {
    response = await availableFetch(`${apiBase}/usage-status`, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
  } catch (error) {
    if (isAbort(error, options.signal)) throw error;
    throw new HirnAgentApiError('Unable to read HIRN Agent usage status.', 'NETWORK_ERROR', error);
  }
  if (!response.ok) {
    throw new HirnAgentApiError(
      `HIRN Agent usage status failed with HTTP ${response.status}.`,
      'HTTP_ERROR',
    );
  }
  return response.json();
}

export async function askHirnAgent(question, conversation = [], options = {}) {
  const normalizedQuestion = String(question || '').trim();
  if (!normalizedQuestion) {
    throw new HirnAgentApiError('Enter a biomedical question.', 'INVALID_REQUEST');
  }

  const availableFetch = options.fetchImpl ?? fetch;
  const apiBase = normalizeBase(options.apiBase ?? DEFAULT_HIRN_AGENT_API_BASE);
  let response;
  try {
    response = await availableFetch(`${apiBase}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        question: normalizedQuestion,
        conversation: Array.isArray(conversation) ? conversation : [],
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (isAbort(error, options.signal)) throw error;
    throw new HirnAgentApiError('Unable to connect to HIRN Agent Search.', 'NETWORK_ERROR', error);
  }

  if (!response.ok) {
    throw new HirnAgentApiError(
      `HIRN Agent request failed with HTTP ${response.status}.`,
      'HTTP_ERROR',
    );
  }
  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new HirnAgentApiError('HIRN Agent returned no readable stream.', 'MALFORMED_STREAM');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completeEvent = null;

  const dispatch = (block) => {
    const event = parseAgentSseBlock(block);
    if (!event) return;
    options.onEvent?.(event.type, event.payload);
    if (event.type === 'error') {
      throw new HirnAgentApiError(
        String(event.payload?.message || 'HIRN Agent could not complete the search.'),
      );
    }
    if (event.type === 'complete') completeEvent = event.payload;
  };

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.value) buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      if (chunk.done) buffer += decoder.decode();

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
      if (chunk.done) break;
    }
    if (buffer.trim()) dispatch(buffer);
  } catch (error) {
    if (isAbort(error, options.signal)) {
      const abortError = new Error('HIRN Agent request was cancelled.');
      abortError.name = 'AbortError';
      throw abortError;
    }
    throw error;
  } finally {
    try {
      await reader.cancel();
    } catch (_error) {
      // The stream may already be closed or aborted.
    }
  }

  if (!completeEvent) {
    throw new HirnAgentApiError(
      'HIRN Agent stream ended before a complete result was received.',
      'INCOMPLETE_STREAM',
    );
  }
  return completeEvent;
}

export { parseAgentSseBlock };
