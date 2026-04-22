/* =========================================
   SnapLink — Frontend JavaScript
========================================= */

const BASE = '';  // Same-origin calls; empty = relative URLs

// ─── DOM refs ────────────────────────────
const form            = document.getElementById('shorten-form');
const urlInput        = document.getElementById('url-input');
const aliasInput      = document.getElementById('custom-alias');
const shortenBtn      = document.getElementById('shorten-btn');
const formError       = document.getElementById('form-error');
const resultContainer = document.getElementById('result-container');
const resultOriginal  = document.getElementById('result-original-url');
const resultShortEl   = document.getElementById('result-short-url');
const copyBtn         = document.getElementById('copy-btn');
const qrcodeDiv       = document.getElementById('qrcode');
const anotherBtn      = document.getElementById('shorten-another-btn');

const historyLoading  = document.getElementById('history-loading');
const historyEmpty    = document.getElementById('history-empty');
const historyWrap     = document.getElementById('history-table-wrap');
const historyTbody    = document.getElementById('history-tbody');
const refreshBtn      = document.getElementById('refresh-btn');

const statTotal       = document.getElementById('stat-total');
const statClicks      = document.getElementById('stat-clicks');
const toast           = document.getElementById('toast');

let currentShortUrl   = '';
let qrInstance        = null;
let toastTimer        = null;

// ─── Show Toast ───────────────────────────
function showToast(msg, duration = 2800) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── Set Error ────────────────────────────
function setError(msg) {
  formError.textContent = msg;
}

// ─── Clear Error ──────────────────────────
function clearError() {
  formError.textContent = '';
}

// ─── Set button loading state ─────────────
function setLoading(loading) {
  const btnText = shortenBtn.querySelector('.btn-text');
  const btnIcon = shortenBtn.querySelector('.btn-icon');
  shortenBtn.disabled = loading;
  if (loading) {
    btnText.textContent = 'Shortening…';
    btnIcon.textContent = '⏳';
  } else {
    btnText.textContent = 'Shorten';
    btnIcon.textContent = '→';
  }
}

// ─── Generate QR Code ─────────────────────
function generateQR(url) {
  qrcodeDiv.innerHTML = '';
  try {
    qrInstance = new QRCode(qrcodeDiv, {
      text: url,
      width: 120,
      height: 120,
      colorDark: '#1a1a2e',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) {
    console.warn('QR generation error:', e);
  }
}

// ─── Show Result ──────────────────────────
function showResult(data) {
  currentShortUrl = data.shortUrl;

  resultOriginal.textContent = data.originalUrl;
  resultShortEl.textContent  = data.shortUrl;
  resultShortEl.href         = data.shortUrl;

  copyBtn.innerHTML = '<span class="copy-icon">📋</span><span class="copy-text">Copy</span>';
  copyBtn.classList.remove('copied');

  generateQR(data.shortUrl);

  resultContainer.classList.remove('hidden');
  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Copy to Clipboard ────────────────────
copyBtn.addEventListener('click', async () => {
  if (!currentShortUrl) return;
  try {
    await navigator.clipboard.writeText(currentShortUrl);
    copyBtn.innerHTML = '<span class="copy-icon">✅</span><span class="copy-text">Copied!</span>';
    copyBtn.classList.add('copied');
    showToast('🔗 Short link copied to clipboard!');
    setTimeout(() => {
      copyBtn.innerHTML = '<span class="copy-icon">📋</span><span class="copy-text">Copy</span>';
      copyBtn.classList.remove('copied');
    }, 2500);
  } catch (e) {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = currentShortUrl;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('🔗 Copied!');
  }
});

// ─── Shorten Another ─────────────────────
anotherBtn.addEventListener('click', () => {
  resultContainer.classList.add('hidden');
  urlInput.value = '';
  aliasInput.value = '';
  urlInput.focus();
  clearError();
});

// ─── Form Submit ──────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const originalUrl = urlInput.value.trim();
  const customCode  = aliasInput.value.trim();

  if (!originalUrl) {
    setError('Please enter a URL to shorten.');
    urlInput.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${BASE}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalUrl, customCode: customCode || undefined }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }

    showResult(data);
    loadHistory();   // Refresh history after shortening
  } catch (err) {
    setError('Network error. Is the server running?');
    console.error(err);
  } finally {
    setLoading(false);
  }
});

