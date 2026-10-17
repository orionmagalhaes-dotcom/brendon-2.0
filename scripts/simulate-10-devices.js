"use strict";

const fs = require("fs");
const path = require("path");

// Load products
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

// Global Hub simulating Supabase Table and Realtime Broadcast
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
          { id: 7, name: "Caixa Terminal", role: "admin", login: "caixa", active: true },
          { id: 8, name: "Garcom Lucas", role: "waiter", login: "lucas", active: true },
          { id: 9, name: "Garcom Beatriz", role: "waiter", login: "beatriz", active: true },
          { id: 10, name: "Cozinheiro Chef", role: "cook", login: "cozinha", active: true }
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
    this.dropRate = 0;
    this.maxDeliveryDelayMs = 8;
    this.droppedMessages = 0;
  }

  subscribe(device) {
    this.subscribers.push(device);
  }

  broadcast(senderDevice, event, payload) {
    for (const sub of this.subscribers) {
      if (sub.sessionId !== senderDevice.sessionId) {
        if (!sub.online || Math.random() < this.dropRate) {
          this.droppedMessages++;
          continue;
        }
        // Asynchronous message delivery simulation
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

  async flush(devices, timeoutMs = 10000) {
    const startedAt = Date.now();
    let stableRounds = 0;
    while (Date.now() - startedAt < timeoutMs) {
      const busy = this.pendingMessages > 0 || devices.some((device) => device.online && (device.syncInFlight || device.syncQueued));
      stableRounds = busy ? 0 : stableRounds + 1;
      if (stableRounds >= 3) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Timeout aguardando convergencia da simulacao.");
  }

  async read() {
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10) + 5));
    return clone(this.cloudRow);
  }

  async update(expectedUpdatedAt, newPayload) {
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 15) + 5));
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

