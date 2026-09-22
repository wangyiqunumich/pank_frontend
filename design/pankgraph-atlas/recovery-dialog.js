/* Recovery dialog — ONE shared component for all recovery variants (design prototype).
   Renders from window.RECOVERY_VARIANTS[variant] into <div data-recovery-dialog="<variant>">.
   Behaviour is simulated: this is a design snapshot, no request is sent. */
(() => {
  const D = window.RECOVERY_DEFAULTS, V = window.RECOVERY_VARIANTS;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ICON_CLOSE = '<svg class="MuiSvgIcon-root" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  const ICON_CHECK = '<svg class="MuiSvgIcon-root" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
  const SPINNER = '<span class="pk-spinner" aria-hidden="true"></span>';

  function navigate(id) {
    if (window.parent !== window) window.parent.postMessage({ type: 'atlas-nav', id }, '*');
    else location.href = id + '.html';
  }

  function mount(host) {
    const id = host.dataset.recoveryDialog, cfg = V[id];
    if (!cfg) return;
    const uid = 'recovery-' + id.replace(/[^a-z0-9]/gi, '-');
    const state = { text: '', attempts: 0, loading: false, countdown: 0, open: true, timer: null, tick: null, snack: null, selected: -1 };

    host.innerHTML = `
<div class="MuiDialog-root MuiModal-root pk-recovery-root" role="presentation">
  <div class="MuiBackdrop-root MuiModal-backdrop" aria-hidden="true"></div>
  <div class="MuiDialog-container MuiDialog-scrollPaper" role="presentation">
    <div class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiDialog-paper pk-recovery" role="alertdialog" aria-modal="true"
         aria-labelledby="${uid}-title" aria-describedby="${uid}-desc" tabindex="-1">
      <h2 class="MuiTypography-root MuiDialogTitle-root pk-recovery__title" id="${uid}-title">
        <span class="MuiTypography-root MuiTypography-overline pk-eyebrow">${esc(cfg.eyebrow)}</span>${esc(cfg.title)}
      </h2>
      <button class="MuiButtonBase-root MuiIconButton-root pk-close" type="button" aria-label="Close and cancel query" data-action="cancel">${ICON_CLOSE}</button>
      <div class="MuiDialogContent-root pk-recovery__content">
        <p class="MuiTypography-root MuiTypography-body1 MuiDialogContentText-root pk-recovery__description" id="${uid}-desc">${esc(cfg.description)}</p>
        <div class="MuiBox-root pk-original" aria-label="${esc(D.originalQuestionLabel)}">
          <span class="MuiTypography-root MuiTypography-body2 pk-supporting">${esc(D.originalQuestionLabel)}</span>
          <p class="MuiTypography-root MuiTypography-body1">${esc(D.originalQuestion)}</p>
        </div>
        ${cfg.suggestions ? `
        <div class="MuiFormControl-root pk-section">
          <span class="MuiFormLabel-root pk-section-label" id="${uid}-sugg">${esc(D.suggestionsLabel)}</span>
          <div class="MuiFormGroup-root MuiRadioGroup-root" role="radiogroup" aria-labelledby="${uid}-sugg">
            ${cfg.suggestions.map((s, i) => `
            <label class="MuiFormControlLabel-root">
              <span class="MuiButtonBase-root MuiRadio-root"><input class="PrivateSwitchBase-input" type="radio" name="${uid}-choice" value="${i}" data-action="suggest"><span class="pk-radio-icon" aria-hidden="true">${ICON_CHECK}</span></span>
              <span class="MuiTypography-root MuiTypography-body1 MuiFormControlLabel-label">${esc(s.label)}${s.detail ? ` <span class="pk-detail">${esc(s.detail)}</span>` : ''}${s.recommended ? '<span class="MuiChip-root MuiChip-sizeSmall"><span class="MuiChip-label">Recommended</span></span>' : ''}</span>
            </label>`).join('')}
          </div>
        </div>` : ''}
        ${cfg.editable ? `
        <div class="MuiFormControl-root MuiTextField-root pk-edit">
          <label class="MuiFormLabel-root pk-section-label pk-edit__label" for="${uid}-edit">${esc(D.editLabel)}${cfg.editRequired ? '' : ` <span class="pk-tag">${esc(D.editOptional)}</span>`}</label>
          <div class="MuiInputBase-root MuiOutlinedInput-root MuiInputBase-multiline">
            <textarea class="MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputMultiline" id="${uid}-edit" rows="3"
              placeholder="${esc(cfg.placeholder || '')}" aria-describedby="${uid}-helper" ${cfg.editRequired ? 'aria-required="true"' : ''}></textarea>
            <fieldset class="MuiOutlinedInput-notchedOutline" aria-hidden="true"><legend><span class="notranslate">​</span></legend></fieldset>
          </div>
          <p class="MuiFormHelperText-root pk-edit__helper" id="${uid}-helper">${esc(D.editHelper)}</p>
        </div>` : ''}
        <div class="pk-banner" role="status" aria-live="polite" hidden></div>
      </div>
      <div class="MuiDialogActions-root pk-recovery__actions">
        <button class="MuiButtonBase-root MuiButton-root MuiButton-text" type="button" data-action="cancel">${esc(cfg.secondaryLabel || 'Cancel query')}</button>
        <button class="MuiButtonBase-root MuiButton-root MuiButton-contained" type="button" data-action="primary"><span class="pk-btn-label">${esc(cfg.primaryLabel)}</span></button>
      </div>
    </div>
  </div>
</div>
<div class="pk-snackbar" role="status" aria-live="polite" hidden><span class="pk-snackbar__text"></span><button type="button" class="pk-snackbar__action" data-action="undo">${esc(D.undo)}</button></div>`;

    const root = host.querySelector('.pk-recovery-root'), paper = host.querySelector('.pk-recovery');
    const primary = host.querySelector('[data-action="primary"]'), primaryLabel = primary.querySelector('.pk-btn-label');
    const textarea = host.querySelector('textarea'), banner = host.querySelector('.pk-banner');
    const snack = host.querySelector('.pk-snackbar'), snackText = snack.querySelector('.pk-snackbar__text');

    function render() {
      const hasText = !!state.text.trim();
      // Typed change turns the primary into an apply-and-retry, except where the edit is already the primary action (editRequired).
      let label = hasText && cfg.editable && !cfg.editRequired ? D.applyLabel : cfg.primaryLabel;
      if (state.loading) label = D.loadingLabel;
      if (state.countdown > 0) label = D.countdownLabel(state.countdown);
      primary.innerHTML = (state.loading ? SPINNER : '') + `<span class="pk-btn-label">${esc(label)}</span>`;
      primary.disabled = state.loading || state.countdown > 0 || (cfg.editRequired && !hasText);
      primary.setAttribute('aria-busy', String(state.loading));
      primary.classList.toggle('Mui-disabled', primary.disabled);
    }
    function showBanner(text) { banner.textContent = text; banner.hidden = false; }
    function startCountdown(seconds) {
      state.countdown = seconds; render();
      clearInterval(state.tick);
      state.tick = setInterval(() => { state.countdown -= 1; if (state.countdown <= 0) { clearInterval(state.tick); state.countdown = 0; } render(); }, 1000);
    }
    function fail() {
      state.attempts += 1;
      showBanner(state.attempts === 1 ? D.failure1 : D.failureN(state.attempts));
      if (cfg.countdownSeconds) startCountdown(cfg.countdownSeconds);
    }
    function submit() {
      if (primary.disabled) return;
      const hasText = !!state.text.trim();
      if (!cfg.retryable && !hasText) { showSnack(D.operatorNotified, false); return; }
      state.loading = true; render();
      clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        state.loading = false;
        const success = id === 'error-clarification' || hasText;   // explicit clarification / applied edit → plan review
        if (success) { navigate(D.successTarget); render(); return; }
        fail(); render();
        (textarea || primary).focus?.();
      }, 1200);
    }
    function showSnack(text, withUndo) {
      snackText.textContent = text; snack.querySelector('.pk-snackbar__action').hidden = !withUndo; snack.hidden = false;
      clearTimeout(state.snack); state.snack = setTimeout(() => { snack.hidden = true; }, 6000);
    }
    function close() { state.open = false; root.hidden = true; clearInterval(state.tick); showSnack(D.cancelled, true); }
    function reopen() { state.open = true; root.hidden = false; snack.hidden = true; focusInitial(); }
    function focusInitial() {
      const target = cfg.editRequired && textarea ? textarea
        : !primary.disabled ? primary
        : (textarea || host.querySelector('[data-action="cancel"].MuiButton-text'));
      target?.focus();
    }
    function focusables() {
      return [...paper.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && !el.hidden && el.offsetParent !== null);
    }

    host.addEventListener('click', e => {
      const t = e.target.closest('[data-action]'); if (!t) return;
      const a = t.dataset.action;
      if (a === 'cancel') close();
      else if (a === 'primary') submit();
      else if (a === 'undo') reopen();
    });
    host.addEventListener('change', e => {
      const t = e.target.closest('[data-action="suggest"]'); if (!t || !textarea) return;
      const s = cfg.suggestions[+t.value]; state.text = s.text; textarea.value = s.text; render();
    });
    textarea?.addEventListener('input', () => {
      state.text = textarea.value;
      // typing a custom change deselects any picked suggestion
      const picked = host.querySelector('[data-action="suggest"]:checked');
      if (picked && cfg.suggestions[+picked.value].text !== state.text) picked.checked = false;
      render();
    });
    paper.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    paper.addEventListener('focusout', e => { if (state.open && !paper.contains(e.relatedTarget) && e.relatedTarget) requestAnimationFrame(() => focusables()[0]?.focus()); });

    render();
    if (!location.search.includes('capture=1')) focusInitial();
  }

  document.querySelectorAll('[data-recovery-dialog]').forEach(mount);
})();
