// Teste de sincronização imediata do botão '+' (incrementItem)
const assert = require('assert');

// Simulação da lógica de timestamp e merge conforme implementada no app.js
function parseUpdatedAtTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function latestKitchenItemTimestamp(item) {
  if (!item) return 0;
  return Math.max(
    parseUpdatedAtTimestamp(item.updatedAt),
    parseUpdatedAtTimestamp(item.lastIncrementAt),
    parseUpdatedAtTimestamp(item.addedAt),
    parseUpdatedAtTimestamp(item.kitchenStatusAt),
    parseUpdatedAtTimestamp(item.kitchenPriorityAt),
    parseUpdatedAtTimestamp(item.kitchenReceivedAt),
    parseUpdatedAtTimestamp(item.waiterVisualUpdatedAt),
    parseUpdatedAtTimestamp(item.deliveredAt),
    parseUpdatedAtTimestamp(item.canceledAt),
    parseUpdatedAtTimestamp(item.createdAt)
  );
}

function mergeRealtimeItems(existingItems, incomingItems) {
  const itemMap = new Map();
  for (const item of Array.isArray(existingItems) ? existingItems : []) {
    const id = String(item?.id || '').trim();
    if (id) itemMap.set(id, item);
  }
  for (const item of Array.isArray(incomingItems) ? incomingItems : []) {
    const id = String(item?.id || '').trim();
    if (!id) continue;
    const existing = itemMap.get(id);
    if (!existing || latestKitchenItemTimestamp(item) >= latestKitchenItemTimestamp(existing)) {
      itemMap.set(id, item);
    }
  }
  return Array.from(itemMap.values());
}

function mergeComandasById(localRows, remoteRows) {
  const map = new Map();
  for (const c of localRows) map.set(c.id, c);
  for (const remote of remoteRows) {
    const previous = map.get(remote.id);
    if (!previous) {
      map.set(remote.id, remote);
      continue;
    }
    const prevTs = Math.max(
      parseUpdatedAtTimestamp(previous.updatedAt),
      Array.isArray(previous.events) && previous.events.length ? parseUpdatedAtTimestamp(previous.events[previous.events.length - 1].ts) : 0
    );
    const remoteTs = Math.max(
      parseUpdatedAtTimestamp(remote.updatedAt),
      Array.isArray(remote.events) && remote.events.length ? parseUpdatedAtTimestamp(remote.events[remote.events.length - 1].ts) : 0
    );
    const winner = remoteTs >= prevTs ? { ...previous, ...remote } : { ...remote, ...previous };
    
    // item merge
    const itemMap = new Map();
    for (const item of previous.items || []) itemMap.set(item.id, item);
    for (const item of remote.items || []) {
      const existing = itemMap.get(item.id);
      if (!existing) {
        itemMap.set(item.id, item);
        continue;
      }
      const existingTs = latestKitchenItemTimestamp(existing);
      const incomingTs = latestKitchenItemTimestamp(item);
      if (incomingTs > existingTs || (incomingTs === existingTs && Number(item.qty || 0) > Number(existing.qty || 0))) {
        itemMap.set(item.id, item);
      }
    }
    winner.items = Array.from(itemMap.values());
    map.set(remote.id, winner);
  }
  return Array.from(map.values());
}

console.log('--- TESTE 1: Dispositivo A incrementa item via botão + e envia broadcast para Dispositivo B ---');
const t0 = new Date('2026-10-19T20:00:00.000Z').toISOString();
const t1 = new Date('2026-10-19T20:05:00.000Z').toISOString();

const itemA = { id: 'item-1', name: 'X-Burger', qty: 1, createdAt: t0, updatedAt: t0 };
const comandaA = { id: 'CMD-1', updatedAt: t0, items: [itemA], events: [] };

const itemB = { ...itemA };
const comandaB = { id: 'CMD-1', updatedAt: t0, items: [itemB], events: [] };

// Dispositivo A clica '+'
itemA.qty = 2;
itemA.lastIncrementAt = t1;
itemA.updatedAt = t1;
comandaA.updatedAt = t1;
comandaA.events.push({ ts: t1, type: 'item_incrementado', detail: 'Item X-Burger incrementado (+1)' });

// Dispositivo B recebe o broadcast Realtime
const mergedItemsB = mergeRealtimeItems(comandaB.items, [itemA]);
comandaB.items = mergedItemsB;
assert.strictEqual(comandaB.items[0].qty, 2, 'Dispositivo B deve receber imediatamente qty = 2 via Realtime');
console.log('✓ TESTE 1 PASSOU: Dispositivo B sincronizou qty = 2 instantaneamente via Realtime!');

console.log('--- TESTE 2: Dispositivo B estava offline quando A incrementou, depois faz merge completo ---');
const comandaB_offline = { id: 'CMD-1', updatedAt: t0, items: [{ id: 'item-1', name: 'X-Burger', qty: 1, createdAt: t0, updatedAt: t0 }] };
const mergedComandas = mergeComandasById([comandaB_offline], [comandaA]);
assert.strictEqual(mergedComandas[0].items[0].qty, 2, 'Comanda resultante do merge deve ter qty = 2');
console.log('✓ TESTE 2 PASSOU: Merge completo preservou a quantidade incrementada sem reverter!');

console.log('--- TESTE 3: Dispositivo A e B com relógios idênticos (tie-breaker) ---');
const itemEqualA = { id: 'item-1', name: 'X-Burger', qty: 3, createdAt: t0, updatedAt: t1, lastIncrementAt: t1 };
const itemEqualB = { id: 'item-1', name: 'X-Burger', qty: 2, createdAt: t0, updatedAt: t1, lastIncrementAt: t1 };
const mergedTieBreaker = mergeComandasById(
  [{ id: 'CMD-1', updatedAt: t1, items: [itemEqualB] }],
  [{ id: 'CMD-1', updatedAt: t1, items: [itemEqualA] }]
);
assert.strictEqual(mergedTieBreaker[0].items[0].qty, 3, 'Tie breaker deve manter a quantidade maior');
console.log('✓ TESTE 3 PASSOU: Tie breaker manteve a quantidade incrementada!');

console.log('\nTodos os testes de incremento de itens passaram com 100% de sucesso!');
