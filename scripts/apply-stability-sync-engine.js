"use strict";

const fs = require("fs");
const path = require("path");

const appJsPath = path.resolve(__dirname, "..", "app.js");
let content = fs.readFileSync(appJsPath, "utf8");
const isCrlf = content.includes("\r\n");
const eol = isCrlf ? "\r\n" : "\n";

function toFileEol(str) {
  return str.replace(/\r?\n/g, eol);
}

// 1. Add Local BroadcastChannel near clientSessionId
const targetSession = toFileEol(`  const clientSessionId = \`sess_\${Math.random().toString(36).slice(2, 9)}_\${Date.now()}\`;`);
const replaceSession = toFileEol(`  const clientSessionId = \`sess_\${Math.random().toString(36).slice(2, 9)}_\${Date.now()}\`;
  const LOCAL_BROADCAST_CHANNEL_NAME = "restobar_local_sync";
  let localBroadcastChannel = null;
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      localBroadcastChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME);
    }
  } catch (_e) { }`);

if (content.includes(targetSession)) {
  content = content.replace(targetSession, replaceSession);
  console.log("1. Local BroadcastChannel adicionado!");
} else {
  console.warn("1. targetSession nao encontrado.");
}

// 2. Add broadcastRealtimePayload, publishComandaClosed, publishComandaDeleted, applyComandaClosed, applyComandaDeleted, and handleIncomingRealtimeMessage
const targetBroadcastSection = toFileEol(`  function publishSupabaseStateChange(remoteUpdatedAtValue) {
    const pending = supabaseCtx.pendingStateChangeBroadcast;
    supabaseCtx.pendingStateChangeBroadcast = null;
    if (!supabaseCtx.channel) return;
    const payload = {
      updatedAt: normalizeIsoTimestamp(remoteUpdatedAtValue) || isoNow(),
      localUpdatedAt: pending?.localUpdatedAt || normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      actorId: pending?.actorId ?? null,
      actorRole: pending?.actorRole || "",
      actorName: pending?.actorName || "",
      reason: pending?.reason || "",
      sessionId: clientSessionId,
      broadcastAt: isoNow()
    };
    supabaseCtx.channel.send({ type: "broadcast", event: "state_changed", payload }).catch(() => { });
  }

  function cloneRealtimePayload(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return value;
    }
  }

  function publishKitchenOrderUpsert(comanda, items, actor, reason = "Novo pedido") {
    if (!supabaseCtx.channel || !comanda) return;
    const kitchenItems = (Array.isArray(items) ? items : []).filter((item) => item && itemNeedsKitchen(item));
    if (!kitchenItems.length) return;
    const payload = {
      sessionId: clientSessionId,
      broadcastAt: isoNow(),
      updatedAt: normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      reason,
      actorId: actor?.id ?? null,
      actorRole: String(actor?.role || ""),
      actorName: String(actor?.name || ""),
      comanda: cloneRealtimePayload(comanda),
      itemIds: kitchenItems.map((item) => String(item.id || "")).filter(Boolean)
    };
    supabaseCtx.channel.send({ type: "broadcast", event: "kitchen_order_upsert", payload }).catch(() => { });
  }

  function publishComandaUpsert(comanda, items, actor, reason = "Comanda atualizada") {
    if (!supabaseCtx.channel || !comanda) return;
    const payload = {
      sessionId: clientSessionId,
      broadcastAt: isoNow(),
      updatedAt: normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      reason,
      actorId: actor?.id ?? null,
      actorRole: String(actor?.role || ""),
      actorName: String(actor?.name || ""),
      comanda: cloneRealtimePayload(comanda),
      itemIds: (Array.isArray(items) ? items : []).map((item) => String(item.id || "")).filter(Boolean)
    };
    supabaseCtx.channel.send({ type: "broadcast", event: "comanda_upsert", payload }).catch(() => { });
  }`);

