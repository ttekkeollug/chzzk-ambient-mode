// youtube-ambilight's core trick: draw video frames to a tiny canvas behind the player,
// scale it up and blur it. ponytail: CSS blur instead of the original's WebGL pipeline.
let cfg = { enabled: true, scale: 1.6, blur: 80, opacity: 1, saturate: 1.5, panel: 0.4 };
const FIELDS = [
  ['enabled', '켜기'], ['scale', '크기', 1, 2.5, 0.05], ['blur', '흐림', 0, 150, 5],
  ['opacity', '밝기', 0, 1, 0.05], ['saturate', '채도', 0, 3, 0.1], ['panel', '패널 불투명도', 0, 1, 0.05],
];

const canvas = document.createElement('canvas');
canvas.width = 128; canvas.height = 72;
Object.assign(canvas.style, { position: 'fixed', zIndex: '-1', pointerEvents: 'none', display: 'none' });
const ctx = canvas.getContext('2d');
document.documentElement.append(canvas);

const style = document.createElement('style');
style.textContent = `
.chzzk-ambient-clear{background:transparent!important}
.chzzk-ambient-btn{display:flex;flex:none;padding:0;align-items:center;justify-content:center;color:#fff;background:none;border:0;cursor:pointer}
.chzzk-ambient-btn.on{color:#00ffa3}
.chzzk-ambient-panel{position:absolute;right:16px;bottom:64px;z-index:2147483647;width:240px;padding:12px 14px;border-radius:10px;
  background:rgba(20,21,23,.92);color:#eee;font:13px system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.5)}
.chzzk-ambient-panel label{display:flex;justify-content:space-between;align-items:center;margin:8px 0;gap:8px}
.chzzk-ambient-panel input[type=range]{width:120px}`;
document.head.append(style);

let video = null, anchor = null;
const tinted = new Map(); // element -> its original inline background-color

function apply() {
  canvas.style.filter = `blur(${cfg.blur}px) saturate(${cfg.saturate})`;
  canvas.style.opacity = cfg.opacity;
  btn.classList.toggle('on', cfg.enabled);
  for (const [k] of FIELDS) { const el = panel.querySelector('#ca-' + k); el[el.type === 'checkbox' ? 'checked' : 'value'] = cfg[k]; }
  untint();
  setVideo(cfg.enabled ? video : null);
}

// The canvas sits at z-index -1, so every opaque ancestor of the player would hide it.
// Clear those backgrounds (and the video's own letterbox) and move the page color to <html>.
function setVideo(v) {
  document.querySelectorAll('.chzzk-ambient-clear').forEach(e => e.classList.remove('chzzk-ambient-clear'));
  video = v;
  if (!v || !cfg.enabled) return;
  const html = document.documentElement;
  for (let e = v; e && e !== html; e = e.parentElement) {
    const c = getComputedStyle(e).backgroundColor;
    if (c !== 'rgba(0, 0, 0, 0)' && isBig(e)) { html.style.backgroundColor = c; break; }
  }
  for (let e = v; e && e !== html; e = e.parentElement) e.classList.add('chzzk-ambient-clear');
}

const isBig = e => { const r = e.getBoundingClientRect(); return r.width * r.height >= innerWidth * innerHeight * 0.5; };

// YouTube look: make the page's large panels (header, sidebar, chat...) see-through so the glow
// spreads across the whole window. Samples a grid of points instead of knowing Chzzk's class names.
// ponytail: heuristic (opaque, >150x150px, no background image); add per-selector rules if it misses something.
function tintPage(r) {
  for (let i = 0.5; i < 10; i++) for (let j = 0.5; j < 8; j++) {
    const x = i * innerWidth / 10, y = j * innerHeight / 8;
    if (x > r.left && x < r.left + r.width && y > r.top && y < r.top + r.height) continue;
    for (const e of document.elementsFromPoint(x, y)) {
      if (e === document.documentElement || e === canvas || tinted.has(e) || e.closest('.chzzk-ambient-panel')) continue;
      const b = e.getBoundingClientRect(), s = getComputedStyle(e);
      if (b.width * b.height < 150 * 150 || s.backgroundImage !== 'none') continue;
      const m = s.backgroundColor.match(/[\d.]+/g);
      if (!m || m[3] === '0') continue;
      tinted.set(e, e.style.getPropertyValue('background-color'));
      const a = isBig(e) ? 0 : cfg.panel * (m[3] ?? 1);
      e.style.setProperty('background-color', `rgba(${m[0]},${m[1]},${m[2]},${a})`, 'important');
    }
  }
}

function untint() {
  for (const [e, v] of tinted) v ? e.style.setProperty('background-color', v) : e.style.removeProperty('background-color');
  tinted.clear();
}

function largestVideo() {
  let best = null, area = 0;
  for (const v of document.querySelectorAll('video')) {
    const r = v.getBoundingClientRect(), a = r.width * r.height;
    if (a > area) { best = v; area = a; }
  }
  return best;
}

// Where the picture actually is inside the <video> box (object-fit: contain letterboxing).
function pictureRect(v) {
  const r = v.getBoundingClientRect();
  if (!v.videoWidth || !r.width) return r;
  const s = Math.min(r.width / v.videoWidth, r.height / v.videoHeight);
  const w = v.videoWidth * s, h = v.videoHeight * s;
  return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
}

