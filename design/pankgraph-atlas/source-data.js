/* Source data file table — design prototype (handoff 2026-10-05). Simulated downloads; no request is sent.
   Mount: <div data-source-files data-atlas-interactive></div>. Files come from window.SOURCE_FILES. */
(() => {
  const ICON = {
    download: 'M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z',
    check: 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z'
  };
  const svg = n => `<svg class="pk-src-icon" viewBox="0 -960 960 960" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  document.querySelectorAll('[data-source-files]').forEach(host => {
    const files = (window.SOURCE_FILES || []).map(f => ({ ...f, status: f.available === false ? 'disabled' : (f.status || 'idle') }));
    const uid = 'src-' + Math.random().toString(36).slice(2, 7);
    let bulk = false;

    host.innerHTML = `
<div class="pk-src-card pk-src__table" role="table" aria-label="Source data files">
  <div class="pk-src__hrow" role="row">
    <div role="columnheader">Data source</div>
    <div role="columnheader">Type</div>
    <div role="columnheader"><span class="pk-src__sr">Action</span></div>
  </div>
  ${files.map((f, i) => `
  <div class="pk-src__row" role="row" data-i="${i}">
    <div class="pk-src__file" role="cell">
      <span class="pk-src__name" title="${esc(f.name)}">${esc(f.name)}</span>
      <span class="pk-src__desc" title="${esc(f.description)}">${esc(f.description)}</span>
    </div>
    <div role="cell"><span class="pk-src__tag">${esc(f.type)}</span></div>
    <div class="pk-src__action" role="cell"></div>
  </div>`).join('')}
</div>
<span class="pk-src__live" aria-live="polite" id="${uid}-live"></span>`;

    const bulkBtn = host.closest('.pk-src')?.querySelector('.pk-src__bulk');
    const live = host.querySelector('.pk-src__live');
    const say = t => { live.textContent = t; };
    const available = files.filter(f => f.status !== 'disabled');

    function renderRow(i) {
      const f = files[i], row = host.querySelector(`.pk-src__row[data-i="${i}"]`), cell = row.querySelector('.pk-src__action');
      row.classList.toggle('pk-src__row--off', f.status === 'disabled');
      const label = t => `<span class="pk-src-label">${t}</span>`;
      if (f.status === 'idle') cell.innerHTML = `<button type="button" class="pk-src-btn pk-src-btn--fixed" data-dl="${i}" aria-label="Download ${esc(f.name)}" title="Download ${esc(f.name)}">${svg('download')}${label('Download')}</button>`;
      else if (f.status === 'progress') cell.innerHTML = `<button type="button" class="pk-src-btn pk-src-btn--fixed" disabled aria-busy="true" aria-label="Downloading ${esc(f.name)}" title="Preparing download…"><span class="pk-src-spinner" aria-hidden="true"></span>${label('Downloading…')}</button>`;
      else if (f.status === 'done') cell.innerHTML = `<button type="button" class="pk-src-btn pk-src-btn--fixed pk-src-btn--done" data-dl="${i}" aria-label="Downloaded ${esc(f.name)}. Download again" title="Downloaded · click to download again">${svg('check')}${label('Downloaded')}</button>`;
      else cell.innerHTML = `<span class="pk-src__unavailable" title="${esc(f.unavailableReason || 'Unavailable')}"><button type="button" class="pk-src-btn pk-src-btn--fixed pk-src-btn--off" disabled aria-label="${esc(f.name)} unavailable: ${esc(f.unavailableReason || '')}">${svg('download')}${label('Unavailable')}</button></span>`;
    }
    function renderBulk() {
      if (!bulkBtn) return;
      bulkBtn.hidden = available.length < 2;
      const done = available.filter(f => f.status === 'done').length, busy = available.filter(f => f.status === 'progress').length;
      if (bulk && busy) { bulkBtn.disabled = true; bulkBtn.innerHTML = `<span class="pk-src-spinner" aria-hidden="true"></span><span>Downloading ${done + 1} of ${available.length}…</span>`; bulkBtn.title = 'Downloading all available files'; }
      else if (done === available.length && available.length) { bulk = false; bulkBtn.disabled = false; bulkBtn.innerHTML = `${svg('check')}<span>All downloaded</span>`; bulkBtn.title = 'All available files downloaded'; }
      else { bulk = false; bulkBtn.disabled = false; bulkBtn.innerHTML = `${svg('download')}<span>Download all (${available.length})</span>`; bulkBtn.title = `Download ${available.length} available files`; }
    }
    function download(i) {
      const f = files[i]; if (f.status === 'progress' || f.status === 'disabled') return;
      f.status = 'progress'; renderRow(i); renderBulk(); say(`Downloading ${f.name}`);
      setTimeout(() => { f.status = 'done'; renderRow(i); renderBulk(); say(available.every(x => x.status === 'done') ? 'All files downloaded' : `${f.name} downloaded`); }, 1200 + Math.random() * 900);
    }
    host.addEventListener('click', e => { const b = e.target.closest('[data-dl]'); if (b) download(+b.dataset.dl); });
    bulkBtn?.addEventListener('click', () => {
      if (bulk) return; bulk = true; renderBulk();
      available.filter(f => f.status === 'idle').forEach((f, n) => setTimeout(() => download(files.indexOf(f)), n * 350));
    });
    files.forEach((_, i) => renderRow(i)); renderBulk();
    // Pre-seeded "in progress" demo rows resolve like a real download would (not in capture mode).
    if (!location.search.includes('capture=1')) files.forEach((f, i) => { if (f.status === 'progress') setTimeout(() => { f.status = 'done'; renderRow(i); renderBulk(); say(`${f.name} downloaded`); }, 2100); });
  });
})();