const replaceBroadcastSection = toFileEol(`  function broadcastRealtimePayload(event, payload) {
    if (localBroadcastChannel) {
      try {
        localBroadcastChannel.postMessage({ event, payload });
      } catch (_e) { }
    }
    if (supabaseCtx.channel) {
      supabaseCtx.channel.send({ type: "broadcast", event, payload }).catch(() => { });
    }
  }

  function publishSupabaseStateChange(remoteUpdatedAtValue) {
    const pending = supabaseCtx.pendingStateChangeBroadcast;
    supabaseCtx.pendingStateChangeBroadcast = null;
    const payload = {
      updatedAt: normalizeIsoTimestamp(remoteUpdatedAtValue) || isoNow(),
      localUpdatedAt: pending?.localUpdatedAt || normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      actorId: pending?.actorId ?? null,
      actorRole: pending?.actorRole || "",
      actorName: pending?.actorName || "",
      reason: pending?.reason || "",
      sessionId: clientSessionId,
      broadcastAt: isoNow()
    };
    broadcastRealtimePayload("state_changed", payload);
  }

  function cloneRealtimePayload(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return value;
    }
  }

  function publishKitchenOrderUpsert(comanda, items, actor, reason = "Novo pedido") {
    if (!comanda) return;
    const kitchenItems = (Array.isArray(items) ? items : []).filter((item) => item && itemNeedsKitchen(item));
    const payload = {
      sessionId: clientSessionId,
      broadcastAt: isoNow(),
      updatedAt: normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      reason,
      actorId: actor?.id ?? null,
      actorRole: String(actor?.role || ""),
      actorName: String(actor?.name || ""),
      comanda: cloneRealtimePayload(comanda),
      itemIds: kitchenItems.map((item) => String(item.id || "")).filter(Boolean)
    };
    broadcastRealtimePayload("kitchen_order_upsert", payload);
  }

  function publishComandaUpsert(comanda, items, actor, reason = "Comanda atualizada") {
    if (!comanda) return;
    const payload = {
      sessionId: clientSessionId,
      broadcastAt: isoNow(),
      updatedAt: normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      reason,
      actorId: actor?.id ?? null,
      actorRole: String(actor?.role || ""),
      actorName: String(actor?.name || ""),
      comanda: cloneRealtimePayload(comanda),
      itemIds: (Array.isArray(items) ? items : []).map((item) => String(item.id || "")).filter(Boolean)
    };
    broadcastRealtimePayload("comanda_upsert", payload);
  }

  function publishComandaClosed(comanda, actor, reason = "Comanda finalizada") {
    if (!comanda) return;
    const payload = {
      sessionId: clientSessionId,
      broadcastAt: isoNow(),
      updatedAt: normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      reason,
      actorId: actor?.id ?? null,
      actorRole: String(actor?.role || ""),
      actorName: String(actor?.name || ""),
      comanda: cloneRealtimePayload(comanda),
      comandaId: String(comanda?.id || "")
    };
    broadcastRealtimePayload("comanda_closed", payload);
  }

  function publishComandaDeleted(comandaId, actor, reason = "Comanda excluida") {
    if (!comandaId) return;
    const payload = {
      sessionId: clientSessionId,
      broadcastAt: isoNow(),
      updatedAt: normalizeIsoTimestamp(state.meta?.updatedAt) || isoNow(),
      reason,
      actorId: actor?.id ?? null,
      actorRole: String(actor?.role || ""),
      actorName: String(actor?.name || ""),
      comandaId: String(comandaId || "")
    };
    broadcastRealtimePayload("comanda_deleted", payload);
  }

  function applyComandaClosed(payload) {
    if (!payload || payload.sessionId === clientSessionId) return false;
    const incoming = payload.comanda;
    const comandaId = String(incoming?.id || payload.comandaId || "").trim();
    if (!comandaId) return false;

    state.openComandas = (Array.isArray(state.openComandas) ? state.openComandas : []).filter(c => String(c?.id || "").trim() !== comandaId);
    const closedRows = Array.isArray(state.closedComandas) ? state.closedComandas : [];
    const existingIndex = closedRows.findIndex(c => String(c?.id || "").trim() === comandaId);
    if (existingIndex >= 0) {
      closedRows[existingIndex] = { ...closedRows[existingIndex], ...(incoming || {}) };
    } else if (incoming) {
      state.closedComandas = [incoming, ...closedRows];
    }
    if (uiState.waiterActiveComandaId === comandaId) {
      uiState.waiterActiveComandaId = null;
    }
    delete uiState.finalizeOpenByComanda[comandaId];
    saveState({ skipCloud: true, touchMeta: false });
    return true;
  }

  function applyComandaDeleted(payload) {
    if (!payload || payload.sessionId === clientSessionId) return false;
    const comandaId = String(payload.comandaId || "").trim();
    if (!comandaId) return false;

    trackDeletedEntity("deletedComandaIds", comandaId);
    state.openComandas = (Array.isArray(state.openComandas) ? state.openComandas : []).filter(c => String(c?.id || "").trim() !== comandaId);
    state.closedComandas = (Array.isArray(state.closedComandas) ? state.closedComandas : []).filter(c => String(c?.id || "").trim() !== comandaId);
    if (uiState.waiterActiveComandaId === comandaId) {
      uiState.waiterActiveComandaId = null;
    }
    if (uiState.comandaDetailsId === comandaId) {
      uiState.comandaDetailsId = null;
    }
    delete uiState.finalizeOpenByComanda[comandaId];
    saveState({ skipCloud: true, touchMeta: false });
    return true;
  }

  function handleIncomingRealtimeMessage(event, payload) {
    if (!payload || payload.sessionId === clientSessionId) return;
    switch (event) {
      case "state_changed":
        rememberObservedRemoteUpdatedAt(payload.updatedAt);
        void pullStateFromSupabase();
        break;
      case "kitchen_order_upsert":
        if (applyKitchenOrderUpsert(payload)) {
          render();
        }
        rememberObservedRemoteUpdatedAt(payload.updatedAt);
        debouncedRemotePullFromSupabase();
        break;
      case "comanda_upsert":
        if (applyComandaUpsert(payload)) {
          render();
        }
        rememberObservedRemoteUpdatedAt(payload.updatedAt);
        debouncedRemotePullFromSupabase();
        break;
      case "comanda_closed":
        if (applyComandaClosed(payload)) {
          render();
        }
        rememberObservedRemoteUpdatedAt(payload.updatedAt);
        debouncedRemotePullFromSupabase();
        break;
      case "comanda_deleted":
        if (applyComandaDeleted(payload)) {
          render();
        }
        rememberObservedRemoteUpdatedAt(payload.updatedAt);
        debouncedRemotePullFromSupabase();
        break;
      case "presence_ping":
        upsertDevicePresence(payload);
        const user = getCurrentUser();
        if (user?.role === "dev" && uiState.devTab === "devices") {
          render();
        }
        break;
      case "audit_event":
        pushRemoteMonitorEvent(payload);
        const u = getCurrentUser();
        if (
          (u?.role === "admin" && (uiState.adminTab === "monitor" || uiState.adminTab === "cozinha" || uiState.adminTab === "dashboard")) ||
          (u?.role === "dev" && (uiState.devTab === "monitor" || uiState.devTab === "cozinha" || uiState.devTab === "dashboard"))
        ) {
          render();
        }
        break;
    }
  }

  if (localBroadcastChannel) {
    localBroadcastChannel.onmessage = (e) => {
      const msg = e.data;
      if (!msg || !msg.event || !msg.payload) return;
      handleIncomingRealtimeMessage(msg.event, msg.payload);
    };
  }`);