// ─── Format Date ──────────────────────────
function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Truncate URL ─────────────────────────
function truncate(str, max = 45) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Delete Link ──────────────────────────
async function deleteLink(code) {
  if (!confirm(`Delete link "/${code}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${BASE}/api/delete/${code}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('🗑️ Link deleted.');
      loadHistory();
    } else {
      showToast(data.error || 'Delete failed.');
    }
  } catch {
    showToast('Network error.');
  }
}

// ─── Copy from History ────────────────────
function copyFromHistory(shortUrl) {
  navigator.clipboard.writeText(shortUrl)
    .then(() => showToast('🔗 Copied to clipboard!'))
    .catch(() => showToast('Failed to copy.'));
}

// ─── Load History ─────────────────────────
async function loadHistory() {
  historyLoading.classList.remove('hidden');
  historyEmpty.classList.add('hidden');
  historyWrap.classList.add('hidden');

  try {
    const res  = await fetch(`${BASE}/api/recent`);
    const data = await res.json();

    historyLoading.classList.add('hidden');

    if (!Array.isArray(data) || data.length === 0) {
      historyEmpty.classList.remove('hidden');
      updateStats([], 0);
      return;
    }

    historyTbody.innerHTML = '';
    let totalClicks = 0;

    data.forEach((item) => {
      totalClicks += item.clicks || 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <a href="${item.originalUrl}" target="_blank" rel="noopener noreferrer"
             class="table-original" title="${item.originalUrl}">
            ${truncate(item.originalUrl)}
          </a>
        </td>
        <td>
          <a href="${item.shortUrl}" target="_blank" rel="noopener noreferrer"
             class="table-short-link">
            ${item.shortUrl.replace(/^https?:\/\//, '')}
          </a>
        </td>
        <td>
          <span class="clicks-badge">📊 ${item.clicks}</span>
        </td>
        <td>${formatDate(item.createdAt)}</td>
        <td>
          <button class="action-btn" onclick="copyFromHistory('${item.shortUrl}')" title="Copy short link">📋</button>
          <button class="action-btn danger" onclick="deleteLink('${item.shortCode}')" title="Delete">🗑️</button>
        </td>
      `;
      historyTbody.appendChild(tr);
    });

    updateStats(data, totalClicks);
    historyWrap.classList.remove('hidden');

  } catch (err) {
    historyLoading.classList.add('hidden');
    historyEmpty.classList.remove('hidden');
    console.error('Failed to load history:', err);
  }
}

// ─── Animate Counter ──────────────────────
function animateCount(el, target) {
  const duration = 800;
  const start    = performance.now();
  const from     = parseInt(el.textContent) || 0;

  function step(now) {
    const elapsed = Math.min((now - start) / duration, 1);
    const ease    = 1 - Math.pow(1 - elapsed, 3);  // ease-out cubic
    el.textContent = Math.round(from + (target - from) * ease);
    if (elapsed < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ─── Update Hero Stats ────────────────────
function updateStats(data, totalClicks) {
  animateCount(statTotal, data.length);
  animateCount(statClicks, totalClicks);
}

// ─── Refresh Button ───────────────────────
refreshBtn.addEventListener('click', () => {
  loadHistory();
  showToast('🔄 Refreshed!');
});

// ─── URL Input — Clear error on type ─────
urlInput.addEventListener('input', clearError);

// ─── Init ─────────────────────────────────
(function init() {
  loadHistory();
})();
