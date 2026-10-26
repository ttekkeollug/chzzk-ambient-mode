const DEFAULTS = { enabled: true, scale: 1.6, blur: 80, opacity: 1, saturate: 1.5, panel: 0.4 };

chrome.storage.local.get(DEFAULTS, s => {
  for (const [k, v] of Object.entries(s)) {
    const el = document.getElementById(k);
    el[el.type === 'checkbox' ? 'checked' : 'value'] = v;
    el.oninput = () => chrome.storage.local.set({ [k]: el.type === 'checkbox' ? el.checked : +el.value });
  }
});

const status = document.getElementById('status');
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url?.startsWith('https://chzzk.naver.com/')) { status.textContent = '치지직 탭에서 열어주세요.'; return; }
  chrome.tabs.sendMessage(tab.id, 'status', r => {
    status.textContent = chrome.runtime.lastError ? '확장이 이 탭에 아직 없습니다. 치지직 탭을 새로고침하세요.' : r;
  });
});
