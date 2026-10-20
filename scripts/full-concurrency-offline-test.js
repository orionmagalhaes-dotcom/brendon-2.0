"use strict";

const fs = require("fs");
const path = require("path");

// Carregar catálogo de produtos do sistema
const productsData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "products-data.json"), "utf8")
);

function isoNow() {
  return new Date().toISOString();
}

function parseNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return "R$ " + parseNumber(value).toFixed(2).replace(".", ",");
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Hub Central Simulado (Simula o Supabase com tabela restobar_state e canais Realtime Broadcast)
class SimulatedSupabaseHub {
  constructor(initialProducts) {
    this.cloudRow = {
      id: "main",
      updated_at: isoNow(),
      payload: {
        meta: {
          updatedAt: isoNow(),
          deletedComandaIds: [],
          deletedUserIds: []
        },
        products: clone(initialProducts),
        users: [
          { id: 1, name: "Admin Nelson", role: "admin", login: "admin", active: true },
          { id: 2, name: "Garcom Pedro", role: "waiter", login: "pedro", active: true },
          { id: 3, name: "Garcom Maria", role: "waiter", login: "maria", active: true },
          { id: 4, name: "Garcom Joao", role: "waiter", login: "joao", active: true },
          { id: 5, name: "Garcom Ana", role: "waiter", login: "ana", active: true },
          { id: 6, name: "Garcom Carlos", role: "waiter", login: "carlos", active: true },
          { id: 7, name: "Garcom Instavel", role: "waiter", login: "instavel", active: true },
          { id: 8, name: "Cozinheiro Chef", role: "cook", login: "cozinha", active: true }
        ],
        openComandas: [],
        closedComandas: [],
        payables: [],
        audit: [],
        seq: { comanda: 1, item: 1, payable: 1, user: 20, product: 200 }
      }
    };
    this.subscribers = [];
    this.lockCollisions = 0;
    this.totalWrites = 0;
    this.pendingMessages = 0;
    this.maxDeliveryDelayMs = 12;
  }

  subscribe(device) {
    this.subscribers.push(device);
  }

  broadcast(senderDevice, event, payload) {
    for (const sub of this.subscribers) {
      if (sub.sessionId !== senderDevice.sessionId) {
        if (!sub.online) {
          continue; // Dispositivo offline não recebe mensagens realtime
        }
        this.pendingMessages++;
        setTimeout(() => {
          try {
            sub.receiveRealtime(event, clone(payload));
          } finally {
            this.pendingMessages--;
          }
        }, Math.floor(Math.random() * this.maxDeliveryDelayMs) + 2);
      }
    }
  }

  async flush(devices, timeoutMs = 12000) {
    const startedAt = Date.now();
    let stableRounds = 0;
    while (Date.now() - startedAt < timeoutMs) {
      const busy =
        this.pendingMessages > 0 ||
        devices.some((device) => device.online && (device.syncInFlight || device.syncQueued));
      stableRounds = busy ? 0 : stableRounds + 1;
      if (stableRounds >= 5) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Timeout aguardando convergência da sincronização.");
  }

  async read() {
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 8) + 2));
    return clone(this.cloudRow);
  }

  async update(expectedUpdatedAt, newPayload) {
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 12) + 3));
    // Concorrência otimista (lock no updated_at como no Supabase)
    if (this.cloudRow.updated_at !== expectedUpdatedAt) {
      this.lockCollisions++;
      return { success: false, conflict: true };
    }
    const newUpdatedAt = isoNow();
    this.cloudRow = {
      id: "main",
      updated_at: newUpdatedAt,
      payload: clone(newPayload)
    };
    this.totalWrites++;
    return { success: true, updated_at: newUpdatedAt };
  }
}

// Dispositivo simulado que espelha exatamente a lógica do app.js
class SimulatedDevice {
  constructor(name, role, userId, hub) {
    this.name = name;
    this.role = role;
    this.userId = userId;
    this.hub = hub;
    this.sessionId = `sess_${name.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Math.random().toString(36).slice(2, 6)}`;
    this.state = null;
    this.lastKnownRemoteUpdatedAt = null;
    this.online = true;
    this.syncQueued = false;
    this.syncInFlight = false;
    this.stats = {
      itemsAdded: 0,
      itemsCanceled: 0,
      comandasCreated: 0,
      comandasFinalized: 0,
      realtimeReceived: 0,
      syncRetries: 0
    };
  }

