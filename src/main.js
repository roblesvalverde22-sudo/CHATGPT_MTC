import {
  loadCatalog,
  saveCatalog,
  loadHistory,
  saveHistory,
  loadOperator,
  saveOperator,
  loadPrinterUrl,
  savePrinterUrl,
} from './storage.js';
import { PrintService } from './printService.js';
import { routeOrder } from './odooRouter.js';

const state = {
  catalog: loadCatalog(),
  cart: [],
  history: loadHistory(),
  operator: loadOperator(),
  printerUrl: loadPrinterUrl(),
};

const printService = new PrintService(() => state.history);

function renderCatalog(filter = '') {
  const tbody = document.querySelector('#catalog-table tbody');
  tbody.innerHTML = '';
  const needle = filter.toLowerCase();
  state.catalog
    .filter((item) =>
      !filter ||
      item.name.toLowerCase().includes(needle) ||
      item.sku.toLowerCase().includes(needle)
    )
    .forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.sku}</td>
        <td>${item.name}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>${(item.taxRate * 100).toFixed(0)}%</td>
        <td><button data-sku="${item.sku}" class="btn-add">Agregar</button></td>
      `;
      tbody.appendChild(tr);
    });
}

function renderCart() {
  const tbody = document.querySelector('#cart-table tbody');
  tbody.innerHTML = '';
  let subtotal = 0;
  state.cart.forEach((item) => {
    const line = item.qty * item.price;
    subtotal += line;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.name}</td>
      <td><input type="number" min="1" value="${item.qty}" data-sku="${item.sku}" class="qty-input" /></td>
      <td>$${item.price.toFixed(2)}</td>
      <td>$${line.toFixed(2)}</td>
      <td><button data-sku="${item.sku}" class="btn-remove">Quitar</button></td>
    `;
    tbody.appendChild(tr);
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  document.querySelector('#cart-total').textContent = `$${total.toFixed(2)} (IVA incl.)`;
  return { subtotal, tax, total };
}

function renderHistory() {
  const tbody = document.querySelector('#history-table tbody');
  tbody.innerHTML = '';
  state.history
    .slice()
    .reverse()
    .forEach((entry) => {
      const tr = document.createElement('tr');
      const tickets = ['client', 'business', 'site']
        .map((t) => {
          const info = entry.tickets?.[t];
          const label = t === 'client' ? 'Cliente' : t === 'business' ? 'Negocio' : 'Obra';
          const status = info?.status || 'PENDIENTE';
          return `<button data-req="${entry.requestId}" data-ticket="${t}" class="btn-reprint">${label} (${status})</button>`;
        })
        .join(' ');

      const auditHtml = (entry.audit || [])
        .map((a) => `${a.at} ${a.by}: ${a.reason} (${a.ticket})`)
        .join('<br/>');

      const pillClass =
        entry.state === 'OK'
          ? 'ok'
          : entry.state === 'PENDIENTE SYNC'
          ? 'pending'
          : entry.state === 'REINTENTO'
          ? 'retry'
          : 'error';

      tr.innerHTML = `
        <td>
          <div>${entry.requestId}</div>
          <div class="muted">${new Date(entry.timestamp).toLocaleString()}</div>
        </td>
        <td>
          <div>${entry.route.channel}</div>
          <div class="muted">${entry.route.ids?.joined || '-'}</div>
        </td>
        <td>
          <div>$${entry.totals.total.toFixed(2)}</div>
          <div class="muted">Pagado $${entry.payment.paidAmount.toFixed(2)}</div>
        </td>
        <td><span class="pill ${pillClass}">${entry.state}</span></td>
        <td class="table-actions">${tickets}</td>
        <td><div class="audit-list">${auditHtml || '-'}</div></td>
      `;
      tbody.appendChild(tr);
    });
}

