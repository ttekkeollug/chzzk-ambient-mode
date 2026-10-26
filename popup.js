const DEFAULTS = { enabled: true, scale: 1.6, blur: 80, opacity: 1, saturate: 1.5, panel: 0.4 };

chrome.storage.local.get(DEFAULTS, s => {
  for (const [k, v] of Object.entries(s)) {
    const el = document.getElementById(k), num = document.getElementById(k + '-n');
    if (!num) {
      el.checked = v;
      el.oninput = () => chrome.storage.local.set({ [k]: el.checked });
      continue;
    }
    el.value = num.value = v;
    const digits = (el.step.split('.')[1] || '').length;
    const save = x => {
      if (x === '' || isNaN(x)) return; // half-typed number like "0."
      const clamped = +Math.min(+el.max, Math.max(+el.min, +x)).toFixed(digits);
      el.value = clamped;
      chrome.storage.local.set({ [k]: clamped });
    };
    el.oninput = () => { num.value = el.value; save(el.value); };
    num.oninput = () => save(num.value);
    num.onchange = () => { num.value = el.value; }; // show the clamped value once editing ends
  }
});

const status = document.getElementById('status');
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url?.startsWith('https://chzzk.naver.com/')) { status.textContent = '치지직 탭에서 열어주세요.'; return; }
  chrome.tabs.sendMessage(tab.id, 'status', r => {
    status.textContent = chrome.runtime.lastError ? '확장이 이 탭에 아직 없습니다. 치지직 탭을 새로고침하세요.' : r;
  });
});
