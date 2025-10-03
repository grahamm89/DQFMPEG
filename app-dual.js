// Dual-section PEG tool using a single data.json with two datasets
const DATA_URL = 'data.json';

// Register SW as before
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');
      function promptUpdate(sw){ if(sw) sw.postMessage({type:'SKIP_WAITING'}); }
      if (reg.waiting) promptUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(reg.waiting || nw);
        });
      });
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshed) return;
        refreshed = true;
        location.reload();
      });
    } catch (e) { console.warn('SW reg failed', e); }
  });
}

// Install prompt
let deferredPrompt;
const btnInstall = document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt = e; btnInstall.hidden = false;
});
btnInstall?.addEventListener('click', async ()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  btnInstall.hidden = true;
});

const els = {
  // Section 1
  label1: document.getElementById('label1'),
  product1: document.getElementById('product1'),
  application1: document.getElementById('application1'),
  pressure1: document.getElementById('pressure1'),
  gap1: document.getElementById('gap1'),
  btnShow1: document.getElementById('btnShow1'),
  pegValue1: document.getElementById('pegValue1'),
  note1: document.getElementById('note1'),
  matrix1: document.getElementById('matrix1'),
  // Section 2
  label2: document.getElementById('label2'),
  product2: document.getElementById('product2'),
  application2: document.getElementById('application2'),
  pressure2: document.getElementById('pressure2'),
  gap2: document.getElementById('gap2'),
  btnShow2: document.getElementById('btnShow2'),
  pegValue2: document.getElementById('pegValue2'),
  note2: document.getElementById('note2'),
  matrix2: document.getElementById('matrix2'),
  // Common
  btnRefreshData: document.getElementById('btnRefreshData'),
  btnCheckUpdates: document.getElementById('btnCheckUpdates'),
  updateStatus: document.getElementById('updateStatus'),
};

async function loadData({noCache=false}={}){
  const url = noCache ? `${DATA_URL}?v=${Date.now()}` : DATA_URL;
  const res = await fetch(url, {cache: noCache ? 'no-store' : 'default'});
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

let DATA = null;

function populateProducts(selectEl, dataset){
  selectEl.innerHTML = '';
  dataset.products.forEach(p => {
    const o = document.createElement('option');
    o.value = p.name; o.textContent = p.name;
    selectEl.appendChild(o);
  });
}

function getPegValue(dataset, productName, app, pressure, gap){
  const p = dataset.products.find(x=>x.name===productName);
  if (!p) return null;
  const block = p[app]; if (!block) return null;
  const pres = block[pressure]; if (!pres) return null;
  const v = pres[gap]; return (v===null || v===undefined || v==='') ? null : v;
}

function renderMatrix(dataset, productName, mount){
  const p = dataset.products.find(x=>x.name===productName);
  if (!p){ mount.innerHTML = ''; return; }
  const t = document.createElement('table');
  t.innerHTML = `
    <thead>
      <tr><th rowspan="2">Application</th><th colspan="2">1.5 bar</th><th colspan="2">2.5 bar</th></tr>
      <tr><th>A-Gap</th><th>R-Gap</th><th>A-Gap</th><th>R-Gap</th></tr>
    </thead>
    <tbody>
      ${['trigger','bucket'].map(app=>{
        const name = app==='trigger'?'Trigger spray':'Bucket / Scrubber drier';
        const cell = (pressure,gap)=>`<td>${getPegValue(dataset, productName, app, pressure, gap) ?? '—'}</td>`;
        return `<tr><td>${name}</td>${cell('1.5','A')}${cell('1.5','R')}${cell('2.5','A')}${cell('2.5','R')}</tr>`;
      }).join('')}
    </tbody>`;
  mount.replaceChildren(t);
}

function wireSection(dataset, ids){
  const {product, application, pressure, gap, btnShow, pegValue, note, matrix} = ids;
  function show(){
    const prod = product.value, app = application.value, pres = pressure.value, g = gap.value;
    const val = getPegValue(dataset, prod, app, pres, g);
    pegValue.textContent = val ?? '—';
    note.textContent = val ? '' : 'No setting available for this combination in the current data.';
    renderMatrix(dataset, prod, matrix);
  }
  btnShow.addEventListener('click', show);
  [product, application, pressure, gap].forEach(el => el.addEventListener('change', show));
  // initial
  show();
}

async function init(){
  try{
    DATA = await loadData();
  }catch(e){
    console.warn('Network-first failed for data.json', e);
    DATA = await loadData({noCache:false}).catch(()=>null);
  }
  if (!DATA) { els.updateStatus.textContent='Unable to load data.'; return; }

  const ds1 = DATA.datasets.primary;
  const ds2 = DATA.datasets.secondary;
  els.label1.textContent = ds1.label || 'Section 1 – PEG Matrix';
  els.label2.textContent = ds2.label || 'Section 2 – PEG Matrix';

  populateProducts(els.product1, ds1);
  populateProducts(els.product2, ds2);

  wireSection(ds1, {
    product: els.product1, application: els.application1, pressure: els.pressure1, gap: els.gap1,
    btnShow: els.btnShow1, pegValue: els.pegValue1, note: els.note1, matrix: els.matrix1
  });
  wireSection(ds2, {
    product: els.product2, application: els.application2, pressure: els.pressure2, gap: els.gap2,
    btnShow: els.btnShow2, pegValue: els.pegValue2, note: els.note2, matrix: els.matrix2
  });
}

els.btnRefreshData.addEventListener('click', async ()=>{
  els.updateStatus.textContent = 'Refreshing data…';
  try{
    DATA = await loadData({noCache:true});
    els.updateStatus.textContent = 'Data refreshed.';
    setTimeout(()=> els.updateStatus.textContent='', 1500);
    init();
  }catch(e){
    els.updateStatus.textContent = 'Failed to refresh data.';
  }
});

els.btnCheckUpdates.addEventListener('click', async ()=>{
  const reg = await navigator.serviceWorker.getRegistration();
  await reg?.update();
  els.updateStatus.textContent = 'Checking for app updates…';
  setTimeout(()=> els.updateStatus.textContent='', 1500);
});

init();