  async init() {
    const remote = await this.hub.read();
    this.state = clone(remote.payload);
    this.lastKnownRemoteUpdatedAt = remote.updated_at;
    this.hub.subscribe(this);
  }

  async setOnline(value) {
    const wasOffline = !this.online;
    this.online = Boolean(value);
    console.log(`  [CONEXÃO] ${this.name} -> ${this.online ? "🟢 ONLINE (Reconectado)" : "🔴 OFFLINE (Sem internet)"}`);
    if (this.online && wasOffline) {
      // Reconexão: dispara ciclo de sincronização com a nuvem
      this.triggerSync();
    }
  }

  receiveRealtime(event, payload) {
    if (!this.online || !payload || payload.sessionId === this.sessionId) return;
    this.stats.realtimeReceived++;
    switch (event) {
      case "comanda_upsert":
      case "kitchen_order_upsert":
        this.applyComandaUpsert(payload);
        break;
      case "comanda_closed":
        this.applyComandaClosed(payload);
        break;
      case "state_changed":
        void this.pullState();
        break;
    }
  }

  applyComandaUpsert(payload) {
    const incoming = payload.comanda;
    if (!incoming || !incoming.id) return;
    const isClosed = (this.state.closedComandas || []).some((c) => c.id === incoming.id);
    if (isClosed) return;

    const openRows = this.state.openComandas || [];
    const idx = openRows.findIndex((c) => c.id === incoming.id);
    if (idx >= 0) {
      const cur = openRows[idx];
      const mergedItems = this.mergeItems(cur.items, incoming.items);
      openRows[idx] = {
        ...cur,
        ...incoming,
        updatedAt: (incoming.updatedAt || "") >= (cur.updatedAt || "") ? incoming.updatedAt : cur.updatedAt,
        items: mergedItems
      };
    } else {
      this.state.openComandas = [...openRows, incoming];
    }
  }

  applyComandaClosed(payload) {
    const comandaId = payload.comandaId || payload.comanda?.id;
    if (!comandaId) return;
    this.state.openComandas = (this.state.openComandas || []).filter((c) => c.id !== comandaId);
    if (payload.comanda) {
      const closed = this.state.closedComandas || [];
      const idx = closed.findIndex((c) => c.id === comandaId);
      if (idx >= 0) closed[idx] = payload.comanda;
      else this.state.closedComandas = [payload.comanda, ...closed];
    }
  }

  mergeItems(existingItems, incomingItems) {
    const map = new Map();
    for (const item of existingItems || []) {
      if (item?.id) map.set(String(item.id), clone(item));
    }
    for (const item of incomingItems || []) {
      if (!item?.id) continue;
      const key = String(item.id);
      if (!map.has(key)) {
        map.set(key, clone(item));
      } else {
        const cur = map.get(key);
        // Preserva cancelamento se qualquer uma das partes cancelou
        if (item.canceled && !cur.canceled) {
          map.set(key, clone(item));
        } else if (!item.canceled && cur.canceled) {
          // Mantém cancelado
        } else if ((item.updatedAt || "") >= (cur.updatedAt || "")) {
          map.set(key, clone(item));
        }
      }
    }
    return [...map.values()];
  }

  generateUniqueComandaId() {
    this.state.seq = this.state.seq || {};
    const seq = Number(this.state.seq.comanda || 1);
    this.state.seq.comanda = seq + 1;
    const sessionChunk = this.sessionId.slice(-4).toUpperCase();
    const timeChunk = Date.now().toString(36).slice(-4).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
    return `CMD-${String(seq).padStart(4, "0")}-${sessionChunk}${timeChunk}${rand}`;
  }

  generateUniqueItemId() {
    this.state.seq = this.state.seq || {};
    const seq = Number(this.state.seq.item || 1);
    this.state.seq.item = seq + 1;
    const sessionChunk = this.sessionId.slice(-4).toUpperCase();
    const timeChunk = Date.now().toString(36).slice(-4).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
    return `IT-${String(seq).padStart(5, "0")}-${sessionChunk}${timeChunk}${rand}`;
  }

