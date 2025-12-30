import { saveHistory } from './storage.js';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PrintService {
  constructor(historyRef) {
    this.historyRef = historyRef;
  }

  async sendToPrinter(url, payload, type) {
    if (!url) {
      return { status: 'MOCK_OK', message: 'Sin URL, mock exitoso' };
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload }),
      });
      if (!res.ok) {
        return { status: 'ERROR', message: `HTTP ${res.status}` };
      }
      return { status: 'OK', message: 'Impreso' };
    } catch (err) {
      return { status: 'ERROR', message: err.message };
    }
  }

  ticketTemplate(order, ticketType) {
    const titleMap = {
      client: 'CLIENTE',
      business: 'NEGOCIO',
      site: 'OBRA',
    };
    const lines = [
      'Materiales Tu Casa',
      `Ticket ${titleMap[ticketType]}`,
      `Request: ${order.requestId}`,
      `Ruta Odoo: ${order.route.channel} → ${order.route.ids?.joined || 'PENDIENTE'}`,
      `Cliente: ${order.customer || 'Mostrador'}`,
      '-----------------------------',
    ];
    order.items.forEach((item) => {
      lines.push(`${item.qty} x ${item.name}`);
      lines.push(`  ${item.sku}  $${item.price.toFixed(2)} c/u`);
    });
    lines.push('-----------------------------');
    lines.push(`Subtotal: $${order.totals.subtotal.toFixed(2)}`);
    lines.push(`IVA: $${order.totals.tax.toFixed(2)}`);
    lines.push(`Total: $${order.totals.total.toFixed(2)}`);
    lines.push(`Pagado: $${order.payment.paidAmount.toFixed(2)}`);
    lines.push(`Entrega: ${order.deliveryPercent}%`);
    lines.push(`Estado: ${order.state}`);
    lines.push(`Notas: ${order.notes || '-'}`);
    lines.push(new Date(order.timestamp).toLocaleString());
    return lines.join('\n');
  }

  async printOrder(order, printerUrl) {
    const tickets = ['client', 'business', 'site'];
    const results = {};
    for (const ticket of tickets) {
      const payload = this.ticketTemplate(order, ticket);
      await wait(150); // spacing for printer
      const result = await this.sendToPrinter(printerUrl, payload, ticket);
      results[ticket] = {
        status: result.status.startsWith('ERROR') ? 'ERROR' : 'OK',
        message: result.message,
        printedAt: Date.now(),
      };
      if (result.status === 'ERROR') {
        break;
      }
    }
    const history = this.historyRef();
    const idx = history.findIndex((h) => h.requestId === order.requestId);
    if (idx >= 0) {
      history[idx].tickets = { ...history[idx].tickets, ...results };
      history[idx].state = Object.values(results).every((r) => r.status === 'OK')
        ? 'OK'
        : 'IMPRESIÓN FALLÓ';
      saveHistory(history);
    }
    return results;
  }

  async reprint(order, ticket, printerUrl, auditEntry) {
    const payload = this.ticketTemplate(order, ticket);
    const result = await this.sendToPrinter(printerUrl, payload, ticket);
    const history = this.historyRef();
    const idx = history.findIndex((h) => h.requestId === order.requestId);
    if (idx >= 0) {
      history[idx].tickets[ticket] = {
        status: result.status.startsWith('ERROR') ? 'ERROR' : 'OK',
        message: result.message,
        printedAt: Date.now(),
      };
      history[idx].audit = history[idx].audit || [];
      history[idx].audit.push({ ...auditEntry, ticket, result: history[idx].tickets[ticket] });
      history[idx].state = Object.values(history[idx].tickets).every((r) => r.status === 'OK')
        ? 'OK'
        : 'IMPRESIÓN FALLÓ';
      saveHistory(history);
    }
    return result;
  }
}
