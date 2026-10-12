# Behaviour Button showcase

A buildless, responsive project website in the Studio editorial direction. Open `index.html` through a local web server. All files required by the page are in this folder; no npm install, build command, backend or account is required.

## Local preview

Serve this folder, for example with `python -m http.server 8767 --bind 127.0.0.1`, then open `http://127.0.0.1:8767/`.

## GitHub Pages

Upload the contents of this folder to the root of the repository used for the website, including `.nojekyll`. In the repository Settings → Pages, select the branch and root directory containing `index.html`. Relative paths support both a user site and a project site under `/repository-name/`.

The site contains `index.html`, `development.html`, `model-timeline.html` and `report.html`. Keep the `assets` directory beside them. The original local source files and internal project records are not part of the website.

## Google Sites

On Google Sites, add a **Full page embed** and enter the published GitHub Pages URL. Publish the Google Site, then check the live desktop and mobile page. The links between the project pages work inside the embed. “Open full experience” opens a separate tab.

The local report loads only after the visitor selects “Try the report”. The iframe uses `./report.html?embedded=1`; “Open full report” opens the same report in a separate tab. The player announces readiness only after the report runtime sends its ready signal. Reload and the direct report link remain available if the embedded player cannot start.

## Standalone participant report

`report.html` is a standalone HTML5 recreation based on the supplied local Figma export. Its report content and interaction data are bundled with the website, so viewing it requires no Figma account or connection to Figma.

Keep `assets/report` with `report.html` when copying the report. The report uses classic scripts and local scene data rather than ES modules or fetched JSON, allowing direct `file:` opening as well as HTTP preview and GitHub Pages hosting. Keep all local images, fonts and other report assets together. The wider showcase should still be previewed over HTTP because its model pages use modules and fetch model or timeline files.

The 12 report pages and one brief ranking reveal were recovered directly from `Hub02-TN.fig`. The visuals use native vector paths and the original glyph outlines, plus 21 original chart images; they are not page screenshots. Nine source emojis use the viewer's system emoji font. The report has no remote scripts, font downloads, Figma connection, or analytics service. `assets/report/source-manifest.json` records the source hash, recovered pages and original image hashes. The `.fig` itself is preserved in the workspace and is not distributed with the website.

The original navigation, timed pages, progress bars and five-bar ranking reveal are preserved. Week 1–3 keep their native vertical scroll range and fixed arrow buttons. Pause/Play, keyboard arrows, Home/Restart and a larger view are added around the original canvas. Reduced-motion viewers start paused. Hidden browser tabs suspend the timers. The original 4-second grey hover variant is used for navigation buttons; the main page transitions use the authored slide direction, duration and easing. Smart Animate between different page compositions uses a dissolve, while the ranking's bar growth is reproduced directly. The meal-box page's omitted source duration/easing use the local default of 0.3 seconds/ease-in-out.

This is the supplied example report, with its original text and metrics. Its pre-existing “32 times” snacking headline and “23” ranking bar differ, and its contextual statistics contain draft reference copy. They have been preserved for source fidelity, not recomputed or independently validated. There is no underlying event dataset bundled with the player.

Browser checks cover every page, source arrows and Restart, timed advancement and pause, mobile layouts at 375 pixels, weekly scrolling and the main page's ready/reload handshake. Direct `file:` browsing could not be exercised because the testing browser permits HTTP(S) URLs only; the classic-script/relative-asset setup was checked statically. Use the HTTP preview above for the verified route.

The embedded report sends `{ type: 'bbp-report-ready', screenCount: 12 }` to the parent after its runtime is ready. The loader checks the current iframe as sender and checks matching origins on HTTP(S). For direct `file:` opening, it accepts the current iframe's readiness message without assuming file URLs share an origin.

Archival reference: [the original shared Figma prototype](https://www.figma.com/proto/FdPWhX817xo9KSate4ngCC/Hub02-TN?node-id=1-2303&starting-point-node-id=1%3A2303&scaling=scale-down&content-scaling=fixed). This link records the source reference; the live website uses the local report.

## Editing

- `assets/site.css`: shared colours, spacing and responsive layouts.
- `index.html`: main page content and links.
- `development.html`: 14 development chapters, from the 2023 kit and pilot through the seven 2.0 hub designs, wider pilot and future ambitions.
- `assets/development.css`: development page styles.
- `assets/history`: 34 supplied development photographs and two MP4 clips with posters. The videos use manual playback and do not preload.
- `model-timeline.html`: chronological Designs 1–7 model gallery.
- `assets/model-timeline.json`: the seven design descriptions and individual model paths.
- `assets/model-timeline.css` and `assets/model-timeline.js`: timeline layout and design selection.
- `assets/site.js`: 3D model controls.
- `report.html`: standalone participant report, also used by the main-page player.
- `assets/report-player.js`: on-demand local report loader and readiness handling.
- `assets/report/report.css`: report layout, visual styling and transitions.
- `assets/report/report-runtime.js`: report navigation and animation runtime.
- `assets/report/report-scenes.js`: locally bundled scene and interaction data from the supplied Figma export.
- `assets/report`: report-specific vector scene data and original chart images, kept beside the runtime files.
- `assets/design-7.glb`: replace this with the finished textured model when ready.
- `assets/model-poster.webp`: the matching static model preview.

The current GLB is the cream-coloured Design 7 enclosure. The assembled black kit is shown in the photographs. Product photos, report cover and development imagery were derived from supplied project assets; originals are preserved. `model-viewer.min.js` is the bundled Google model-viewer 4.4.0 runtime; its license is included alongside it.

## Adding models to the timeline

Designs 1–6 currently use `assets/design-7.glb` as an explicitly labelled placeholder; Design 7 uses its own enclosure model. Each JSON entry has its own `modelSrc` and `poster`, so replacing one design does not affect the others.

To add a model, place its GLB and matching poster in `assets`, then update that design's entry in `assets/model-timeline.json`:

```json
"modelSrc": "./assets/design-1.glb",
"modelStatus": "available",
"poster": "./assets/design-1-poster.webp",
"modelLabel": "Design 1 enclosure model"
```

Keep the seven entries in major-design order. Revision 6.3 and Design 6.4 Slim belong in Design 6's `revisionNote`. The page reads this file over HTTP; use the local preview server rather than opening the HTML with a `file:` URL. No files are uploaded by the model viewer.
