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



// ===== SECOND DATASET (data2.json) — dilution vs pressure =====
const DATA_URL_2 = 'data2.json';
const els2 = {
  product: document.getElementById('product2'),
  dilution: document.getElementById('dilution2'),
  pressure: document.getElementById('pressure2'),
  btnShow: document.getElementById('btnShow2'),
  pegValue: document.getElementById('pegValue2'),
  note: document.getElementById('note2'),
  matrix: document.getElementById('matrix2'),
  btnRefreshData: document.getElementById('btnRefreshData2')
};

async function loadData2({noCache=false} = {}) {
  const url = noCache ? `${DATA_URL_2}?v=${Date.now()}` : DATA_URL_2;
  const res = await fetch(url, {cache: noCache ? 'no-store' : 'default'});
  if (!res.ok) throw new Error('Failed to load data2');
  return res.json();
}

let DATA2 = null;

function buildProductOptions2() {
  els2.product.innerHTML = '';
  if (!DATA2 || !Array.isArray(DATA2.products) || DATA2.products.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No products in data2.json —';
    els2.product.appendChild(opt);
    return;
  }
  DATA2.products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    els2.product.appendChild(opt);
  });
}

function getPegValue2(productName, dilution, pressure) {
  if (!DATA2 || !DATA2.products) return null;
  const p = DATA2.products.find(x => x.name === productName);
  if (!p || !p.dilution) return null;
  const d = p.dilution[dilution];
  if (!d) return null;
  const val = d[pressure];
  return (val === null || val === undefined || val === '') ? null : val;
}

function renderMatrixFor2(productName) {
  if (!DATA2 || !Array.isArray(DATA2.products) || DATA2.products.length === 0) {
    els2.matrix.innerHTML = '<p class="muted">No products in data2.json.</p>';
    return;
  }
  const p = DATA2.products.find(x => x.name === productName);
  if (!p || !p.dilution) { els2.matrix.innerHTML = ''; return; }
  const table = document.createElement('table');
  const cell = (dil, pres) => {
    const v = (p.dilution?.[dil] ?? {})[pres];
    return `<td>${v ?? '—'}</td>`;
  };
  table.innerHTML = `
    <thead>
      <tr>
        <th> </th>
        <th colspan="2">Pressure</th>
      </tr>
      <tr>
        <th>Dilution</th>
        <th>1.5 bar</th>
        <th>2.5 bar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>10%</td>
        ${cell('10','1.5')}
        ${cell('10','2.5')}
      </tr>
      <tr>
        <td>5%</td>
        ${cell('5','1.5')}
        ${cell('5','2.5')}
      </tr>
    </tbody>
  `;
  els2.matrix.replaceChildren(table);
}

function showResult2() {
  const product = els2.product.value;
  const dilution = els2.dilution.value;
  const pressure = els2.pressure.value;
  const value = getPegValue2(product, dilution, pressure);
  els2.pegValue.textContent = value ?? '—';
  els2.note.textContent = value ? '' : 'No setting available for this combination in the second dataset.';
  renderMatrixFor2(product);
}

async function init2() {
  try {
    DATA2 = await loadData2();
  } catch (e) {
    console.warn('Network-first failed for data2, retrying from cache...', e);
    DATA2 = await loadData2({noCache:false}).catch(() => null);
  }
  buildProductOptions2();
  showResult2();
}

els2.btnShow.addEventListener('click', showResult2);
['product2','dilution2','pressure2'].forEach(id => {
  document.getElementById(id).addEventListener('change', showResult2);
});
els2.btnRefreshData.addEventListener('click', async () => {
  try {
    DATA2 = await loadData2({noCache:true});
    buildProductOptions2();
    showResult2();
  } catch (e) {
    els2.note.textContent = 'Failed to refresh second dataset.';
  }
});

init2();


// ===== THIRD DATASET (data3.json) — application vs gap (no pressure) =====
const DATA_URL_3 = 'data3.json';
const els3 = {
  product: document.getElementById('product3'),
  application: document.getElementById('application3'),
  gap: document.getElementById('gap3'),
  btnShow: document.getElementById('btnShow3'),
  pegValue: document.getElementById('pegValue3'),
  note: document.getElementById('note3'),
  matrix: document.getElementById('matrix3'),
  btnRefreshData: document.getElementById('btnRefreshData3')
};

async function loadData3({noCache=false} = {}) {
  const url = noCache ? `${DATA_URL_3}?v=${Date.now()}` : DATA_URL_3;
  const res = await fetch(url, {cache: noCache ? 'no-store' : 'default'});
  if (!res.ok) throw new Error('Failed to load data3');
  return res.json();
}

let DATA3 = null;

function buildProductOptions3() {
  els3.product.innerHTML = '';
  if (!DATA3 || !Array.isArray(DATA3.products) || DATA3.products.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No products in data3.json —';
    els3.product.appendChild(opt);
    return;
  }
  DATA3.products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    els3.product.appendChild(opt);
  });
}

function getPegValue3(productName, application, gap) {
  if (!DATA3 || !DATA3.products) return null;
  const p = DATA3.products.find(x => x.name === productName);
  if (!p || !p[application]) return null;
  const val = p[application][gap];
  return (val === null || val === undefined || val === '') ? null : val;
}

function renderMatrixFor3(productName) {
  if (!DATA3 || !Array.isArray(DATA3.products) || DATA3.products.length === 0) {
    els3.matrix.innerHTML = '<p class="muted">No products in data3.json.</p>';
    return;
  }
  const p = DATA3.products.find(x => x.name === productName);
  if (!p) { els3.matrix.innerHTML = ''; return; }
  const cell = (app, gap) => {
    const v = (p?.[app] ?? {})[gap];
    return `<td>${v ?? '—'}</td>`;
  };
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Application</th>
        <th>A-Gap</th>
        <th>R-Gap</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Trigger spray</td>
        ${cell('trigger','A')}
        ${cell('trigger','R')}
      </tr>
      <tr>
        <td>Bucket / Scrubber drier</td>
        ${cell('bucket','A')}
        ${cell('bucket','R')}
      </tr>
    </tbody>
  `;
  els3.matrix.replaceChildren(table);
}

function showResult3() {
  const product = els3.product.value;
  const application = els3.application.value;
  const gap = els3.gap.value;
  const value = getPegValue3(product, application, gap);
  els3.pegValue.textContent = value ?? '—';
  els3.note.textContent = value ? '' : 'No setting available for this combination in the third dataset.';
  renderMatrixFor3(product);
}

async function init3() {
  try {
    DATA3 = await loadData3();
  } catch (e) {
    console.warn('Network-first failed for data3, retrying from cache...', e);
    DATA3 = await loadData3({noCache:false}).catch(() => null);
  }
  buildProductOptions3();
  showResult3();
}

els3.btnShow.addEventListener('click', showResult3);
['product3','application3','gap3'].forEach(id => {
  document.getElementById(id).addEventListener('change', showResult3);
});
els3.btnRefreshData.addEventListener('click', async () => {
  try {
    DATA3 = await loadData3({noCache:true});
    buildProductOptions3();
    showResult3();
  } catch (e) {
    els3.note.textContent = 'Failed to refresh third dataset.';
  }
});

init3();