function addToCart(sku) {
  const product = state.catalog.find((c) => c.sku === sku);
  if (!product) return;
  const existing = state.cart.find((c) => c.sku === sku);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function updateQty(sku, qty) {
  const item = state.cart.find((c) => c.sku === sku);
  if (!item) return;
  item.qty = qty;
  renderCart();
}

function removeFromCart(sku) {
  state.cart = state.cart.filter((c) => c.sku !== sku);
  renderCart();
}

function generateRequestId() {
  return 'REQ-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function ensureUniqueRequest(requestId) {
  return !state.history.some((h) => h.requestId === requestId);
}

function loadDemoCatalog() {
  state.catalog = [
    { sku: 'CEM001', name: 'Cemento gris 50kg', price: 185, taxRate: 0.16 },
    { sku: 'ARENA01', name: 'Arena gruesa m3', price: 320, taxRate: 0.16 },
    { sku: 'VAR03/8', name: 'Varilla 3/8"', price: 140, taxRate: 0.16 },
    { sku: 'ACERO12', name: 'Acero #12', price: 360, taxRate: 0.16 },
    { sku: 'IMP001', name: 'Impermeabilizante 19L', price: 890, taxRate: 0.16 },
  ];
  saveCatalog(state.catalog);
  renderCatalog();
}

function parseCsv(content) {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: reject,
    });
  });
}

async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    const text = await file.text();
    const rows = await parseCsv(text);
    state.catalog = rows.map((r, idx) => ({
      sku: r.sku || r.SKU || `SKU-${idx}`,
      name: r.name || r.Nombre || r.nombre || `Item ${idx}`,
      price: Number(r.price || r.Precio || 0),
      taxRate: Number(r.tax || r.IVA || 0.16) || 0,
    }));
  } else if (ext === 'xlsx') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    state.catalog = rows.map((r, idx) => ({
      sku: r.sku || r.SKU || `SKU-${idx}`,
      name: r.name || r.Nombre || r.nombre || `Item ${idx}`,
      price: Number(r.price || r.Precio || 0),
      taxRate: Number(r.tax || r.IVA || 0.16) || 0,
    }));
  } else {
    alert('Formato no soportado');
    return;
  }
  saveCatalog(state.catalog);
  renderCatalog();
}

function computeTotals() {
  const subtotal = state.cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = subtotal * 0.16;
  return { subtotal, tax, total: subtotal + tax };
}

function showRouteInfo(route) {
  const label = document.getElementById('odoo-route');
  label.textContent = `Se fue a Odoo → ${route.channel} (${route.ids.joined})`;
}

function upsertHistory(entry, markRetry = false) {
  const idx = state.history.findIndex((h) => h.requestId === entry.requestId);
  if (idx >= 0) {
    const previous = state.history[idx];
    state.history[idx] = {
      ...previous,
      ...entry,
      tickets: previous.tickets || {},
      audit: previous.audit || [],
      state: markRetry ? 'REINTENTO' : entry.state,
    };
  } else {
    state.history.push(entry);
  }
  saveHistory(state.history);
  renderHistory();
}

async function checkout() {
  if (state.cart.length === 0) return alert('Carrito vacío');
  const totals = computeTotals();
  const deliveryPercent = Number(document.getElementById('delivery-percent').value || 0);
  const paidAmount = Number(document.getElementById('paid-amount').value || 0);
  const notes = document.getElementById('notes').value;
  const operator = document.getElementById('operator-name').value || 'demo';
  const requestedId = document.getElementById('request-id').value.trim();
  const requestId = requestedId || generateRequestId();
  document.getElementById('request-id').value = requestId;
  const order = {
    requestId,
    items: state.cart,
    totals,
    deliveryPercent,
    payment: { paidAmount },
    notes,
    operator,
    timestamp: Date.now(),
    audit: [],
  };
  const existing = state.history.find((h) => h.requestId === requestId);
  const route = routeOrder({ ...order });
  order.route = route;
  order.state = existing ? 'REINTENTO' : 'PENDIENTE SYNC';
  order.tickets = existing?.tickets || {};
  order.audit = existing?.audit || [];
  upsertHistory(order, Boolean(existing));
  showRouteInfo(route);
  const printerUrl = document.getElementById('printer-url').value;
  const ticketResults = await printService.printOrder(order, printerUrl);
  const failed = Object.values(ticketResults).some((r) => r.status === 'ERROR');
  const history = state.history;
  const idx = history.findIndex((h) => h.requestId === requestId);
  if (idx >= 0) {
    history[idx].state = failed ? 'IMPRESIÓN FALLÓ' : 'OK';
    saveHistory(history);
  }
  renderHistory();
  state.cart = [];
  renderCart();
}