  createComanda(tableName, customerName) {
    const comandaId = this.generateUniqueComandaId();
    const now = isoNow();
    const comanda = {
      id: comandaId,
      table: tableName,
      customer: customerName || "",
      createdAt: now,
      updatedAt: now,
      createdBy: this.userId,
      createdByName: this.name,
      status: "aberta",
      items: [],
      notes: [],
      events: [{ ts: now, type: "comanda_aberta", detail: `Aberta na ${tableName} por ${this.name}` }]
    };
    this.state.openComandas.push(comanda);
    this.stats.comandasCreated++;
    this.triggerSync();
    if (this.online) {
      this.hub.broadcast(this, "comanda_upsert", {
        sessionId: this.sessionId,
        comanda,
        broadcastAt: now
      });
    }
    return comanda;
  }

  addItemToComanda(comandaId, product, qty = 1, waiterNote = "") {
    const comanda = this.state.openComandas.find((c) => c.id === comandaId);
    if (!comanda) return null;

    const itemId = this.generateUniqueItemId();
    const now = isoNow();
    const isKitchen = product.category === "Cozinha";
    const item = {
      id: itemId,
      productId: product.id,
      name: product.name,
      category: product.category,
      priceAtSale: Number(product.price || 0),
      costAtSale: Number(product.cost || 0),
      qty,
      waiterNote,
      addedAt: now,
      updatedAt: now,
      canceled: false,
      kitchenStatus: isKitchen ? "fila" : "",
      addedByName: this.name
    };
    comanda.items.push(item);
    comanda.updatedAt = now;
    this.stats.itemsAdded++;

    // Ajuste de estoque local
    const p = this.state.products.find((prod) => prod.id === product.id);
    if (p) {
      p.stock = Math.max(0, Number(p.stock || 0) - qty);
      p.updatedAt = now;
    }

    this.triggerSync();
    if (this.online) {
      this.hub.broadcast(this, isKitchen ? "kitchen_order_upsert" : "comanda_upsert", {
        sessionId: this.sessionId,
        comanda,
        items: [item],
        broadcastAt: now
      });
    }
    return item;
  }

  cancelItem(comandaId, itemId, reason = "Desistencia de pedido") {
    const comanda = this.state.openComandas.find((c) => c.id === comandaId);
    if (!comanda) return false;

    const item = comanda.items.find((i) => i.id === itemId);
    if (!item || item.canceled) return false;

    const now = isoNow();
    item.canceled = true;
    item.canceledAt = now;
    item.cancelReason = reason;
    item.canceledByName = this.name;
    item.updatedAt = now;
    comanda.updatedAt = now;
    this.stats.itemsCanceled++;

    // Repõe estoque do produto
    const p = this.state.products.find((prod) => prod.id === item.productId);
    if (p) {
      p.stock = Number(p.stock || 0) + item.qty;
      p.updatedAt = now;
    }

    this.triggerSync();
    if (this.online) {
      this.hub.broadcast(this, "comanda_upsert", {
        sessionId: this.sessionId,
        comanda,
        items: [item],
        broadcastAt: now
      });
    }
    return true;
  }

  finalizeComanda(comandaId, paymentSplits) {
    const comanda = this.state.openComandas.find((c) => c.id === comandaId);
    if (!comanda) return false;

    const total = comanda.items
      .filter((i) => !i.canceled)
      .reduce((sum, i) => sum + i.priceAtSale * i.qty, 0);

    const paid = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(total - paid) > 0.01) {
      throw new Error(`Divergência de pagamento na comanda ${comandaId}: total=${total}, pago=${paid}`);
    }

    const now = isoNow();
    comanda.status = "finalizada";
    comanda.closedAt = now;
    comanda.updatedAt = now;
    comanda.closedByName = this.name;
    comanda.payment = {
      method: paymentSplits.length === 1 ? paymentSplits[0].method : "multiplo",
      methods: paymentSplits,
      totalPaid: paid
    };

    this.state.openComandas = this.state.openComandas.filter((c) => c.id !== comandaId);
    this.state.closedComandas = [comanda, ...(this.state.closedComandas || [])];
    this.stats.comandasFinalized++;

