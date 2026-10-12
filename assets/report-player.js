(() => {
  'use strict';

  // The local report loads only when requested. Readiness comes from its runtime.
  const reportUrl = './report.html?embedded=1';

  function initializeReportPlayer() {
    const player = document.getElementById('report-player');
    const loadButton = document.getElementById('report-load');
    const status = document.getElementById('report-status');
    const frameSlot = document.getElementById('report-frame-slot');
    if (!player || !loadButton || !status || !frameSlot || player.dataset.reportInitialized) return;

    player.dataset.reportInitialized = 'true';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const poster = player.querySelector('.report-poster');
    const fallbackHint = 'Use the Open full report link to view it separately.';
    let slowLoadTimer;

    const reloadButton = document.createElement('button');
    reloadButton.type = 'button';
    reloadButton.className = 'report-reload';
    reloadButton.textContent = 'Reload report';
    reloadButton.hidden = true;
    reloadButton.setAttribute('aria-controls', 'report-frame-slot');
    status.insertAdjacentElement('afterend', reloadButton);

    window.addEventListener('message', event => {
      const frame = frameSlot.firstElementChild;
      if (!frame || event.source !== frame.contentWindow) return;

      const protocol = window.location.protocol;
      if (protocol === 'http:' || protocol === 'https:') {
        if (event.origin !== window.location.origin) return;
      } else if (protocol !== 'file:') {
        return;
      }
      // File URLs can have opaque origins. The current iframe window remains
      // the sender check; this handshake carries only a fixed readiness signal.
      if (!event.data || event.data.type !== 'bbp-report-ready' || event.data.screenCount !== 12) return;

      window.clearTimeout(slowLoadTimer);
      player.dataset.reportState = 'ready';
      frameSlot.setAttribute('aria-busy', 'false');
      status.textContent = 'Report ready. Use the arrows to move through the report.';
    });

    function openReport() {
      window.clearTimeout(slowLoadTimer);
      const frame = document.createElement('iframe');
      frame.className = 'report-frame';
      frame.title = 'Behaviour Button interactive participant report';
      frame.allow = 'fullscreen';
      frame.allowFullscreen = true;
      frame.setAttribute('allowfullscreen', '');
      frame.tabIndex = 0;

      player.dataset.reportState = 'loading';
      frameSlot.setAttribute('aria-busy', 'true');
      status.textContent = 'Opening the interactive report.';
      if (poster) poster.hidden = true;
      loadButton.hidden = true;
      reloadButton.hidden = false;

      frame.addEventListener('error', () => {
        if (frameSlot.firstElementChild !== frame) return;
        window.clearTimeout(slowLoadTimer);
        player.dataset.reportState = 'error';
        frameSlot.setAttribute('aria-busy', 'false');
        status.textContent = `The report could not open here. Try Reload report. ${fallbackHint}`;
      });

      frame.src = reportUrl;
      frameSlot.replaceChildren(frame);
      frame.focus({ preventScroll: true });

      slowLoadTimer = window.setTimeout(() => {
        if (frameSlot.firstElementChild !== frame || player.dataset.reportState !== 'loading') return;
        player.dataset.reportState = 'slow';
        frameSlot.setAttribute('aria-busy', 'false');
        status.textContent = `The report is taking longer to open. Try Reload report. ${fallbackHint}`;
      }, 20000);
    }

    loadButton.addEventListener('click', openReport);
    reloadButton.addEventListener('click', openReport);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReportPlayer, { once: true });
  } else {
    initializeReportPlayer();
  }
})();