if (content.includes(targetBroadcastSection)) {
  content = content.replace(targetBroadcastSection, replaceBroadcastSection);
  console.log("2. Funcoes de broadcast e receiver unificado adicionados!");
} else {
  console.warn("2. targetBroadcastSection nao encontrado.");
}

// 3. Update Supabase Channel Subscription to use handleIncomingRealtimeMessage
const targetChannelSub = toFileEol(`    channel
      .on("broadcast", { event: "audit_event" }, (message) => {
        if (message?.payload) {
          pushRemoteMonitorEvent(message.payload);
          const user = getCurrentUser();
          if (
            (user?.role === "admin" && (uiState.adminTab === "monitor" || uiState.adminTab === "cozinha" || uiState.adminTab === "dashboard")) ||
            (user?.role === "dev" && (uiState.devTab === "monitor" || uiState.devTab === "cozinha" || uiState.devTab === "dashboard"))
          ) {
            render();
          }
        }
      })
      .on("broadcast", { event: "presence_ping" }, (message) => {
        if (!message?.payload) return;
        upsertDevicePresence(message.payload);
        const user = getCurrentUser();
        if (user?.role === "dev" && uiState.devTab === "devices") {
          render();
        }
      })
      .on("broadcast", { event: "state_changed" }, (message) => {
        rememberObservedRemoteUpdatedAt(message?.payload?.updatedAt);
        void pullStateFromSupabase(); // Call immediately, no debounce
      })
      .on("broadcast", { event: "kitchen_order_upsert" }, (message) => {
        if (applyKitchenOrderUpsert(message?.payload)) {
          render();
        }
        rememberObservedRemoteUpdatedAt(message?.payload?.updatedAt);
        debouncedRemotePullFromSupabase();
      })
      .on("broadcast", { event: "comanda_upsert" }, (message) => {
        if (applyComandaUpsert(message?.payload)) {
          render();
        }
        rememberObservedRemoteUpdatedAt(message?.payload?.updatedAt);
        debouncedRemotePullFromSupabase();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restobar_state",
          filter: "id=eq.main"
        },
        (payload) => {
          if (payload?.new?.updated_at) {
            rememberObservedRemoteUpdatedAt(payload.new.updated_at);
            debouncedRemotePullFromSupabase();
          }
        }
      );`);

