const HISTORY_KEY = 'mtc_history';
const CATALOG_KEY = 'mtc_catalog';
const OPERATOR_KEY = 'mtc_operator';
const PRINTER_KEY = 'mtc_printer_url';

export function loadCatalog() {
  try {
    return JSON.parse(localStorage.getItem(CATALOG_KEY) || '[]');
  } catch (err) {
    console.error('No se pudo leer catálogo', err);
    return [];
  }
}

export function saveCatalog(catalog) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (err) {
    console.error('No se pudo leer historial', err);
    return [];
  }
}

export function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function loadOperator() {
  return localStorage.getItem(OPERATOR_KEY) || '';
}

export function saveOperator(name) {
  localStorage.setItem(OPERATOR_KEY, name);
}

export function loadPrinterUrl() {
  return localStorage.getItem(PRINTER_KEY) || '';
}

export function savePrinterUrl(url) {
  localStorage.setItem(PRINTER_KEY, url);
}
