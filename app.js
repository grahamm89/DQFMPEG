const DATA_URL_1 = 'data.json';
const DATA_URL_2 = 'data2.json';
const DATA_URL_3 = 'data3.json';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return; refreshing = true; location.reload();
      });
      if (reg.waiting) console.info('[PWA] Update ready.');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            console.info('[PWA] Update installed. Reload to apply.');
          }
        });
      });
    } catch (e) { console.warn('[PWA] SW registration failed', e); }
  });
}

function $(sel, root=document){ return root.querySelector(sel); }
function createOption(val, text=val){ const o=document.createElement('option'); o.value=val; o.textContent=text; return o; }

function toProducts(raw){
  if (Array.isArray(raw?.products)) return raw.products;
  const ds = raw?.datasets;
  if (ds){
    const key = 'primary' in ds ? 'primary' : Object.keys(ds)[0];
    const products = ds?.[key]?.products;
    if (Array.isArray(products)) return products;
  }
  return [];
}

async function loadJSON(url){
  const res = await fetch(url, {cache:'no-store'});
  if (!res.ok) throw new Error('Failed to load '+url);
  return res.json();
}

// Section resolvers
function resolveValueS1(product, {application, pressure, gap}){
  return product?.[application]?.[pressure]?.[gap] ?? null;
}
function resolveValueS2(product, {dilution, pressure}){
  return product?.dilution?.[dilution]?.[pressure] ?? null;
}
function resolveValueS3(product, {application, gap}){
  return product?.[application]?.[gap] ?? null;
}

function initSection(root, config){
  const els = {
    product: $('#'+config.ids.product, root),
    result:  $('#'+config.ids.result, root),
    peg:     $('#'+config.ids.peg, root),
    application: config.ids.application ? $('#'+config.ids.application, root) : null,
    pressure:    config.ids.pressure ? $('#'+config.ids.pressure, root) : null,
    gap:         config.ids.gap ? $('#'+config.ids.gap, root) : null,
    dilution:    config.ids.dilution ? $('#'+config.ids.dilution, root) : null
  };
  let products = [];

  function setResult(val){
    if (!els.result || !els.peg) return;
    els.peg.textContent = (val ?? '') !== '' && val !== null ? String(val) : '—';
    els.result.hidden = false;
  }

  function getSelection(){
    return {
      productName: els.product?.value || null,
      application: els.application?.value || null,
      pressure:    els.pressure?.value || null,
      gap:         els.gap?.value || null,
      dilution:    els.dilution?.value || null
    };
  }

  function compute(){
    const sel = getSelection();
    const p = products.find(x => x.name === sel.productName);
    if (!p){ setResult(null); return; }
    let val = null;
    if (config.type === 's1') val = resolveValueS1(p, sel);
    else if (config.type === 's2') val = resolveValueS2(p, sel);
    else if (config.type === 's3') val = resolveValueS3(p, sel);
    setResult(val);
  }

  function populate(){
    els.product.innerHTML='';
    els.product.appendChild(createOption('', 'Select product'));
    products.forEach(p => els.product.appendChild(createOption(p.name, p.name)));
  }

  function bind(){
    [els.product, els.application, els.pressure, els.gap, els.dilution]
      .filter(Boolean).forEach(ctrl => ctrl.addEventListener('change', compute));
  }

  async function bootstrap(){
    try {
      const raw = await loadJSON(config.url);
      products = toProducts(raw);
      populate();
      bind();
    } catch (e) {
      console.error('[DQFM] Failed to load', config.url, e);
      if (els.result){
        els.result.hidden = false;
        els.result.textContent = 'Error: could not load data.';
      }
    }
  }
  bootstrap();
}

document.addEventListener('DOMContentLoaded', () => {
  const s1 = document.querySelector('[data-section="1"]');
  if (s1) initSection(s1, { type:'s1', url: DATA_URL_1,
    ids:{ product:'product', application:'application', pressure:'pressure', gap:'gap', result:'result', peg:'pegValue' } });

  const s2 = document.querySelector('[data-section="2"]');
  if (s2) initSection(s2, { type:'s2', url: DATA_URL_2,
    ids:{ product:'product2', dilution:'dilution2', pressure:'pressure2', result:'result2', peg:'pegValue2' } });

  const s3 = document.querySelector('[data-section="3"]');
  if (s3) initSection(s3, { type:'s3', url: DATA_URL_3,
    ids:{ product:'product3', application:'application3', gap:'gap3', result:'result3', peg:'pegValue3' } });
});
