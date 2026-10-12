(() => {
  'use strict';

  const app = document.getElementById('report-app');
  const stage = document.getElementById('report-stage');
  const viewport = document.getElementById('report-viewport');
  const previous = document.getElementById('previous-page');
  const next = document.getElementById('next-page');
  const pause = document.getElementById('pause-report');
  const fit = document.getElementById('fit-report');
  const restart = document.getElementById('restart-report');
  const position = document.getElementById('page-position');
  const announcement = document.getElementById('report-announcement');
  const data = window.BBP_REPORT;
  const embedded = new URLSearchParams(location.search).get('embedded') === '1';
  document.body.classList.toggle('is-embedded', embedded);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reducedMotion;
  let large = false;
  let current = null;
  let currentScene = null;
  let timer = null;
  let timerDeadline = 0;
  let timerRemaining = 0;
  let sequence = 0;
  let sceneAnimations = [];
  let leaving = null;
  let entryReady = false;

  if (!data || !Array.isArray(data.scenes) || !data.scenes.length) {
    document.getElementById('loading-note').textContent = 'The report could not load. Keep the assets/report folder beside report.html and reload.';
    [previous, next, pause, fit, restart].forEach(button => { button.disabled = true; });
    return;
  }
  const scenes = new Map(data.scenes.map(scene => [scene.id, scene]));
  const pages = data.scenes.filter(scene => !scene.transient);
  const slugMap = new Map(pages.map(scene => [scene.slug, scene.id]));

  function fitStage() {
    if (!current) return;
    stage.style.setProperty('--scene-ratio', `${current.width} / ${current.height}`);
    const width = viewport.clientWidth;
    const chrome = embedded ? document.querySelector('.report-controls').getBoundingClientRect().height :
      document.querySelector('.report-header').getBoundingClientRect().height +
      document.querySelector('.report-controls').getBoundingClientRect().height +
      document.querySelector('.report-hint').getBoundingClientRect().height + 64;
    const height = Math.max(180, window.innerHeight - chrome);
    stage.style.setProperty('--stage-width', `${large ? Math.min(width, 834) : Math.min(width, height * current.width / current.height, 834)}px`);
  }

  function clearTimer() {
    window.clearTimeout(timer);
    timer = null;
  }

  function armTimer(milliseconds) {
    clearTimer();
    timerRemaining = milliseconds;
    if (!entryReady || !current.timer || (paused && !current.transient) || document.hidden) return;
    const token = sequence;
    timerDeadline = performance.now() + milliseconds;
    timer = window.setTimeout(() => {
      if (token !== sequence) return;
      const action = current.timer.action;
      navigate(action.target, action, 'timer');
    }, Math.max(milliseconds, 1));
  }

  function setPaused(value) {
    paused = value;
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
    pause.title = paused ? 'Resume automatic transitions (Space)' : 'Pause automatic transitions (Space)';
    if (paused) {
      if (timer !== null) timerRemaining = Math.max(0, timerDeadline - performance.now());
      clearTimer();
      sceneAnimations.forEach(animation => animation.pause());
      if (current?.transient && current.timer) armTimer(timerRemaining);
    } else {
      sceneAnimations.forEach(animation => animation.play());
      if (current && current.timer) armTimer(timerRemaining);
    }
  }

  function applyProgress(container, scene) {
    // These bounds and timings are recovered from the original bar-timer components.
    if (!scene.progress) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    scene.progress.forEach((bar, index) => {
      if (!bar.active) return;
      const sourceGroup = svg.querySelector(`[data-node="${bar.nodeId}"]`);
      if (sourceGroup) sourceGroup.style.opacity = '0';
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', bar.x);
      rect.setAttribute('y', bar.y);
      rect.setAttribute('width', bar.width);
      rect.setAttribute('height', bar.height);
      rect.setAttribute('rx', bar.height / 2);
      rect.setAttribute('fill', bar.background || '#ffffff4d');
      svg.append(rect);
      const fill = rect.cloneNode();
      fill.setAttribute('fill', bar.fill || '#fff');
      fill.style.transformBox = 'fill-box';
      fill.style.transformOrigin = 'left center';
      svg.append(fill);
      fill.style.animation = `report-progress ${bar.duration}s linear ${bar.delay || 0}s both`;
      const animation = {
        pause: () => { fill.style.animationPlayState = 'paused'; },
        play: () => { fill.style.animationPlayState = 'running'; },
        cancel: () => { fill.style.animation = 'none'; }
      };
      if (paused || document.hidden) animation.pause();
      sceneAnimations.push(animation);
    });
  }

  function makeScene(scene) {
    const container = document.createElement('div');
    container.className = 'report-scene is-current';
    container.dataset.scene = scene.id;
    container.innerHTML = scene.svg;
    const svg = container.querySelector('svg');
    if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); }
    if (svg && scene.scroll?.direction === 'VERTICAL' && scene.scroll.contentHeight > scene.height) {
      const scroll = document.createElement('div');
      scroll.className = 'report-art-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', `${scene.title}. Scroll for the full summary.`);
      scroll.style.background = scene.background;
      container.prepend(scroll);
      scroll.append(svg);
      const fixed = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      fixed.classList.add('report-fixed-art');
      fixed.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`);
      fixed.setAttribute('aria-hidden', 'true');
      fixed.setAttribute('focusable', 'false');
      const definitions = svg.querySelector('defs');
      if (definitions) fixed.append(definitions.cloneNode(true));
      scene.scroll.fixedNodes.forEach(node => {
        const group = svg.querySelector(`[data-node="${node.nodeId}"]`);
        if (group) fixed.append(group);
      });
      container.append(fixed);
      svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.scroll.contentHeight}`);
      svg.setAttribute('height', scene.scroll.contentHeight);
      svg.style.height = 'auto';
      const rootClip = svg.querySelector('[data-root-clip]');
      if (rootClip) {
        rootClip.setAttribute('width', scene.width);
        rootClip.setAttribute('height', scene.scroll.contentHeight);
      }
    }
    const copy = document.createElement('div');
    copy.className = 'sr-only';
    const heading = document.createElement('h1');
    heading.textContent = scene.title;
    copy.append(heading);
    (scene.text || []).forEach(value => {
      const paragraph = document.createElement('p');
      paragraph.textContent = value;
      copy.append(paragraph);
    });
    container.append(copy);
    const hotspots = document.createElement('div');
    hotspots.className = 'report-hotspots';
    (scene.hotspots || []).forEach(hotspot => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'report-hotspot';
      button.dataset.sourceNode = hotspot.nodeId;
      button.setAttribute('aria-label', hotspot.label);
      button.title = hotspot.label;
      button.style.left = `${hotspot.x / scene.width * 100}%`;
      button.style.top = `${hotspot.y / scene.height * 100}%`;
      button.style.width = `${hotspot.width / scene.width * 100}%`;
      button.style.height = `${hotspot.height / scene.height * 100}%`;
      // The source hover variant eases the authored button fill to grey.
      const buttonPaint = container.querySelector(`[data-node="${hotspot.nodeId}"] > use`);
      if (buttonPaint && hotspot.hover) {
        const originalFill = buttonPaint.getAttribute('fill');
        const easing = `cubic-bezier(${hotspot.hover.easing.join(',')})`;
        buttonPaint.style.transition = `fill ${hotspot.hover.duration}s ${easing}`;
        const over = () => { buttonPaint.style.fill = hotspot.hover.fill; };
        const out = () => { buttonPaint.style.fill = originalFill; };
        button.addEventListener('pointerenter', over);
        button.addEventListener('pointerdown', over);
        button.addEventListener('focus', over);
        button.addEventListener('pointerleave', out);
        button.addEventListener('blur', out);
      }
      button.addEventListener('click', () => navigate(hotspot.action.target, hotspot.action, 'button'));
      hotspots.append(button);
    });
    container.append(hotspots);
    return container;
  }

  function transitionScene(oldScene, newScene, action) {
    if (!oldScene) return Promise.resolve();
    if (leaving) leaving.remove();
    leaving = oldScene;
    oldScene.className = 'report-scene is-leaving';
    oldScene.setAttribute('aria-hidden', 'true');
    oldScene.inert = true;
    const duration = reducedMotion ? 0 : (action?.duration ?? 0.3) * 1000;
    const easing = Array.isArray(action?.easing) ? `cubic-bezier(${action.easing.join(',')})` : 'ease-in-out';
    const type = action?.type || 'SLIDE_FROM_RIGHT';
    if (!duration) {
      oldScene.remove();
      if (leaving === oldScene) leaving = null;
      return Promise.resolve();
    }
    let enter, exit;
    if (oldScene.dataset.scene === '1:14915' && newScene.dataset.scene === '1:2589') {
      // These five native bars grow from one source unit to their authored widths.
      const bars = [['1:2625', 324.220001], ['1:2630', 294.059998], ['1:2635', 82.940002], ['1:2640', 30.16], ['1:2645', 30.16]];
      bars.forEach(([nodeId, width]) => {
        const group = newScene.querySelector(`[data-node="${nodeId}"]`);
        if (!group || !duration) return;
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        while (group.firstChild) wrapper.append(group.firstChild);
        wrapper.style.transformBox = 'fill-box';
        wrapper.style.transformOrigin = 'left center';
        wrapper.style.setProperty('--bar-start', 1 / width);
        wrapper.style.animation = `report-rank-reveal ${duration}ms ${easing} both`;
        group.append(wrapper);
      });
      oldScene.remove();
      if (leaving === oldScene) leaving = null;
      return new Promise(resolve => window.setTimeout(resolve, duration));
    } else if (type === 'SLIDE_FROM_RIGHT' || type === 'SLIDE_FROM_LEFT') {
      enter = type === 'SLIDE_FROM_RIGHT' ? 'report-enter-right' : 'report-enter-left';
      exit = type === 'SLIDE_FROM_RIGHT' ? 'report-exit-left' : 'report-exit-right';
    } else {
      enter = 'report-fade-in';
      exit = 'report-fade-out';
    }
    newScene.style.animation = `${enter} ${duration}ms ${easing} both`;
    oldScene.style.animation = `${exit} ${duration}ms ${easing} both`;
    return new Promise(resolve => {
      window.setTimeout(() => {
        oldScene.remove();
        if (leaving === oldScene) leaving = null;
        resolve();
      }, duration);
    });
  }

  function navigationAction(direction) {
    if (!current) return null;
    if (direction < 0) return current.hotspots.find(hotspot => hotspot.kind === 'previous')?.action || null;
    return current.hotspots.find(hotspot => hotspot.kind === 'next' || hotspot.kind === 'start')?.action || null;
  }

  function navigate(id, action, reason = 'button') {
    const scene = scenes.get(id);
    if (!scene) return;
    clearTimer();
    sceneAnimations.forEach(animation => animation.cancel());
    sceneAnimations = [];
    const token = ++sequence;
    entryReady = false;
    const oldScene = currentScene;
    const focusedWithin = oldScene && oldScene.contains(document.activeElement);
    current = scene;
    currentScene = makeScene(scene);
    stage.append(currentScene);
    stage.setAttribute('aria-label', scene.title);
    stage.dataset.page = scene.slug;
    position.textContent = `${scene.page} / ${pages.length}`;
    previous.disabled = !navigationAction(-1);
    const forwardAction = navigationAction(1);
    next.disabled = !forwardAction || (scene.slug === 'thanks');
    fitStage();
    if (!scene.transient) {
      history.replaceState(null, '', `${location.pathname}${location.search}#${scene.slug}`);
      document.title = `${scene.title} · Behaviour Button report`;
    }
    if (focusedWithin) stage.focus({ preventScroll: true });
    if (!scene.transient) announcement.textContent = `${scene.title}, page ${scene.page} of ${pages.length}`;
    const finished = transitionScene(oldScene, currentScene, action);
    timerRemaining = scene.timer ? scene.timer.seconds * 1000 : 0;
    // Complete the source's short ranking reveal even when automatic paging is paused.
    finished.then(() => {
      if (token !== sequence) return;
      entryReady = true;
      applyProgress(currentScene, scene);
      if (scene.timer) armTimer(timerRemaining);
    });
    if (large && reason !== 'timer') viewport.scrollTop = 0;
  }

  previous.addEventListener('click', () => { const action = navigationAction(-1); if (action) navigate(action.target, action); });
  next.addEventListener('click', () => { const action = navigationAction(1); if (action) navigate(action.target, action); });
  pause.addEventListener('click', () => setPaused(!paused));
  fit.addEventListener('click', () => {
    large = !large;
    document.body.classList.toggle('is-large', large);
    fit.textContent = large ? 'Fit page' : 'Larger';
    fit.setAttribute('aria-pressed', String(large));
    fitStage();
  });
  restart.addEventListener('click', () => navigate(data.startId, { type: 'SLIDE_FROM_LEFT', duration: 0.3 }));
  window.addEventListener('resize', fitStage);
  if (window.ResizeObserver) new ResizeObserver(fitStage).observe(viewport);
  window.addEventListener('hashchange', () => {
    const id = slugMap.get(location.hash.slice(1));
    if (id && id !== current?.id) navigate(id, { type: 'DISSOLVE', duration: 0.15 });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (timer !== null) timerRemaining = Math.max(0, timerDeadline - performance.now());
      clearTimer();
      sceneAnimations.forEach(animation => animation.pause());
    } else {
      if (!paused) sceneAnimations.forEach(animation => animation.play());
      if (current?.timer) armTimer(timerRemaining);
    }
  });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (event.code === 'Space' && event.target.tagName === 'BUTTON') return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const action = event.key === 'ArrowRight' && next.disabled ? null : navigationAction(event.key === 'ArrowRight' ? 1 : -1);
      if (action) { event.preventDefault(); navigate(action.target, action, 'keyboard'); }
    } else if (event.code === 'Space') {
      event.preventDefault(); setPaused(!paused);
    } else if (event.key === 'Home') {
      event.preventDefault(); navigate(data.startId, { type: 'SLIDE_FROM_LEFT', duration: 0.3 }, 'keyboard');
    }
  });

  stage.replaceChildren();
  setPaused(paused);
  navigate(slugMap.get(location.hash.slice(1)) || data.startId, null, 'initial');
  // The parent marks the on-demand player ready only after this local runtime starts.
  if (window.parent !== window) {
    const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
    window.parent.postMessage({ type: 'bbp-report-ready', screenCount: pages.length }, targetOrigin);
  }
})();
