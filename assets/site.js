const model = document.querySelector('#hub-model');
const stage = document.querySelector('#model-stage');
const status = document.querySelector('#model-status');
const rotate = document.querySelector('#model-rotate');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (model) {
  const stopRotation = () => {
    model.autoRotate = false;
    rotate.setAttribute('aria-pressed', 'false');
    rotate.textContent = 'Rotate';
  };
  const ready = customElements.whenDefined('model-viewer');
  document.querySelector('#model-reset').addEventListener('click', async () => {
    await ready;
    stopRotation();
    model.resetTurntableRotation();
    model.cameraOrbit = '35deg 75deg 105%';
    model.fieldOfView = '30deg';
    model.jumpCameraToGoal();
    status.textContent = 'View reset · Drag to rotate';
  });
  rotate.addEventListener('click', async () => {
    await ready;
    model.autoRotate = !model.autoRotate;
    rotate.setAttribute('aria-pressed', String(model.autoRotate));
    rotate.textContent = model.autoRotate ? 'Pause' : 'Rotate';
    status.textContent = model.autoRotate ? 'Rotating · Select Pause to stop' : 'Drag to rotate · Expand to zoom';
  });
  document.querySelector('#model-expand').addEventListener('click', async () => {
    if (!document.fullscreenEnabled || !stage.requestFullscreen) {
      status.textContent = 'Use “Open the design separately” for a larger view.';
      return;
    }
    try {
      await stage.requestFullscreen();
    } catch {
      status.textContent = 'Use “Open the design separately” for a larger view.';
    }
  });
  document.querySelector('#model-close').addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    const expanded = document.fullscreenElement === stage;
    model.toggleAttribute('disable-zoom', !expanded);
    model.setAttribute('touch-action', expanded ? 'none' : 'pan-y');
    document.querySelector(expanded ? '#model-close' : '#model-expand').focus({ preventScroll: true });
  });
  model.addEventListener('load', () => {
    status.textContent = 'Drag to rotate · Expand to zoom';
  });
  model.addEventListener('error', () => {
    stopRotation();
    document.querySelector('#model-error').hidden = false;
    status.textContent = 'The 3D preview is unavailable.';
    document.querySelectorAll('.model-buttons button').forEach(button => { button.disabled = true; });
  });
  model.addEventListener('progress', event => {
    model.querySelector('.model-progress span').style.transform = `scaleX(${event.detail.totalProgress})`;
    model.querySelector('.model-progress').hidden = event.detail.totalProgress === 1;
  });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) stopRotation(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) stopRotation();
    });
    observer.observe(model);
  }
}