// Settings button in the player's control bar, left of the right-hand button group (record button).
const btn = document.createElement('button');
btn.title = '앰비언트 설정';
btn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'
  + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const panel = document.createElement('div');
panel.className = 'chzzk-ambient-panel';
panel.hidden = true;
panel.innerHTML = FIELDS.map(([k, name, min, max, step]) => min === undefined
  ? `<label>${name} <input type="checkbox" id="ca-${k}"></label>`
  : `<label>${name} <input type="range" id="ca-${k}" min="${min}" max="${max}" step="${step}"></label>`).join('');
for (const [k] of FIELDS) {
  const el = panel.querySelector('#ca-' + k);
  el.oninput = () => chrome.storage.local.set({ [k]: el.type === 'checkbox' ? el.checked : +el.value });
}
// Keep clicks on our UI from reaching the player (which would pause/play or hide controls).
for (const t of ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'keydown', 'wheel']) {
  panel.addEventListener(t, e => e.stopPropagation());
  // Window capture runs before any player listener, so the clip/record button next to us never sees it.
  window.addEventListener(t, e => {
    if (!btn.contains(e.target)) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (t === 'click') panel.hidden = !panel.hidden;
  }, true);
}

function injectButton() {
  const r = video.getBoundingClientRect();
  anchor = [...document.querySelectorAll('button, [role=button]')].filter(b => {
    if (b === btn) return false;
    const br = b.getBoundingClientRect();
    return br.width && br.bottom <= r.bottom + 1 && br.bottom > r.bottom - 80 && br.left > r.left + r.width / 2 && br.right <= r.right + 1;
  }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0];
  if (!anchor) return;
  // Don't copy the neighbour's classes: the player dispatches clicks by class, which fired the clip button.
  const ar = anchor.getBoundingClientRect();
  btn.className = 'chzzk-ambient-btn' + (cfg.enabled ? ' on' : '');
  Object.assign(btn.style, { width: ar.width + 'px', height: ar.height + 'px' });
  anchor.before(btn);
  let root = btn.parentElement;
  while (root && !root.contains(video)) root = root.parentElement;
  (root || document.body).append(panel);
}

// Chzzk is an SPA: re-pick the player, re-inject the button and re-tint new panels periodically.
setInterval(() => {
  const v = largestVideo();
  if (v !== video) { untint(); setVideo(v); }
  if (video && !btn.isConnected) injectButton();
  if (cfg.enabled && video && !document.fullscreenElement) tintPage(pictureRect(video));
}, 500);

// The player hides its controls per button, so mirror the neighbour's visibility; close the panel with them.
function syncButton() {
  if (!anchor?.isConnected) return;
  const s = getComputedStyle(anchor), shown = s.visibility !== 'hidden' && +s.opacity > 0.05;
  btn.style.opacity = s.opacity;
  btn.style.visibility = s.visibility;
  if (!shown) panel.hidden = true;
}
// Clicking anywhere outside our button/panel closes the panel.
addEventListener('pointerdown', e => { if (!btn.contains(e.target) && !panel.contains(e.target)) panel.hidden = true; }, true);

function loop() {
  requestAnimationFrame(loop);
  syncButton();
  // Fullscreen only renders the fullscreen element's subtree, so the canvas has to live inside it.
  const host = document.fullscreenElement || document.documentElement;
  if (canvas.parentElement !== host) host.append(canvas);
  if (!cfg.enabled || !video || video.readyState < 2) { canvas.style.display = 'none'; return; }
  const r = pictureRect(video);
  if (!r.width) { canvas.style.display = 'none'; return; }
  Object.assign(canvas.style, {
    display: 'block', left: r.left + 'px', top: r.top + 'px',
    width: r.width + 'px', height: r.height + 'px', transform: `scale(${cfg.scale})`,
  });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}
chrome.storage.local.get(cfg, s => { cfg = s; apply(); });
chrome.storage.onChanged.addListener(c => { for (const k in c) cfg[k] = c[k].newValue; apply(); });
loop();

// Popup asks "why can't I see it?": report the video state and what is painted over the glow.
const describe = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : '');
const opaque = e => { const s = getComputedStyle(e), a = s.backgroundColor.match(/[\d.]+/g)?.[3]; return a === undefined || s.backgroundImage !== 'none'; };
chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg !== 'status') return;
  if (!cfg.enabled) return reply('꺼져 있음');
  const v = largestVideo();
  if (!v) return reply('영상(video)을 찾지 못했습니다.');
  const r = pictureRect(v), lines = [
    `영상: ${v.videoWidth}x${v.videoHeight}, readyState ${v.readyState}`,
    `화면 위치: ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
    `설정 버튼: ${btn.isConnected ? '있음' : '못 넣음'}, 투명 처리한 패널: ${tinted.size}개`,
  ];
  const pts = { 위: [r.left + r.width / 2, r.top - 20], 아래: [r.left + r.width / 2, r.top + r.height + 20],
                왼쪽: [r.left - 20, r.top + r.height / 2], 오른쪽: [r.left + r.width + 20, r.top + r.height / 2] };
  for (const [name, [x, y]] of Object.entries(pts)) {
    const cover = document.elementsFromPoint(x, y).find(e => e !== canvas && e !== document.documentElement && opaque(e));
    lines.push(`${name}: ${cover ? '가림 ← ' + describe(cover) : '보임'}`);
  }
  reply(lines.join('\n'));
});
