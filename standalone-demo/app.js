(() => {
  const API_BASE = 'http://127.0.0.1:18100';
  const $ = (id) => document.getElementById(id);
  const state = { controller: null };
  const elements = {
    question: $('question'), ask: $('ask'), cancel: $('cancel'), composer: $('composer'),
    progress: $('progress'), progressLabel: $('progress-label'), error: $('error'),
    errorMessage: $('error-message'), result: $('result'), submitted: $('submitted-question'),
    answer: $('answer'), answerCard: $('answer-card'), answerTitle: $('answer-title'),
    answerIcon: $('answer-icon'), executionTime: $('execution-time'), refusalNote: $('refusal-note'),
    referencesSection: $('references-section'), references: $('references'), count: $('reference-count'),
    askAnother: $('ask-another'),
  };

  const show = (node, visible) => node.classList.toggle('hidden', !visible);
  const safeUrl = (value) => {
    try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : ''; }
    catch (_) { return ''; }
  };
  const anchorId = (id) => `hirn-reference-${String(id).replace(/[^A-Za-z0-9_-]/g, '-')}`;

  function setBusy(busy) {
    elements.question.disabled = busy;
    elements.ask.disabled = busy || !elements.question.value.trim();
    show(elements.cancel, busy);
    show(elements.progress, busy);
    if (busy) elements.progressLabel.textContent = 'Connecting to the HIRN literature service…';
  }

  function appendAnswerText(text, references) {
    elements.answer.replaceChildren();
    const ids = new Set(references.map((ref) => String(ref.id || '')).filter(Boolean));
    const pattern = /\[([^\]]+)\](?:\((https?:\/\/[^\s)]+)\))?/g;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      elements.answer.append(document.createTextNode(text.slice(cursor, match.index)));
      const label = match[1];
      const external = safeUrl(match[2]);
      if (external || ids.has(label)) {
        const link = document.createElement('a');
        link.textContent = `[${label}]`;
        link.href = external || `#${anchorId(label)}`;
        if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        elements.answer.append(link);
      } else {
        elements.answer.append(document.createTextNode(match[0]));
      }
      cursor = match.index + match[0].length;
    }
    elements.answer.append(document.createTextNode(text.slice(cursor)));
  }

  function renderReference(ref, index) {
    const id = String(ref.id || ref.pmid || `source-${index + 1}`);
    const card = document.createElement('article');
    card.className = 'reference-card'; card.id = anchorId(id);
    const number = document.createElement('span'); number.className = 'reference-number'; number.textContent = index + 1;
    const body = document.createElement('div'); body.className = 'reference-body';
    const href = safeUrl(ref.url);
    const title = document.createElement(href ? 'a' : 'div');
    title.className = 'reference-title'; title.textContent = ref.title || `HIRN source ${id}`;
    if (href) { title.href = href; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
    body.append(title);
    const meta = document.createElement('div'); meta.className = 'meta';
    const values = [ref.pmid ? `PMID ${ref.pmid}` : id, ref.source && String(ref.source).replaceAll('_', ' '), ref.journal, ref.date, ref.consortia].filter(Boolean);
    values.forEach((value, valueIndex) => { const chip = document.createElement('span'); chip.textContent = value; if (!valueIndex) chip.className = 'identifier'; meta.append(chip); });
    body.append(meta);
    if (Array.isArray(ref.authors) && ref.authors.length) { const authors = document.createElement('p'); authors.className = 'authors'; authors.textContent = `Authors: ${ref.authors.join(', ')}`; body.append(authors); }
    const fulltext = safeUrl(ref.fulltext_url);
    if (fulltext && fulltext !== href) { const link = document.createElement('a'); link.className = 'fulltext'; link.href = fulltext; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Read full text'; body.append(link); }
    card.append(number, body); return card;
  }

  function renderComplete(frame, question) {
    const refs = Array.isArray(frame.references) ? frame.references : [];
    const refused = refs.length === 0;
    elements.submitted.textContent = question;
    elements.answerCard.classList.toggle('refusal', refused);
    elements.answerTitle.textContent = refused ? 'Not found in this library' : 'Direct answer';
    elements.answerIcon.textContent = refused ? '▤' : '✓';
    elements.executionTime.textContent = Number.isFinite(Number(frame.execution_time)) ? `${Number(frame.execution_time).toFixed(1)}s` : '';
    appendAnswerText(String(frame.response || 'The service completed without returning answer text.'), refs);
    show(elements.refusalNote, refused); show(elements.referencesSection, !refused);
    elements.count.textContent = refs.length; elements.references.replaceChildren(...refs.map(renderReference));
    show(elements.composer, false); show(elements.result, true); show(elements.progress, false);
  }

  async function ask() {
    const question = elements.question.value.trim(); if (!question) return;
    state.controller?.abort(); state.controller = new AbortController();
    show(elements.error, false); show(elements.result, false); setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify({ question }), signal: state.controller.signal });
      if (!response.ok) throw new Error(`HIRN request failed with HTTP ${response.status}.`);
      if (!response.body) throw new Error('HIRN returned no readable response stream.');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      for (;;) {
        const chunk = await reader.read(); buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
        const blocks = buffer.split(/\r?\n\r?\n/); buffer = blocks.pop() || '';
        for (const block of blocks) {
          const data = block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
          if (!data || data === '[DONE]') continue;
          const frame = JSON.parse(data);
          if (frame.step === 'Processing') continue;
          if (frame.type === 'progress') { elements.progressLabel.textContent = frame.label || 'Searching the HIRN library'; continue; }
          if (frame.step === 'Error') throw new Error(frame.content || 'The HIRN service could not complete this request.');
          if (frame.step === 'Complete') { renderComplete(frame, question); return; }
        }
        if (chunk.done) break;
      }
      throw new Error('HIRN stream ended before a complete answer was received.');
    } catch (error) {
      if (error.name !== 'AbortError') { elements.errorMessage.textContent = error.message || 'The request failed.'; show(elements.error, true); }
    } finally { state.controller = null; setBusy(false); }
  }

  elements.question.addEventListener('input', () => { elements.ask.disabled = !elements.question.value.trim(); });
  elements.question.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); ask(); } });
  elements.ask.addEventListener('click', ask);
  elements.cancel.addEventListener('click', () => state.controller?.abort());
  elements.askAnother.addEventListener('click', () => { elements.question.value = ''; show(elements.result, false); show(elements.composer, true); elements.ask.disabled = true; elements.question.focus(); });
  elements.ask.disabled = true;
})();