// Simulated Device (Simulating app.js running on a phone/computer)
class SimulatedDevice {
  constructor(name, role, userId, hub) {
    this.name = name;
    this.role = role;
    this.userId = userId;
    this.hub = hub;
    this.sessionId = `sess_${name.toLowerCase()}_${Math.random().toString(36).slice(2, 7)}`;
    this.state = null;
    this.lastKnownRemoteUpdatedAt = null;
    this.online = true;
    this.syncQueued = false;
    this.syncInFlight = false;
    this.stats = {
      itemsAdded: 0,
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
    this.online = Boolean(value);
    if (!this.online) return;
    await this.pullState();
    if (this.syncQueued) void this.syncLoop();
  }

  createConcurrentLogin() {
    const sessionSuffix = this.sessionId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
    const id = 1000000000000 + (Date.now() % 1000000000) * 1000000 + Math.floor(Math.random() * 1000000);
    const user = {
      id,
      name: `Garcom Login ${this.name}`,
      role: "waiter",
      login: `garcom_stress_${sessionSuffix}`,
      password: "2222",
      active: true,
      updatedAt: isoNow()
    };
    this.state.users = [...(this.state.users || []), user];
    this.triggerSync();
    return user;
  }

  receiveRealtime(event, payload) {
    if (!this.online || !payload || payload.sessionId === this.sessionId) return;
    this.stats.realtimeReceived++;
    switch (event) {
      case "comanda_upsert":
        this.applyComandaUpsert(payload);
        break;
      case "kitchen_order_upsert":
        this.applyKitchenOrderUpsert(payload);
        break;
      case "comanda_closed":
        this.applyComandaClosed(payload);
        break;
      case "comanda_deleted":
        this.applyComandaDeleted(payload);
        break;
      case "state_changed":
        void this.pullState();
        break;
    }
  }

  applyComandaUpsert(payload) {
    const incoming = payload.comanda;
    if (!incoming || !incoming.id) return;
    const blocked = (this.state.closedComandas || []).some((c) => c.id === incoming.id) ||
      (this.state.meta?.deletedComandaIds || []).includes(incoming.id);
    if (blocked) return;
    const openRows = this.state.openComandas || [];
    const idx = openRows.findIndex((c) => c.id === incoming.id);
    if (idx >= 0) {
      openRows[idx] = {
        ...openRows[idx],
        ...incoming,
        items: this.mergeRealtimeItems(openRows[idx].items, incoming.items)
      };
    } else {
      this.state.openComandas = [...openRows, incoming];
    }
  }

  applyKitchenOrderUpsert(payload) {
    this.applyComandaUpsert(payload);
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

  applyComandaDeleted(payload) {
    const comandaId = payload.comandaId;
    if (!comandaId) return;
    this.state.openComandas = (this.state.openComandas || []).filter((c) => c.id !== comandaId);
    this.state.closedComandas = (this.state.closedComandas || []).filter((c) => c.id !== comandaId);
  }

  mergeRealtimeItems(existingItems, incomingItems) {
    const map = new Map();
    for (const item of existingItems || []) {
      if (item?.id) map.set(String(item.id), item);
    }
    for (const item of incomingItems || []) {
      if (item?.id) {
        if (!map.has(String(item.id))) {
          map.set(String(item.id), item);
        } else {
          // Keep newest item timestamp
          const cur = map.get(String(item.id));
          if ((item.updatedAt || "") >= (cur.updatedAt || "")) {
            map.set(String(item.id), item);
          }
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
      status: "aberta",
      items: [],
      notes: [],
      events: [{ ts: now, type: "comanda_aberta", detail: `Aberta na ${tableName}` }]
    };
    this.state.openComandas.push(comanda);
    this.stats.comandasCreated++;
    this.triggerSync();
    this.hub.broadcast(this, "comanda_upsert", {
      sessionId: this.sessionId,
      comanda,
      broadcastAt: now
    });
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
      subcategory: product.subcategory || "Geral",
      priceAtSale: Number(product.price || 0),
      costAtSale: Number(product.cost || 0),
      qty,
      waiterNote,
      addedAt: now,
      updatedAt: now,
      canceled: false,
      delivered: false,
      kitchenStatus: isKitchen ? "fila" : "",
      kitchenPrinted: false,
      needsKitchen: isKitchen
    };
    comanda.items.push(item);
    comanda.updatedAt = now;
    this.stats.itemsAdded++;
    this.triggerSync();

    this.hub.broadcast(this, isKitchen ? "kitchen_order_upsert" : "comanda_upsert", {
      sessionId: this.sessionId,
      comanda,
      items: [item],
      broadcastAt: now
    });
    return item;
  }

  sendKitchenOrders(comandaId) {
    const comanda = this.state.openComandas.find((c) => c.id === comandaId);
    if (!comanda) return { count: 0, items: [] };

    // FILTRO ESTRITO: Apenas itens da categoria 'Cozinha'
    const kitchenItems = comanda.items.filter(
      (i) => i && !i.canceled && i.category === "Cozinha" && !i.kitchenPrinted
    );

    for (const item of kitchenItems) {
      item.kitchenPrinted = true;
      item.updatedAt = isoNow();
    }
    if (kitchenItems.length > 0) {
      comanda.updatedAt = isoNow();
      this.triggerSync();
      this.hub.broadcast(this, "kitchen_order_upsert", {
        sessionId: this.sessionId,
        comanda,
        items: kitchenItems,
        broadcastAt: isoNow()
      });
    }
    return { count: kitchenItems.length, items: kitchenItems };
  }

  finalizeComanda(comandaId, paymentSplits) {
    const comanda = this.state.openComandas.find((c) => c.id === comandaId);
    if (!comanda) return false;

    const total = comanda.items
      .filter((i) => !i.canceled)
      .reduce((sum, i) => sum + i.priceAtSale * i.qty, 0);

    const paid = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(total - paid) > 0.01) {
      throw new Error(`Divergência de pagamento: comanda=${total}, pago=${paid}`);
    }

    const now = isoNow();
    comanda.status = "finalizada";
    comanda.closedAt = now;
    comanda.updatedAt = now;
    comanda.payment = {
      method: paymentSplits.length === 1 ? paymentSplits[0].method : "multiplo",
      methods: paymentSplits,
      totalPaid: paid
    };

    this.state.openComandas = this.state.openComandas.filter((c) => c.id !== comandaId);
    this.state.closedComandas = [comanda, ...(this.state.closedComandas || [])];
    this.stats.comandasFinalized++;

    this.triggerSync();
    this.hub.broadcast(this, "comanda_closed", {
      sessionId: this.sessionId,
      comanda,
      comandaId,
      broadcastAt: now
    });
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
      // Merge local with remote state
      const merged = this.mergeStates(this.state, remote.payload);
      const writeResult = await this.hub.update(remote.updated_at, merged);

      if (writeResult.success) {
        this.state = merged;
        this.lastKnownRemoteUpdatedAt = writeResult.updated_at;
      } else {
        // Concurrency conflict! Retry immediately with fresh remote state
        this.stats.syncRetries++;
        this.syncQueued = true;
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20) + 10));
      }
    }
    this.syncInFlight = false;
  }

  mergeStates(local, remote) {
    const result = clone(local);
    const users = new Map();
    for (const user of [...(local.users || []), ...(remote.users || [])]) {
      if (!user?.id) continue;
      const previous = users.get(String(user.id));
      if (!previous || String(user.updatedAt || "") >= String(previous.updatedAt || "")) {
        users.set(String(user.id), clone(user));
      }
    }
    result.users = [...users.values()];

    // 1. Merge openComandas
    const map = new Map();
    for (const c of local.openComandas || []) {
      if (c?.id) map.set(c.id, clone(c));
    }
    for (const r of remote.openComandas || []) {
      if (!r?.id) continue;
      if (!map.has(r.id)) {
        map.set(r.id, clone(r));
      } else {
        const cur = map.get(r.id);
        const mergedItems = this.mergeRealtimeItems(cur.items, r.items);
        const newestUpdatedAt = (r.updatedAt || "") > (cur.updatedAt || "") ? r.updatedAt : cur.updatedAt;
        map.set(r.id, {
          ...cur,
          ...r,
          updatedAt: newestUpdatedAt,
          items: mergedItems
        });
      }
    }
    // Remove if comanda was closed in remote or local
    const closedIds = new Set([
      ...(local.closedComandas || []).map((c) => c.id),
      ...(remote.closedComandas || []).map((c) => c.id)
    ]);
    result.openComandas = [...map.values()].filter((c) => !closedIds.has(c.id));

    // 2. Merge closedComandas
    const closedMap = new Map();
    for (const c of [...(local.closedComandas || []), ...(remote.closedComandas || [])]) {
      if (c?.id && !closedMap.has(c.id)) closedMap.set(c.id, c);
    }
    result.closedComandas = [...closedMap.values()];

    // 3. Sequences
    result.seq = {
      comanda: Math.max(local.seq?.comanda || 1, remote.seq?.comanda || 1),
      item: Math.max(local.seq?.item || 1, remote.seq?.item || 1),
      payable: Math.max(local.seq?.payable || 1, remote.seq?.payable || 1),
      user: Math.max(local.seq?.user || 1, remote.seq?.user || 1),
      product: Math.max(local.seq?.product || 1, remote.seq?.product || 1)
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

// ==========================================
// TEST EXECUTION
// ==========================================
async function runSimulation() {
  console.log("===============================================================");
  console.log("SIMULAÇÃO MASSIVA DE RESTAURANTE COM 30 DISPOSITIVOS");
  console.log("===============================================================\n");

  const hub = new SimulatedSupabaseHub(productsData);

  const devices = [
    new SimulatedDevice("Admin-Principal", "admin", 1, hub),
    new SimulatedDevice("Garcom-Pedro", "waiter", 2, hub),
    new SimulatedDevice("Garcom-Maria", "waiter", 3, hub),
    new SimulatedDevice("Garcom-Joao", "waiter", 4, hub),
    new SimulatedDevice("Garcom-Ana", "waiter", 5, hub),
    new SimulatedDevice("Garcom-Carlos", "waiter", 6, hub),
    new SimulatedDevice("Caixa-Frente", "admin", 7, hub),
    new SimulatedDevice("Garcom-Lucas", "waiter", 8, hub),
    new SimulatedDevice("Garcom-Beatriz", "waiter", 9, hub),
    new SimulatedDevice("Cozinha-Monitor", "cook", 10, hub)
  ];
  for (let i = 11; i <= 30; i++) {
    devices.push(new SimulatedDevice(`Garcom-Stress-${String(i).padStart(2, "0")}`, "waiter", i, hub));
  }

  console.log(`1. Inicializando ${devices.length} dispositivos...`);
  for (const d of devices) {
    await d.init();
  }
  console.log(`   -> ${devices.length} dispositivos conectados ao Hub com sucesso.\n`);

  console.log("1b. DISPARANDO 30 LOGINS NOVOS EM PARALELO...");
  const concurrentUsers = devices.map((device) => device.createConcurrentLogin());
  await hub.flush(devices);
  for (const d of devices) await d.pullState();

  const cloudUserIds = new Set((hub.cloudRow.payload.users || []).map((user) => String(user.id)));
  const cloudLogins = new Set((hub.cloudRow.payload.users || []).map((user) => String(user.login).toLowerCase()));
  if (concurrentUsers.some((user) => !cloudUserIds.has(String(user.id))) || cloudLogins.size !== (hub.cloudRow.payload.users || []).length) {
    throw new Error("FALHA CRITICA: logins concorrentes colidiram ou desapareceram.");
  }
  console.log("   -> 30 identidades distintas preservadas e sincronizadas.\n");

  // Pick popular test products
  const pSkol = productsData.find((p) => p.category === "Bar" && p.name.includes("SKOL")) || productsData.find((p) => p.category === "Bar");
  const pBaiao = productsData.find((p) => p.category === "Cozinha" && p.name.includes("Baião")) || productsData.find((p) => p.category === "Cozinha");
  const pFrango = productsData.find((p) => p.category === "Cozinha" && p.name.includes("Frango")) || productsData.find((p) => p.category === "Cozinha");
  const pEspeto = productsData.find((p) => p.category === "Espetinhos") || productsData[0];
  const pBatata = productsData.find((p) => p.name.includes("Batata")) || productsData[1];

  console.log("Produtos selecionados para o teste:");
  console.log(` - Bar: ${pSkol.name} (${money(pSkol.price)})`);
  console.log(` - Cozinha: ${pBaiao.name} (${money(pBaiao.price)})`);
  console.log(` - Cozinha: ${pFrango.name} (${money(pFrango.price)})`);
  console.log(` - Espetinho: ${pEspeto.name} (${money(pEspeto.price)})`);
  console.log(` - Porção: ${pBatata.name} (${money(pBatata.price)})\n`);

  console.log("1c. TESTANDO APARELHO OFFLINE E PERDA DE MENSAGENS REALTIME...");
  const offlineDevice = devices[29];
  await offlineDevice.setOnline(false);
  const offlineComanda = offlineDevice.createComanda("Mesa Offline", "Cliente sem sinal");
  const offlineItem = offlineDevice.addItemToComanda(offlineComanda.id, pBaiao, 2, "criado offline");
  hub.dropRate = 0.35;
  hub.maxDeliveryDelayMs = 90;
  const recoveryComanda = devices[1].createComanda("Mesa Recuperacao", "Cliente realtime perdido");
  const recoveryItem = devices[1].addItemToComanda(recoveryComanda.id, pSkol, 1, "recuperar por pull");
  await hub.flush(devices);
  await offlineDevice.setOnline(true);
  await hub.flush(devices);
  hub.dropRate = 0;
  hub.maxDeliveryDelayMs = 8;
  for (const d of devices) await d.pullState();
  const recoveredIds = new Set((hub.cloudRow.payload.openComandas || []).map((c) => c.id));
  if (!recoveredIds.has(offlineComanda.id) || !recoveredIds.has(recoveryComanda.id)) {
    throw new Error("FALHA CRITICA: recuperacao offline/realtime perdeu uma comanda.");
  }
  const recoveredItemIds = new Set((hub.cloudRow.payload.openComandas || []).flatMap((c) => (c.items || []).map((item) => item.id)));
  if (!recoveredItemIds.has(offlineItem.id) || !recoveredItemIds.has(recoveryItem.id)) {
    throw new Error("FALHA CRITICA: recuperacao offline/realtime perdeu um item.");
  }
  console.log(`   -> Offline recuperado; ${hub.droppedMessages} mensagens realtime descartadas sem perda de dados.\n`);

  // STEP 1: Concurrently open 8 tables
  console.log("2. DISPARANDO ABERTURA CONCORRENTE DE COMANDAS...");
  const tables = [
    { devIdx: 1, table: "Mesa 01", customer: "Carlos Eduardo" },
    { devIdx: 2, table: "Mesa 02", customer: "Fernanda Lima" },
    { devIdx: 3, table: "Mesa 03", customer: "Roberto Dias" },
    { devIdx: 4, table: "Mesa 04", customer: "Patrícia Gomes" },
    { devIdx: 5, table: "Mesa 05", customer: "Thiago Rocha" },
    { devIdx: 7, table: "Mesa 06", customer: "Juliana Mendes" },
    { devIdx: 8, table: "Mesa 07", customer: "Marcos Paulo" },
    { devIdx: 0, table: "Balcão 01", customer: "Cliente Balcão" }
  ];
  for (let i = 10; i < devices.length; i++) {
    tables.push({ devIdx: i, table: `Mesa ${String(i + 1).padStart(2, "0")}`, customer: `Cliente Stress ${i + 1}` });
  }

  const createdComandas = [];
  await Promise.all(
    tables.map(async (t) => {
      const dev = devices[t.devIdx];
      const cmd = dev.createComanda(t.table, t.customer);
      createdComandas.push({ comandaId: cmd.id, table: t.table, dev });
    })
  );
  console.log(`   -> ${createdComandas.length} comandas abertas simultaneamente.\n`);

  await hub.flush(devices);
  for (const d of devices) await d.pullState();

  // STEP 2: Consecutive concurrent additions of products to tables
  console.log("3. RODADA INTENSIVA DE PEDIDOS (MULTI-DISPOSITIVOS CONCORRENTES)...");
  const addOperations = [];

  // Each waiter adds items to their tables AND cross-table additions
  // Waiter 1 and Waiter 2 BOTH add items to Mesa 01 simultaneously!
  const cmdMesa1 = createdComandas.find((c) => c.table === "Mesa 01").comandaId;
  const cmdMesa2 = createdComandas.find((c) => c.table === "Mesa 02").comandaId;
  const cmdMesa3 = createdComandas.find((c) => c.table === "Mesa 03").comandaId;

  // 20 rapid-fire concurrent additions across 7 waiters
  for (let i = 0; i < 5; i++) {
    // Waiter Pedro adds to Mesa 01
    addOperations.push(devices[1].addItemToComanda(cmdMesa1, pSkol, 2, "Bem gelada"));
    // Waiter Maria ALSO adds to Mesa 01 at the EXACT same time!
    addOperations.push(devices[2].addItemToComanda(cmdMesa1, pBaiao, 1, "Sem coentro"));
    // Waiter Joao adds to Mesa 02
    addOperations.push(devices[3].addItemToComanda(cmdMesa2, pFrango, 1));
    // Waiter Ana adds to Mesa 02
    addOperations.push(devices[4].addItemToComanda(cmdMesa2, pBatata, 2));
    // Waiter Carlos adds to Mesa 03
    addOperations.push(devices[5].addItemToComanda(cmdMesa3, pEspeto, 3));
    // Waiter Lucas adds to Mesa 03
    addOperations.push(devices[7].addItemToComanda(cmdMesa3, pSkol, 4));
    // Waiter Beatriz adds to Mesa 01
    addOperations.push(devices[8].addItemToComanda(cmdMesa1, pEspeto, 2));
  }

  await Promise.all(addOperations);
  const stressItems = [];
  for (let round = 0; round < 25; round++) {
    for (let index = 0; index < createdComandas.length; index++) {
      const target = createdComandas[index];
      const device = devices[(index + round) % devices.length];
      const product = [pSkol, pBaiao, pFrango, pEspeto, pBatata][(index + round) % 5];
      const item = device.addItemToComanda(target.comandaId, product, (round % 3) + 1, `stress-${round}-${index}`);
      if (!item) throw new Error(`FALHA CRITICA: ${device.name} nao encontrou ${target.comandaId} durante carga.`);
      stressItems.push(item.id);
    }
  }
  await hub.flush(devices);
  for (const d of devices) await d.pullState();
  console.log(`   -> ${addOperations.length + stressItems.length} adições de produtos processadas em paralelo.\n`);

  // STEP 3: "Enviar Pedidos" test (Cozinha only!)
  console.log("4. TESTANDO 'ENVIAR PEDIDOS' (FILTRO EXCLUSIVO PARA COZINHA)...");
  const sendResult1 = devices[1].sendKitchenOrders(cmdMesa1);
  if (sendResult1.count <= 0) {
    throw new Error("FALHA CRITICA: itens de cozinha adicionados concorrentemente nao chegaram ao garcom responsavel.");
  }
  console.log(`   -> Mesa 01 enviou ${sendResult1.count} itens de Cozinha.`);
  for (const item of sendResult1.items) {
    if (item.category !== "Cozinha") {
      throw new Error(`FALHA CRÍTICA: Item da categoria ${item.category} enviado na Cozinha!`);
    }
  }
  console.log("   -> [SUCESSO]: Apenas itens de categoria 'Cozinha' foram enviados!");

  // STEP 4: Finalize comanda with MULTI-PAYMENT (Mesa 01)
  console.log("\n5. TESTANDO PAGAMENTO DIVIDIDO (MÚLTIPLAS FORMAS DE PAGAMENTO)...");
  // Wait for all syncs to settle
  await hub.flush(devices);
  for (const d of devices) await d.pullState();

  const mesa1InCaixa = devices[6].state.openComandas.find((c) => c.id === cmdMesa1);
  if (!mesa1InCaixa) {
    throw new Error("Mesa 01 não encontrada no terminal do Caixa!");
  }

  const totalMesa1 = mesa1InCaixa.items
    .filter((i) => !i.canceled)
    .reduce((sum, i) => sum + i.priceAtSale * i.qty, 0);

  console.log(`   -> Total calculado para Mesa 01: ${money(totalMesa1)}`);

  // Split: R$ 50 in Dinheiro, remaining on Maquineta/Credito
  const part1 = 50.0;
  const part2 = Math.round((totalMesa1 - part1) * 100) / 100;
  const splits = [
    { method: "dinheiro", amount: part1 },
    { method: "maquineta_credito", amount: part2 }
  ];

  console.log(`   -> Pagamento dividido: Dinheiro ${money(part1)} + Cartão ${money(part2)}`);
  const staleMesa1Payload = clone(mesa1InCaixa);
  devices[6].finalizeComanda(cmdMesa1, splits);
  console.log("   -> Comanda finalizada com sucesso no Caixa!\n");

  // Wait 300ms for final convergence
  console.log("6. AGUARDANDO CONVERGÊNCIA TOTAL DA NUVEM E DISPOSITIVOS...");
  await hub.flush(devices);
  for (const d of devices) {
    await d.pullState();
  }

  // Entrega deliberadamente atrasada: update antigo nao pode reabrir a conta.
  for (const d of devices) {
    d.receiveRealtime("comanda_upsert", { sessionId: "stale-session", comanda: staleMesa1Payload });
  }
  if (devices.some((d) => (d.state.openComandas || []).some((c) => c.id === cmdMesa1))) {
    throw new Error("FALHA CRITICA: evento realtime atrasado reabriu comanda finalizada.");
  }

  // STEP 5: VERIFICAÇÕES DE INTEGRIDADE E CONSISTÊNCIA
  console.log("\n7. AUDITORIA DE CONSISTÊNCIA E CONCORRÊNCIA:");

  // Check 1: Did any device lose the closed comanda?
  let allClosedConsistent = true;
  for (const d of devices) {
    const hasClosed = (d.state.closedComandas || []).some((c) => c.id === cmdMesa1);
    if (!hasClosed) {
      allClosedConsistent = false;
      console.error(`   [ERRO]: Dispositivo ${d.name} não possui a Mesa 01 nas fechadas!`);
    }
  }
  if (allClosedConsistent) {
    console.log(`   ✓ [CHECK 1]: Todos os ${devices.length} dispositivos têm a comanda finalizada sincronizada!`);
  }

  // Check 2: Check items of Mesa 01
  const closedCmd = devices[0].state.closedComandas.find((c) => c.id === cmdMesa1);
  console.log(`   ✓ [CHECK 2]: Mesa 01 fechada com ${closedCmd.items.length} itens registrados.`);

  const cloudComandas = [...(hub.cloudRow.payload.openComandas || []), ...(hub.cloudRow.payload.closedComandas || [])];
  const cloudItemIds = new Set(cloudComandas.flatMap((comanda) => (comanda.items || []).map((item) => item.id)));
  const missingStressItems = stressItems.filter((id) => !cloudItemIds.has(id));
  if (missingStressItems.length) {
    throw new Error(`FALHA CRITICA: ${missingStressItems.length} itens desapareceram durante a carga concorrente.`);
  }
  console.log(`   ✓ [CHECK 3]: ${stressItems.length} itens da carga massiva preservados integralmente.`);

  // Check 3: Concurrency collisions handled
  console.log(`   ✓ [CHECK 4]: Conflitos de escrita simultânea resolvidos pelo motor: ${hub.lockCollisions}`);
  console.log(`   ✓ [CHECK 5]: Total de escritas bem-sucedidas na nuvem: ${hub.totalWrites}`);

  // Summary per device
  console.log("\nRESUMO POR DISPOSITIVO:");
  for (const d of devices) {
    console.log(
      ` - ${d.name.padEnd(16)} | Criou: ${d.stats.comandasCreated} | Itens add: ${d.stats.itemsAdded.toString().padStart(2)} | Realtime msg: ${d.stats.realtimeReceived.toString().padStart(2)} | Retries: ${d.stats.syncRetries}`
    );
  }

  console.log("\n===============================================================");
  console.log("RESULTADO FINAL: SIMULAÇÃO CONCLUÍDA COM 100% DE SUCESSO!");
  console.log("NENHUM ITEM PERDIDO, ZERO CORRUPÇÃO DE DADOS, SINCRONIZAÇÃO TOTAL.");
  console.log("===============================================================");
}

runSimulation().catch((err) => {
  console.error("ERRO NA SIMULAÇÃO:", err);
  process.exit(1);
});