const replaceChannelSub = toFileEol(`    channel
      .on("broadcast", { event: "audit_event" }, (m) => handleIncomingRealtimeMessage("audit_event", m?.payload))
      .on("broadcast", { event: "presence_ping" }, (m) => handleIncomingRealtimeMessage("presence_ping", m?.payload))
      .on("broadcast", { event: "state_changed" }, (m) => handleIncomingRealtimeMessage("state_changed", m?.payload))
      .on("broadcast", { event: "kitchen_order_upsert" }, (m) => handleIncomingRealtimeMessage("kitchen_order_upsert", m?.payload))
      .on("broadcast", { event: "comanda_upsert" }, (m) => handleIncomingRealtimeMessage("comanda_upsert", m?.payload))
      .on("broadcast", { event: "comanda_closed" }, (m) => handleIncomingRealtimeMessage("comanda_closed", m?.payload))
      .on("broadcast", { event: "comanda_deleted" }, (m) => handleIncomingRealtimeMessage("comanda_deleted", m?.payload))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restobar_state",
          filter: "id=eq.main"
        },
        (payload) => {
          if (payload?.new?.updated_at) {
            rememberObservedRemoteUpdatedAt(payload.new.updated_at);
            debouncedRemotePullFromSupabase();
          }
        }
      );`);

if (content.includes(targetChannelSub)) {
  content = content.replace(targetChannelSub, replaceChannelSub);
  console.log("3. Escuta do Supabase Channel unificada!");
} else {
  console.warn("3. targetChannelSub nao encontrado.");
}

// 4. Eliminate clock-skew in pollSupabaseRemoteMetadata
const targetPoll = toFileEol(`      const observedUpdatedAt = rememberObservedRemoteUpdatedAt(data.updated_at);
      if (!observedUpdatedAt) return;
      const observedTs = parseUpdatedAtTimestamp(observedUpdatedAt);
      const knownTs = parseUpdatedAtTimestamp(supabaseCtx.lastKnownRemoteUpdatedAt);
      const localTs = parseUpdatedAtTimestamp(state.meta?.updatedAt);
      if (observedTs > Math.max(knownTs, localTs)) {
        debouncedRemotePullFromSupabase();
      }`);

const replacePoll = toFileEol(`      const observedUpdatedAt = rememberObservedRemoteUpdatedAt(data.updated_at);
      if (!observedUpdatedAt) return;
      const knownTs = String(supabaseCtx.lastKnownRemoteUpdatedAt || "").trim();
      const currentObserved = String(observedUpdatedAt || "").trim();
      if (currentObserved !== knownTs) {
        debouncedRemotePullFromSupabase();
      }`);

if (content.includes(targetPoll)) {
  content = content.replace(targetPoll, replacePoll);
  console.log("4. Imunidade a clock-skew adicionada no pollSupabaseRemoteMetadata!");
} else {
  console.warn("4. targetPoll nao encontrado.");
}

// 5. Eliminate clock-skew in pullStateFromSupabase
const targetShouldPull = toFileEol(`      const localLooksReset = isLikelyResetState(state);
      const remoteHasMoreData =
        remoteFootprint.catalogRows > localFootprint.catalogRows ||
        remoteFootprint.operationalRows > localFootprint.operationalRows;
      const shouldPull = (Number.isFinite(remoteUpdated) && remoteUpdated > localUpdated) || (localLooksReset && remoteHasMoreData);`);

const replaceShouldPull = toFileEol(`      const localLooksReset = isLikelyResetState(state);
      const remoteHasMoreData =
        remoteFootprint.catalogRows > localFootprint.catalogRows ||
        remoteFootprint.operationalRows > localFootprint.operationalRows;
      const areEquivalent = areCloudStatesEquivalent(state, data.payload);
      const isKnownSameVersion = Boolean(data.updated_at && data.updated_at === supabaseCtx.lastKnownRemoteUpdatedAt);
      const shouldPull = !areEquivalent || !isKnownSameVersion || (Number.isFinite(remoteUpdated) && remoteUpdated > localUpdated) || (localLooksReset && remoteHasMoreData);`);

