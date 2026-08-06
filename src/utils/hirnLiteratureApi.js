export const DOCUMENTED_HIRN_API_BASE =
  'https://jieliulab3.dcmb.med.umich.edu/hirn-literature-api';

const configuredApiBase = process.env.REACT_APP_HIRN_LITERATURE_API_URL?.trim();

export const DEFAULT_HIRN_API_BASE =
  configuredApiBase || DOCUMENTED_HIRN_API_BASE;

export class HirnApiError extends Error {
  constructor(message, code, cause) {
    super(message);
    this.name = new.target.name;
    this.code = code;

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class HirnInputError extends HirnApiError {
  constructor(message = 'Enter a biomedical question.') {
    super(message, 'INVALID_REQUEST');
  }
}

export class HirnHttpError extends HirnApiError {
  constructor(status, statusText, detail) {
    const statusLabel = [status, statusText].filter(Boolean).join(' ');
    const suffix = detail ? `: ${detail}` : '.';

    super(`HIRN request failed with HTTP ${statusLabel}${suffix}`, 'HTTP_ERROR');
    this.status = status;
    this.statusText = statusText || '';
    this.detail = detail;
  }
}

export class HirnNetworkError extends HirnApiError {
  constructor(
    message = 'Unable to connect to HIRN Literature. Please try again.',
    cause,
  ) {
    super(message, 'NETWORK_ERROR', cause);
  }
}

export class HirnMalformedStreamError extends HirnApiError {
  constructor(message = 'HIRN returned a malformed response stream.', cause) {
    super(message, 'MALFORMED_STREAM', cause);
  }
}

export class HirnIncompleteStreamError extends HirnApiError {
  constructor() {
    super(
      'HIRN stream ended before a complete answer was received.',
      'INCOMPLETE_STREAM',
    );
  }
}

export class HirnRequestCancelledError extends HirnApiError {
  constructor(cause) {
    super('HIRN request was cancelled.', 'ABORTED', cause);
    // Preserve the platform convention used by fetch and AbortController.
    this.name = 'AbortError';
  }
}

const EVENT_BOUNDARY = /(?:\r\n|\r|\n)(?:\r\n|\r|\n)/;

function isAbortError(error, signal) {
  return Boolean(
    signal?.aborted ||
      error?.name === 'AbortError' ||
      error?.code === 'ABORT_ERR',
  );
}

function normalizeApiBase(apiBase) {
  const normalized =
    typeof apiBase === 'string' ? apiBase.trim().replace(/\/+$/, '') : '';
  return normalized || DOCUMENTED_HIRN_API_BASE;
}

function normalizeMaxArticles(maxArticles) {
  if (maxArticles === undefined || maxArticles === null) return 10;
  if (typeof maxArticles !== 'number' || !Number.isFinite(maxArticles)) {
    throw new HirnInputError('Maximum articles must be a number.');
  }

  return Math.min(30, Math.max(1, Math.trunc(maxArticles)));
}

async function readHttpErrorDetail(response) {
  try {
    const source =
      typeof response.clone === 'function' ? response.clone() : response;
    if (typeof source.json !== 'function') return undefined;

    const body = await source.json();
    if (typeof body?.detail !== 'string') return undefined;

    const detail = body.detail.trim();
    return detail ? detail.slice(0, 300) : undefined;
  } catch (_error) {
    return undefined;
  }
}

/**
 * Parse one SSE event block into a HIRN event.
 *
 * SSE comments and terminal `[DONE]` markers intentionally return null. Multiple
 * `data:` fields are joined with a newline as required by the SSE specification.
 */
export function parseSseBlock(block) {
  if (typeof block !== 'string') {
    throw new HirnMalformedStreamError(
      'HIRN stream emitted an invalid event block.',
    );
  }

  const dataLines = [];
  const lines = block.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);

  lines.forEach((line) => {
    if (!line || line.startsWith(':')) return;

    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    if (field !== 'data') return;

    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    dataLines.push(value);
  });

  const data = dataLines.join('\n').trim();
  if (!data || data === '[DONE]') return null;

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    throw new HirnMalformedStreamError(
      'HIRN stream contained invalid JSON.',
      error,
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HirnMalformedStreamError(
      'HIRN stream emitted a non-object JSON event.',
    );
  }

  return parsed;
}

/**
 * Ask the HIRN Literature service a single question and return its final event.
 */
export async function askHirn(question, options = {}) {
  if (typeof question !== 'string' || !question.trim()) {
    throw new HirnInputError();
  }

  const normalizedQuestion = question.trim();
  const maxArticles = normalizeMaxArticles(options.maxArticles);
  const apiBase = normalizeApiBase(options.apiBase ?? DEFAULT_HIRN_API_BASE);
  const signal = options.signal;
  const availableFetch =
    options.fetchImpl ??
    (typeof fetch === 'function' ? fetch : undefined);

  if (signal?.aborted) throw new HirnRequestCancelledError();
  if (!availableFetch) {
    throw new HirnNetworkError(
      'HIRN Literature is unavailable because this browser cannot make requests.',
    );
  }

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
        messages: options.messages ?? [],
        max_articles: maxArticles,
        ...(options.sessionId ? { session_id: options.sessionId } : {}),
      }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error, signal)) {
      throw new HirnRequestCancelledError(error);
    }
    throw new HirnNetworkError(undefined, error);
  }

  if (signal?.aborted) throw new HirnRequestCancelledError();

  if (!response?.ok) {
    const detail = await readHttpErrorDetail(response || {});
    throw new HirnHttpError(
      response?.status ?? 'unknown',
      response?.statusText,
      detail,
    );
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new HirnMalformedStreamError(
      'HIRN returned no readable response stream.',
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamClosed = false;

  const dispatch = (block) => {
    const event = parseSseBlock(block);
    if (!event) return null;

    options.onEvent?.(event);
    return event.done === true ? event : null;
  };

  const drainCompleteBlocks = () => {
    while (true) {
      const boundary = buffer.match(EVENT_BOUNDARY);
      if (!boundary || boundary.index === undefined) return null;

      const block = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      const finalEvent = dispatch(block);
      if (finalEvent) return finalEvent;
    }
  };

  try {
    while (true) {
      let chunk;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (isAbortError(error, signal)) {
          throw new HirnRequestCancelledError(error);
        }
        throw new HirnNetworkError(
          'The HIRN response stream could not be read. Please try again.',
          error,
        );
      }

      if (signal?.aborted) throw new HirnRequestCancelledError();

      if (chunk.value) {
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      }
      if (chunk.done) {
        streamClosed = true;
        buffer += decoder.decode();
      }

      const finalEvent = drainCompleteBlocks();
      if (finalEvent) return finalEvent;

      if (chunk.done) break;
    }

    if (buffer.trim()) {
      const finalEvent = dispatch(buffer);
      if (finalEvent) return finalEvent;
    }

    throw new HirnIncompleteStreamError();
  } finally {
    if (!streamClosed && typeof reader.cancel === 'function') {
      try {
        await reader.cancel();
      } catch (_error) {
        // The request may already have been cancelled by its AbortSignal.
      }
    }
  }
}
