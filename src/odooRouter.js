function mockId(prefix) {
  return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
}

export function routeOrder(order) {
  const paidEnough = order.payment.paidAmount >= order.totals.total - 0.01;
  const deliveredAll = order.deliveryPercent >= 100;
  const channel = paidEnough && deliveredAll ? 'POS' : 'Sales';

  const ids = channel === 'POS'
    ? { pos: mockId('POS'), joined: mockId('POS') }
    : {
        sale: mockId('SO'),
        picking: deliveredAll ? mockId('PICK') : mockId('PICK-P'),
        invoice: paidEnough ? mockId('INV') : null,
        payment: paidEnough ? mockId('PAY') : null,
      };
  return { channel, ids: { ...ids, joined: Object.values(ids).filter(Boolean).join(' / ') } };
}