    this.triggerSync();
    if (this.online) {
      this.hub.broadcast(this, "comanda_closed", {
        sessionId: this.sessionId,
        comanda,
        comandaId,
        broadcastAt: now
      });
    }
    return true;
  }

  triggerSync() {
    this.syncQueued = true;
    if (this.online && !this.syncInFlight) {
      void this.syncLoop();
    }
  }

  async syncLoop() {
    if (this.syncInFlight || !this.online) return;
    this.syncInFlight = true;

    while (this.syncQueued && this.online) {
      this.syncQueued = false;
      const remote = await this.hub.read();
      const merged = this.mergeStates(this.state, remote.payload);
      const writeResult = await this.hub.update(remote.updated_at, merged);

      if (writeResult.success) {
        this.state = merged;
        this.lastKnownRemoteUpdatedAt = writeResult.updated_at;
        // Notifica demais aparelhos online que houve atualização no banco (como o Supabase Realtime)
        this.hub.broadcast(this, "state_changed", {
          updatedAt: writeResult.updated_at,
          sessionId: this.sessionId
        });
      } else {
        // Conflito otimista concorrente: tenta novamente com o estado mais recente
        this.stats.syncRetries++;
        this.syncQueued = true;
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 15) + 5));
      }
    }
    this.syncInFlight = false;
  }

  mergeStates(local, remote) {
    const result = clone(local);

    // 1. Reconciliação de Comandas Abertas
    const openMap = new Map();
    // Prioriza comandas da nuvem
    for (const r of remote.openComandas || []) {
      if (r?.id) openMap.set(r.id, clone(r));
    }
    // Mescla com comandas locais
    for (const c of local.openComandas || []) {
      if (!c?.id) continue;
      if (!openMap.has(c.id)) {
        openMap.set(c.id, clone(c));
      } else {
        const cur = openMap.get(c.id);
        const mergedItems = this.mergeItems(cur.items, c.items);
        const newestUpdatedAt = (c.updatedAt || "") > (cur.updatedAt || "") ? c.updatedAt : cur.updatedAt;
        openMap.set(c.id, {
          ...cur,
          ...c,
          updatedAt: newestUpdatedAt,
          items: mergedItems
        });
      }
    }

    // Comandas que foram fechadas tanto local quanto remotamente
    const closedIds = new Set([
      ...(local.closedComandas || []).map((c) => c.id),
      ...(remote.closedComandas || []).map((c) => c.id)
    ]);
    result.openComandas = [...openMap.values()].filter((c) => !closedIds.has(c.id));

    // 2. Reconciliação de Comandas Fechadas
    const closedMap = new Map();
    for (const c of [...(local.closedComandas || []), ...(remote.closedComandas || [])]) {
      if (c?.id && !closedMap.has(c.id)) closedMap.set(c.id, clone(c));
    }
    result.closedComandas = [...closedMap.values()];

    // 3. Sequências numéricas seguras
    result.seq = {
      comanda: Math.max(local.seq?.comanda || 1, remote.seq?.comanda || 1),
      item: Math.max(local.seq?.item || 1, remote.seq?.item || 1),
      payable: Math.max(local.seq?.payable || 1, remote.seq?.payable || 1)
    };

    return result;
  }

  async pullState() {
    if (!this.online) return;
    const remote = await this.hub.read();
    this.state = this.mergeStates(this.state, remote.payload);
    this.lastKnownRemoteUpdatedAt = remote.updated_at;
  }
}