function bindEvents() {
  document.getElementById('catalog-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  document.getElementById('load-demo').addEventListener('click', loadDemoCatalog);
  document.getElementById('search').addEventListener('input', (e) => renderCatalog(e.target.value));

  document.querySelector('#catalog-table tbody').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-add')) {
      addToCart(e.target.dataset.sku);
    }
  });

  document.querySelector('#cart-table tbody').addEventListener('input', (e) => {
    if (e.target.classList.contains('qty-input')) {
      updateQty(e.target.dataset.sku, Number(e.target.value));
    }
  });

  document.querySelector('#cart-table tbody').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
      removeFromCart(e.target.dataset.sku);
    }
  });

  document.getElementById('checkout').addEventListener('click', checkout);

  document.querySelector('#history-table tbody').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-reprint')) {
      const reqId = e.target.dataset.req;
      const ticket = e.target.dataset.ticket;
      const order = state.history.find((h) => h.requestId === reqId);
      const reason = prompt('Motivo reimpresión');
      const operator = document.getElementById('operator-name').value || 'demo';
      if (!reason) return;
      order.state = 'REINTENTO';
      saveHistory(state.history);
      await printService.reprint(order, ticket, document.getElementById('printer-url').value, {
        by: operator,
        reason,
        at: new Date().toLocaleString(),
      });
      renderHistory();
    }
  });

  document.getElementById('operator-name').addEventListener('input', (e) => {
    state.operator = e.target.value;
    saveOperator(state.operator);
  });

  document.getElementById('printer-url').addEventListener('input', (e) => {
    state.printerUrl = e.target.value;
    savePrinterUrl(state.printerUrl);
  });

  document.getElementById('btn-ping').addEventListener('click', async () => {
    const url = document.getElementById('printer-url').value;
    const log = document.getElementById('diag-log');
    try {
      const res = await fetch(url || 'http://localhost:0/ping', { method: 'GET', mode: 'no-cors' });
      log.textContent = `Ping enviado a ${url || 'mock'} (${res.type || 'mock'})`;
      setPrinterStatus('READY');
    } catch (err) {
      log.textContent = `Error: ${err.message}`;
      setPrinterStatus('OFFLINE');
    }
  });

  document.getElementById('btn-test-ticket').addEventListener('click', async () => {
    const log = document.getElementById('diag-log');
    const payload = 'Ticket de prueba - Mostrador Unificado';
    const res = await printService.sendToPrinter(state.printerUrl, payload, 'test');
    log.textContent = `${res.status}: ${res.message}`;
    setPrinterStatus(res.status === 'OK' || res.status === 'MOCK_OK' ? 'READY' : 'OFFLINE');
  });
}

function setPrinterStatus(status) {
  const pill = document.getElementById('printer-status');
  pill.textContent = status;
  pill.classList.remove('ok', 'pending', 'error');
  if (status === 'READY') pill.classList.add('ok');
  else if (status === 'BUSY' || status === 'PENDIENTE') pill.classList.add('pending');
  else pill.classList.add('error');
}

function init() {
  renderCatalog();
  renderCart();
  renderHistory();
  document.getElementById('operator-name').value = state.operator;
  document.getElementById('printer-url').value = state.printerUrl;
  document.getElementById('request-id').value = generateRequestId();
  bindEvents();
}

init();
