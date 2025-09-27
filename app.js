// PWA app logic
const DATA_URL = 'data.json';

// Register service worker with instant update behavior
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');
      // Listen for waiting worker and prompt update
      function promptUpdate(sw) {
        if (!sw) return;
        sw.postMessage({type:'SKIP_WAITING'});
      }
      if (reg.waiting) promptUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(reg.waiting || newSW);
            }
          });
        }
      });
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshed) return;
        refreshed = true;
        window.location.reload();
      });
    } catch (e) {
      console.warn('SW registration failed', e);
    }
  });
}

// Simple install prompt
let deferredPrompt;
const btnInstall = document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.hidden = false;
});
btnInstall?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  btnInstall.hidden = true;
});

// UI elements
const els = {
  product: document.getElementById('product'),
  application: document.getElementById('application'),
  pressure: document.getElementById('pressure'),
  gap: document.getElementById('gap'),
  btnShow: document.getElementById('btnShow'),
  pegValue: document.getElementById('pegValue'),
  note: document.getElementById('note'),
  matrix: document.getElementById('matrix'),
  btnRefreshData: document.getElementById('btnRefreshData'),
  btnCheckUpdates: document.getElementById('btnCheckUpdates'),
  updateStatus: document.getElementById('updateStatus')
};

// Load data.json with network-first to ensure updates
async function loadData({noCache=false} = {}) {
  const url = noCache ? `${DATA_URL}?v=${Date.now()}` : DATA_URL;
  const res = await fetch(url, {cache: noCache ? 'no-store' : 'default'});
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

let DATA = null;

function buildProductOptions() {
  els.product.innerHTML = '';
  DATA.products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    els.product.appendChild(opt);
  });
}

function getPegValue(productName, app, pressure, gap) {
  const p = DATA.products.find(x => x.name === productName);
  if (!p) return null;
  const block = p[app];
  if (!block) return null;
  const pres = block[pressure];
  if (!pres) return null;
  const val = pres[gap];
  return (val === null || val === undefined || val === '') ? null : val;
}

function renderMatrixFor(productName) {
  const p = DATA.products.find(x => x.name === productName);
  if (!p) { els.matrix.innerHTML = ''; return; }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th rowspan="2">Application</th>
        <th colspan="2">1.5 bar</th>
        <th colspan="2">2.5 bar</th>
      </tr>
      <tr>
        <th>A-Gap</th><th>R-Gap</th><th>A-Gap</th><th>R-Gap</th>
      </tr>
    </thead>
    <tbody>
      ${['trigger','bucket'].map(app => {
        const rowName = app === 'trigger' ? 'Trigger spray' : 'Bucket / Scrubber drier';
        const c = (pressure, gap) => {
          const v = getPegValue(productName, app, pressure, gap);
          return `<td>${v ?? '—'}</td>`;
        };
        return `<tr>
          <td>${rowName}</td>
          ${c('1.5','A')}${c('1.5','R')}${c('2.5','A')}${c('2.5','R')}
        </tr>`;
      }).join('')}
    </tbody>
  `;
  els.matrix.replaceChildren(table);
}

function showResult() {
  const product = els.product.value;
  const app = els.application.value;
  const pressure = els.pressure.value;
  const gap = els.gap.value;
  const value = getPegValue(product, app, pressure, gap);
  els.pegValue.textContent = value ?? '—';
  els.note.textContent = value ? '' : 'No setting available for this combination in the current data.';
  renderMatrixFor(product);
}

async function init() {
  try {
    DATA = await loadData();
  } catch (e) {
    console.warn('Network-first failed, retrying from cache...', e);
    DATA = await loadData({noCache:false}).catch(() => null);
  }
  if (!DATA) {
    els.note.textContent = 'Unable to load data.';
    return;
  }
  buildProductOptions();
  showResult();
}

els.btnShow.addEventListener('click', showResult);
['product','application','pressure','gap'].forEach(id => {
  document.getElementById(id).addEventListener('change', showResult);
});

els.btnRefreshData.addEventListener('click', async () => {
  els.updateStatus.textContent = 'Refreshing data…';
  try {
    DATA = await loadData({noCache:true});
    buildProductOptions();
    showResult();
    els.updateStatus.textContent = 'Data refreshed.';
    setTimeout(()=> els.updateStatus.textContent='', 2000);
  } catch (e) {
    els.updateStatus.textContent = 'Failed to refresh data.';
  }
});

els.btnCheckUpdates.addEventListener('click', async () => {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.update();
    els.updateStatus.textContent = 'Checking for app updates…';
    setTimeout(()=> els.updateStatus.textContent='', 2000);
  }
});

init();