if (content.includes(targetShouldPull)) {
  content = content.replace(targetShouldPull, replaceShouldPull);
  console.log("5. Imunidade a clock-skew adicionada no pullStateFromSupabase!");
} else {
  console.warn("5. targetShouldPull nao encontrado.");
}

// 6. Hook broadcast into setKitchenItemStatus, setKitchenItemPriority, cancelItem, addComandaNote, deleteComandaPermanently, finalizeComanda
// 6a. setKitchenItemStatus
const targetKitchenStatus = toFileEol(`    saveState();
    render();
  }

  function deliverItem(comandaId, itemId) {`);

const replaceKitchenStatus = toFileEol(`    saveState();
    publishKitchenOrderUpsert(comanda, [item], actor, \`Status cozinha: \${kitchenStatusLabel(status)}\`);
    publishComandaUpsert(comanda, [item], actor, \`Status cozinha: \${kitchenStatusLabel(status)}\`);
    render();
  }

  function deliverItem(comandaId, itemId) {`);

if (content.includes(targetKitchenStatus)) {
  content = content.replace(targetKitchenStatus, replaceKitchenStatus);
  console.log("6a. Broadcast adicionado em setKitchenItemStatus!");
} else {
  console.warn("6a. targetKitchenStatus nao encontrado.");
}

// 6b. setKitchenItemPriority
const targetPriority = toFileEol(`    appendComandaEvent(comanda, {
      actor,
      type: "cozinha_prioridade",
      detail: \`Prioridade do pedido \${item.name} alterada para \${adminMonitorPriorityLabel(mappedPriority)}.\`,
      itemId: item.id
    });

    saveState();
    render();
  }`);

const replacePriority = toFileEol(`    appendComandaEvent(comanda, {
      actor,
      type: "cozinha_prioridade",
      detail: \`Prioridade do pedido \${item.name} alterada para \${adminMonitorPriorityLabel(mappedPriority)}.\`,
      itemId: item.id
    });

    saveState();
    publishKitchenOrderUpsert(comanda, [item], actor, "Prioridade alterada");
    publishComandaUpsert(comanda, [item], actor, "Prioridade alterada");
    render();
  }`);

if (content.includes(targetPriority)) {
  content = content.replace(targetPriority, replacePriority);
  console.log("6b. Broadcast adicionado em setKitchenItemPriority!");
} else {
  console.warn("6b. targetPriority nao encontrado.");
}

// 6c. cancelItem
const targetCancel = toFileEol(`    saveState();
    render();
  }

  function addComandaNote(comandaId) {`);

const replaceCancel = toFileEol(`    saveState();
    publishComandaUpsert(comanda, [item], actor, "Item cancelado");
    publishKitchenOrderUpsert(comanda, [item], actor, "Item cancelado");
    render();
  }

  function addComandaNote(comandaId) {`);

if (content.includes(targetCancel)) {
  content = content.replace(targetCancel, replaceCancel);
  console.log("6c. Broadcast adicionado em cancelItem!");
} else {
  console.warn("6c. targetCancel nao encontrado.");
}

// 6d. addComandaNote
const targetNote = toFileEol(`    appendComandaEvent(comanda, {
      actor,
      type: "comanda_obs",
      detail: \`Observacao adicionada: \${note.trim()}\`
    });

    saveState();
    render();
  }`);

const replaceNote = toFileEol(`    appendComandaEvent(comanda, {
      actor,
      type: "comanda_obs",
      detail: \`Observacao adicionada: \${note.trim()}\`
    });

    saveState();
    publishComandaUpsert(comanda, [], actor, "Observacao adicionada");
    render();
  }`);

if (content.includes(targetNote)) {
  content = content.replace(targetNote, replaceNote);
  console.log("6d. Broadcast adicionado em addComandaNote!");
} else {
  console.warn("6d. targetNote nao encontrado.");
}

// 6e. deleteComandaPermanently
const targetDelete = toFileEol(`    appendAudit({
      actor,
      type: "comanda_excluida",
      comandaId: comanda.id,
      detail:
        \`Comanda \${comanda.id} excluida permanentemente. \` +
        \`Estoque reposto: \${impact.restoredQty} unidade(s) em \${impact.restoredProducts} item(ns).\` +
        \`\${impact.notFoundProducts ? \` \${impact.notFoundProducts} item(ns) sem produto vinculado para reposicao.\` : ""}\`
    });

    saveState();
    render();
  }`);