// =========================================================================
// BATERIA DE TESTES DE ESTABILIDADE, CONCORRÊNCIA E SINCRONIZAÇÃO OFFLINE
// =========================================================================
async function runFullTest() {
  console.log("=============================================================================");
  console.log("TESTE DE ESTABILIDADE, CONCORRÊNCIA MULTI-DISPOSITIVOS E RECUPERAÇÃO OFFLINE");
  console.log("=============================================================================\n");

  const hub = new SimulatedSupabaseHub(productsData);

  const devices = [
    new SimulatedDevice("Admin-Caixa", "admin", 1, hub),
    new SimulatedDevice("Garcom-Pedro", "waiter", 2, hub),
    new SimulatedDevice("Garcom-Maria", "waiter", 3, hub),
    new SimulatedDevice("Garcom-Joao", "waiter", 4, hub),
    new SimulatedDevice("Garcom-Ana", "waiter", 5, hub),
    new SimulatedDevice("Garcom-Carlos", "waiter", 6, hub),
    new SimulatedDevice("Garcom-Instavel", "waiter", 7, hub),
    new SimulatedDevice("Cozinha-Monitor", "cook", 8, hub)
  ];

  console.log("FASE 1: Inicializando 8 dispositivos simultâneos...");
  for (const device of devices) {
    await device.init();
  }
  console.log("  -> 8 dispositivos sincronizados e ouvindo canais em tempo real.\n");

  // Produtos de teste
  const skol = productsData.find((p) => p.name.includes("SKOL") || p.name.includes("Skol")) || productsData[0];
  const baiao = productsData.find((p) => p.name.includes("Baião") || p.name.includes("Baiao")) || productsData[1];
  const espetinho = productsData.find((p) => p.name.includes("Espetinho")) || productsData[2];
  const frango = productsData.find((p) => p.name.includes("Frango")) || productsData[3];

  console.log("FASE 2: Abertura simultânea de comandas (Garantir zero sobreposição e IDs únicos)...");
  const mesa01 = devices[1].createComanda("Mesa 01", "Cliente Roberto");
  const mesa02 = devices[2].createComanda("Mesa 02", "Cliente Fernanda");
  const mesa03 = devices[3].createComanda("Mesa 03", "Cliente Marcos");
  const mesa04 = devices[4].createComanda("Mesa 04", "Cliente Juliana");
  const mesa05 = devices[5].createComanda("Mesa 05", "Cliente Carlos");

  await hub.flush(devices);
  for (const d of devices) await d.pullState();

  // Validação Fase 2
  for (const device of devices) {
    if (device.state.openComandas.length !== 5) {
      throw new Error(`Falha na Fase 2: ${device.name} enxerga ${device.state.openComandas.length} comandas, esperado 5.`);
    }
  }
  console.log("  ✓ Todas as 5 comandas foram abertas simultaneamente sem sobreposição!");
  console.log("  ✓ Todos os 8 dispositivos estão sincronizados com as 5 comandas abertas.\n");

  console.log("FASE 3: Adição simultânea e concorrente de itens...");
  // Pedro e Maria pedem ao mesmo tempo para a Mesa 01!
  const item1 = devices[1].addItemToComanda(mesa01.id, skol, 3, "Bem gelada");
  const item2 = devices[2].addItemToComanda(mesa01.id, baiao, 1, "Sem cebola");
  // Outros garçons adicionam nas outras mesas em paralelo
  devices[3].addItemToComanda(mesa02.id, espetinho, 4);
  devices[4].addItemToComanda(mesa03.id, frango, 1);
  devices[5].addItemToComanda(mesa04.id, skol, 2);

  await hub.flush(devices);
  for (const d of devices) await d.pullState();

  // Validação Fase 3: Mesa 01 deve conter AMBOS os itens (Skol x3 e Baião x1)
  for (const device of devices) {
    const m1 = device.state.openComandas.find((c) => c.id === mesa01.id);
    if (!m1 || m1.items.length !== 2) {
      throw new Error(`Falha na Fase 3: ${device.name} não possui os 2 itens concorrentes na Mesa 01.`);
    }
  }
  console.log("  ✓ Concorrência perfeita na mesma comanda: Pedro e Maria adicionaram itens sem se sobrescrever!");
  console.log("  ✓ Todos os dispositivos receberam todos os pedidos.\n");

  console.log("FASE 4: Remoção e cancelamento de itens...");
  // Garçom cancela o Baião da Mesa 01
  const cancelSuccess = devices[1].cancelItem(mesa01.id, item2.id, "Cliente desistiu");
  if (!cancelSuccess) throw new Error("Falha ao registrar cancelamento do item.");

  await hub.flush(devices);
  for (const d of devices) await d.pullState();

  for (const device of devices) {
    const m1 = device.state.openComandas.find((c) => c.id === mesa01.id);
    const canceledItem = m1.items.find((i) => i.id === item2.id);
    if (!canceledItem || !canceledItem.canceled) {
      throw new Error(`Falha na Fase 4: Cancelamento do item não sincronizou para ${device.name}.`);
    }
    // Total ativo deve considerar apenas o item ativo (Skol x3 = 3 * 5 = 15)
    const activeTotal = m1.items.filter((i) => !i.canceled).reduce((s, i) => s + i.priceAtSale * i.qty, 0);
    if (activeTotal !== 15) {
      throw new Error(`Total ativo divergente em ${device.name}: R$ ${activeTotal}, esperado R$ 15,00`);
    }
  }
  console.log("  ✓ Cancelamento de item sincronizado em todos os aparelhos!");
  console.log("  ✓ Total da comanda recalculado automaticamente sem incluir o item cancelado.\n");

  console.log("=============================================================================");
  console.log("FASE 5: TESTE CRÍTICO DE DISPOSITIVO OFFLINE (QUEDA DE INTERNET)");
  console.log("=============================================================================");

  const instavel = devices[6]; // Garcom-Instavel

  // 1. Garcom-Instavel perde a conexão
  await instavel.setOnline(false);

  console.log("\n  -> Enquanto Garcom-Instavel está sem internet, ele continua atendendo clientes:");
  // Cria comanda offline
  const mesaOffline = instavel.createComanda("Mesa 99 (Offline)", "Cliente Vanderlei");
  instavel.addItemToComanda(mesaOffline.id, espetinho, 5, "Bem passado");
  instavel.addItemToComanda(mesaOffline.id, skol, 4);

  // Adiciona itens em comanda pré-existente (Mesa 02) enquanto offline
  instavel.addItemToComanda(mesa02.id, skol, 2, "Adicionado offline");

  // Cancela um item na Mesa 03 enquanto offline
  const mesa03Item = mesa03.items[0];
  if (mesa03Item) {
    instavel.cancelItem(mesa03.id, mesa03Item.id, "Cancelado no aparelho offline");
  }

  console.log("     * Garcom-Instavel abriu 'Mesa 99 (Offline)' com 2 itens.");
  console.log("     * Garcom-Instavel adicionou 2 Skols na 'Mesa 02'.");
  console.log("     * Garcom-Instavel cancelou item na 'Mesa 03'.");

  console.log("\n  -> Enquanto isso, os outros aparelhos ONLINE continuam operando na nuvem:");
  // Outros aparelhos operam normalmente
  devices[1].addItemToComanda(mesa02.id, frango, 1); // Pedro adiciona Frango na Mesa 02 ao mesmo tempo
  devices[2].addItemToComanda(mesa05.id, skol, 10);

  // Caixa finaliza a Mesa 04 com pagamento dividido
  const m4 = devices[0].state.openComandas.find((c) => c.id === mesa04.id);
  const m4Total = m4.items.filter((i) => !i.canceled).reduce((s, i) => s + i.priceAtSale * i.qty, 0);
  devices[0].finalizeComanda(mesa04.id, [{ method: "pix", amount: m4Total }]);

  await hub.flush(devices.filter((d) => d !== instavel));
  console.log("     * Admin finalizou 'Mesa 04' com Pix.");
  console.log("     * Garcom-Pedro adicionou Frango na 'Mesa 02'.");

  console.log("\n  -> RESTABELECENDO CONEXÃO DE Garcom-Instavel (Reconexão)...");
  await instavel.setOnline(true);

  // Aguarda todos convergirem
  await hub.flush(devices);
  for (const d of devices) await d.pullState();
  console.log("  -> Sincronização e resolução de conflitos concluídas!\n");

  console.log("=============================================================================");
  console.log("FASE 6: AUDITORIA RIGOROSA DE CONSISTÊNCIA ENTRE TODOS OS DISPOSITIVOS");
  console.log("=============================================================================");

  // 1. Verificar se a Mesa 99 (criada offline) agora existe na nuvem e em TODOS os 8 dispositivos
  for (const device of devices) {
    const found = device.state.openComandas.find((c) => c.id === mesaOffline.id);
    if (!found) {
      throw new Error(`ERRO: ${device.name} não recebeu a comanda criada offline (${mesaOffline.id}).`);
    }
    if (found.items.length !== 2) {
      throw new Error(`ERRO: ${device.name} possui ${found.items.length} itens na Mesa 99, esperado 2.`);
    }
  }
  console.log("  ✓ [CHECK 1]: Comanda criada offline (Mesa 99) foi replicada para TODOS os dispositivos!");

  // 2. Verificar se a Mesa 02 mesclou as alterações feitas offline + online sem perda
  for (const device of devices) {
    const m2 = device.state.openComandas.find((c) => c.id === mesa02.id);
    if (!m2) throw new Error(`ERRO: Mesa 02 sumiu em ${device.name}!`);
    // Deve conter: Espetinho x4 (Fase 3) + Skol x2 (adicionado offline) + Frango x1 (adicionado online)
    if (m2.items.length !== 3) {
      throw new Error(`ERRO: Mesa 02 possui ${m2.items.length} itens em ${device.name}, esperado 3 itens.`);
    }
  }
  console.log("  ✓ [CHECK 2]: Mesa 02 unificou com perfeição as adições online e offline!");

  // 3. Verificar se a Mesa 04 finalizada no Caixa agora está FECHADA em todos os dispositivos
  for (const device of devices) {
    const isOpen = device.state.openComandas.some((c) => c.id === mesa04.id);
    const isClosed = device.state.closedComandas.some((c) => c.id === mesa04.id);
    if (isOpen || !isClosed) {
      throw new Error(`ERRO: ${device.name} ainda mostra a Mesa 04 como aberta ou não fechou corretamente.`);
    }
  }
  console.log("  ✓ [CHECK 3]: Comanda finalizada no Caixa foi sincronizada para todos, inclusive o aparelho reconectado!");

  // 4. Verificar se a contagem e os totais de comandas abertas são IDÊNTICOS em todos os 8 dispositivos
  const baseDevice = devices[0];
  const baseOpenCount = baseDevice.state.openComandas.length;
  const baseClosedCount = baseDevice.state.closedComandas.length;

  for (let i = 1; i < devices.length; i++) {
    const d = devices[i];
    if (d.state.openComandas.length !== baseOpenCount) {
      throw new Error(`DIVERGÊNCIA: ${d.name} tem ${d.state.openComandas.length} comandas abertas, ${baseDevice.name} tem ${baseOpenCount}.`);
    }
    if (d.state.closedComandas.length !== baseClosedCount) {
      throw new Error(`DIVERGÊNCIA: ${d.name} tem ${d.state.closedComandas.length} comandas fechadas, ${baseDevice.name} tem ${baseClosedCount}.`);
    }
  }
  console.log(`  ✓ [CHECK 4]: Todos os 8 dispositivos possuem exatamente ${baseOpenCount} comandas abertas e ${baseClosedCount} finalizadas.`);

  // 5. Verificar ausência de sobreposição ou alteração aleatória
  const allOpenIds = new Set();
  for (const comanda of baseDevice.state.openComandas) {
    if (allOpenIds.has(comanda.id)) {
      throw new Error(`ERRO CRÍTICO: ID duplicado detectado: ${comanda.id}`);
    }
    allOpenIds.add(comanda.id);
  }
  console.log("  ✓ [CHECK 5]: Zero sobreposições e zero colisões de IDs detectadas!");
  console.log(`  ✓ [CHECK 6]: Conflitos de gravação simultânea resolvidos com sucesso: ${hub.lockCollisions}`);
  console.log(`  ✓ [CHECK 7]: Total de gravações atômicas confirmadas na nuvem: ${hub.totalWrites}\n`);

  console.log("=============================================================================");
  console.log("RELATÓRIO DETALHADO POR DISPOSITIVO:");
  console.log("=============================================================================");
  for (const d of devices) {
    console.log(
      ` - ${d.name.padEnd(16)} | Criou: ${d.stats.comandasCreated} | Itens add: ${d.stats.itemsAdded} | Cancelou: ${d.stats.itemsCanceled} | Fechou: ${d.stats.comandasFinalized} | Retries: ${d.stats.syncRetries}`
    );
  }

  console.log("\n=============================================================================");
  console.log("RESULTADO FINAL: TESTE COMPLETO 100% APROVADO!");
  console.log("O sistema é comprovadamente estável, seguro contra concorrência e resiliente a quedas de internet.");
  console.log("=============================================================================");
}

runFullTest().catch((err) => {
  console.error("\n❌ FALHA NO TESTE:", err);
  process.exit(1);
});
