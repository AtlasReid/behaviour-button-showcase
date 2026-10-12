const timeline = document.querySelector('#design-timeline');
const model = document.querySelector('#hub-model');
const links = [...timeline.querySelectorAll('[data-design-id]')];
const previous = document.querySelector('#previous-design');
const next = document.querySelector('#next-design');
const modelReady = customElements.whenDefined('model-viewer');
let designs = [];
let selectedIndex = 0;

function updateCollectionNote() {
  const placeholders = designs.filter(design => design.modelStatus === 'placeholder').map(design => design.designNumber);
  const label = document.querySelector('#collection-label');
  const note = document.querySelector('#collection-note');
  if (!placeholders.length) {
    label.textContent = 'The model collection';
    note.textContent = 'Explore the individual models of all seven major hub designs.';
    return;
  }
  const consecutive = placeholders.length > 1 && placeholders.every((number, index) => number === placeholders[0] + index);
  const names = consecutive ? `${placeholders[0]}–${placeholders.at(-1)}` : placeholders.join(', ');
  label.textContent = 'Models being collected';
  note.textContent = `Design${placeholders.length === 1 ? '' : 's'} ${names} currently ${placeholders.length === 1 ? 'shows' : 'show'} the Design 7 enclosure as a placeholder. ${placeholders.length === 1 ? 'Its individual model will' : 'Their individual models will'} be added here.`;
}

function selectDesign(index, updateLocation = false) {
  if (index < 0 || index >= designs.length) return;
  selectedIndex = index;
  const design = designs[index];
  const placeholder = design.modelStatus === 'placeholder';
  links.forEach(link => {
    if (link.dataset.designId === design.id) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#selected-design').textContent = `Design ${design.designNumber}`;
  document.querySelector('#selected-position').textContent = `${String(index + 1).padStart(2, '0')} / ${String(designs.length).padStart(2, '0')}`;
  document.querySelector('#selected-title').textContent = design.title;
  document.querySelector('#selected-subtitle').textContent = design.subtitle;
  const story = document.querySelector('#selected-story');
  story.replaceChildren(...design.paragraphs.map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));
  const revision = document.querySelector('#design-revision-note');
  revision.textContent = design.revisionNote || '';
  revision.hidden = !design.revisionNote;
  document.querySelector('#model-caption').textContent = placeholder ? 'Design 7 placeholder' : `Design ${design.designNumber} · Enclosure`;
  const sourceLabel = document.querySelector('#model-source-label');
  sourceLabel.textContent = design.modelLabel;
  sourceLabel.dataset.modelStatus = design.modelStatus;
  model.alt = placeholder ? `Design 7 enclosure shown as a placeholder for Design ${design.designNumber}. This is not the Design ${design.designNumber} geometry.` : `Interactive Design ${design.designNumber} hub enclosure, showing its screen recess, stand and rear details.`;
  model.poster = design.poster;
  if (model.getAttribute('src') !== design.modelSrc) {
    document.querySelector('#model-error').hidden = true;
    document.querySelectorAll('.model-buttons button').forEach(button => { button.disabled = false; });
    document.querySelector('#model-status').textContent = 'Loading the model…';
    model.src = design.modelSrc;
  }
  modelReady.then(() => {
    model.autoRotate = false;
    model.resetTurntableRotation();
    model.cameraOrbit = '35deg 75deg 105%';
    model.fieldOfView = '30deg';
    model.jumpCameraToGoal();
    const rotate = document.querySelector('#model-rotate');
    rotate.setAttribute('aria-pressed', 'false');
    rotate.textContent = 'Rotate';
    if (model.loaded) document.querySelector('#model-status').textContent = 'Drag to rotate · Expand to zoom';
  });
  previous.disabled = index === 0;
  next.disabled = index === designs.length - 1;
  document.querySelector('#selection-status').textContent = `Design ${design.designNumber} selected. ${placeholder ? 'Design 7 model shown as a placeholder.' : `Design ${design.designNumber} enclosure model available.`}`;
  if (updateLocation) history.replaceState(null, '', `#${design.id}`);
}

links.forEach(link => link.addEventListener('click', event => {
  if (!designs.length) return;
  event.preventDefault();
  selectDesign(designs.findIndex(design => design.id === link.dataset.designId), true);
}));
previous.addEventListener('click', () => selectDesign(selectedIndex - 1, true));
next.addEventListener('click', () => selectDesign(selectedIndex + 1, true));
window.addEventListener('hashchange', () => {
  const index = designs.findIndex(design => `#${design.id}` === window.location.hash);
  if (index >= 0) selectDesign(index);
});

model.addEventListener('load', () => {
  document.querySelector('#model-error').hidden = true;
  document.querySelectorAll('.model-buttons button').forEach(button => { button.disabled = false; });
});

try {
  const response = await fetch('./assets/model-timeline.json');
  if (!response.ok) throw new Error('Timeline unavailable');
  designs = await response.json();
  if (!Array.isArray(designs) || designs.length !== 7 || designs.some(design => !Array.isArray(design.paragraphs) || !design.modelSrc || !design.id)) throw new Error('Invalid design sequence');
  updateCollectionNote();
  const initial = designs.findIndex(design => `#${design.id}` === window.location.hash);
  selectDesign(initial >= 0 ? initial : 0);
} catch {
  document.querySelector('#timeline-load-error').hidden = false;
  previous.disabled = true;
  next.disabled = true;
}