const replaceDelete = toFileEol(`    appendAudit({
      actor,
      type: "comanda_excluida",
      comandaId: comanda.id,
      detail:
        \`Comanda \${comanda.id} excluida permanentemente. \` +
        \`Estoque reposto: \${impact.restoredQty} unidade(s) em \${impact.restoredProducts} item(ns).\` +
        \`\${impact.notFoundProducts ? \` \${impact.notFoundProducts} item(ns) sem produto vinculado para reposicao.\` : ""}\`
    });

    saveState();
    publishComandaDeleted(deletedId, actor, "Comanda excluida");
    render();
  }`);

if (content.includes(targetDelete)) {
  content = content.replace(targetDelete, replaceDelete);
  console.log("6e. Broadcast adicionado em deleteComandaPermanently!");
} else {
  console.warn("6e. targetDelete nao encontrado.");
}

// 6f. finalizeComanda
const targetFinalize = toFileEol(`    delete uiState.finalizeOpenByComanda[comanda.id];

    saveState();
    render();
    const shouldPrint = confirm("Deseja imprimir a nota do cliente agora?");`);

const replaceFinalize = toFileEol(`    delete uiState.finalizeOpenByComanda[comanda.id];

    saveState();
    publishComandaClosed(comanda, actor, "Comanda finalizada");
    render();
    const shouldPrint = confirm("Deseja imprimir a nota do cliente agora?");`);

if (content.includes(targetFinalize)) {
  content = content.replace(targetFinalize, replaceFinalize);
  console.log("6f. Broadcast adicionado em finalizeComanda!");
} else {
  console.warn("6f. targetFinalize nao encontrado.");
}

// 7. Add visibilitychange and online/offline event listeners
const targetEnd = toFileEol(`  setInterval(async () => {
    if (supabaseCtx.client) {
      await pollSupabaseRemoteMetadata();
    }
  }, CLOUD_POLL_INTERVAL_MS);`);

const replaceEnd = toFileEol(`  setInterval(async () => {
    if (supabaseCtx.client) {
      await pollSupabaseRemoteMetadata();
    }
  }, CLOUD_POLL_INTERVAL_MS);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        broadcastPresencePing();
        if (supabaseCtx.client) {
          void pollSupabaseRemoteMetadata();
          void pullStateFromSupabase();
          if (!supabaseCtx.connected) {
            void connectSupabase();
          }
        }
      }
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      setSupabaseStatus("conectando", "Rede restabelecida...");
      clearSupabaseReconnectTimer();
      void connectSupabase();
      void pullStateFromSupabase();
    });

    window.addEventListener("offline", () => {
      setSupabaseStatus("aviso", "Sem conexao com a internet.");
    });
  }`);

if (content.includes(targetEnd)) {
  content = content.replace(targetEnd, replaceEnd);
  console.log("7. Listeners de visibilitychange e online adicionados!");
} else {
  console.warn("7. targetEnd nao encontrado.");
}

// 8. Refine active element and cursor preservation in render()
const targetActiveEl = toFileEol(`    const activeEl = document.activeElement;
    const activeSelector = activeEl?.id
      ? \`#\${activeEl.id}\`
      : activeEl?.dataset?.role
        ? \`[data-role="\${activeEl.dataset.role}"]\`
        : null;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    const selectionStart = isInput ? activeEl.selectionStart : null;
    const selectionEnd = isInput ? activeEl.selectionEnd : null;
    const scrollY = window.scrollY;`);

const replaceActiveEl = toFileEol(`    const activeEl = document.activeElement;
    const activeSelector = activeEl?.id
      ? \`#\${activeEl.id}\`
      : activeEl?.dataset?.role
        ? \`[data-role="\${activeEl.dataset.role}"]\`
        : activeEl?.name
          ? \`\${activeEl.tagName.toLowerCase()}[name="\${activeEl.name}"]\`
          : null;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    const activeVal = isInput ? activeEl.value : null;
    const selectionStart = isInput ? activeEl.selectionStart : null;
    const selectionEnd = isInput ? activeEl.selectionEnd : null;
    const scrollY = window.scrollY;`);

if (content.includes(targetActiveEl)) {
  content = content.replace(targetActiveEl, replaceActiveEl);
  console.log("8. Preservacao de inputs refinada em render()!");
} else {
  console.warn("8. targetActiveEl nao encontrado.");
}

fs.writeFileSync(appJsPath, content, "utf8");
console.log("Todas as atualizacoes no app.js foram concluidas com sucesso!");
