
"use strict";

(() => {
  const STORAGE_KEY = "restobar_control_v1";
  const SESSION_KEY = "restobar_local_session_user";
  const SESSION_TAB_KEY = "restobar_local_session_user_tab";
  const CLIENT_SESSION_KEY = "restobar_local_client_session_id";
  const PRINTER_PREFS_KEY = "restobar_local_printer_prefs_v1";
  const HISTORY_RETENTION_DAYS = 90;
  const CASH_HTML_REPORT_RETENTION_DAYS = 30;
  const PAYABLES_RETENTION_DAYS = 350;
  const CASH_HTML_REPORTS_LIMIT = 120;
  const INTERNAL_CASH_AUDIT_LIMIT = 120;
  const FINANCE_CYCLE_DAYS = 30;
  const FINANCE_CYCLE_REPORTS_LIMIT = 120;
  const FINAL_CLIENT_PREP_FLAG = "final_client_ready_v1";
  const FINAL_CLIENT_PREP_MARKER = "final_client_prepared_at";
  const FINAL_CLIENT_PREP_SIGNATURE_KEY = "final_client_prep_signature";
  const FINAL_CLIENT_PREP_SIGNATURE = "2026-02-25-final-client";
  const CATALOG_BACKUPS_META_KEY = "catalogBackups";
  const CATALOG_BACKUPS_LIMIT = 30;
  const EDUARDO_RECOVERY_MARKER_KEY = "eduardo_restore_applied_v1";
  const ACCESS_CODE_WAITER_PREFIX = "Garcom Codigo";
  const SYSTEM_TEST_MARKERS = Object.freeze(["teste", "test", "mock", "pixteste", "cupom de teste"]);
  const ESTABLISHMENT_NAME = "Brancao";
  const CATEGORIES = ["Bar", "Dose/Copo", "Cozinha", "Espetinhos", "Avulso", "Ofertas"];
  const BAR_SUBCATEGORIES = ["Geral"];
  const BEVERAGE_SUBCATEGORIES = ["Geral"];
  const SNACK_SUBCATEGORIES = ["Lanches", "Adicionais"];
  const KITCHEN_CATEGORIES = new Set(["Cozinha"]);
  const KITCHEN_STATUSES = [
    { value: "fila", label: "Fila de espera" },
    { value: "cozinhando", label: "Cozinhando" },
    { value: "em_falta", label: "Em falta" },
    { value: "entregue", label: "Entregue" }
  ];
  const KITCHEN_PRIORITIES = [
    { value: "normal", label: "Normal" },
    { value: "comum", label: "Comum" },
    { value: "alta", label: "Prioridade alta" },
    { value: "maxima", label: "Prioridade maxima" }
  ];
  const PAYMENT_METHODS = [
    { value: "dinheiro", label: "Dinheiro" },
    { value: "maquineta_debito", label: "Maquineta/Debito" },
    { value: "maquineta_credito", label: "Maquineta/Credito" },
    { value: "pix", label: "Pix" },
    { value: "fiado", label: "Fiado" }
  ];
  const CANCEL_REASONS = [
    "Troca de pedido",
    "Desistencia de pedido",
    "Alteracao de pedido",
    "Reclamacao de pedido",
    "Cortesia",
    "Sem ocorrencia"
  ];
  // Configure these four values with the credentials of Cliente 2 before publishing.
  const SUPABASE_URL = "https://wgresekhrdwlxlmftuvs.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVzZWtocmR3bHhsbWZ0dXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMjY1NzEsImV4cCI6MjEwNTYwMjU3MX0.NHqDFKe0nH6UjzcTtGZFBNEe_U55EUTkTcs_LQH_yGM";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JyK0dnU4FajLisbaxZ7Y_w_ovbBnWv2";
  const SUPABASE_PROJECT_ID = "wgresekhrdwlxlmftuvs";
  const DEV_ACCESS_LOGIN = "dev";
  const DEV_ACCESS_PASSWORD = "dev";
  const DEV_SESSION_ID = "__dev__";
  const DEVICE_PRESENCE_TTL_MS = 45 * 1000;
  const DEVICE_PRESENCE_PING_MS = 10 * 1000;
  const CLOUD_SYNC_DEBOUNCE_MS = 250;
  const CLOUD_PULL_DEBOUNCE_MS = 400;
  const CLOUD_REMOTE_PULL_DEBOUNCE_MS = 120;
  const CLOUD_POLL_INTERVAL_MS = 2 * 1000;
  const ROLE_ACCESS_CODE_BY_ROLE = Object.freeze({
    admin: "1111",
    waiter: "2222"
  });
  const DEFAULT_RECEIPT_PAPER_WIDTH_MM = 58;
  const AUTO_OPEN_KITCHEN_PREVIEW_ON_ADD = false;

  const app = document.getElementById("app");
  const uiState = {
    adminTab: "dashboard",
    devTab: "monitor",
    waiterTab: "abrir",
    cookTab: "ativos",
    cashHtmlViewerReportId: "",
    finalizeOpenByComanda: {},
    waiterCollapsedByComanda: {},
    adminKitchenCollapsedByRow: {},
    waiterActiveComandaId: null,
    deferredPrompt: null,
    monitorWaiterId: "all",
    comandaDetailsId: null,
    comandaDetailsSource: "closed",
    waiterComandaSearch: "",
    waiterCatalogSearch: "",
    waiterCatalogCategory: "all",
    adminComandaSearch: "",
    adminHistoryComandaSearch: "",
    adminKitchenSearch: "",
    adminInlineEditComandaId: null,
    cookSearch: "",
    supabaseStatus: "desconectado",
    supabaseLastError: "",
    devicePresenceBySession: {},
    remoteMonitorEvents: [],
    waiterReadyModalItems: [],
    waiterReadySeenMap: {},
    waiterKitchenReceiptNotices: [],
    waiterKitchenReceiptSeenMap: {},
    waiterDraftByComanda: {},
    persistedDetailsOpen: {},
    itemSelector: {
      open: false,
      comandaId: "",
      mode: "increment"
    },
    deleteComandaAuth: {
      open: false,
      comandaId: "",
      loginDraft: "",
      passwordDraft: ""
    },
    quickSalePaidConfirm: true,
    printerPrefs: loadPrinterPrefs(),
    qzSecurityConfigured: false,
    initialCloudLoadComplete: false
  };

  const DEV_SHADOW_USER = Object.freeze({
    id: DEV_SESSION_ID,
    role: "dev",
    name: "Dev",
    functionName: "Dev",
    login: DEV_ACCESS_LOGIN,
    active: true
  });

  function debugReport(hypothesisId, location, msg, data = {}, runId = "pre-fix") {
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "cross-device-sync",
        runId,
        hypothesisId,
        location,
        msg: `[DEBUG] ${msg}`,
        data,
        ts: Date.now()
      })
    }).catch(() => { });
  }

  function isAdminOrDev(userOrRole) {
    const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
    return role === "admin" || role === "dev";
  }

  function buildClientSessionId() {
    const existing = String(sessionStorage.getItem(CLIENT_SESSION_KEY) || "").trim();
    if (existing) return existing;
    const created = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(CLIENT_SESSION_KEY, created);
    return created;
  }

  const clientSessionId = buildClientSessionId();
  const LOCAL_BROADCAST_CHANNEL_NAME = "restobar_local_sync";
  let localBroadcastChannel = null;
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      localBroadcastChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME);
    }
  } catch (_e) { }

  function isoNow() {
    return new Date().toISOString();
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function parseUpdatedAtTimestamp(value) {
    const ts = new Date(value || 0).getTime();
    if (!Number.isFinite(ts)) return 0;
    const oneYearAhead = Date.now() + 365 * 24 * 60 * 60 * 1000;
    if (ts > oneYearAhead) return 0;
    return ts;
  }

  function normalizeIsoTimestamp(value) {
    const ts = parseUpdatedAtTimestamp(value);
    if (!ts) return "";
    return new Date(ts).toISOString();
  }

  function comandaLatestEventTimestamp(comanda) {
    const events = Array.isArray(comanda?.events) ? comanda.events : [];
    if (!events.length) return 0;
    let latest = 0;
    for (const event of events) {
      const ts = parseUpdatedAtTimestamp(event?.ts);
      if (ts > latest) latest = ts;
    }
    return latest;
  }

  function comandaReferenceTimestamp(comanda) {
    const closedTs = parseUpdatedAtTimestamp(comanda?.closedAt);
    if (closedTs) return closedTs;
    const latestEventTs = comandaLatestEventTimestamp(comanda);
    if (latestEventTs) return latestEventTs;
    return parseUpdatedAtTimestamp(comanda?.createdAt);
  }

  function comandaBelongsToCashWindow(comanda, openedAt, closedAt) {
    const openedTs = parseUpdatedAtTimestamp(openedAt);
    const closedTs = parseUpdatedAtTimestamp(closedAt);
    if (!openedTs || !closedTs || closedTs < openedTs) return true;
    const comandaTs = comandaReferenceTimestamp(comanda);
    if (!comandaTs) return true;
    return comandaTs >= openedTs && comandaTs <= closedTs;
  }

  function earliestComandaCreatedAtIso(commandas) {
    let earliestTs = 0;
    for (const comanda of Array.isArray(commandas) ? commandas : []) {
      const ts = parseUpdatedAtTimestamp(comanda?.createdAt);
      if (!ts) continue;
      if (!earliestTs || ts < earliestTs) earliestTs = ts;
    }
    return earliestTs ? new Date(earliestTs).toISOString() : "";
  }

  function synchronizeCashOpenedAt(targetState) {
    if (!targetState || typeof targetState !== "object") return "";
    targetState.cash = targetState.cash || {};
    const openComandas = Array.isArray(targetState.openComandas) ? targetState.openComandas : [];
    const closedComandas = Array.isArray(targetState.closedComandas) ? targetState.closedComandas : [];
    const effectiveOpenedAt = earliestComandaCreatedAtIso([...openComandas, ...closedComandas]);
    targetState.cash.openedAt = effectiveOpenedAt || "";
    targetState.cash.updatedAt = isoNow();
    return targetState.cash.openedAt;
  }

  function ensureCashOpenedAtFromComanda(startedAt) {
    const startedTs = parseUpdatedAtTimestamp(startedAt);
    if (!startedTs) return;
    const currentTs = parseUpdatedAtTimestamp(state?.cash?.openedAt);
    if (!currentTs || startedTs < currentTs) {
      state.cash.openedAt = new Date(startedTs).toISOString();
      state.cash.updatedAt = isoNow();
    }
  }

  function formatCashOpenedAtLabel(value) {
    const ts = parseUpdatedAtTimestamp(value);
    if (!ts) return "Aguardando primeira comanda";
    return formatDateTimeWithDay(new Date(ts).toISOString());
  }

  function sanitizeHistoryClosuresByCashWindow(closures) {
    return (Array.isArray(closures) ? closures : []).map((closure) => {
      const sourceComandas = Array.isArray(closure?.commandas) ? closure.commandas : [];
      const filteredComandas = dedupeComandasById(
        sourceComandas.filter((comanda) => comandaBelongsToCashWindow(comanda, closure?.openedAt, closure?.closedAt))
      );
      return {
        ...closure,
        commandas: filteredComandas,
        summary: buildCashSummary(filteredComandas)
      };
    });
  }

  function sanitizeOperationalComandasAgainstHistory(targetState) {
    console.log("[sanitizeOperationalComandasAgainstHistory] Starting, targetState.openComandas count:", targetState.openComandas?.length);
    if (!targetState || typeof targetState !== "object") return;
    targetState.history90 = sanitizeHistoryClosuresByCashWindow(targetState.history90);
    const archivedIds = new Set(
      (targetState.history90 || [])
        .flatMap((closure) => (Array.isArray(closure?.commandas) ? closure.commandas : []))
        .map((comanda) => String(comanda?.id || "").trim())
        .filter(Boolean)
    );
    console.log("[sanitizeOperationalComandasAgainstHistory] archivedIds:", Array.from(archivedIds));
    const closedComandas = dedupeComandasById(targetState.closedComandas).filter(
      (comanda) => !archivedIds.has(String(comanda?.id || "").trim())
    );
    console.log("[sanitizeOperationalComandasAgainstHistory] closedComandas after filter:", closedComandas);
    const closedIds = new Set(closedComandas.map((comanda) => String(comanda?.id || "").trim()).filter(Boolean));
    console.log("[sanitizeOperationalComandasAgainstHistory] closedIds:", Array.from(closedIds));
    const openComandas = dedupeComandasById(targetState.openComandas).filter((comanda) => {
      const id = String(comanda?.id || "").trim();
      if (!id) {
        console.log("[sanitizeOperationalComandasAgainstHistory] Filtering out comanda with no id:", comanda);
        return false;
      }
      if (archivedIds.has(id)) {
        console.log("[sanitizeOperationalComandasAgainstHistory] Filtering out comanda (in archivedIds):", id);
        return false;
      }
      if (closedIds.has(id)) {
        console.log("[sanitizeOperationalComandasAgainstHistory] Filtering out comanda (in closedIds):", id);
        return false;
      }
      return true;
    });
    console.log("[sanitizeOperationalComandasAgainstHistory] Final openComandas:", openComandas);
    targetState.closedComandas = closedComandas;
    targetState.openComandas = openComandas;
    synchronizeCashOpenedAt(targetState);
  }

  function comandaNumericPart(comandaId) {
    const match = /^CMD-(\d+)/i.exec(String(comandaId || "").trim());
    if (!match) return 0;
    const value = Number(match[1]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function displayComandaId(comandaId) {
    const raw = String(comandaId || "").trim();
    if (!raw) return "-";
    const match = /^(CMD-\d+)/i.exec(raw);
    if (!match) return raw;
    return match[1].toUpperCase();
  }

  function maskComandaCodesInText(value) {
    return String(value ?? "").replace(/\b(CMD-\d+)-[A-Z0-9]+\b/gi, (_full, base) => String(base || "").toUpperCase());
  }

  function collectComandaIdsFromState(targetState) {
    const ids = new Set();
    if (!targetState || typeof targetState !== "object") return ids;
    for (const comanda of Array.isArray(targetState.openComandas) ? targetState.openComandas : []) {
      const id = String(comanda?.id || "").trim();
      if (id) ids.add(id);
    }
    for (const comanda of Array.isArray(targetState.closedComandas) ? targetState.closedComandas : []) {
      const id = String(comanda?.id || "").trim();
      if (id) ids.add(id);
    }
    for (const closure of Array.isArray(targetState.history90) ? targetState.history90 : []) {
      for (const comanda of Array.isArray(closure?.commandas) ? closure.commandas : []) {
        const id = String(comanda?.id || "").trim();
        if (id) ids.add(id);
      }
    }
    for (const deletedId of normalizeDeletedIdList(targetState?.meta?.deletedComandaIds)) {
      const id = String(deletedId || "").trim();
      if (id) ids.add(id);
    }
    return ids;
  }

  function recomputeComandaSequence(targetState) {
    if (!targetState || typeof targetState !== "object") return;
    targetState.seq = targetState.seq || {};
    const current = Number(targetState.seq.comanda || 1);
    let next = Number.isFinite(current) && current > 0 ? Math.floor(current) : 1;
    const ids = collectComandaIdsFromState(targetState);
    for (const id of ids) {
      const numeric = comandaNumericPart(id);
      if (numeric >= next) {
        next = numeric + 1;
      }
    }
    targetState.seq.comanda = Math.max(1, next);
  }

  function generateUniqueComandaId(targetState) {
    if (!targetState || typeof targetState !== "object") return "";
    recomputeComandaSequence(targetState);
    const reservedIds = collectComandaIdsFromState(targetState);
    const sessionChunkRaw = String(clientSessionId || "").replace(/[^a-z0-9]/gi, "");
    const sessionChunk = (sessionChunkRaw.slice(-4) || "SESS").toUpperCase();
    for (let attempt = 0; attempt < 200000; attempt += 1) {
      const seqNumber = Number(targetState.seq?.comanda || 1);
      targetState.seq.comanda = seqNumber + 1;
      const timeChunk = Date.now().toString(36).slice(-4).toUpperCase();
      const randomChunk = Math.random().toString(36).slice(2, 4).toUpperCase();
      const candidate = `CMD-${String(seqNumber).padStart(4, "0")}-${sessionChunk}${timeChunk}${randomChunk}`;
      if (reservedIds.has(candidate)) continue;
      return candidate;
    }
    return "";
  }

  function generateUniqueItemId(targetState) {
    targetState = targetState || state;
    targetState.seq = targetState.seq || {};
    const seq = Number(targetState.seq.item || 1);
    targetState.seq.item = seq + 1;
    const sessionChunkRaw = String(clientSessionId || "").replace(/[^a-z0-9]/gi, "");
    const sessionChunk = (sessionChunkRaw.slice(-4) || "SESS").toUpperCase();
    const timeChunk = Date.now().toString(36).slice(-4).toUpperCase();
    const randomChunk = Math.random().toString(36).slice(2, 4).toUpperCase();
    return `IT-${String(seq).padStart(5, "0")}-${sessionChunk}${timeChunk}${randomChunk}`;
  }

  function browserNameFromUa(uaRaw) {
    const ua = String(uaRaw || "").toLowerCase();
    if (ua.includes("edg/")) return "Edge";
    if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
    if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
    if (ua.includes("firefox/")) return "Firefox";
    if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
    return "Navegador";
  }

  function deviceTypeFromUa(uaRaw) {
    const ua = String(uaRaw || "").toLowerCase();
    if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
    if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) return "Celular";
    return "Desktop";
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("pt-BR");
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
  }

  function formatDateOnlySafe(value) {
    const raw = String(value || "").trim();
    if (!raw) return "-";
    const directIsoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (directIsoDate) {
      return `${directIsoDate[3]}/${directIsoDate[2]}/${directIsoDate[1]}`;
    }
    return formatDate(raw);
  }

  function formatDateTimeWithDay(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function money(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseNumber(value || 0));
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function detailKeyPart(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function detailKey(...parts) {
    const key = parts.map((part) => detailKeyPart(part)).filter(Boolean).join(":");
    return key || "";
  }

  function isDetailOpen(key, defaultOpen = false) {
    if (!key) return defaultOpen;
    if (Object.prototype.hasOwnProperty.call(uiState.persistedDetailsOpen, key)) {
      return Boolean(uiState.persistedDetailsOpen[key]);
    }
    return defaultOpen;
  }

  function detailOpenAttr(key, defaultOpen = false) {
    return isDetailOpen(key, defaultOpen) ? " open" : "";
  }

  function formCheckboxChecked(form, name, fallback = false) {
    if (!form || !name) return Boolean(fallback);
    const input = form.querySelector(`input[name="${name}"]`);
    if (!input) return Boolean(fallback);
    return Boolean(input.checked);
  }

  function kitchenRowCollapseKey(comandaId, itemId) {
    return detailKey("admin-kitchen-row", comandaId, itemId);
  }

  function isAdminKitchenRowCollapsed(comandaId, itemId) {
    const key = kitchenRowCollapseKey(comandaId, itemId);
    if (!key) return false;
    return Boolean(uiState.adminKitchenCollapsedByRow[key]);
  }

  function setAdminKitchenRowCollapsed(comandaId, itemId, collapsed) {
    const key = kitchenRowCollapseKey(comandaId, itemId);
    if (!key) return;
    if (collapsed) {
      uiState.adminKitchenCollapsedByRow[key] = true;
    } else {
      delete uiState.adminKitchenCollapsedByRow[key];
    }
  }

  function parseNumber(input) {
    if (typeof input === "number") return input;
    const raw = String(input || "").trim().replace(/[^0-9,.-]/g, "");
    const hasComma = raw.includes(",");
    const normalized = hasComma ? raw.replaceAll(".", "").replaceAll(",", ".") : raw;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeDeletedIdList(source) {
    if (!Array.isArray(source)) return [];
    return [...new Set(source.map((id) => String(id || "").trim()).filter(Boolean))];
  }

  function sortByRowIdAsc(rows = []) {
    return [...rows].sort((a, b) => String(a?.id ?? "").localeCompare(String(b?.id ?? ""), undefined, { numeric: true }));
  }

  function hashText(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function stableSerializeForHash(value) {
    if (value === undefined) return "null";
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return `[${value.map((entry) => stableSerializeForHash(entry)).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    const parts = [];
    for (const key of keys) {
      if (value[key] === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${stableSerializeForHash(value[key])}`);
    }
    return `{${parts.join(",")}}`;
  }

  function buildCatalogSnapshot(source) {
    const users = sortByRowIdAsc(
      (Array.isArray(source?.users) ? source.users : [])
        .filter((u) => u && (u.role === "admin" || u.role === "waiter" || u.role === "cook"))
        .map((u) => ({
          id: Number.isFinite(Number(u.id)) ? Number(u.id) : String(u.id || ""),
          role: String(u.role || ""),
          name: String(u.name || ""),
          functionName: String(u.functionName || ""),
          login: String(u.login || ""),
          password: String(u.password || ""),
          active: u.active !== false
        }))
    );
    const products = sortByRowIdAsc(
      (Array.isArray(source?.products) ? source.products : []).map((p) => ({
        id: Number.isFinite(Number(p?.id)) ? Number(p.id) : String(p?.id || ""),
        name: String(p?.name || ""),
        category: String(p?.category || ""),
        subcategory: String(p?.subcategory || ""),
        price: Number(p?.price || 0),
        stock: Number(p?.stock || 0),
        prepTime: Number(p?.prepTime || 0),
        cost: Number(p?.cost || 0),
        available: p?.available !== false,
        requiresKitchen: Boolean(p?.requiresKitchen)
      }))
    );
    const signature = hashText(JSON.stringify({ users, products }));
    return { users, products, signature };
  }

  function buildCatalogBackupId(createdAt, signature) {
    const seed = `${String(createdAt || "").trim()}-${String(signature || "").trim()}`.replace(/[^a-zA-Z0-9_-]/g, "");
    return seed ? `bkp-${seed}` : `bkp-${Date.now().toString(36)}`;
  }

  function normalizeCatalogBackups(source) {
    if (!Array.isArray(source)) return [];
    const normalized = [];
    const seen = new Set();
    for (const entry of source) {
      if (!entry || typeof entry !== "object") continue;
      const snapshot = buildCatalogSnapshot(entry);
      if (!snapshot.users.length && !snapshot.products.length) continue;
      const createdAt = typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : isoNow();
      const signature = String(entry.signature || snapshot.signature || "").trim() || snapshot.signature;
      const dedupeKey = `${createdAt}|${signature}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      normalized.push({
        id: String(entry.id || buildCatalogBackupId(createdAt, signature)),
        createdAt,
        reason: typeof entry.reason === "string" && entry.reason ? entry.reason : "auto",
        signature,
        users: snapshot.users,
        products: snapshot.products
      });
    }
    normalized.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return normalized.slice(-CATALOG_BACKUPS_LIMIT);
  }

  function mergeCatalogBackups(...sources) {
    const merged = [];
    for (const source of sources) {
      if (!Array.isArray(source)) continue;
      merged.push(...source);
    }
    return normalizeCatalogBackups(merged);
  }

  function ensureCatalogBackup(targetState, reason = "auto") {
    if (!targetState || typeof targetState !== "object") return false;
    targetState.meta = targetState.meta || {};
    const backups = normalizeCatalogBackups(targetState.meta[CATALOG_BACKUPS_META_KEY]);
    const snapshot = buildCatalogSnapshot(targetState);
    if (!snapshot.users.length && !snapshot.products.length) {
      targetState.meta[CATALOG_BACKUPS_META_KEY] = backups;
      return false;
    }
    const latest = backups[backups.length - 1];
    if (latest && latest.signature === snapshot.signature) {
      targetState.meta[CATALOG_BACKUPS_META_KEY] = backups;
      return false;
    }
    const createdAt = isoNow();
    const next = {
      id: buildCatalogBackupId(createdAt, snapshot.signature),
      createdAt,
      reason: String(reason || "auto").slice(0, 48),
      signature: snapshot.signature,
      users: snapshot.users,
      products: snapshot.products
    };
    targetState.meta[CATALOG_BACKUPS_META_KEY] = [...backups, next].slice(-CATALOG_BACKUPS_LIMIT);
    targetState.meta.catalogBackupUpdatedAt = createdAt;
    targetState.meta.catalogBackupSignature = snapshot.signature;
    return true;
  }

  function applyCatalogBackupRecovery(targetState, ...backupSources) {
    if (!targetState || typeof targetState !== "object") return targetState;
    const meta = targetState.meta || {};
    const backups = mergeCatalogBackups(
      meta[CATALOG_BACKUPS_META_KEY],
      ...backupSources.map((source) => source?.meta?.[CATALOG_BACKUPS_META_KEY])
    );
    const recoveryEnabled = meta.enableCatalogRecovery === true;
    if (!backups.length || !recoveryEnabled) {
      return {
        ...targetState,
        meta: {
          ...meta,
          [CATALOG_BACKUPS_META_KEY]: backups
        }
      };
    }
    const latest = backups[backups.length - 1];
    const deletedProductIds = normalizeDeletedIdList(meta.deletedProductIds);
    const deletedUserIds = normalizeDeletedIdList(meta.deletedUserIds);
    const deletedProductSet = new Set(deletedProductIds.map(id => String(id)));
    const deletedUserSet = new Set(deletedUserIds.map(id => String(id)));
    // Recovery é somente aditivo — NÃO sobrescreve produtos/users existentes
    const currentUserIds = new Set(
      (Array.isArray(targetState.users) ? targetState.users : [])
        .map(u => String(u?.id ?? "").trim()).filter(Boolean)
    );
    const currentProductIds = new Set(
      (Array.isArray(targetState.products) ? targetState.products : [])
        .map(p => String(p?.id ?? "").trim()).filter(Boolean)
    );
    const recoveredUsers = (Array.isArray(latest.users) ? latest.users : [])
      .filter(u => { const id = String(u?.id ?? "").trim(); return id && !currentUserIds.has(id) && !deletedUserSet.has(id); });
    const recoveredProducts = (Array.isArray(latest.products) ? latest.products : [])
      .filter(p => { const id = String(p?.id ?? "").trim(); return id && !currentProductIds.has(id) && !deletedProductSet.has(id); });
    return {
      ...targetState,
      users: [...(Array.isArray(targetState.users) ? targetState.users : []), ...recoveredUsers],
      products: [...(Array.isArray(targetState.products) ? targetState.products : []), ...recoveredProducts],
      meta: {
        ...meta,
        [CATALOG_BACKUPS_META_KEY]: backups
      }
    };
  }

  function mergedRowsById(localRows, remoteRows, deletedIds = [], options = {}) {
    const preferLocal = options.preferLocal !== false;
    const allowRemoteOnly = options.allowRemoteOnly !== false;
    const getTimestamp = options.getTimestamp || null;
    const deletedSet = new Set(normalizeDeletedIdList(deletedIds));
    const localMap = new Map();
    for (const row of Array.isArray(localRows) ? localRows : []) {
      const id = String(row?.id ?? "").trim();
      if (!id || deletedSet.has(id)) continue;
      localMap.set(id, { ...row });
    }
    if (!allowRemoteOnly) {
      return [...localMap.values()].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
    }

    const map = new Map();
    const firstRows = preferLocal ? (Array.isArray(remoteRows) ? remoteRows : []) : Array.isArray(localRows) ? localRows : [];
    const secondRows = preferLocal ? Array.from(localMap.values()) : Array.isArray(remoteRows) ? remoteRows : [];
    for (const row of firstRows) {
      const id = String(row?.id ?? "").trim();
      if (!id || deletedSet.has(id)) continue;
      map.set(id, { ...row });
    }
    for (const row of secondRows) {
      const id = String(row?.id ?? "").trim();
      if (!id || deletedSet.has(id)) continue;
      if (map.has(id) && getTimestamp) {
        const existing = map.get(id);
        const merged = pickRowByTimestamp(existing, row, {
          getTimestamp,
          preferLocal
        });
        map.set(id, merged);
      } else {
        map.set(id, { ...row });
      }
    }
    return [...map.values()].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
  }

  function pickRowByTimestamp(localRow, remoteRow, options = {}) {
    if (!localRow) return remoteRow || null;
    if (!remoteRow) return localRow || null;
    const localTs = parseUpdatedAtTimestamp(options.getTimestamp ? options.getTimestamp(localRow) : localRow?.updatedAt || 0);
    const remoteTs = parseUpdatedAtTimestamp(options.getTimestamp ? options.getTimestamp(remoteRow) : remoteRow?.updatedAt || 0);
    const preferLocal = options.preferLocal !== false;
    if (localTs && remoteTs && localTs !== remoteTs) {
      return localTs > remoteTs ? localRow : remoteRow;
    }
    if (remoteTs && !localTs) return remoteRow;
    if (localTs && !remoteTs) return localRow;
    return preferLocal ? localRow : remoteRow;
  }

  function latestKitchenItemTimestamp(item) {
    if (!item) return 0;
    return Math.max(
      parseUpdatedAtTimestamp(item.kitchenStatusAt),
      parseUpdatedAtTimestamp(item.kitchenPriorityAt),
      parseUpdatedAtTimestamp(item.kitchenReceivedAt),
      parseUpdatedAtTimestamp(item.waiterVisualUpdatedAt),
      parseUpdatedAtTimestamp(item.deliveredAt),
      parseUpdatedAtTimestamp(item.canceledAt),
      parseUpdatedAtTimestamp(item.createdAt)
    );
  }

  function mergeComandasById(localRows, remoteRows, options = {}) {
    const map = new Map();
    const allowRemoteOnly = options.allowRemoteOnly !== false;
    const deletedSet = new Set(normalizeDeletedIdList(options.deletedIds));
    for (const comanda of Array.isArray(localRows) ? localRows : []) {
      const id = String(comanda?.id || "").trim();
      if (!id) continue;
      if (deletedSet.has(id)) continue;
      map.set(id, comanda);
    }
    for (const comanda of Array.isArray(remoteRows) ? remoteRows : []) {
      const id = String(comanda?.id || "").trim();
      if (!id) continue;
      if (deletedSet.has(id)) continue;
      if (!allowRemoteOnly && !map.has(id)) continue;
      const previous = map.get(id);
      const merged = pickRowByTimestamp(previous, comanda, {
        getTimestamp: (row) => row?.updatedAt || (Array.isArray(row?.events) && row.events.length ? row.events[row.events.length - 1]?.ts : null) || row?.closedAt || row?.createdAt || "",
        preferLocal: options.preferLocal !== false
      });
      // Item-level merge: preserva itens de ambos os lados para evitar sumico
      if (previous && comanda && merged) {
        const prevItems = Array.isArray(previous.items) ? previous.items : [];
        const remoteItems = Array.isArray(comanda.items) ? comanda.items : [];
        if (prevItems.length > 0 || remoteItems.length > 0) {
          const itemMap = new Map();
          for (const item of prevItems) { if (item?.id) itemMap.set(String(item.id), item); }
          for (const item of remoteItems) {
            const itemId = String(item?.id || "");
            if (!itemId) continue;
            if (!itemMap.has(itemId)) { itemMap.set(itemId, item); continue; }
            const existing = itemMap.get(itemId);
            const existingTs = latestKitchenItemTimestamp(existing);
            const incomingTs = latestKitchenItemTimestamp(item);
            if (incomingTs > existingTs) itemMap.set(itemId, item);
          }
          merged.items = [...itemMap.values()];
        }
      }
      map.set(id, merged);
    }
    return [...map.values()];
  }

  function mergeRowsByIdWithTimestamp(localRows, remoteRows, options = {}) {
    const map = new Map();
    const allowRemoteOnly = options.allowRemoteOnly !== false;
    for (const row of Array.isArray(localRows) ? localRows : []) {
      const id = String(row?.id || "").trim();
      if (!id) continue;
      map.set(id, row);
    }
    for (const row of Array.isArray(remoteRows) ? remoteRows : []) {
      const id = String(row?.id || "").trim();
      if (!id) continue;
      if (!allowRemoteOnly && !map.has(id)) continue;
      const previous = map.get(id);
      map.set(id, pickRowByTimestamp(previous, row, options));
    }
    return [...map.values()];
  }

  function mergeAuditRows(localRows, remoteRows) {
    const seen = new Set();
    const merged = [];
    for (const row of [...(Array.isArray(localRows) ? localRows : []), ...(Array.isArray(remoteRows) ? remoteRows : [])]) {
      if (!row || typeof row !== "object") continue;
      const key = String(row.id || `${row.ts || ""}|${row.actorId || ""}|${row.type || ""}|${row.comandaId || ""}|${row.detail || ""}`);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
    merged.sort((a, b) => new Date(b?.ts || 0) - new Date(a?.ts || 0));
    return merged.slice(0, 5000);
  }

  function sanitizeDeletedUserIds(deletedIds, ...states) {
    const ids = normalizeDeletedIdList(deletedIds);
    return ids;
  }

  function sanitizeDeletedProductIds(deletedIds, ...states) {
    const ids = normalizeDeletedIdList(deletedIds);
    return ids;
  }

  function normalizeOperationalResetAt(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    const ts = parseUpdatedAtTimestamp(trimmed);
    return ts ? new Date(ts).toISOString() : "";
  }

  function selectLatestOperationalResetAt(...values) {
    let best = "";
    let bestTs = 0;
    for (const value of values) {
      const normalized = normalizeOperationalResetAt(value);
      if (!normalized) continue;
      const ts = parseUpdatedAtTimestamp(normalized);
      if (!ts || ts <= bestTs) continue;
      bestTs = ts;
      best = normalized;
    }
    return best;
  }

  function applyRealtimeAuditCutoff(targetState, cutoffIso) {
    if (!targetState || typeof targetState !== "object") return;
    const normalizedCutoff = normalizeIsoTimestamp(cutoffIso);
    targetState.meta = targetState.meta || {};
    if (!normalizedCutoff) {
      targetState.meta.realtimeAuditResetAt = "";
      return;
    }
    const cutoffMs = parseUpdatedAtTimestamp(normalizedCutoff);
    if (!cutoffMs) {
      targetState.meta.realtimeAuditResetAt = "";
      return;
    }
    targetState.auditLog = (Array.isArray(targetState.auditLog) ? targetState.auditLog : []).filter((event) => {
      const ts = parseUpdatedAtTimestamp(event?.ts);
      return ts && ts >= cutoffMs;
    });
    targetState.meta.realtimeAuditResetAt = normalizedCutoff;
  }

  function selectLatestTimestampIso(...values) {
    let best = "";
    let bestTs = 0;
    for (const value of values) {
      const normalized = normalizeIsoTimestamp(value);
      if (!normalized) continue;
      const ts = parseUpdatedAtTimestamp(normalized);
      if (!ts || ts <= bestTs) continue;
      best = normalized;
      bestTs = ts;
    }
    return best;
  }

  function applyOperationalResetCutoff(targetState, cutoffIso) {
    // No-op: Never apply operational reset cutoff to prevent losing data on refresh
    // Data should only be deleted manually or via programmed functions
  }

  function stateFootprint(source) {
    const users = Array.isArray(source?.users) ? source.users.length : 0;
    const products = Array.isArray(source?.products) ? source.products.length : 0;
    const openComandas = Array.isArray(source?.openComandas) ? source.openComandas.length : 0;
    const closedComandas = Array.isArray(source?.closedComandas) ? source.closedComandas.length : 0;
    const history90 = Array.isArray(source?.history90) ? source.history90.length : 0;
    const auditLog = Array.isArray(source?.auditLog) ? source.auditLog.length : 0;
    const payables = Array.isArray(source?.payables) ? source.payables.length : 0;
    const cashHtmlReports = Array.isArray(source?.cashHtmlReports) ? source.cashHtmlReports.length : 0;
    const internalCashAudits = Array.isArray(source?.internalCashAudits) ? source.internalCashAudits.length : 0;
    const financeCycleReports = Array.isArray(source?.financeCycleReports) ? source.financeCycleReports.length : 0;
    const cookHistory = Array.isArray(source?.cookHistory) ? source.cookHistory.length : 0;
    return {
      users,
      products,
      openComandas,
      closedComandas,
      history90,
      auditLog,
      payables,
      cashHtmlReports,
      internalCashAudits,
      financeCycleReports,
      cookHistory,
      catalogRows: users + products,
      operationalRows: openComandas + closedComandas + history90 + auditLog + payables + cashHtmlReports + internalCashAudits + financeCycleReports + cookHistory
    };
  }

  function isLikelyResetState(source) {
    const fp = stateFootprint(source);
    return fp.users <= 1 && fp.products === 0 && fp.openComandas === 0 && fp.closedComandas === 0 && fp.history90 === 0 && fp.payables === 0 && fp.cashHtmlReports === 0 && fp.internalCashAudits === 0 && fp.financeCycleReports === 0;
  }

  function shouldForceRemotePreference(localCandidate, remoteCandidate) {
    if (!isLikelyResetState(localCandidate)) return false;
    const remote = stateFootprint(remoteCandidate);
    return remote.catalogRows >= 3 || remote.operationalRows >= 5;
  }

  function resolveOperationalResetAtForMerge(localState, remoteState) {
    return ""; // Never apply operational reset when merging state to prevent data loss
  }

  function mergeStateForCloud(localState, remoteState) {
    console.log("[mergeStateForCloud] Starting, local openComandas count:", localState.openComandas?.length, "remote openComandas count:", remoteState.openComandas?.length);
    const localMeta = localState?.meta || {};
    const remoteMeta = remoteState?.meta || {};
    const localUpdated = parseUpdatedAtTimestamp(localMeta.updatedAt);
    const remoteUpdated = parseUpdatedAtTimestamp(remoteMeta.updatedAt);
    let preferLocal = localUpdated >= remoteUpdated;
    if (preferLocal && shouldForceRemotePreference(localState, remoteState)) {
      preferLocal = false;
    }
    const operationalResetAt = resolveOperationalResetAtForMerge(localState, remoteState);
    const realtimeAuditResetAt = selectLatestTimestampIso(localMeta.realtimeAuditResetAt, remoteMeta.realtimeAuditResetAt);
    const financeCycleStartedAt = selectLatestTimestampIso(localMeta.financeCycleStartedAt, remoteMeta.financeCycleStartedAt);
    const catalogBackups = mergeCatalogBackups(localMeta[CATALOG_BACKUPS_META_KEY], remoteMeta[CATALOG_BACKUPS_META_KEY]);
    const deletedProductIdsRaw = normalizeDeletedIdList([
      ...(Array.isArray(localMeta.deletedProductIds) ? localMeta.deletedProductIds : []),
      ...(Array.isArray(remoteMeta.deletedProductIds) ? remoteMeta.deletedProductIds : [])
    ]);
    const deletedUserIdsRaw = normalizeDeletedIdList([
      ...(Array.isArray(localMeta.deletedUserIds) ? localMeta.deletedUserIds : []),
      ...(Array.isArray(remoteMeta.deletedUserIds) ? remoteMeta.deletedUserIds : [])
    ]);
    const deletedComandaIds = normalizeDeletedIdList([
      ...(Array.isArray(localMeta.deletedComandaIds) ? localMeta.deletedComandaIds : []),
      ...(Array.isArray(remoteMeta.deletedComandaIds) ? remoteMeta.deletedComandaIds : [])
    ]);
    // #region debug-point B:merge-input
    debugReport("B", "app.js:mergeStateForCloud", "Entrando no merge", {
      preferLocal,
      localMetaUpdatedAt: localMeta.updatedAt || "",
      remoteMetaUpdatedAt: remoteMeta.updatedAt || "",
      localUsers: (Array.isArray(localState?.users) ? localState.users : []).map((u) => ({
        id: u?.id,
        login: u?.login,
        password: u?.password,
        updatedAt: u?.updatedAt
      })),
      remoteUsers: (Array.isArray(remoteState?.users) ? remoteState.users : []).map((u) => ({
        id: u?.id,
        login: u?.login,
        password: u?.password,
        updatedAt: u?.updatedAt
      })),
      localOpenComandas: (Array.isArray(localState?.openComandas) ? localState.openComandas : []).map((c) => c?.id),
      remoteOpenComandas: (Array.isArray(remoteState?.openComandas) ? remoteState.openComandas : []).map((c) => c?.id),
      deletedUserIdsRaw,
      deletedProductIdsRaw,
      deletedComandaIds
    });
    // #endregion
    console.log("[mergeStateForCloud] deletedComandaIds:", deletedComandaIds);
    const deletedComandaSet = new Set(deletedComandaIds);
    const deletedProductIds = sanitizeDeletedProductIds(deletedProductIdsRaw, localState, remoteState);
    const deletedUserIds = sanitizeDeletedUserIds(deletedUserIdsRaw, localState, remoteState);
    // Dados operacionais (comandas, historico, auditoria etc.) nunca devem
    // ser descartados apenas porque a copia local esta mais recente no "meta.updatedAt".
    // Em cenarios concorrentes, manter "remote-only" evita sumico temporario de pedidos.
    const allowRemoteOperationalInsert = true;
    const mergedOpenComandasRaw = mergeComandasById(localState?.openComandas, remoteState?.openComandas, {
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert,
      deletedIds: deletedComandaIds
    });
    console.log("[mergeStateForCloud] mergedOpenComandasRaw count:", mergedOpenComandasRaw?.length);
    const mergedClosedComandas = mergeComandasById(localState?.closedComandas, remoteState?.closedComandas, {
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert,
      deletedIds: deletedComandaIds
    });
    console.log("[mergeStateForCloud] mergedClosedComandas count:", mergedClosedComandas?.length);
    const closedIds = new Set(mergedClosedComandas.map((comanda) => String(comanda?.id || "").trim()).filter(Boolean));
    console.log("[mergeStateForCloud] closedIds:", Array.from(closedIds));
    const mergedOpenComandas = mergedOpenComandasRaw.filter((comanda) => !closedIds.has(String(comanda?.id || "").trim()));
    console.log("[mergeStateForCloud] mergedOpenComandas count after closedIds filter:", mergedOpenComandas?.length);
    const mergedHistory90 = mergeRowsByIdWithTimestamp(localState?.history90, remoteState?.history90, {
      getTimestamp: (row) => row?.closedAt || row?.createdAt || row?.updatedAt || "",
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert
    })
      .map((row) => ({
        ...row,
        commandas: (Array.isArray(row?.commandas) ? row.commandas : []).filter(
          (comanda) => !deletedComandaSet.has(String(comanda?.id || "").trim())
        )
      }))
      .sort((a, b) => new Date(b?.closedAt || b?.createdAt || 0) - new Date(a?.closedAt || a?.createdAt || 0));
    const mergedCookHistory = mergeRowsByIdWithTimestamp(localState?.cookHistory, remoteState?.cookHistory, {
      getTimestamp: (row) => row?.updatedAt || row?.deliveredAt || "",
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert
    });
    const mergedPayables = mergeRowsByIdWithTimestamp(localState?.payables, remoteState?.payables, {
      getTimestamp: (row) => row?.updatedAt || row?.paidAt || row?.createdAt || "",
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert
    });
    const mergedCashHtmlReports = mergeRowsByIdWithTimestamp(localState?.cashHtmlReports, remoteState?.cashHtmlReports, {
      getTimestamp: (row) => row?.createdAt || row?.closedAt || "",
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert
    });
    const mergedInternalCashAudits = mergeRowsByIdWithTimestamp(localState?.internalCashAudits, remoteState?.internalCashAudits, {
      getTimestamp: (row) => row?.closedAt || row?.createdAt || "",
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert
    });
    const mergedFinanceCycleReports = mergeRowsByIdWithTimestamp(localState?.financeCycleReports, remoteState?.financeCycleReports, {
      getTimestamp: (row) => row?.endAt || row?.generatedAt || "",
      preferLocal,
      allowRemoteOnly: allowRemoteOperationalInsert
    });
    const mergedAudit = mergeAuditRows(localState?.auditLog, remoteState?.auditLog);

    const mergedUsersRaw = mergeRowsByIdWithTimestamp(localState?.users, remoteState?.users, {
      getTimestamp: (user) => user?.updatedAt || "",
      preferLocal,
      allowRemoteOnly: true
    });
    const mergedUsers = mergedUsersRaw.filter((u) => !deletedUserIds.includes(String(u?.id ?? "").trim()));
    // #region debug-point B:merge-output
    debugReport("B", "app.js:mergeStateForCloud", "Saindo do merge", {
      mergedUsers: mergedUsers.map((u) => ({
        id: u?.id,
        login: u?.login,
        password: u?.password,
        updatedAt: u?.updatedAt
      })),
      mergedOpenComandas: mergedOpenComandas.map((c) => c?.id),
      mergedClosedComandas: mergedClosedComandas.map((c) => c?.id),
      deletedUserIds,
      deletedProductIds,
      deletedComandaIds
    });
    // #endregion

    const merged = {
      ...(preferLocal ? remoteState : localState),
      ...(preferLocal ? localState : remoteState),
      users: mergedUsers,
      products: mergeRowsByIdWithTimestamp(localState?.products, remoteState?.products, {
        getTimestamp: (row) => row?.updatedAt || "",
        preferLocal,
        allowRemoteOnly: true
      }).filter((p) => !deletedProductIds.includes(String(p?.id ?? "").trim())),
      openComandas: mergedOpenComandas,
      closedComandas: mergedClosedComandas,
      history90: mergedHistory90,
      cookHistory: mergedCookHistory,
      payables: mergedPayables,
      cashHtmlReports: mergedCashHtmlReports,
      internalCashAudits: mergedInternalCashAudits,
      financeCycleReports: mergedFinanceCycleReports,
      auditLog: mergedAudit,
      meta: {
        ...(preferLocal ? remoteState?.meta || {} : localState?.meta || {}),
        ...(preferLocal ? localState?.meta || {} : remoteState?.meta || {}),
        [CATALOG_BACKUPS_META_KEY]: catalogBackups,
        deletedProductIds,
        deletedUserIds,
        deletedComandaIds,
        operationalResetAt,
        realtimeAuditResetAt,
        financeCycleStartedAt
      },
      cash: (() => {
        const localCash = localState?.cash || {};
        const remoteCash = remoteState?.cash || {};
        const localTs = parseUpdatedAtTimestamp(localCash.updatedAt);
        const remoteTs = parseUpdatedAtTimestamp(remoteCash.updatedAt);
        if (localTs > remoteTs) return { ...remoteCash, ...localCash };
        if (remoteTs > localTs) return { ...localCash, ...remoteCash };
        return { ...(preferLocal ? remoteCash : localCash), ...(preferLocal ? localCash : remoteCash) };
      })()
    };
    console.log("[mergeStateForCloud] After building merged object, merged.openComandas count:", merged.openComandas?.length);
    applyOperationalResetCutoff(merged, operationalResetAt);
    console.log("[mergeStateForCloud] After applyOperationalResetCutoff, merged.openComandas count:", merged.openComandas?.length);
    applyRealtimeAuditCutoff(merged, realtimeAuditResetAt);
    console.log("[mergeStateForCloud] After applyRealtimeAuditCutoff, merged.openComandas count:", merged.openComandas?.length);
    sanitizeOperationalComandasAgainstHistory(merged);
    console.log("[mergeStateForCloud] After sanitizeOperationalComandasAgainstHistory, merged.openComandas count:", merged.openComandas?.length);
    merged.seq = merged.seq || {};
    const maxUserId = Math.max(0, ...(Array.isArray(merged.users) ? merged.users : []).map((u) => Number(u?.id || 0)));
    const maxProductId = Math.max(0, ...(Array.isArray(merged.products) ? merged.products : []).map((p) => Number(p?.id || 0)));
    merged.seq.user = Math.max(Number(merged.seq.user || 0), maxUserId + 1);
    merged.seq.product = Math.max(Number(merged.seq.product || 0), maxProductId + 1);
    recomputeComandaSequence(merged);
    console.log("[mergeStateForCloud] Final merged.openComandas count:", merged.openComandas?.length);
    return merged;
  }

  function trackDeletedEntity(metaKey, entityId) {
    const id = String(entityId ?? "").trim();
    if (!id) return;
    state.meta = state.meta || {};
    const current = normalizeDeletedIdList(state.meta[metaKey]);
    if (current.includes(id)) {
      state.meta[metaKey] = current;
      return;
    }
    current.push(id);
    state.meta[metaKey] = current.slice(-800);
  }

  const DEFAULT_INITIAL_PRODUCTS = Object.freeze([
  {
    "id": 2,
    "cost": 3,
    "name": "Refrigerante lata",
    "price": 6,
    "stock": 40,
    "category": "Bar",
    "prepTime": 0,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 3,
    "cost": 3.5,
    "name": "Suco natural",
    "price": 8,
    "stock": 34,
    "category": "Bar",
    "prepTime": 0,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 4,
    "cost": 6.5,
    "name": "Whisky dose",
    "price": 14,
    "stock": 28,
    "category": "Avulso",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 5,
    "cost": 5.2,
    "name": "Vodka dose",
    "price": 12,
    "stock": 28,
    "category": "Avulso",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 8,
    "cost": 13,
    "name": "Frango acebolado",
    "price": 32,
    "stock": 9,
    "category": "Cozinha",
    "prepTime": 20,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 9,
    "cost": 0,
    "name": "Espetinho de carne",
    "price": 6,
    "stock": 51,
    "category": "Espetinhos",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 10,
    "cost": 0,
    "name": "Espetinho de frango",
    "price": 6,
    "stock": 55,
    "category": "Espetinhos",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 12,
    "cost": 1.2,
    "name": "Bala pacote",
    "price": 3,
    "stock": 90,
    "category": "Avulso",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 13,
    "cost": 15,
    "name": "Combo Almoço",
    "price": 36,
    "stock": 18,
    "category": "Ofertas",
    "prepTime": 22,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 14,
    "cost": 13.2,
    "name": "Combo balde e gelo",
    "price": 29,
    "stock": 18,
    "category": "Ofertas",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 15,
    "cost": 0,
    "name": "MEDALHÃO DE GADO",
    "price": 6,
    "stock": 99,
    "category": "Espetinhos",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 16,
    "cost": 0,
    "name": "LINGUIÇA",
    "price": 6,
    "stock": 99,
    "category": "Espetinhos",
    "prepTime": 0,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 17,
    "cost": 2,
    "name": "Baião G",
    "price": 8,
    "stock": 95,
    "category": "Cozinha",
    "prepTime": 2,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 18,
    "cost": 2,
    "name": "Baião P",
    "price": 5,
    "stock": 93,
    "category": "Cozinha",
    "prepTime": 2,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 19,
    "cost": 5,
    "name": "Arroz a Piamontese G",
    "price": 12,
    "stock": 98,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 20,
    "cost": 3,
    "name": "Arroz a Piamontese P",
    "price": 6,
    "stock": 98,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 21,
    "cost": 10,
    "name": "Espaguete de Carne de Sol",
    "price": 20,
    "stock": 97,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 22,
    "cost": 10,
    "name": "Espaguete de Camarão",
    "price": 20,
    "stock": 96,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 23,
    "cost": 8,
    "name": "Batata Frita",
    "price": 15,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 15,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 24,
    "cost": 5,
    "name": "Batata Frita 1/2",
    "price": 10,
    "stock": 98,
    "category": "Cozinha",
    "prepTime": 15,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 25,
    "cost": 8,
    "name": "Calabresa Frita",
    "price": 15,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 26,
    "cost": 5,
    "name": "Calabresa frita 1/2",
    "price": 10,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 27,
    "cost": 10,
    "name": "Batata com Calabresa 1/2",
    "price": 20,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 15,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 28,
    "cost": 15,
    "name": "Carne de Sol",
    "price": 35,
    "stock": 98,
    "category": "Cozinha",
    "prepTime": 20,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 29,
    "cost": 10,
    "name": "Carne de sol 1/2",
    "price": 20,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 20,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 30,
    "cost": 20,
    "name": "Camarão no Alho e Óleo",
    "price": 40,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 15,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 31,
    "cost": 10,
    "name": "Camarão no Alho e Óleo 1/2",
    "price": 20,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 15,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 32,
    "cost": 5,
    "name": "Bolinha de Carne",
    "price": 10,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 33,
    "cost": 5,
    "name": "Bolinha de Queijo",
    "price": 10,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 34,
    "cost": 5,
    "name": "Bolinha de Frango",
    "price": 10,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 35,
    "cost": 5,
    "name": "Macaxeira Frita",
    "price": 15,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 36,
    "cost": 5,
    "name": "Macaxeira Frita 1/2",
    "price": 10,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 10,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 37,
    "cost": 6,
    "name": "Feijão Tropeiro G",
    "price": 15,
    "stock": 98,
    "category": "Cozinha",
    "prepTime": 5,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 38,
    "cost": 3,
    "name": "Feijão Tropeiro P",
    "price": 8,
    "stock": 99,
    "category": "Cozinha",
    "prepTime": 5,
    "available": true,
    "subcategory": "",
    "requiresKitchen": true
  },
  {
    "id": 39,
    "cost": 2.73,
    "name": "BRAHMA",
    "price": 5,
    "stock": 293,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 40,
    "cost": 2.7,
    "name": "SKOL",
    "price": 5,
    "stock": 50,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 41,
    "cost": 6.25,
    "name": "HEINEKEN",
    "price": 9,
    "stock": 50,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 42,
    "cost": 5.5,
    "name": "SPARTEN",
    "price": 8,
    "stock": 27,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 43,
    "cost": 6.5,
    "name": "CORONA",
    "price": 10,
    "stock": 25,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 44,
    "cost": 2.5,
    "name": "BLACK WHITE/DOSE",
    "price": 7,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 45,
    "cost": 45,
    "name": "BLACK WHITE/LITRO",
    "price": 70,
    "stock": 4,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 46,
    "cost": 1,
    "name": "DREHER/DOSE",
    "price": 2,
    "stock": 10,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 47,
    "cost": 20,
    "name": "DREHER/LITRO",
    "price": 35,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 48,
    "cost": 16,
    "name": "51/DOSE",
    "price": 2,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 49,
    "cost": 18,
    "name": "51/LITRO",
    "price": 30,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 50,
    "cost": 1,
    "name": "YPIOCA/ AMARELA",
    "price": 3,
    "stock": 9994,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 51,
    "cost": 1,
    "name": "YPIOCA/ BRANCA",
    "price": 2,
    "stock": 7,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 52,
    "cost": 2,
    "name": "YPIOCA/ EMPALHADA",
    "price": 4,
    "stock": 7,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 53,
    "cost": 4,
    "name": "YPIOCA/ 150 ANOS",
    "price": 8,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 54,
    "cost": 4,
    "name": "CAMPARI/ DOSE",
    "price": 7,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 55,
    "cost": 60,
    "name": "CAMPARI/ LITRO",
    "price": 80,
    "stock": 4,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 56,
    "cost": 3,
    "name": "TEACHER'S / DOSE",
    "price": 5,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 57,
    "cost": 40,
    "name": "TEACHER'S / LITRO",
    "price": 60,
    "stock": 4,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 58,
    "cost": 5,
    "name": "RED LABEL / DOSE",
    "price": 10,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 59,
    "cost": 90,
    "name": "RED LABEL / LITRO",
    "price": 130,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 60,
    "cost": 10,
    "name": "OLD PAR / DOSE",
    "price": 15,
    "stock": 1,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 61,
    "cost": 140,
    "name": "OLD PAR / LITRO",
    "price": 190,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 62,
    "cost": 2,
    "name": "MONTILA",
    "price": 4,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 63,
    "cost": 1,
    "name": "VODKA SLOVA / DOSE",
    "price": 2,
    "stock": 4,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 64,
    "cost": 12,
    "name": "VODKA SLOVA / LITRO",
    "price": 20,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 65,
    "cost": 2,
    "name": "FOGO PAULISTA / DOSE",
    "price": 3,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 66,
    "cost": 1,
    "name": "PRESIDENTE / DOSE",
    "price": 2,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 67,
    "cost": 2,
    "name": "VELHO BARREIRO / DOSE",
    "price": 3,
    "stock": 1,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 68,
    "cost": 2,
    "name": "SÃO JOÃO DA BARRA / DOSE",
    "price": 3,
    "stock": 2,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 69,
    "cost": 2,
    "name": "VODKA ORLOFF / DOSE",
    "price": 4,
    "stock": 3,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 70,
    "cost": 40,
    "name": "VODKA ORLOFF / LITRO",
    "price": 60,
    "stock": 3,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 71,
    "cost": 1.8,
    "name": "REFRIGERANTE PET",
    "price": 3,
    "stock": 38,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 72,
    "cost": 2,
    "name": "REFRIGERANTE LATA",
    "price": 4,
    "stock": 27,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 73,
    "cost": 3.49,
    "name": "REFRIGERANTE LATA",
    "price": 5,
    "stock": 20,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 74,
    "cost": 1.5,
    "name": "ÁGUA C/GÁS",
    "price": 3,
    "stock": 24,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 75,
    "cost": 1,
    "name": "ÁGUA S/GÁS",
    "price": 2,
    "stock": 30,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 76,
    "cost": 3,
    "name": "DELL VALE",
    "price": 5,
    "stock": 7,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 77,
    "cost": 5,
    "name": "COCA 1L",
    "price": 10,
    "stock": 15,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 78,
    "cost": 5,
    "name": "COCA 600ML",
    "price": 7,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 79,
    "cost": 5,
    "name": "REFRIGERANTE 1L",
    "price": 7,
    "stock": 12,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 80,
    "cost": 12,
    "name": "COCA 2L",
    "price": 15,
    "stock": 5,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 81,
    "cost": 7,
    "name": "REFRIGERANTE 2L",
    "price": 12,
    "stock": 12,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 82,
    "cost": 9,
    "name": "RED BULL",
    "price": 12,
    "stock": 6,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 83,
    "cost": 9,
    "name": "MONSTER",
    "price": 12,
    "stock": 12,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 84,
    "cost": 6,
    "name": "ICE CABARÉ",
    "price": 10,
    "stock": 12,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 85,
    "cost": 3.14,
    "name": "CHOKITO",
    "price": 4,
    "stock": 20,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 86,
    "cost": 3.14,
    "name": "PRESTÍGIO",
    "price": 4,
    "stock": 20,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 87,
    "cost": 1.4,
    "name": "BATOM GAROTO",
    "price": 2.5,
    "stock": 50,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 89,
    "cost": 3.14,
    "name": "CARIBE",
    "price": 4,
    "stock": 15,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 91,
    "cost": 0.2,
    "name": "PIRULITO",
    "price": 0.5,
    "stock": 50,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 92,
    "cost": 1,
    "name": "FINI",
    "price": 2,
    "stock": 20,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 93,
    "cost": 1,
    "name": "SONHO DE VALSA",
    "price": 2,
    "stock": 15,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 94,
    "cost": 2,
    "name": "TRIDENT",
    "price": 3,
    "stock": 20,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 95,
    "cost": 1.4,
    "name": "MENTOS",
    "price": 2,
    "stock": 29,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 96,
    "cost": 1.34,
    "name": "HALLS",
    "price": 2.5,
    "stock": 15,
    "category": "Avulso",
    "prepTime": 1,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  },
  {
    "id": 97,
    "cost": 1.9,
    "name": "Coca Pet 250ml",
    "price": 4,
    "stock": 85,
    "category": "Bar",
    "prepTime": 1,
    "available": true,
    "subcategory": "Geral",
    "requiresKitchen": false
  },
  {
    "id": 98,
    "cost": 3,
    "name": "Porco",
    "price": 6,
    "stock": 1500,
    "category": "Espetinhos",
    "prepTime": 5,
    "available": true,
    "subcategory": "",
    "requiresKitchen": false
  }
]);

  const CANONICAL_PRODUCT_BY_ID = Object.freeze(
    DEFAULT_INITIAL_PRODUCTS.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {})
  );

  function initialState() {
    return {
      users: [
        { id: 1, role: "admin", name: "Administrador", functionName: "Administrador", login: "admin", password: "admin", active: true, updatedAt: isoNow() }
      ],
      products: DEFAULT_INITIAL_PRODUCTS.map((p) => ({ ...p })),
      openComandas: [],
      closedComandas: [],
      cashHtmlReports: [],
      internalCashAudits: [],
      financeCycleReports: [],
      cookHistory: [],
      payables: [],
      auditLog: [],
      history90: [],
      cash: {
        id: "CX-1",
        openedAt: "",
        date: todayISO(),
        updatedAt: isoNow()
      },
      seq: {
        user: 2,
        product: 99,
        comanda: 1,
        item: 1,
        sale: 1,
        payable: 1,
        cash: 2,
        event: 1
      },
      meta: {
        updatedAt: isoNow(),
        lastCloudSyncAt: null,
        deletedProductIds: [],
        deletedUserIds: [],
        deletedComandaIds: [],
        financeCycleStartedAt: "",
        operationalResetAt: "",
        realtimeAuditResetAt: "",
        [FINAL_CLIENT_PREP_FLAG]: true,
        [FINAL_CLIENT_PREP_MARKER]: isoNow(),
        [FINAL_CLIENT_PREP_SIGNATURE_KEY]: FINAL_CLIENT_PREP_SIGNATURE
      },
      session: {
        userId: null
      }
    };
  }

  function pruneHistory(state) {
    const threshold = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    state.history90 = (state.history90 || []).filter((entry) => {
      const at = new Date(entry.closedAt || entry.createdAt || 0).getTime();
      return Number.isFinite(at) && at >= threshold;
    });
  }

  function prunePayables(state) {
    const threshold = Date.now() - PAYABLES_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    state.payables = (state.payables || []).filter((entry) => {
      const referenceAt = new Date(entry.paidAt || entry.createdAt || 0).getTime();
      if (!Number.isFinite(referenceAt)) return true;
      return referenceAt >= threshold;
    });
  }

  function normalizeCashHtmlReportRecord(entry, fallbackId = 0) {
    const parsed = entry && typeof entry === "object" ? entry : {};
    const createdAt = typeof parsed.createdAt === "string" && parsed.createdAt ? parsed.createdAt : isoNow();
    const closedAt = typeof parsed.closedAt === "string" && parsed.closedAt ? parsed.closedAt : createdAt;
    const openedAt = typeof parsed.openedAt === "string" ? parsed.openedAt : "";
    const referenceDayRaw =
      typeof parsed.referenceDay === "string" && parsed.referenceDay
        ? parsed.referenceDay
        : String(openedAt || closedAt || createdAt).slice(0, 10);
    return {
      id: String(parsed.id || `CHR-${fallbackId + 1}`),
      cashClosureId: String(parsed.cashClosureId || ""),
      cashId: String(parsed.cashId || ""),
      openedAt,
      closedAt,
      referenceDay: String(referenceDayRaw || "").slice(0, 10),
      createdAt,
      createdById: parsed.createdById ?? null,
      createdByName: String(parsed.createdByName || ""),
      createdByRole: String(parsed.createdByRole || ""),
      title: String(parsed.title || ""),
      subtitle: String(parsed.subtitle || ""),
      html: String(parsed.html || "")
    };
  }

  function pruneCashHtmlReports(state) {
    const threshold = Date.now() - CASH_HTML_REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const normalized = (state.cashHtmlReports || [])
      .map((entry, idx) => normalizeCashHtmlReportRecord(entry, idx))
      .filter((entry) => {
        if (!String(entry.html || "").trim()) return false;
        const referenceAt = new Date(entry.closedAt || entry.createdAt || 0).getTime();
        if (!Number.isFinite(referenceAt)) return true;
        return referenceAt >= threshold;
      })
      .sort((a, b) => new Date(b.closedAt || b.createdAt || 0) - new Date(a.closedAt || a.createdAt || 0));
    state.cashHtmlReports = normalized.slice(0, CASH_HTML_REPORTS_LIMIT);
  }

  function normalizeInternalCashAuditRecord(entry, fallbackId = 0) {
    const parsed = entry && typeof entry === "object" ? entry : {};
    const createdAt = normalizeIsoTimestamp(parsed.createdAt || parsed.closedAt || parsed.openedAt) || isoNow();
    const closedAt = normalizeIsoTimestamp(parsed.closedAt || parsed.createdAt) || createdAt;
    const openedAt = normalizeIsoTimestamp(parsed.openedAt) || "";
    const checks = (Array.isArray(parsed.checks) ? parsed.checks : [])
      .filter((row) => row && typeof row === "object")
      .map((row, idx) => ({
        code: String(row.code || `check_${fallbackId + 1}_${idx + 1}`),
        ok: row.ok !== false,
        detail: String(row.detail || "")
      }));
    const rawSummary = parsed.summary && typeof parsed.summary === "object" ? parsed.summary : {};
    const byPayment = {};
    for (const [method, amount] of Object.entries(rawSummary.byPayment || {})) {
      byPayment[String(method || "").trim()] = Math.max(0, parseNumber(amount || 0));
    }
    return {
      id: String(parsed.id || `ICA-${fallbackId + 1}`),
      referenceDay: String(parsed.referenceDay || String(openedAt || closedAt || createdAt).slice(0, 10)).slice(0, 10),
      createdAt,
      cashClosureId: String(parsed.cashClosureId || ""),
      cashId: String(parsed.cashId || ""),
      openedAt,
      closedAt,
      actorId: parsed.actorId ?? null,
      actorName: String(parsed.actorName || ""),
      actorRole: String(parsed.actorRole || ""),
      status: String(parsed.status || (checks.every((check) => check.ok) ? "ok" : "warning")),
      fingerprint: String(parsed.fingerprint || ""),
      reportHash: String(parsed.reportHash || ""),
      checks,
      summary: {
        commandasCount: Math.max(0, Number(rawSummary.commandasCount || parsed.commandasCount || 0)),
        uniqueComandas: Math.max(0, Number(rawSummary.uniqueComandas || 0)),
        auditSnapshotCount: Math.max(0, Number(rawSummary.auditSnapshotCount || 0)),
        htmlSize: Math.max(0, Number(rawSummary.htmlSize || 0)),
        total: Math.max(0, parseNumber(rawSummary.total || parsed.total || 0)),
        byPayment
      }
    };
  }

  function pruneInternalCashAudits(state) {
    const threshold = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const normalized = (state.internalCashAudits || [])
      .map((entry, idx) => normalizeInternalCashAuditRecord(entry, idx))
      .filter((entry) => {
        const referenceAt = new Date(entry.closedAt || entry.createdAt || 0).getTime();
        if (!Number.isFinite(referenceAt)) return true;
        return referenceAt >= threshold;
      })
      .sort((a, b) => new Date(b.closedAt || b.createdAt || 0) - new Date(a.closedAt || a.createdAt || 0));
    state.internalCashAudits = normalized.slice(0, INTERNAL_CASH_AUDIT_LIMIT);
  }

  function normalizeFinanceCycleReportRecord(entry, fallbackId = 0) {
    const parsed = entry && typeof entry === "object" ? entry : {};
    const startAt = normalizeIsoTimestamp(parsed.startAt);
    const endAt = normalizeIsoTimestamp(parsed.endAt);
    const generatedAt = normalizeIsoTimestamp(parsed.generatedAt || parsed.createdAt || parsed.endAt || parsed.startAt) || isoNow();
    const grossRevenue = Math.max(0, parseNumber(parsed.grossRevenue || 0));
    const totalCost = Math.max(0, parseNumber(parsed.totalCost || 0));
    const netProfit = parseNumber(parsed.netProfit !== undefined ? parsed.netProfit : grossRevenue - totalCost);
    const commandasCount = Math.max(0, Number(parsed.commandasCount || 0));
    const totalItemsSold = Math.max(0, parseNumber(parsed.totalItemsSold || 0));
    const topProducts = (Array.isArray(parsed.topProducts) ? parsed.topProducts : [])
      .filter((row) => row && typeof row === "object")
      .map((row, idx) => ({
        id: String(row.id || `FRP-${fallbackId + 1}-${idx + 1}`),
        name: String(row.name || ""),
        soldQty: Math.max(0, parseNumber(row.soldQty || 0)),
        revenue: Math.max(0, parseNumber(row.revenue || 0)),
        profit: parseNumber(row.profit || 0)
      }))
      .slice(0, 10);
    return {
      id: String(parsed.id || `FCR-${fallbackId + 1}`),
      startAt,
      endAt,
      generatedAt,
      commandasCount,
      totalItemsSold,
      grossRevenue,
      totalCost,
      netProfit,
      topProducts
    };
  }

  function pruneFinanceCycleReports(state) {
    const threshold = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const normalized = (state.financeCycleReports || [])
      .map((entry, idx) => normalizeFinanceCycleReportRecord(entry, idx))
      .filter((entry) => {
        const referenceAt = new Date(entry.endAt || entry.generatedAt || 0).getTime();
        if (!Number.isFinite(referenceAt)) return true;
        return referenceAt >= threshold;
      })
      .sort((a, b) => new Date(b.endAt || b.generatedAt || 0) - new Date(a.endAt || a.generatedAt || 0));
    state.financeCycleReports = normalized.slice(0, FINANCE_CYCLE_REPORTS_LIMIT);
  }

  function hasSystemTestMarker(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return false;
    return SYSTEM_TEST_MARKERS.some((marker) => text.includes(marker));
  }

  function isSystemGeneratedCodeWaiter(user) {
    if (!user || user.role !== "waiter") return false;
    const name = String(user.name || "").trim();
    const login = String(user.login || "").trim().toLowerCase();
    return name.startsWith(`${ACCESS_CODE_WAITER_PREFIX} `) && login.startsWith("garcom_");
  }

  function isKnownSystemTestUser(user) {
    if (!user) return false;
    const role = String(user.role || "").trim().toLowerCase();
    const name = String(user.name || "").trim().toLowerCase();
    const login = String(user.login || "").trim().toLowerCase();
    if (isSystemGeneratedCodeWaiter(user)) return true;
    if (role === "waiter" && name === "garcom teste" && login === "user") return true;
    if (role === "admin" && name === "owner admin" && login === "owner") return true;
    return false;
  }

  function isSystemTestAuditEntry(entry) {
    if (!entry) return false;
    const detail = String(entry.detail || "");
    const actorName = String(entry.actorName || "");
    const type = String(entry.type || "");
    if (hasSystemTestMarker(detail) || hasSystemTestMarker(actorName)) return true;
    if (type === "funcionario_add" && detail.includes("criado automaticamente via codigo 2222")) return true;
    return false;
  }

  function purgeSystemTestArtifacts(targetState) {
    if (!targetState || typeof targetState !== "object") return false;
    let changed = false;
    targetState.users = Array.isArray(targetState.users) ? targetState.users : [];
    targetState.openComandas = Array.isArray(targetState.openComandas) ? targetState.openComandas : [];
    targetState.closedComandas = Array.isArray(targetState.closedComandas) ? targetState.closedComandas : [];
    targetState.history90 = Array.isArray(targetState.history90) ? targetState.history90 : [];
    targetState.auditLog = Array.isArray(targetState.auditLog) ? targetState.auditLog : [];
    targetState.payables = Array.isArray(targetState.payables) ? targetState.payables : [];
    targetState.cookHistory = Array.isArray(targetState.cookHistory) ? targetState.cookHistory : [];
    targetState.cashHtmlReports = Array.isArray(targetState.cashHtmlReports) ? targetState.cashHtmlReports : [];
    targetState.financeCycleReports = Array.isArray(targetState.financeCycleReports) ? targetState.financeCycleReports : [];
    targetState.meta = targetState.meta || {};

    const removedUserIds = new Set();
    const keptUsers = [];
    for (const user of targetState.users) {
      if (isKnownSystemTestUser(user)) {
        removedUserIds.add(String(user.id || ""));
        changed = true;
        continue;
      }
      keptUsers.push(user);
    }
    targetState.users = keptUsers;

    const shouldDropComanda = (comanda) => {
      if (!comanda || typeof comanda !== "object") return true;
      if (removedUserIds.has(String(comanda.createdBy || ""))) return true;
      const hasTestEvents = (comanda.events || []).some(
        (event) => removedUserIds.has(String(event?.actorId || "")) || isSystemTestAuditEntry(event)
      );
      if (hasTestEvents) return true;
      const hasTestItems = (comanda.items || []).some(
        (item) => hasSystemTestMarker(item?.name) || hasSystemTestMarker(item?.waiterNote)
      );
      return hasTestItems;
    };

    const sanitizeComandaEvents = (comanda) => {
      const original = Array.isArray(comanda.events) ? comanda.events : [];
      const filtered = original.filter(
        (event) => !removedUserIds.has(String(event?.actorId || "")) && !isSystemTestAuditEntry(event)
      );
      if (filtered.length !== original.length) {
        comanda.events = filtered;
        changed = true;
      }
    };

    const keepOpen = [];
    for (const comanda of targetState.openComandas) {
      if (shouldDropComanda(comanda)) {
        changed = true;
        continue;
      }
      sanitizeComandaEvents(comanda);
      keepOpen.push(comanda);
    }
    targetState.openComandas = keepOpen;

    const keepClosed = [];
    for (const comanda of targetState.closedComandas) {
      if (shouldDropComanda(comanda)) {
        changed = true;
        continue;
      }
      sanitizeComandaEvents(comanda);
      keepClosed.push(comanda);
    }
    targetState.closedComandas = keepClosed;

    const keepHistory = [];
    for (const closure of targetState.history90) {
      const copy = { ...closure };
      const closureComandas = Array.isArray(copy.commandas) ? copy.commandas : [];
      const keptClosureComandas = [];
      for (const comanda of closureComandas) {
        if (shouldDropComanda(comanda)) {
          changed = true;
          continue;
        }
        sanitizeComandaEvents(comanda);
        keptClosureComandas.push(comanda);
      }
      copy.commandas = keptClosureComandas;
      const closureAudit = Array.isArray(copy.auditLog) ? copy.auditLog : [];
      const filteredClosureAudit = closureAudit.filter(
        (event) =>
          !removedUserIds.has(String(event?.actorId || "")) &&
          !isSystemTestAuditEntry(event) &&
          (!event?.comandaId || keptClosureComandas.some((comanda) => String(comanda.id || "") === String(event.comandaId || "")))
      );
      if (filteredClosureAudit.length !== closureAudit.length) {
        copy.auditLog = filteredClosureAudit;
        changed = true;
      }
      if (copy.commandas.length || (copy.auditLog || []).length) {
        keepHistory.push(copy);
      } else {
        changed = true;
      }
    }
    targetState.history90 = keepHistory;

    const allComandaIds = new Set(
      [
        ...targetState.openComandas.map((comanda) => String(comanda.id || "")),
        ...targetState.closedComandas.map((comanda) => String(comanda.id || "")),
        ...targetState.history90.flatMap((closure) => (closure.commandas || []).map((comanda) => String(comanda.id || "")))
      ].filter(Boolean)
    );

    const originalAudit = targetState.auditLog;
    targetState.auditLog = originalAudit.filter(
      (entry) =>
        !removedUserIds.has(String(entry?.actorId || "")) &&
        !isSystemTestAuditEntry(entry) &&
        (!entry?.comandaId || allComandaIds.has(String(entry.comandaId || "")))
    );
    if (targetState.auditLog.length !== originalAudit.length) changed = true;

    const originalPayables = targetState.payables;
    targetState.payables = originalPayables.filter(
      (entry) => allComandaIds.has(String(entry?.comandaId || "")) && !hasSystemTestMarker(entry?.customerName)
    );
    if (targetState.payables.length !== originalPayables.length) changed = true;

    const originalCookHistory = targetState.cookHistory;
    targetState.cookHistory = originalCookHistory.filter(
      (entry) => allComandaIds.has(String(entry?.comandaId || "")) && !removedUserIds.has(String(entry?.cookId || ""))
    );
    if (targetState.cookHistory.length !== originalCookHistory.length) changed = true;

    const originalCashHtml = targetState.cashHtmlReports;
    targetState.cashHtmlReports = originalCashHtml.filter(
      (entry) => !hasSystemTestMarker(entry?.title) && !hasSystemTestMarker(entry?.subtitle)
    );
    if (targetState.cashHtmlReports.length !== originalCashHtml.length) changed = true;

    if (removedUserIds.size) {
      const deletedIds = normalizeDeletedIdList([...(targetState.meta.deletedUserIds || []), ...removedUserIds]);
      targetState.meta.deletedUserIds = deletedIds;
    }

    return changed;
  }

  function ensureSystemUsers(targetState) {
    targetState.users = Array.isArray(targetState.users) ? targetState.users : [];
    const hasActiveAdmin = targetState.users.some((u) => u?.role === "admin" && u?.active !== false);
    if (hasActiveAdmin) return;

    const existingLogins = new Set(
      targetState.users
        .map((u) => String(u?.login || "").trim())
        .filter(Boolean)
    );
    let nextLogin = "admin";
    let suffix = 2;
    while (existingLogins.has(nextLogin)) {
      nextLogin = `admin${suffix++}`;
    }

    targetState.seq = targetState.seq || {};
    const fallbackId = Math.max(0, ...targetState.users.map((u) => Number(u?.id || 0))) + 1;
    const nextUserId = Number.isInteger(Number(targetState.seq.user)) && Number(targetState.seq.user) > 0 ? Number(targetState.seq.user) : fallbackId;
    targetState.users.push({
      id: nextUserId,
      role: "admin",
      name: "Administrador",
      functionName: "Administrador",
      login: nextLogin,
      password: "admin",
      active: true
    });
    targetState.seq.user = Math.max(Number(targetState.seq.user || 0), nextUserId + 1);
  }

  function applyFinalClientPreparation(targetState) {
    targetState.meta = targetState.meta || {};
    ensureSystemUsers(targetState);
    targetState.meta[FINAL_CLIENT_PREP_FLAG] = true;
    if (!targetState.meta[FINAL_CLIENT_PREP_MARKER]) {
      targetState.meta[FINAL_CLIENT_PREP_MARKER] = isoNow();
    }
    targetState.meta[FINAL_CLIENT_PREP_SIGNATURE_KEY] = FINAL_CLIENT_PREP_SIGNATURE;
  }

  function findLatestBackupWaiterByName(targetState, waiterName) {
    const backups = normalizeCatalogBackups(targetState?.meta?.[CATALOG_BACKUPS_META_KEY]);
    if (!backups.length) return null;
    const target = String(waiterName || "").trim().toLowerCase();
    if (!target) return null;
    const ordered = [...backups].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    for (const backup of ordered) {
      const waiter = (backup.users || []).find(
        (user) => user?.role === "waiter" && String(user?.name || "").trim().toLowerCase() === target
      );
      if (waiter) return waiter;
    }
    return null;
  }

  function applyEduardoCredentialRecovery(targetState) {
    if (!targetState || typeof targetState !== "object") return false;
    targetState.meta = targetState.meta || {};
    if (targetState.meta[EDUARDO_RECOVERY_MARKER_KEY]) return false;
    targetState.users = Array.isArray(targetState.users) ? targetState.users : [];

    const backupWaiter = findLatestBackupWaiterByName(targetState, "Eduardo");
    if (!backupWaiter) return false;

    const backupId = String(backupWaiter.id || "").trim();
    let targetUser =
      targetState.users.find((user) => String(user?.id || "").trim() === backupId) ||
      targetState.users.find((user) => user?.role === "waiter" && String(user?.name || "").trim().toLowerCase() === "orion");

    if (!targetUser) {
      const maxId = Math.max(0, ...targetState.users.map((user) => Number(user?.id || 0)));
      const nextId = Math.max(maxId + 1, Number(targetState.seq?.user || 0) || 0);
      targetUser = {
        id: nextId,
        role: "waiter",
        name: String(backupWaiter.name || "Eduardo"),
        functionName: String(backupWaiter.functionName || "Garcom"),
        login: String(backupWaiter.login || "eduardo"),
        password: String(backupWaiter.password || ""),
        active: backupWaiter.active !== false
      };
      targetState.users.push(targetUser);
      targetState.seq = targetState.seq || {};
      targetState.seq.user = Math.max(Number(targetState.seq.user || 0), nextId + 1);
      targetState.meta[EDUARDO_RECOVERY_MARKER_KEY] = isoNow();
      return true;
    }

    const loginFromBackup = String(backupWaiter.login || "").trim();
    const loginInUseByOther = targetState.users.some(
      (user) => user !== targetUser && String(user?.login || "").trim() === loginFromBackup
    );

    targetUser.role = "waiter";
    targetUser.name = String(backupWaiter.name || targetUser.name || "Eduardo");
    targetUser.functionName = String(backupWaiter.functionName || targetUser.functionName || "Garcom");
    if (loginFromBackup && !loginInUseByOther) {
      targetUser.login = loginFromBackup;
    }
    if (backupWaiter.password !== undefined && backupWaiter.password !== null && String(backupWaiter.password) !== "") {
      targetUser.password = String(backupWaiter.password);
    }
    targetUser.active = backupWaiter.active !== false;
    targetState.meta[EDUARDO_RECOVERY_MARKER_KEY] = isoNow();
    return true;
  }

  function normalizeCategoryName(category) {
    const raw = String(category || "").trim();
    if (!raw) return "Avulso";
    const flat = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (flat === "doses" || flat === "dose" || flat === "doses/copo" || flat === "dose/copo" || flat === "copo") return "Dose/Copo";
    if (flat === "bar" || flat === "bebida" || flat === "bebidas") return "Bar";
    if (flat === "cozinha" || flat === "lanche" || flat === "lanches") return "Cozinha";
    if (flat === "espetinho" || flat === "espetinhos" || flat === "espertinho" || flat === "espertinhos") return "Espetinhos";
    if (flat === "avulso" || flat === "avulsos" || flat === "variedades" || flat === "variados") return "Avulso";
    if (flat === "oferta" || flat === "ofertas") return "Ofertas";
    return "Avulso";
  }

  function normalizeProductCategory(category) {
    return normalizeCategoryName(category);
  }

  function normalizeProductSubcategory(product) {
    if (product.category !== "Bar") return "";
    const raw = String(product.subcategory || "").trim();
    return BAR_SUBCATEGORIES.includes(raw) ? raw : "Geral";
  }

  function normalizeComandaItem(item, fallbackId = 0) {
    const category = normalizeCategoryName(item.category);
    const requiresKitchen = KITCHEN_CATEGORIES.has(category) ? true : category === "Ofertas" ? Boolean(item.requiresKitchen) : false;
    const needsKitchen = requiresKitchen || (item.needsKitchen !== undefined ? Boolean(item.needsKitchen) : false);
    const kitchenPriority = needsKitchen ? String(item.kitchenPriority || "normal") : "";
    const rawVisualState =
      item.waiterVisualState === "new" || item.waiterVisualState === "ready" || item.waiterVisualState === "seen"
        ? item.waiterVisualState
        : item.kitchenStatus === "entregue" && item.kitchenAlertUnread
          ? "ready"
          : "";
    const visualState = rawVisualState === "ready" && !item.kitchenAlertUnread ? "seen" : rawVisualState;
    return {
      ...item,
      id: item.id || `IT-NORM-${fallbackId}`,
      category,
      subcategory: normalizeProductSubcategory(item, category),
      requiresKitchen,
      needsKitchen,
      kitchenPriority: needsKitchen && ["normal", "comum", "alta", "maxima"].includes(kitchenPriority) ? kitchenPriority : needsKitchen ? "normal" : "",
      kitchenPriorityById: item.kitchenPriorityById || null,
      kitchenPriorityByName: item.kitchenPriorityByName || "",
      kitchenPriorityAt: item.kitchenPriorityAt || null,
      kitchenReceivedAt: item.kitchenReceivedAt || null,
      kitchenReceivedById: item.kitchenReceivedById || null,
      kitchenReceivedByName: item.kitchenReceivedByName || "",
      kitchenAlertUnread: Boolean(item.kitchenAlertUnread),
      waiterVisualState: visualState,
      waiterVisualUpdatedAt: item.waiterVisualUpdatedAt || null
    };
  }

  function normalizeComandaRecord(comanda, fallbackId = 0) {
    const items = Array.isArray(comanda.items) ? comanda.items.map((item, idx) => normalizeComandaItem(item || {}, idx + 1)) : [];
    const hasKitchenUnread = items.some((item) => itemNeedsKitchen(item) && item.kitchenAlertUnread && !item.canceled);
    return {
      ...comanda,
      id: comanda.id || `CMD-NORM-${fallbackId + 1}`,
      table: comanda.table || "-",
      items,
      kitchenAlertUnread: hasKitchenUnread
    };
  }

  function normalizeProductRecord(product, fallbackId = 0) {
    const id = Number(product.id || fallbackId);
    const canonical = CANONICAL_PRODUCT_BY_ID[id];
    const categoryFromInput = String(product.category || "").trim();
    const effectiveCategory = canonical ? canonical.category : normalizeProductCategory(categoryFromInput);
    const normalized = {
      ...product,
      id,
      category: effectiveCategory,
      price: Number(product.price ?? canonical?.price ?? 0),
      stock: Number(product.stock ?? canonical?.stock ?? 0),
      cost: Number(product.cost ?? canonical?.cost ?? 0),
      prepTime: Number(product.prepTime ?? canonical?.prepTime ?? 0),
      name: String(product.name || canonical?.name || "")
    };
    normalized.subcategory = canonical ? canonical.subcategory : normalizeProductSubcategory(product);
    normalized.available = product.available !== false;
    normalized.requiresKitchen = canonical
      ? Boolean(canonical.requiresKitchen)
      : KITCHEN_CATEGORIES.has(effectiveCategory)
        ? true
        : effectiveCategory === "Ofertas"
          ? Boolean(product.requiresKitchen)
          : false;
    normalized.updatedAt = product.updatedAt ? String(product.updatedAt) : isoNow();
    return normalized;
  }

  function normalizeUserRecord(user, fallbackId = 0) {
    const normalized = {
      ...user,
      id: Number(user.id || fallbackId),
      name: String(user.name || ""),
      role: String(user.role || "waiter"),
      login: String(user.login || "").trim(),
      password: String(user.password || ""),
      active: user.active !== false,
      updatedAt: user.updatedAt ? String(user.updatedAt) : isoNow()
    };
    return normalized;
  }

  function normalizePayableRecord(payable, fallbackId = 0) {
    const source = payable && typeof payable === "object" ? payable : {};
    const createdAt = String(source.createdAt || source.paidAt || "");
    const paidAt = source.paidAt ? String(source.paidAt) : null;
    const updatedAt = String(source.updatedAt || paidAt || createdAt || "");
    const adjustments = Array.isArray(source.adjustments)
      ? source.adjustments
        .filter((entry) => entry && typeof entry === "object")
        .map((entry, idx) => ({
          id: String(entry.id || `PGA-NORM-${fallbackId + 1}-${idx + 1}`),
          ts: String(entry.ts || entry.createdAt || updatedAt || createdAt || ""),
          type: String(entry.type || "manual"),
          detail: String(entry.detail || ""),
          amountDelta: parseNumber(entry.amountDelta || 0),
          productId: entry.productId !== undefined && entry.productId !== null ? Number(entry.productId) : null,
          productName: String(entry.productName || ""),
          qty: Math.max(0, parseNumber(entry.qty || 0)),
          unitPrice: Math.max(0, parseNumber(entry.unitPrice || 0)),
          actorId: entry.actorId !== undefined ? entry.actorId : null,
          actorRole: String(entry.actorRole || ""),
          actorName: String(entry.actorName || "")
        }))
      : [];
    const total = Math.max(0, parseNumber(source.total || 0));
    const status = source.status === "pago" ? "pago" : "pendente";
    return {
      ...source,
      id: String(source.id || `PG-NORM-${String(fallbackId + 1).padStart(5, "0")}`),
      comandaId: String(source.comandaId || "-"),
      customerName: String(source.customerName || ""),
      total,
      status,
      createdAt,
      updatedAt,
      paidAt: status === "pago" ? paidAt || updatedAt || createdAt : null,
      paidMethod: source.paidMethod ? String(source.paidMethod) : null,
      adjustments
    };
  }

  function normalizeStateShape(source) {
    console.log("[normalizeStateShape] Starting with source, openComandas count:", source.openComandas?.length);
    const parsed = source && typeof source === "object" ? source : {};
    const fallback = initialState();
    const deletedProductIdsRaw = normalizeDeletedIdList(parsed.meta?.deletedProductIds);
    const deletedUserIdsRaw = normalizeDeletedIdList(parsed.meta?.deletedUserIds);
    const deletedComandaIdsRaw = normalizeDeletedIdList(parsed.meta?.deletedComandaIds);
    const deletedProductSet = new Set(deletedProductIdsRaw.map(id => String(id)));
    const deletedUserSet = new Set(deletedUserIdsRaw.map(id => String(id)));
    const deletedComandaSet = new Set(deletedComandaIdsRaw.map(id => String(id)));
    const normalized = {
      ...fallback,
      ...parsed,
      users: (Array.isArray(parsed.users) ? parsed.users.map((u, idx) => normalizeUserRecord(u || {}, idx + 1)) : fallback.users.map((u) => normalizeUserRecord(u || {}, u.id)))
        .filter(u => !deletedUserSet.has(String(u?.id ?? "").trim())),
      products: (Array.isArray(parsed.products)
        ? parsed.products.map((p, idx) => normalizeProductRecord(p || {}, idx + 1))
        : fallback.products.map((p) => normalizeProductRecord(p || {}, p.id)))
        .filter(p => !deletedProductSet.has(String(p?.id ?? "").trim())),
      openComandas: (Array.isArray(parsed.openComandas) ? parsed.openComandas.map((c, idx) => normalizeComandaRecord(c || {}, idx)) : [])
        .filter(c => !deletedComandaSet.has(String(c?.id ?? "").trim())),
      closedComandas: (Array.isArray(parsed.closedComandas) ? parsed.closedComandas.map((c, idx) => normalizeComandaRecord(c || {}, idx)) : [])
        .filter(c => !deletedComandaSet.has(String(c?.id ?? "").trim())),
      cashHtmlReports: Array.isArray(parsed.cashHtmlReports)
        ? parsed.cashHtmlReports.map((entry, idx) => normalizeCashHtmlReportRecord(entry, idx))
        : [],
      internalCashAudits: Array.isArray(parsed.internalCashAudits)
        ? parsed.internalCashAudits.map((entry, idx) => normalizeInternalCashAuditRecord(entry, idx))
        : [],
      financeCycleReports: Array.isArray(parsed.financeCycleReports)
        ? parsed.financeCycleReports.map((entry, idx) => normalizeFinanceCycleReportRecord(entry, idx))
        : [],
      cookHistory: Array.isArray(parsed.cookHistory) ? parsed.cookHistory : [],
      payables: Array.isArray(parsed.payables) ? parsed.payables.map((entry, idx) => normalizePayableRecord(entry, idx)) : [],
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
      history90: Array.isArray(parsed.history90)
        ? parsed.history90.map((entry) => ({
          ...entry,
          commandas: (Array.isArray(entry.commandas) ? entry.commandas.map((c, idx) => normalizeComandaRecord(c || {}, idx)) : [])
            .filter(c => !deletedComandaSet.has(String(c?.id ?? "").trim()))
        }))
        : [],
      seq: { ...fallback.seq, ...(parsed.seq || {}) },
      meta: {
        ...fallback.meta,
        ...(parsed.meta || {}),
        [CATALOG_BACKUPS_META_KEY]: normalizeCatalogBackups(parsed.meta?.[CATALOG_BACKUPS_META_KEY]),
        deletedProductIds: deletedProductIdsRaw,
        deletedUserIds: deletedUserIdsRaw,
        deletedComandaIds: deletedComandaIdsRaw,
        financeCycleStartedAt: normalizeIsoTimestamp(parsed.meta?.financeCycleStartedAt),
        operationalResetAt: "", // Clear operational reset to prevent data loss
        realtimeAuditResetAt: normalizeIsoTimestamp(parsed.meta?.realtimeAuditResetAt),
        [FINAL_CLIENT_PREP_FLAG]: parsed.meta?.[FINAL_CLIENT_PREP_FLAG] === true,
        [FINAL_CLIENT_PREP_MARKER]:
          typeof parsed.meta?.[FINAL_CLIENT_PREP_MARKER] === "string" && parsed.meta?.[FINAL_CLIENT_PREP_MARKER]
            ? parsed.meta[FINAL_CLIENT_PREP_MARKER]
            : "",
        [FINAL_CLIENT_PREP_SIGNATURE_KEY]:
          typeof parsed.meta?.[FINAL_CLIENT_PREP_SIGNATURE_KEY] === "string" && parsed.meta?.[FINAL_CLIENT_PREP_SIGNATURE_KEY]
            ? parsed.meta[FINAL_CLIENT_PREP_SIGNATURE_KEY]
            : ""
      },
      cash: { ...fallback.cash, ...(parsed.cash || {}) },
      session: { userId: parsed.session?.userId || null }
    };
    console.log("[normalizeStateShape] After initial normalization, openComandas count:", normalized.openComandas?.length);
    normalized.meta.deletedUserIds = sanitizeDeletedUserIds(normalized.meta.deletedUserIds, normalized);
    normalized.meta.deletedProductIds = sanitizeDeletedProductIds(normalized.meta.deletedProductIds, normalized);

    ensureSystemUsers(normalized);
    const recovered = applyCatalogBackupRecovery(normalized);
    console.log("[normalizeStateShape] After applyCatalogBackupRecovery, openComandas count:", recovered.openComandas?.length);
    recovered.seq = recovered.seq || normalized.seq || {};
    recovered.meta = recovered.meta || {};
    recovered.meta.deletedUserIds = sanitizeDeletedUserIds(recovered.meta.deletedUserIds, normalized, recovered);
    recovered.meta.deletedProductIds = sanitizeDeletedProductIds(recovered.meta.deletedProductIds, normalized, recovered);
    recovered.meta.deletedComandaIds = normalizeDeletedIdList(recovered.meta.deletedComandaIds);
    applyEduardoCredentialRecovery(recovered);
    purgeSystemTestArtifacts(recovered);
    applyFinalClientPreparation(recovered);
    console.log("[normalizeStateShape] Before applyOperationalResetCutoff, openComandas count:", recovered.openComandas?.length);
    applyOperationalResetCutoff(recovered, recovered.meta?.operationalResetAt);
    console.log("[normalizeStateShape] After applyOperationalResetCutoff, openComandas count:", recovered.openComandas?.length);
    applyRealtimeAuditCutoff(recovered, recovered.meta?.realtimeAuditResetAt);
    console.log("[normalizeStateShape] Before sanitizeOperationalComandasAgainstHistory, openComandas count:", recovered.openComandas?.length);
    sanitizeOperationalComandasAgainstHistory(recovered);
    console.log("[normalizeStateShape] After sanitizeOperationalComandasAgainstHistory, openComandas count:", recovered.openComandas?.length);
    recomputeComandaSequence(recovered);
    ensureCatalogBackup(recovered, "normalize");
    pruneHistory(recovered);
    prunePayables(recovered);
    pruneCashHtmlReports(recovered);
    pruneInternalCashAudits(recovered);
    pruneFinanceCycleReports(recovered);
    console.log("[normalizeStateShape] Final openComandas count:", recovered.openComandas?.length);
    return recovered;
  }

  function loadState() {
    console.log("[loadState] Starting load");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      console.log("[loadState] No existing state found, using initial");
      const first = initialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(first));
      return first;
    }

    try {
      const parsed = JSON.parse(raw);
      console.log("[loadState] Loaded from localStorage, openComandas count:", parsed.openComandas?.length);
      console.log("[loadState] Loaded from localStorage, parsed.openComandas:", parsed.openComandas);
      const merged = normalizeStateShape(parsed);
      console.log("[loadState] After normalizeStateShape, openComandas count:", merged.openComandas?.length);
      console.log("[loadState] After normalizeStateShape, merged.openComandas:", merged.openComandas);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (_err) {
      console.error("[loadState] Error loading state, using initial:", _err);
      const clean = initialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      return clean;
    }
  }

  function parseSessionIdentity(raw) {
    const value = String(raw || "").trim();
    if (!value) return null;
    if (value === DEV_SESSION_ID) return DEV_SESSION_ID;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function loadSessionUserId(fallbackUserId = null) {
    const tabSession = parseSessionIdentity(sessionStorage.getItem(SESSION_TAB_KEY));
    if (tabSession) {
      return tabSession;
    }

    const persistentSession = parseSessionIdentity(localStorage.getItem(SESSION_KEY));
    if (persistentSession) {
      sessionStorage.setItem(SESSION_TAB_KEY, String(persistentSession));
      return persistentSession;
    }

    const fallbackSession = parseSessionIdentity(fallbackUserId);
    if (fallbackSession) {
      sessionStorage.setItem(SESSION_TAB_KEY, String(fallbackSession));
      return fallbackSession;
    }
    return null;
  }

  function persistSessionUserId(userId, rememberLogin = false) {
    const parsed = parseSessionIdentity(userId);
    if (parsed) {
      sessionStorage.setItem(SESSION_TAB_KEY, String(parsed));
      if (rememberLogin) {
        localStorage.setItem(SESSION_KEY, String(parsed));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
      return;
    }
    sessionStorage.removeItem(SESSION_TAB_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  function normalizePrinterPrefs(source) {
    const parsed = source && typeof source === "object" ? source : {};
    const paperWidthMm = Number(parsed.receiptPaperWidthMm || DEFAULT_RECEIPT_PAPER_WIDTH_MM);
    return {
      kitchenDirectEnabled: parsed.kitchenDirectEnabled === true,
      kitchenPrinterName: String(parsed.kitchenPrinterName || "").trim(),
      receiptDirectEnabled: parsed.receiptDirectEnabled === true,
      receiptPrinterName: String(parsed.receiptPrinterName || "").trim(),
      receiptPaperWidthMm: paperWidthMm === 80 ? 80 : DEFAULT_RECEIPT_PAPER_WIDTH_MM
    };
  }

  function loadPrinterPrefs() {
    const raw = localStorage.getItem(PRINTER_PREFS_KEY);
    if (!raw) return normalizePrinterPrefs(null);
    try {
      return normalizePrinterPrefs(JSON.parse(raw));
    } catch (_err) {
      return normalizePrinterPrefs(null);
    }
  }

  function persistPrinterPrefs() {
    localStorage.setItem(PRINTER_PREFS_KEY, JSON.stringify(normalizePrinterPrefs(uiState.printerPrefs)));
  }

  function sanitizeStateForCloud(source) {
    try {
      const cloned = JSON.parse(JSON.stringify(source));
      cloned.session = { userId: null };
      return cloned;
    } catch (_err) {
      const fallback = { ...source, session: { userId: null } };
      return fallback;
    }
  }

  function buildComparableCloudState(source) {
    const comparable = sanitizeStateForCloud(source);
    comparable.meta = comparable.meta || {};
    comparable.meta.lastCloudSyncAt = null;
    return comparable;
  }

  function cloudStateFingerprint(source) {
    try {
      return hashText(stableSerializeForHash(buildComparableCloudState(source)));
    } catch (_err) {
      return "";
    }
  }

  function areCloudStatesEquivalent(localCandidate, remoteCandidate) {
    const localFingerprint = cloudStateFingerprint(localCandidate);
    const remoteFingerprint = cloudStateFingerprint(remoteCandidate);
    return Boolean(localFingerprint) && localFingerprint === remoteFingerprint;
  }

  let state = loadState();
  let sessionUserId = loadSessionUserId(null);
  state.session = { userId: null };
  const sessionUserExists =
    sessionUserId === DEV_SESSION_ID ||
    state.users.some((u) => u.id === sessionUserId && u.active !== false);
  if (sessionUserId && !sessionUserExists) {
    sessionUserId = null;
    persistSessionUserId(null);
  }
  const supabaseCtx = {
    client: null,
    channel: null,
    connected: false,
    syncTimer: null,
    syncInFlight: false,
    syncQueued: false,
    reconnectTimer: null,
    reconnectAttempts: 0,
    syncRetryCount: 0,
    pullDebounceTimer: null,
    pullInFlight: false,
    pullQueued: false,
    lastSyncErrorAt: null,
    lastSyncError: "",
    lastKnownRemoteUpdatedAt: "",
    lastObservedRemoteUpdatedAt: "",
    lastSyncedCloudFingerprint: "",
    pendingStateChangeBroadcast: null,
    prioritizeNextCloudSync: false
  };

  let stateVersion = 0;
  let lastRenderedVersion = -1;
  let lastPushAt = 0;

  function rememberObservedRemoteUpdatedAt(updatedAtValue) {
    const rawValue = typeof updatedAtValue === "string" ? updatedAtValue.trim() : "";
    const normalized = normalizeIsoTimestamp(rawValue);
    if (!normalized || !rawValue) return "";
    const incomingTs = parseUpdatedAtTimestamp(rawValue);
    const currentTs = parseUpdatedAtTimestamp(supabaseCtx.lastObservedRemoteUpdatedAt);
    if (!currentTs || incomingTs >= currentTs) {
      supabaseCtx.lastObservedRemoteUpdatedAt = rawValue;
    }
    return rawValue;
  }

  function rememberKnownRemoteUpdatedAt(updatedAtValue) {
    const normalized = rememberObservedRemoteUpdatedAt(updatedAtValue);
    if (!normalized) return "";
    supabaseCtx.lastKnownRemoteUpdatedAt = normalized;
    return normalized;
  }

  function rememberSyncedCloudFingerprint(source) {
    const fingerprint = cloudStateFingerprint(source);
    if (!fingerprint) return "";
    supabaseCtx.lastSyncedCloudFingerprint = fingerprint;
    return fingerprint;
  }

  function finalizeSuccessfulCloudSync(source, remoteUpdatedAtValue) {
    lastPushAt = Date.now();
    state.meta = state.meta || {};
    state.meta.lastCloudSyncAt = isoNow();
    stateVersion++;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_lsErr) { }
    rememberKnownRemoteUpdatedAt(remoteUpdatedAtValue);
    rememberSyncedCloudFingerprint(source);
    supabaseCtx.syncRetryCount = 0;
    supabaseCtx.lastSyncError = "";
    supabaseCtx.lastSyncErrorAt = null;
    setSupabaseStatus("conectado");
  }

  function queuePendingStateChangeBroadcast(options = {}) {
    const actor = options.actor || getCurrentUser() || { id: 0, role: "system", name: "Sistema" };
    supabaseCtx.pendingStateChangeBroadcast = {
      actorId: actor?.id ?? null,
      actorRole: String(actor?.role || "system"),
      actorName: String(actor?.name || "Sistema"),
      reason: String(options.reason || "").trim(),
      localUpdatedAt: normalizeIsoTimestamp(options.localUpdatedAt || state.meta?.updatedAt) || isoNow()
    };
  }

  function clearPendingStateChangeBroadcast() {
    supabaseCtx.pendingStateChangeBroadcast = null;
  }

  function broadcastRealtimePayload(event, payload) {
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
  }

  function mergeRealtimeItems(existingItems, incomingItems) {
    const itemMap = new Map();
    for (const item of Array.isArray(existingItems) ? existingItems : []) {
      const id = String(item?.id || "").trim();
      if (id) itemMap.set(id, item);
    }
    for (const item of Array.isArray(incomingItems) ? incomingItems : []) {
      const id = String(item?.id || "").trim();
      if (!id) continue;
      const existing = itemMap.get(id);
      if (!existing || latestKitchenItemTimestamp(item) >= latestKitchenItemTimestamp(existing)) {
        itemMap.set(id, item);
      }
    }
    return [...itemMap.values()];
  }

  function applyKitchenOrderUpsert(payload) {
    if (!payload || payload.sessionId === clientSessionId) return false;
    const incoming = payload.comanda;
    const comandaId = String(incoming?.id || "").trim();
    if (!comandaId || !Array.isArray(incoming?.items)) return false;
    const incomingHasKitchenOrder = incoming.items.some((item) => itemNeedsKitchen(item) && !item?.canceled);
    if (!incomingHasKitchenOrder) return false;

    const openRows = Array.isArray(state.openComandas) ? state.openComandas : [];
    const existingIndex = openRows.findIndex((comanda) => String(comanda?.id || "").trim() === comandaId);
    if (existingIndex >= 0) {
      const existing = openRows[existingIndex];
      openRows[existingIndex] = {
        ...existing,
        ...incoming,
        items: mergeRealtimeItems(existing.items, incoming.items),
        events: mergeAuditRows(existing.events, incoming.events).sort((a, b) => new Date(a?.ts || 0) - new Date(b?.ts || 0))
      };
    } else {
      state.openComandas = [...openRows, incoming];
    }
    saveState({ skipCloud: true, touchMeta: false });
    return true;
  }

  function applyComandaUpsert(payload) {
    if (!payload || payload.sessionId === clientSessionId) return false;
    const incoming = payload.comanda;
    const comandaId = String(incoming?.id || "").trim();
    if (!comandaId) return false;

    const openRows = Array.isArray(state.openComandas) ? state.openComandas : [];
    const existingIndex = openRows.findIndex((comanda) => String(comanda?.id || "").trim() === comandaId);
    if (existingIndex >= 0) {
      const existing = openRows[existingIndex];
      openRows[existingIndex] = {
        ...existing,
        ...incoming,
        items: Array.isArray(incoming.items) ? mergeRealtimeItems(existing.items, incoming.items) : existing.items,
        events: Array.isArray(incoming.events) ? mergeAuditRows(existing.events, incoming.events).sort((a, b) => new Date(a?.ts || 0) - new Date(b?.ts || 0)) : existing.events
      };
    } else {
      state.openComandas = [...openRows, incoming];
    }
    saveState({ skipCloud: true, touchMeta: false });
    return true;
  }

  function adoptIncomingState(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return;
    }
    try {
      const currentSession = sessionUserId;
      // #region debug-point C:adopt-before
      debugReport("C", "app.js:adoptIncomingState", "Adotando estado remoto", {
        currentUsers: (Array.isArray(state?.users) ? state.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        incomingUsers: (Array.isArray(source?.users) ? source.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        currentOpenComandas: (Array.isArray(state?.openComandas) ? state.openComandas : []).map((c) => c?.id),
        incomingOpenComandas: (Array.isArray(source?.openComandas) ? source.openComandas : []).map((c) => c?.id),
        currentMetaUpdatedAt: state?.meta?.updatedAt || "",
        incomingMetaUpdatedAt: source?.meta?.updatedAt || ""
      });
      // #endregion
      state = normalizeStateShape(source);
      state.session = { userId: null };
      sessionUserId = currentSession;
      stateVersion++;
      // #region debug-point C:adopt-after
      debugReport("C", "app.js:adoptIncomingState", "Estado adotado e normalizado", {
        users: (Array.isArray(state?.users) ? state.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        openComandas: (Array.isArray(state?.openComandas) ? state.openComandas : []).map((c) => c?.id),
        deletedUserIds: state?.meta?.deletedUserIds || [],
        deletedComandaIds: state?.meta?.deletedComandaIds || [],
        metaUpdatedAt: state?.meta?.updatedAt || ""
      });
      // #endregion
    } catch (err) {
      console.error("[adoptIncomingState] Falha ao normalizar estado recebido:", err);
    }
  }

  function saveState(options = {}) {
    const touchMeta = options.touchMeta !== false;
    state.meta = state.meta || {};
    synchronizeCashOpenedAt(state);
    rollFinance30DayCycles(state, { nowIso: isoNow() });
    ensureCatalogBackup(state, "save");
    if (touchMeta) {
      state.meta.updatedAt = isoNow();
    }
    stateVersion++;
    state.session = { userId: null };
    pruneHistory(state);
    prunePayables(state);
    pruneCashHtmlReports(state);
    pruneInternalCashAudits(state);
    pruneFinanceCycleReports(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (storageErr) {
      console.warn("[saveState] localStorage cheio, tentando pruning agressivo...", storageErr);
      try {
        state.auditLog = (state.auditLog || []).slice(0, 500);
        state.history90 = (state.history90 || []).slice(0, 30);
        state.cookHistory = (state.cookHistory || []).slice(0, 200);
        state.cashHtmlReports = (state.cashHtmlReports || []).slice(0, 30);
        state.internalCashAudits = (state.internalCashAudits || []).slice(0, 30);
        state.financeCycleReports = (state.financeCycleReports || []).slice(0, 30);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (retryErr) {
        console.error("[saveState] Falha ao salvar mesmo apos pruning:", retryErr);
      }
    }
    if (!options.skipCloud) {
      queuePendingStateChangeBroadcast({
        actor: options.actor,
        reason: options.reason,
        localUpdatedAt: state.meta?.updatedAt
      });
      scheduleSupabaseSync({
        immediate: options.cloudDelayMs === 0 || supabaseCtx.prioritizeNextCloudSync,
        delayMs: options.cloudDelayMs
      });
      supabaseCtx.prioritizeNextCloudSync = false;
    }
  }

  // Limpa qualquer sessao antiga dentro do estado compartilhado.
  saveState({ skipCloud: true, touchMeta: false });

  function setSupabaseStatus(status, errorMessage = "") {
    uiState.supabaseStatus = status;
    uiState.supabaseLastError = errorMessage;
  }

  function getSupabaseClient() {
    if (supabaseCtx.client) {
      return supabaseCtx.client;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      setSupabaseStatus("indisponivel", "Biblioteca Supabase nao carregada.");
      return null;
    }
    supabaseCtx.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          "x-project-id": SUPABASE_PROJECT_ID,
          "x-publishable-key": SUPABASE_PUBLISHABLE_KEY
        }
      }
    });
    return supabaseCtx.client;
  }

  function scheduleSupabaseSync(options = {}) {
    supabaseCtx.syncQueued = true;
    if (supabaseCtx.syncTimer) {
      clearTimeout(supabaseCtx.syncTimer);
    }
    const requestedDelay = Number.isFinite(Number(options.delayMs)) ? Number(options.delayMs) : CLOUD_SYNC_DEBOUNCE_MS;
    const delayMs = options.immediate ? 0 : Math.max(0, requestedDelay);
    supabaseCtx.syncTimer = setTimeout(() => {
      supabaseCtx.syncTimer = null;
      void syncStateToSupabase();
    }, delayMs);
  }

  function clearSupabaseReconnectTimer() {
    if (!supabaseCtx.reconnectTimer) return;
    clearTimeout(supabaseCtx.reconnectTimer);
    supabaseCtx.reconnectTimer = null;
  }

  function scheduleSupabaseReconnect(delayMs = 2000) {
    if (supabaseCtx.reconnectTimer) return;
    supabaseCtx.reconnectTimer = setTimeout(() => {
      supabaseCtx.reconnectTimer = null;
      void connectSupabase();
    }, Math.max(1000, Number(delayMs || 2000)));
  }

  async function syncStateToSupabase() {
    const client = getSupabaseClient();
    if (!client) return;
    if (supabaseCtx.syncInFlight) {
      supabaseCtx.syncQueued = true;
      return;
    }
    if (!supabaseCtx.syncQueued) return;

    supabaseCtx.syncInFlight = true;
    supabaseCtx.syncQueued = false;
    ensureCatalogBackup(state, "sync");
    const sanitized = sanitizeStateForCloud(state);
    const localFingerprint = cloudStateFingerprint(sanitized);
    if (localFingerprint && localFingerprint === supabaseCtx.lastSyncedCloudFingerprint) {
      supabaseCtx.syncRetryCount = 0;
      supabaseCtx.lastSyncError = "";
      supabaseCtx.lastSyncErrorAt = null;
      setSupabaseStatus("conectado");
      clearPendingStateChangeBroadcast();
      supabaseCtx.syncInFlight = false;
      return;
    }
    try {
      // #region debug-point E:sync-start
      debugReport("E", "app.js:syncStateToSupabase", "Iniciando sync", {
        localMetaUpdatedAt: sanitized?.meta?.updatedAt || "",
        users: (Array.isArray(sanitized?.users) ? sanitized.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        openComandas: (Array.isArray(sanitized?.openComandas) ? sanitized.openComandas : []).map((c) => c?.id),
        deletedUserIds: sanitized?.meta?.deletedUserIds || [],
        deletedComandaIds: sanitized?.meta?.deletedComandaIds || []
      });
      // #endregion
      let mergedForCloud = sanitized;
      const { data: remoteData, error: remoteErr } = await client
        .from("restobar_state")
        .select("payload,updated_at")
        .eq("id", "main")
        .maybeSingle();
      if (remoteErr) {
        throw remoteErr;
      }
      if (remoteData?.updated_at) {
        rememberObservedRemoteUpdatedAt(remoteData.updated_at);
      }
      if (remoteData?.payload && typeof remoteData.payload === "object") {
        // #region debug-point E:sync-remote-read
        debugReport("E", "app.js:syncStateToSupabase", "Estado remoto lido antes do write", {
          remoteUpdatedAt: remoteData?.updated_at || "",
          remoteMetaUpdatedAt: remoteData?.payload?.meta?.updatedAt || "",
          remoteUsers: (Array.isArray(remoteData?.payload?.users) ? remoteData.payload.users : []).map((u) => ({
            id: u?.id,
            login: u?.login,
            password: u?.password,
            updatedAt: u?.updatedAt
          })),
          remoteOpenComandas: (Array.isArray(remoteData?.payload?.openComandas) ? remoteData.payload.openComandas : []).map((c) => c?.id)
        });
        // #endregion
        mergedForCloud = mergeStateForCloud(sanitized, remoteData.payload);
      }
      mergedForCloud = applyCatalogBackupRecovery(mergedForCloud, sanitized, remoteData?.payload || null);
      ensureCatalogBackup(mergedForCloud, "sync");
      if (remoteData?.payload && typeof remoteData.payload === "object" && areCloudStatesEquivalent(mergedForCloud, remoteData.payload)) {
        finalizeSuccessfulCloudSync(mergedForCloud, remoteData.updated_at);
        clearPendingStateChangeBroadcast();
        return;
      }

      const payload = {
        id: "main",
        updated_at: isoNow(),
        payload: mergedForCloud
      };
      // Optimistic locking: só atualiza se updated_at não mudou desde o read
      const remoteUpdatedAt = typeof remoteData?.updated_at === "string" ? remoteData.updated_at.trim() : "";
      let writeResult;
      if (remoteUpdatedAt) {
        writeResult = await client.from("restobar_state")
          .update({ updated_at: payload.updated_at, payload: payload.payload })
          .eq("id", "main")
          .eq("updated_at", remoteUpdatedAt)
          .select("updated_at");
      } else {
        writeResult = await client.from("restobar_state").upsert(payload).select("updated_at");
      }
      const { error, data: writeData } = writeResult;
      if (error) {
        throw error;
      }
      const writtenUpdatedAt = Array.isArray(writeData) ? writeData[0]?.updated_at : "";
      // Se update não afetou nenhuma linha, outro device escreveu → re-sync
      if (remoteUpdatedAt && !writtenUpdatedAt) {
        supabaseCtx.syncQueued = true;
        return;
      }
      finalizeSuccessfulCloudSync(payload.payload, writtenUpdatedAt || payload.updated_at);
      // #region debug-point E:sync-write-success
      debugReport("E", "app.js:syncStateToSupabase", "Sync concluido com sucesso", {
        writtenUpdatedAt: writtenUpdatedAt || payload.updated_at,
        payloadMetaUpdatedAt: payload?.payload?.meta?.updatedAt || "",
        users: (Array.isArray(payload?.payload?.users) ? payload.payload.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        openComandas: (Array.isArray(payload?.payload?.openComandas) ? payload.payload.openComandas : []).map((c) => c?.id)
      });
      // #endregion
      publishSupabaseStateChange(writtenUpdatedAt || payload.updated_at);
    } catch (err) {
      // #region debug-point E:sync-error
      debugReport("E", "app.js:syncStateToSupabase", "Erro no sync", {
        error: String(err?.message || err || ""),
        localMetaUpdatedAt: sanitized?.meta?.updatedAt || ""
      });
      // #endregion
      supabaseCtx.syncQueued = true;
      supabaseCtx.syncRetryCount = Math.min(supabaseCtx.syncRetryCount + 1, 8);
      supabaseCtx.lastSyncError = String(err?.message || err || "Falha ao sincronizar.");
      supabaseCtx.lastSyncErrorAt = isoNow();
      setSupabaseStatus("aviso", supabaseCtx.lastSyncError);
    } finally {
      supabaseCtx.syncInFlight = false;
      if (supabaseCtx.syncQueued) {
        if (supabaseCtx.syncTimer) {
          clearTimeout(supabaseCtx.syncTimer);
        }
        const retryDelay = Math.min(120 * Math.pow(2, supabaseCtx.syncRetryCount), 8000);
        supabaseCtx.syncTimer = setTimeout(() => {
          supabaseCtx.syncTimer = null;
          void syncStateToSupabase();
        }, retryDelay);
      }
    }
  }

  async function pullStateFromSupabase() {
    console.log("[pullStateFromSupabase] Starting, current local openComandas count:", state.openComandas?.length);
    const client = getSupabaseClient();
    if (!client) return;
    if (supabaseCtx.pullInFlight) {
      supabaseCtx.pullQueued = true;
      return;
    }
    supabaseCtx.pullInFlight = true;
    supabaseCtx.pullQueued = false;

    try {
      const { data, error } = await client.from("restobar_state").select("payload,updated_at").eq("id", "main").maybeSingle();
      if (error || !data?.payload) {
        console.log("[pullStateFromSupabase] No data or error, returning", error);
        return;
      }
      if (typeof data.payload !== "object" || Array.isArray(data.payload)) {
        console.warn("[pullStateFromSupabase] Payload remoto invalido, ignorando.");
        return;
      }
      if (data?.updated_at) {
        rememberKnownRemoteUpdatedAt(data.updated_at);
      }

      const localUpdated = parseUpdatedAtTimestamp(state.meta?.updatedAt);
      const remoteMetaUpdated = parseUpdatedAtTimestamp(data.payload?.meta?.updatedAt);
      const remoteRowUpdated = parseUpdatedAtTimestamp(data.updated_at);
      const remoteUpdated = Math.max(remoteMetaUpdated, remoteRowUpdated);
      const localFootprint = stateFootprint(state);
      const remoteFootprint = stateFootprint(data.payload);
      // #region debug-point D:pull-read
      debugReport("D", "app.js:pullStateFromSupabase", "Estado remoto recebido", {
        remoteUpdatedAt: data?.updated_at || "",
        remoteMetaUpdatedAt: data?.payload?.meta?.updatedAt || "",
        localMetaUpdatedAt: state?.meta?.updatedAt || "",
        remoteUsers: (Array.isArray(data?.payload?.users) ? data.payload.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        localUsers: (Array.isArray(state?.users) ? state.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        remoteOpenComandas: (Array.isArray(data?.payload?.openComandas) ? data.payload.openComandas : []).map((c) => c?.id),
        localOpenComandas: (Array.isArray(state?.openComandas) ? state.openComandas : []).map((c) => c?.id),
        shouldPullCandidate: {
          localUpdated,
          remoteMetaUpdated,
          remoteUpdated
        }
      });
      // #endregion
      console.log("[pullStateFromSupabase] remoteFootprint.openComandas:", remoteFootprint.openComandas);
      console.log("[pullStateFromSupabase] data.payload.openComandas:", data.payload.openComandas);
      const localLooksReset = isLikelyResetState(state);
      const remoteHasMoreData =
        remoteFootprint.catalogRows > localFootprint.catalogRows ||
        remoteFootprint.operationalRows > localFootprint.operationalRows;
      const areEquivalent = areCloudStatesEquivalent(state, data.payload);
      const isKnownSameVersion = Boolean(data.updated_at && data.updated_at === supabaseCtx.lastKnownRemoteUpdatedAt);
      const shouldPull = !areEquivalent || !isKnownSameVersion || (Number.isFinite(remoteUpdated) && remoteUpdated > localUpdated) || (localLooksReset && remoteHasMoreData);
      console.log("[pullStateFromSupabase] shouldPull:", shouldPull, "remoteUpdated:", remoteUpdated, "localUpdated:", localUpdated);
      if (shouldPull) {
        if (shouldForceRemotePreference(data.payload, state)) {
          setSupabaseStatus("aviso", "Pull remoto ignorado para evitar sobrescrita destrutiva do historico local.");
          return;
        }
        console.log("[pullStateFromSupabase] Merging states");
        const incomingMerged = mergeStateForCloud(state, data.payload);
        console.log("[pullStateFromSupabase] After mergeStateForCloud, incomingMerged.openComandas count:", incomingMerged.openComandas?.length);
        const incomingRecovered = applyCatalogBackupRecovery(incomingMerged, state, data.payload);
        ensureCatalogBackup(incomingRecovered, "pull");
        adoptIncomingState(incomingRecovered);
        console.log("[pullStateFromSupabase] After adoptIncomingState, state.openComandas count:", state.openComandas?.length);
        state.meta.lastCloudSyncAt = isoNow();
        saveState({ skipCloud: true, touchMeta: false });
        render();
      }
      // #region debug-point D:pull-finish
      debugReport("D", "app.js:pullStateFromSupabase", "Pull finalizado", {
        shouldPull,
        stateUsers: (Array.isArray(state?.users) ? state.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt
        })),
        stateOpenComandas: (Array.isArray(state?.openComandas) ? state.openComandas : []).map((c) => c?.id),
        deletedUserIds: state?.meta?.deletedUserIds || [],
        deletedComandaIds: state?.meta?.deletedComandaIds || []
      });
      // #endregion
      if (areCloudStatesEquivalent(state, data.payload)) {
        rememberSyncedCloudFingerprint(state);
      }
      setSupabaseStatus("conectado");
    } catch (err) {
      console.error("[pullStateFromSupabase] Error:", err);
      setSupabaseStatus("aviso", String(err?.message || err || "Falha ao ler cloud."));
    } finally {
      supabaseCtx.pullInFlight = false;
      if (supabaseCtx.pullQueued) {
        supabaseCtx.pullQueued = false;
        void pullStateFromSupabase();
      }
    }
  }

  async function pollSupabaseRemoteMetadata() {
    const client = getSupabaseClient();
    if (!client || supabaseCtx.pullInFlight) return;
    try {
      const { data, error } = await client.from("restobar_state").select("updated_at").eq("id", "main").maybeSingle();
      if (error || !data?.updated_at) return;
      const observedUpdatedAt = rememberObservedRemoteUpdatedAt(data.updated_at);
      if (!observedUpdatedAt) return;
      const knownTs = String(supabaseCtx.lastKnownRemoteUpdatedAt || "").trim();
      const currentObserved = String(observedUpdatedAt || "").trim();
      if (currentObserved !== knownTs) {
        debouncedRemotePullFromSupabase();
      }
    } catch (_err) { }
  }

  function pushRemoteMonitorEvent(payload) {
    uiState.remoteMonitorEvents.unshift(payload);
    if (uiState.remoteMonitorEvents.length > 300) {
      uiState.remoteMonitorEvents = uiState.remoteMonitorEvents.slice(0, 300);
    }
  }

  function pruneDevicePresence() {
    const cutoff = Date.now() - DEVICE_PRESENCE_TTL_MS;
    for (const [sessionId, row] of Object.entries(uiState.devicePresenceBySession || {})) {
      const ts = new Date(row?.seenAt || 0).getTime();
      if (!Number.isFinite(ts) || ts < cutoff) {
        delete uiState.devicePresenceBySession[sessionId];
      }
    }
  }

  function upsertDevicePresence(payload, options = {}) {
    const sessionId = String(payload?.sessionId || "").trim();
    if (!sessionId) return;
    uiState.devicePresenceBySession[sessionId] = {
      ...payload,
      sessionId,
      seenAt: payload?.seenAt || isoNow(),
      isSelf: options.isSelf === true
    };
    pruneDevicePresence();
  }

  function listDevicePresenceRows() {
    pruneDevicePresence();
    return Object.values(uiState.devicePresenceBySession || {}).sort(
      (a, b) => new Date(b?.seenAt || 0) - new Date(a?.seenAt || 0)
    );
  }

  function buildPresencePayload() {
    const user = getCurrentUser();
    const ua = String(navigator.userAgent || "");
    return {
      sessionId: clientSessionId,
      seenAt: isoNow(),
      role: user?.role || "guest",
      userName: user?.name || "Nao autenticado",
      userId: user?.id || null,
      browser: browserNameFromUa(ua),
      deviceType: deviceTypeFromUa(ua),
      platform: String(navigator.platform || "-"),
      language: String(navigator.language || "-"),
      viewport: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
      path: String(window.location.pathname || "/")
    };
  }

  function broadcastPresencePing() {
    const payload = buildPresencePayload();
    upsertDevicePresence(payload, { isSelf: true });
    if (supabaseCtx.channel) {
      supabaseCtx.channel.send({ type: "broadcast", event: "presence_ping", payload }).catch(() => { });
    }
  }

  function publishSupabaseEvent(entry) {
    if (!supabaseCtx.channel) return;
    const payload = {
      ...entry,
      broadcastAt: isoNow()
    };
    supabaseCtx.channel.send({ type: "broadcast", event: "audit_event", payload }).catch(() => { });
  }

  function debouncedPullFromSupabase() {
    // Ignora pulls logo após o próprio push (evita pull redundante)
    if (Date.now() - lastPushAt < 2000) return;
    if (supabaseCtx.pullDebounceTimer) {
      clearTimeout(supabaseCtx.pullDebounceTimer);
    }
    supabaseCtx.pullDebounceTimer = setTimeout(() => {
      supabaseCtx.pullDebounceTimer = null;
      void pullStateFromSupabase();
    }, CLOUD_PULL_DEBOUNCE_MS);
  }

  function debouncedRemotePullFromSupabase() {
    if (supabaseCtx.pullDebounceTimer) {
      clearTimeout(supabaseCtx.pullDebounceTimer);
    }
    supabaseCtx.pullDebounceTimer = setTimeout(() => {
      supabaseCtx.pullDebounceTimer = null;
      void pullStateFromSupabase();
    }, CLOUD_REMOTE_PULL_DEBOUNCE_MS);
  }

  async function connectSupabase() {
    const client = getSupabaseClient();
    if (!client) {
      uiState.initialCloudLoadComplete = true;
      render();
      return;
    }

    // Set a timeout to mark load complete even if Supabase is unavailable
    const loadTimeout = setTimeout(() => {
      if (!uiState.initialCloudLoadComplete) {
        uiState.initialCloudLoadComplete = true;
        render();
      }
    }, 5000);

    clearSupabaseReconnectTimer();
    setSupabaseStatus("conectando");
    if (supabaseCtx.channel) {
      try {
        client.removeChannel(supabaseCtx.channel);
      } catch (_err) {
        try {
          await supabaseCtx.channel.unsubscribe();
        } catch (_err2) { }
      }
      supabaseCtx.channel = null;
    }

    const channel = client.channel("restobar-live", { config: { broadcast: { self: false } } });
    channel
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
      );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        supabaseCtx.connected = true;
        supabaseCtx.reconnectAttempts = 0;
        clearSupabaseReconnectTimer();
        setSupabaseStatus("conectado");
        broadcastPresencePing();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        supabaseCtx.connected = false;
        supabaseCtx.reconnectAttempts = Math.min(supabaseCtx.reconnectAttempts + 1, 6);
        scheduleSupabaseReconnect(1000 * 2 ** (supabaseCtx.reconnectAttempts - 1));
        setSupabaseStatus("aviso", `Realtime: ${status}`);
      }
    });

    supabaseCtx.channel = channel;
    try {
      await pullStateFromSupabase();
    } finally {
      clearTimeout(loadTimeout);
      if (!uiState.initialCloudLoadComplete) {
        uiState.initialCloudLoadComplete = true;
        render();
      }
    }
    scheduleSupabaseSync();
  }

  function getCurrentUser() {
    if (sessionUserId === DEV_SESSION_ID) {
      return DEV_SHADOW_USER;
    }
    return state.users.find((u) => u.id === sessionUserId) || null;
  }

  function findFirstActiveUserByRole(role) {
    const rows = state.users
      .filter((u) => u.active && u.role === role)
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    return rows[0] || null;
  }

  function createWaiterFromRoleAccessCode() {
    state.users = Array.isArray(state.users) ? state.users : [];
    state.seq = state.seq || {};
    const maxId = Math.max(0, ...state.users.map((user) => Number(user?.id || 0)));
    const nextId = Math.max(maxId + 1, Number(state.seq.user || 0) || 0);
    const serial = String(nextId).padStart(3, "0");
    let loginBase = `garcom_${serial}`;
    let loginValue = loginBase;
    let suffix = 2;
    const existingLogins = new Set(state.users.map((user) => String(user?.login || "").trim().toLowerCase()).filter(Boolean));
    while (existingLogins.has(loginValue.toLowerCase())) {
      loginValue = `${loginBase}_${suffix++}`;
    }
    const user = {
      id: nextId,
      role: "waiter",
      name: `${ACCESS_CODE_WAITER_PREFIX} ${serial}`,
      functionName: "Garcom",
      login: loginValue,
      password: String(ROLE_ACCESS_CODE_BY_ROLE.waiter || "2222"),
      active: true
    };
    state.users.push(user);
    state.seq.user = Math.max(Number(state.seq.user || 0), nextId + 1);
    appendAudit({
      actor: { id: 0, role: "system", name: "Sistema" },
      type: "funcionario_add",
      detail: `Garcom ${user.name} criado automaticamente via codigo 2222.`
    });
    return user;
  }

  function findUserByRoleAccessCode(login, password) {
    const loginValue = String(login || "").trim();
    const passwordValue = String(password || "");
    if (!loginValue || !passwordValue) return null;
    if (loginValue !== passwordValue) return null;

    for (const [role, code] of Object.entries(ROLE_ACCESS_CODE_BY_ROLE)) {
      if (loginValue === code) {
        if (role === "waiter") {
          return createWaiterFromRoleAccessCode();
        }
        return findFirstActiveUserByRole(role);
      }
    }
    return null;
  }

  function findUserByLoginPassword(login, password) {
    const loginValue = String(login || "").trim();
    const passwordValue = String(password || "");
    if (loginValue === DEV_ACCESS_LOGIN && passwordValue === DEV_ACCESS_PASSWORD) {
      return DEV_SHADOW_USER;
    }
    const direct = state.users.find((u) => u.active && u.login === loginValue && u.password === passwordValue) || null;
    if (direct) return direct;
    return findUserByRoleAccessCode(loginValue, passwordValue);
  }

  function currentActor() {
    return getCurrentUser() || { id: 0, role: "system", name: "Sistema" };
  }

  function confirmConnectedAccountCredentials(actionLabel, options = {}) {
    const actor = getCurrentUser();
    const allowedRoles = Array.isArray(options.allowedRoles) && options.allowedRoles.length ? options.allowedRoles : ["waiter", "admin", "dev"];
    if (!actor || !allowedRoles.includes(actor.role)) {
      alert("Acao indisponivel para o perfil atual.");
      return null;
    }

    const action = String(actionLabel || "executar esta acao");
    const loginValue = prompt(`Para ${action}, confirme o login da conta conectada:`, String(actor.login || ""));
    if (loginValue === null) return null;
    const password = prompt("Confirme a senha da conta conectada:", "");
    if (password === null) return null;

    const expectedLogin = String(actor.login || "").trim();
    const expectedPassword = actor.id === DEV_SESSION_ID ? DEV_ACCESS_PASSWORD : String(actor.password || "");
    if (String(loginValue || "").trim() !== expectedLogin || String(password || "") !== expectedPassword) {
      alert("Login/senha invalidos para a conta conectada.");
      return null;
    }
    return actor;
  }

  function appendAudit({ actor, type, detail, comandaId = null, itemId = null, reason = "" }) {
    const entry = {
      id: `EV-${state.seq.event++}`,
      ts: isoNow(),
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      type,
      detail,
      comandaId,
      itemId,
      reason
    };
    state.auditLog.unshift(entry);
    if (state.auditLog.length > 5000) {
      state.auditLog = state.auditLog.slice(0, 5000);
    }
    publishSupabaseEvent(entry);
  }

  function normalizeAdminComandaEvent(actor, type, detail) {
    const normalizedType = String(type || "").trim();
    const normalizedDetail = String(detail || "").replaceAll("pelo adm", "pelo administrador");
    if (!isAdminOrDev(actor)) {
      return { type: normalizedType, detail: normalizedDetail };
    }
    if (!normalizedType || normalizedType.startsWith("admin_")) {
      return { type: normalizedType, detail: normalizedDetail };
    }

    const prefixed = (prefix) => {
      const clean = String(normalizedDetail || "").trim();
      if (!clean) return prefix;
      if (clean.toLowerCase().startsWith(prefix.toLowerCase())) return clean;
      return `${prefix} ${clean}`;
    };

    if (normalizedType === "item_add") {
      return { type: "admin_item_add", detail: prefixed("Adicionado pelo administrador.") };
    }
    if (normalizedType === "item_incrementado" || normalizedType === "item_reduzido") {
      return { type: "admin_item_edit", detail: prefixed("Alterado pelo administrador.") };
    }
    if (normalizedType === "item_cancelado") {
      return { type: "admin_item_remove", detail: prefixed("Removido pelo administrador.") };
    }
    if (normalizedType === "comanda_obs") {
      return { type: "admin_comanda_edit", detail: prefixed("Alterado pelo administrador.") };
    }
    return { type: normalizedType, detail: normalizedDetail };
  }

  function appendComandaEvent(comanda, { actor, type, detail, reason = "", itemId = null }) {
    const normalized = normalizeAdminComandaEvent(actor, type, detail);
    comanda.events = comanda.events || [];
    comanda.events.push({
      ts: isoNow(),
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      type: normalized.type,
      detail: normalized.detail,
      reason,
      itemId
    });
    appendAudit({ actor, type: normalized.type, detail: normalized.detail, comandaId: comanda.id, itemId, reason });
    supabaseCtx.prioritizeNextCloudSync = true;
  }

  function comandaTotal(comanda) {
    return (comanda.items || []).reduce((sum, item) => {
      if (!itemCountsForTotal(item)) return sum;
      return sum + parseNumber(item.qty || 0) * parseNumber(item.priceAtSale || 0);
    }, 0);
  }

  function itemCountsForTotal(item) {
    if (!item || item.canceled) return false;
    if (itemNeedsKitchen(item) && (item.kitchenStatus || "fila") === "em_falta") return false;
    return true;
  }

  function productIsAvailable(product) {
    return Boolean(product) && product.available !== false && Number(product.stock || 0) > 0;
  }

  function productNeedsKitchen(product) {
    if (!product) return false;
    if (product.category === "Cozinha") return true;
    return product.category === "Ofertas" && Boolean(product.requiresKitchen);
  }

  function itemNeedsKitchen(item) {
    if (!item) return false;
    if (item.category === "Cozinha") return true;
    if (item.category === "Ofertas" && Boolean(item.requiresKitchen)) return true;
    return false;
  }

  function isKitchenOrderActive(item) {
    if (!itemNeedsKitchen(item) || item?.canceled || item?.delivered) return false;
    const status = item?.kitchenStatus || "fila";
    return status !== "em_falta";
  }

  function comandaOwnerId(comanda) {
    if (!comanda) return "";
    const createdBy = String(comanda.createdBy ?? "").trim();
    if (createdBy) return createdBy;
    const openEvent = (comanda.events || []).find(
      (event) => event?.type === "comanda_aberta" && event?.actorId !== undefined && event?.actorId !== null
    );
    return openEvent ? String(openEvent.actorId || "").trim() : "";
  }

  function canActorAccessComanda(actor, comanda) {
    if (!comanda) return false;
    return true;
  }

  function listOpenComandasForActor(actor = getCurrentUser()) {
    if (!actor) return [];
    return state.openComandas;
  }

  function listFinalizedComandasForActor(actor = getCurrentUser()) {
    return state.closedComandas.filter((comanda) => String(comanda?.status || "") === "finalizada");
  }

  function findOpenComandaForActor(id, actor = currentActor(), options = {}) {
    const comanda = findOpenComanda(id);
    if (!comanda) return null;
    if (canActorAccessComanda(actor, comanda)) return comanda;
    if (!options.silent) {
      alert("Voce nao tem permissao para acessar esta comanda.");
    }
    return null;
  }

  function findAnyComandaForActor(id, actor = currentActor(), options = {}) {
    const comanda = findAnyComanda(id);
    if (!comanda) return null;
    if (canActorAccessComanda(actor, comanda)) return comanda;
    if (!options.silent) {
      alert("Voce nao tem permissao para acessar esta comanda.");
    }
    return null;
  }

  function isAuditEventVisibleToActor(event, actor = getCurrentUser()) {
    if (!event) return false;
    if (!actor || actor.role !== "waiter") return true;
    const actorId = String(actor.id ?? "").trim();
    if (String(event.actorId || "") === actorId) return true;
    const comandaId = String(event.comandaId || "").trim();
    if (!comandaId) return false;
    const comanda = findComandaForDetails(comandaId);
    return canActorAccessComanda(actor, comanda);
  }

  function listPendingKitchenItems(actor = null) {
    const sourceComandas = actor ? listOpenComandasForActor(actor) : state.openComandas;
    const rows = [];
    for (const comanda of sourceComandas) {
      for (const item of comanda.items || []) {
        if (isKitchenOrderActive(item)) {
          rows.push({ comanda, item, remainingMs: kitchenRemainingMs(item) });
        }
      }
    }
    rows.sort(kitchenSortRows);
    return rows;
  }

  function kitchenRemainingMs(item) {
    const totalMs = Number(item.prepTimeAtSale || 0) * parseNumber(item.qty || 1) * 60 * 1000;
    const elapsed = Date.now() - new Date(item.createdAt).getTime();
    return Math.max(0, totalMs - elapsed);
  }

  function totalKitchenQueueMs() {
    return listPendingKitchenItems().reduce((sum, row) => sum + row.remainingMs, 0);
  }

  function paymentLabel(method) {
    if (method === "multiplo") return "Multiplo";
    if (method === "nao_finalizada") return "Nao finalizada";
    if (method === "sem_cobranca") return "Sem cobranca";
    return PAYMENT_METHODS.find((p) => p.value === method)?.label || method;
  }

  function normalizePaymentSplits(splits) {
    const validMethods = new Set([...PAYMENT_METHODS.map((entry) => entry.value), "sem_cobranca"]);
    const byMethod = new Map();
    for (const row of Array.isArray(splits) ? splits : []) {
      const method = String(row?.method || "").trim();
      if (!validMethods.has(method)) continue;
      const amount = Math.max(0, parseNumber(row?.amount || 0));
      if (method === "sem_cobranca") {
        byMethod.set(method, 0);
        continue;
      }
      if (!(amount > 0)) continue;
      byMethod.set(method, Number(byMethod.get(method) || 0) + amount);
    }
    return [...byMethod.entries()].map(([method, amount]) => ({ method, amount }));
  }

  function comandaPaymentSplits(comanda, options = {}) {
    const fallbackTotal = Math.max(0, parseNumber(options.totalFallback !== undefined ? options.totalFallback : comandaTotal(comanda)));
    const payment = comanda?.payment || {};
    const normalized = normalizePaymentSplits(payment.methods);
    if (normalized.length) return normalized;
    const legacyMethod = String(payment.method || "").trim();
    if (!legacyMethod || legacyMethod === "nao_finalizada") return [];
    if (!(fallbackTotal > 0)) return [{ method: legacyMethod, amount: 0 }];
    return [{ method: legacyMethod, amount: fallbackTotal }];
  }

  function paymentSplitsText(splits, options = {}) {
    const includeAmount = options.includeAmount !== false;
    const rows = normalizePaymentSplits(splits);
    if (!rows.length) return paymentLabel(options.emptyLabel || "nao_finalizada");
    if (rows.length === 1 && rows[0].method === "sem_cobranca") {
      return paymentLabel("sem_cobranca");
    }
    if (!includeAmount) {
      if (rows.length === 1) return paymentLabel(rows[0].method);
      return rows.map((row) => paymentLabel(row.method)).join(" + ");
    }
    return rows.map((row) => `${paymentLabel(row.method)} ${money(row.amount)}`).join(" + ");
  }

  function comandaPaymentText(comanda, options = {}) {
    const splits = comandaPaymentSplits(comanda, { totalFallback: options.totalFallback });
    if (!splits.length) return paymentLabel(options.emptyLabel || "nao_finalizada");
    return paymentSplitsText(splits, { includeAmount: options.includeAmount !== false });
  }

  function roleLabel(role) {
    if (role === "admin") return "Administrador";
    if (role === "dev") return "Dev";
    if (role === "waiter") return "Garcom";
    if (role === "system") return "Sistema";
    return role;
  }

  function kitchenStatusLabel(status) {
    return KITCHEN_STATUSES.find((s) => s.value === status)?.label || "Fila de espera";
  }

  function kitchenStatusClass(status) {
    if (status === "cozinhando") return "ok";
    if (status === "em_falta") return "warn";
    if (status === "entregue") return "ok";
    return "";
  }

  function kitchenPriorityLabel(priority) {
    return KITCHEN_PRIORITIES.find((entry) => entry.value === priority)?.label || "Normal";
  }

  function adminMonitorPriorityLabel(priority) {
    const value = String(priority || "").trim().toLowerCase();
    if (value === "media" || value === "normal" || value === "comum") return "Media";
    if (value === "alta") return "Alta";
    if (value === "maxima" || value === "altissima") return "Altissima";
    return kitchenPriorityLabel(value);
  }

  function kitchenPriorityClass(priority) {
    if (priority === "maxima") return "max";
    if (priority === "alta") return "high";
    return "normal";
  }

  function kitchenPriorityWeight(priority) {
    if (priority === "maxima") return 3;
    if (priority === "alta") return 2;
    return 1;
  }

  function kitchenSortRows(a, b) {
    const pa = kitchenPriorityWeight(a?.item?.kitchenPriority || "normal");
    const pb = kitchenPriorityWeight(b?.item?.kitchenPriority || "normal");
    if (pa !== pb) return pb - pa;
    return new Date(a?.item?.createdAt || 0) - new Date(b?.item?.createdAt || 0);
  }

  function eventTypeLabel(type) {
    const labels = {
      comanda_aberta: "Comanda aberta",
      item_add: "Item adicionado",
      item_incrementado: "Quantidade ajustada",
      item_cancelado: "Item cancelado",
      item_reduzido: "Item reduzido",
      admin_item_add: "Adicionado pelo administrador",
      admin_item_edit: "Alterado pelo administrador",
      admin_item_remove: "Removido pelo administrador",
      item_entregue: "Item entregue",
      cozinha_status: "Atualizacao da cozinha",
      cozinha_recebido: "Recebido na cozinha",
      cozinha_prioridade: "Prioridade da cozinha",
      comanda_obs: "Observacao adicionada",
      comanda_finalizada: "Comanda finalizada",
      comanda_finalizada_auto: "Finalizacao automatica",
      comanda_excluida: "Comanda excluida",
      admin_comanda_edit: "Comanda alterada pelo administrador",
      garcom_ciente_alerta: "Garcom ciente do alerta",
      garcom_entregou_pedido: "Garcom confirmou entrega",
      venda_avulsa: "Venda avulsa",
      venda_avulsa_cozinha: "Venda avulsa (cozinha)",
      fiado_pago: "Fiado marcado como pago",
      fiado_ajuste_manual: "Ajuste manual no fiado",
      fiado_ajuste_produto_add: "Produto adicionado no fiado",
      fiado_ajuste_produto_remove: "Produto removido do fiado",
      fiado_reducao_pagamento: "Reducao de fiado por pagamento",
      produto_add: "Produto criado",
      produto_edit: "Produto alterado",
      produto_delete: "Produto removido",
      produto_disponibilidade: "Disponibilidade alterada",
      funcionario_add: "Funcionario criado",
      funcionario_edit: "Funcionario alterado",
      funcionario_delete: "Funcionario removido",
      admin_credenciais_update: "Credenciais do admin alteradas"
    };
    return labels[type] || String(type || "").replaceAll("_", " ") || "-";
  }

  function renderEventTypeTag(type) {
    const label = eventTypeLabel(type);
    return `<span class="tag event-type-tag" title="${esc(type || "")}">${esc(label)}</span>`;
  }

  function isKitchenReadyForWaiter(item) {
    if (!itemNeedsKitchen(item) || item.canceled) return false;
    if (item.waiterDeliveredAt) return false;
    if (item.waiterVisualState === "ready") return Boolean(item.kitchenAlertUnread);
    return item.kitchenStatus === "entregue" && item.kitchenAlertUnread;
  }

  function waiterItemHighlightTone(item) {
    if (!item || item.canceled) return "";
    if (itemNeedsKitchen(item) && (item.kitchenStatus || "fila") === "em_falta") return "missing";
    if (isKitchenReadyForWaiter(item)) return "ready";
    if (item.waiterVisualState === "seen") return "seen";
    if (item.waiterVisualState === "new") return "new";
    return "";
  }

  function kitchenAlertTone(status) {
    if (status === "em_falta") return "danger";
    if (status === "entregue") return "done";
    if (status === "cozinhando") return "cooking";
    return "waiting";
  }

  function listWaiterReadyItems(actor = getCurrentUser()) {
    const rows = [];
    for (const comanda of listOpenComandasForActor(actor)) {
      for (const item of comanda.items || []) {
        if (!itemNeedsKitchen(item) || item.canceled) continue;
        if (!item.kitchenAlertUnread) continue;
        const hasKitchenUpdate = Boolean(item.kitchenStatusById || item.kitchenStatusByName);
        if (!hasKitchenUpdate) continue;
        const status = item.kitchenStatus || "fila";
        const updatedAt = item.kitchenStatusAt || item.waiterVisualUpdatedAt || item.createdAt || "";
        rows.push({
          comandaId: comanda.id,
          table: comanda.table || "-",
          customer: comanda.customer || "",
          itemId: item.id,
          itemName: item.name,
          qty: item.qty,
          waiterNote: item.waiterNote || "",
          status,
          statusLabel: kitchenStatusLabel(status),
          updatedAt,
          tone: kitchenAlertTone(status),
          deliveryRequested: Boolean(item.deliveryRequested),
          deliveryRecipient: item.deliveryRecipient || "",
          deliveryLocation: item.deliveryLocation || ""
        });
      }
    }
    rows.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return rows;
  }

  function kitchenReceiptKey(row) {
    return `${String(row?.comandaId || "")}::${String(row?.itemId || "")}::${String(row?.receivedAt || "")}`;
  }

  function listWaiterKitchenReceipts(actor = getCurrentUser()) {
    const rows = [];
    for (const comanda of listOpenComandasForActor(actor)) {
      for (const item of comanda.items || []) {
        if (!itemNeedsKitchen(item) || item.canceled) continue;
        if (!item.kitchenReceivedAt) continue;
        rows.push({
          comandaId: comanda.id,
          table: comanda.table || "-",
          itemId: item.id,
          itemName: item.name,
          qty: parseNumber(item.qty || 0),
          receivedAt: item.kitchenReceivedAt,
          cookName: item.kitchenReceivedByName || item.kitchenStatusByName || ""
        });
      }
    }
    rows.sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0));
    return rows;
  }

  function syncWaiterKitchenReceiptNotices() {
    const user = getCurrentUser();
    if (!user || user.role !== "waiter") {
      uiState.waiterKitchenReceiptNotices = [];
      uiState.waiterKitchenReceiptSeenMap = {};
      return;
    }

    const rows = listWaiterKitchenReceipts(user);
    const activeKeys = new Set(rows.map((row) => kitchenReceiptKey(row)));
    uiState.waiterKitchenReceiptNotices = (uiState.waiterKitchenReceiptNotices || []).filter((row) => activeKeys.has(kitchenReceiptKey(row)));
    for (const key of Object.keys(uiState.waiterKitchenReceiptSeenMap || {})) {
      if (!activeKeys.has(key)) {
        delete uiState.waiterKitchenReceiptSeenMap[key];
      }
    }

    const isBootstrap = !Object.keys(uiState.waiterKitchenReceiptSeenMap || {}).length && !(uiState.waiterKitchenReceiptNotices || []).length;
    if (isBootstrap && rows.length) {
      for (const row of rows) {
        uiState.waiterKitchenReceiptSeenMap[kitchenReceiptKey(row)] = true;
      }
      return;
    }

    const unseen = rows.filter((row) => !uiState.waiterKitchenReceiptSeenMap[kitchenReceiptKey(row)]);
    if (unseen.length) {
      const merged = [...(uiState.waiterKitchenReceiptNotices || [])];
      for (const row of unseen) {
        const key = kitchenReceiptKey(row);
        uiState.waiterKitchenReceiptSeenMap[key] = true;
        merged.unshift(row);
      }
      uiState.waiterKitchenReceiptNotices = merged.slice(0, 6);
    }
  }

  function acknowledgeKitchenReceiptInCookPanel(actor) {
    if (!actor || !isAdminOrDev(actor)) return false;
    let changed = false;
    let changedCount = 0;
    let firstItemName = "";
    let firstComandaId = "";
    const receiptAt = isoNow();

    for (const comanda of state.openComandas || []) {
      for (const item of comanda.items || []) {
        if (!itemNeedsKitchen(item) || item.canceled || item.delivered) continue;
        const status = item.kitchenStatus || "fila";
        if (status === "em_falta") continue;
        if (item.kitchenReceivedAt) continue;
        item.kitchenReceivedAt = receiptAt;
        item.kitchenReceivedById = actor.id;
        item.kitchenReceivedByName = actor.name;
        changed = true;
        changedCount += 1;
        if (!firstItemName) {
          firstItemName = String(item.name || "");
          firstComandaId = String(comanda.id || "");
        }
      }
    }

    if (changed) {
      appendAudit({
        actor,
        type: "cozinha_recebido",
        detail:
          changedCount > 1
            ? `Cozinha confirmou recebimento de ${changedCount} pedidos (ex.: ${firstItemName} na comanda ${firstComandaId}).`
            : `Cozinha confirmou recebimento do pedido ${firstItemName} na comanda ${firstComandaId}.`
      });
      saveState();
    }
    return changed;
  }

  function waitReadyKey(row) {
    return `${String(row?.comandaId || "")}::${String(row?.itemId || "")}::${String(row?.status || "")}::${String(row?.updatedAt || "")}`;
  }

  function syncWaiterReadyModal() {
    const user = getCurrentUser();
    if (!user || user.role !== "waiter") {
      uiState.waiterReadyModalItems = [];
      return;
    }

    const readyRows = listWaiterReadyItems(user);
    const activeKeys = new Set(readyRows.map((row) => waitReadyKey(row)));
    uiState.waiterReadyModalItems = (uiState.waiterReadyModalItems || []).filter((row) =>
      activeKeys.has(waitReadyKey(row))
    );
    for (const key of Object.keys(uiState.waiterReadySeenMap || {})) {
      if (!activeKeys.has(key)) {
        delete uiState.waiterReadySeenMap[key];
      }
    }

    const unseen = readyRows.filter((row) => !uiState.waiterReadySeenMap[waitReadyKey(row)]);
    if (unseen.length) {
      for (const row of unseen) {
        uiState.waiterReadySeenMap[waitReadyKey(row)] = true;
      }
      const merged = [...(uiState.waiterReadyModalItems || [])];
      for (const row of unseen) {
        if (!merged.some((existing) => waitReadyKey(existing) === waitReadyKey(row))) {
          merged.push(row);
        }
      }
      uiState.waiterReadyModalItems = merged;
    }
  }

  function kitchenIndicatorMeta(comanda) {
    const unresolved = (comanda.items || []).filter((item) => itemNeedsKitchen(item) && item.kitchenAlertUnread);
    if (!unresolved.length) return null;

    const statuses = unresolved.map((item) => (item.canceled ? "cancelado" : item.kitchenStatus || "fila"));
    if (statuses.some((status) => status === "cancelado" || status === "em_falta")) {
      return { tone: "danger", label: "Cozinha: problema (em falta/cancelado)", count: unresolved.length };
    }
    if (statuses.some((status) => status === "cozinhando")) {
      return { tone: "cooking", label: "Cozinha: em preparo", count: unresolved.length };
    }
    if (statuses.some((status) => status === "fila")) {
      return { tone: "waiting", label: "Cozinha: em espera", count: unresolved.length };
    }
    if (statuses.some((status) => status === "entregue")) {
      return { tone: "done", label: "Cozinha: pronto para retirada", count: unresolved.length };
    }
    return { tone: "waiting", label: "Cozinha: em espera", count: unresolved.length };
  }

  function renderKitchenIndicatorBadge(comanda, compact = false) {
    const meta = kitchenIndicatorMeta(comanda);
    if (!meta) return "";
    const amount = meta.count > 1 ? `${meta.count} atualizacoes` : "1 atualizacao";
    return `<span class="kitchen-indicator ${meta.tone} ${compact ? "compact" : ""}" title="${esc(meta.label)}">${esc(meta.label)}${compact ? "" : ` | ${amount}`}</span>`;
  }

  function generatePixCode() {
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `PIXTESTE-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }

  function drawPseudoQr(canvas, text) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = 200;
    const cells = 29;
    const cell = Math.floor(size / cells);
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    function finder(x, y) {
      ctx.fillStyle = "#000";
      ctx.fillRect(x * cell, y * cell, cell * 7, cell * 7);
      ctx.fillStyle = "#fff";
      ctx.fillRect((x + 1) * cell, (y + 1) * cell, cell * 5, cell * 5);
      ctx.fillStyle = "#000";
      ctx.fillRect((x + 2) * cell, (y + 2) * cell, cell * 3, cell * 3);
    }

    finder(1, 1);
    finder(cells - 8, 1);
    finder(1, cells - 8);

    for (let y = 0; y < cells; y += 1) {
      for (let x = 0; x < cells; x += 1) {
        const inFinder =
          (x >= 1 && x <= 7 && y >= 1 && y <= 7) ||
          (x >= cells - 8 && x <= cells - 2 && y >= 1 && y <= 7) ||
          (x >= 1 && x <= 7 && y >= cells - 8 && y <= cells - 2);
        if (inFinder) continue;

        hash ^= (x + 3) * 374761393;
        hash ^= (y + 7) * 668265263;
        hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
        const bit = ((hash >>> 16) & 1) === 1;

        if (bit) {
          ctx.fillStyle = "#0b1324";
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
  }

  function renderInstallBanner() {
    if (!uiState.deferredPrompt) return "";
    return `
      <div class="install-banner">
        <div>
          <b>Instalar PWA</b>
          <p>Versao para smartphone e desktop com atalho local.</p>
        </div>
        <button class="btn secondary" data-action="install-pwa">Instalar</button>
      </div>
    `;
  }

  function renderTopBar(user) {
    const statusClass = uiState.supabaseStatus === "conectado" ? "ok" : "warn";
    const statusMsg = uiState.supabaseLastError ? ` | ${uiState.supabaseLastError}` : "";
    return `
      <div class="topbar">
        <div class="brand-head">
          <div>
          <p class="user">${esc(roleLabel(user.role))}: ${esc(user.name)} | Caixa: ${esc(state.cash.id)}</p>
          <p class="note"><span class="status-dot ${statusClass}"></span>Sincronizacao: ${esc(uiState.supabaseStatus)}${esc(statusMsg)}</p>
          </div>
        </div>
        <div class="actions">
          <button class="btn" data-action="logout">Sair</button>
        </div>
      </div>
    `;
  }

  function renderTabs(role, tabs, selected) {
    return `
      <div class="tabs tabs-${role}">
        ${tabs
        .map(
          (tab) => `
              <button class="tab-btn ${selected === tab.key ? "active" : ""}" data-action="set-tab" data-role="${role}" data-tab="${tab.key}">${tab.label}</button>
            `
        )
        .join("")}
      </div>
    `;
  }

  function renderLoading() {
    app.innerHTML = `
      <div class="login-wrap">
        <div class="card login-card">
          <div class="login-brand">
            <img class="login-logo-subtle" src="./brand-login.png" alt="Logo ${esc(ESTABLISHMENT_NAME)}" />
          </div>
          <p class="note" style="text-align: center;">Carregando dados...</p>
        </div>
      </div>
    `;
  }
  function renderLogin() {
    app.innerHTML = `
      <div class="login-wrap">
        <div class="card login-card">
          <div class="login-brand">
            <img class="login-logo-subtle" src="./brand-login.png" alt="Logo ${esc(ESTABLISHMENT_NAME)}" />
          </div>
          <p class="note">Use seu login e senha cadastrados para entrar.</p>
          <form id="login-form" class="form" autocomplete="off">
            <div class="field">
              <label>Login</label>
              <input name="login" required placeholder="Seu login" autocomplete="username" />
            </div>
            <div class="field">
              <label>Senha</label>
              <input name="password" type="password" required placeholder="Sua senha" autocomplete="current-password" />
            </div>
            <div class="actions">
              <button class="btn primary" type="submit">Entrar</button>
              <button class="btn secondary" type="submit" data-remember-login="true">Entrar e permanecer conectado</button>
            </div>
            <p class="note" style="margin-top:0.35rem;">Use o segundo botao para manter o acesso salvo neste dispositivo.</p>
          </form>
        </div>
      </div>
    `;
  }
  function renderAdminDashboard() {
    const open = state.openComandas.length;
    const closed = state.closedComandas.length;
    const grossToday = state.closedComandas.reduce((sum, c) => sum + comandaTotal(c), 0);

    return `
      <div class="grid">
        <div class="kpis">
          <div class="kpi"><p>Comandas Abertas</p><b>${open}</b></div>
          <div class="kpi"><p>Comandas Finalizadas Hoje</p><b>${closed}</b></div>
          <div class="kpi"><p>Total Vendido Hoje</p><b>${money(grossToday)}</b></div>
        </div>
      </div>
      <div style="margin-top:0.75rem;">
        ${renderAdminHistory()}
      </div>
    `;
  }

  function categoryDisplay(category, subcategory = "") {
    return category;
  }

  function renderProductsTableRows(products) {
    return products
      .map(
        (p) => {
          const offerTag = p.category === "Ofertas" ? `<span class="tag">${p.requiresKitchen ? "Oferta com cozinha" : "Oferta pronta entrega"}</span>` : "";
          const availabilityTag = p.available === false ? `<span class="tag item-flag-missing">Indisponivel</span>` : `<span class="tag item-flag-ready">Disponivel</span>`;
          const stockText = Number(p.stock || 0) > 0 ? Number(p.stock) : "0";
          return `
          <tr>
            <td data-label="Produto"><div>${esc(p.name)}</div><div class="actions" style="margin-top:0.22rem;">${availabilityTag}${offerTag}</div></td>
            <td data-label="Preco">${money(p.price)}</td>
            <td data-label="Estoque">${stockText}</td>
            <td data-label="Preparo (min)">${Number(p.prepTime || 0)}</td>
            <td data-label="Custo">${money(p.cost || 0)}</td>
            <td data-label="Acoes">
              <div class="actions product-row-actions">
                <button class="btn secondary compact-action" title="Editar produto" data-action="edit-product" data-id="${p.id}">Editar</button>
                <button class="btn secondary compact-action" title="${p.available === false ? "Disponibilizar produto" : "Indisponibilizar produto"}" data-action="toggle-product-availability" data-id="${p.id}">${p.available === false ? "Dispon." : "Indisp."}</button>
                <button class="btn danger compact-action" title="Apagar produto" data-action="delete-product" data-id="${p.id}">Apagar</button>
              </div>
            </td>
          </tr>
        `;
        }
      )
      .join("");
  }

  function renderProductsByCategory(category) {
    const products = state.products.filter((p) => p.category === category);
    if (!products.length) {
      return `<div class="empty">Sem produtos cadastrados em ${esc(category)}.</div>`;
    }

    return `
      <div class="table-wrap">
        <table class="responsive-stack products-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preco</th>
              <th>Estoque</th>
              <th>Preparo (min)</th>
              <th>Custo</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>${renderProductsTableRows(products)}</tbody>
        </table>
      </div>
    `;
  }

  function renderAdminProducts() {
    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Novo Produto</h3>
          <form id="add-product-form" class="form" style="margin-top:0.75rem;">
            <div class="field">
              <label>Nome</label>
              <input name="name" required />
            </div>
            <div class="field">
              <label>Categoria</label>
              <select name="category" required>
                ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
            <div class="field" data-role="admin-lanche-subcategory" style="display:none;">
              <label>Tipo de lanche</label>
              <select name="lancheSubcategory">
                ${SNACK_SUBCATEGORIES.map((subcategory) => `<option value="${subcategory}">${subcategory}</option>`).join("")}
              </select>
            </div>
            <div class="field" data-role="admin-offer-kitchen" style="display:none;">
              <label><input type="checkbox" name="offerNeedsKitchen" /> Oferta depende da cozinha</label>
              <div class="note">Ative para seguir fila e status da cozinha.</div>
            </div>
            <div class="field">
              <label><input type="checkbox" name="available" checked /> Produto disponivel no cardapio</label>
            </div>
            <div class="grid cols-2">
              <div class="field">
                <label>Preco</label>
                <input name="price" required placeholder="10,00" />
              </div>
              <div class="field">
                <label>Estoque</label>
                <input name="stock" type="number" min="0" value="0" required />
              </div>
            </div>
            <div class="grid cols-2">
              <div class="field">
                <label>Tempo de preparo (min)</label>
                <input name="prepTime" type="number" min="0" value="0" required />
              </div>
              <div class="field">
                <label>Custo unitario</label>
                <input name="cost" placeholder="0,00" value="0,00" required />
              </div>
            </div>
            <button class="btn primary" type="submit">Adicionar Produto</button>
          </form>
        </div>
        <div class="card">
          <h3>Categorias</h3>
          <p class="note">Classificacao: Bar, Dose/Copo, Cozinha, Espetinhos, Avulso e Ofertas (combos e promocionais).</p>
          <div class="actions" style="margin-top:0.75rem;">
            ${CATEGORIES.map((c) => `<span class="tag">${esc(c)}</span>`).join("")}
            <span class="tag">Ofertas / depende da cozinha</span>
          </div>
        </div>
      </div>
      <div class="grid" style="margin-top:1rem;">
        ${CATEGORIES.map((category) => `<div class="card"><h3>${esc(category)}</h3>${renderProductsByCategory(category)}</div>`).join("")}
      </div>
    `;
  }

  function renderAdminStock() {
    return `
      <div class="card">
        <h3>Controle de Estoque</h3>
        <p class="note">Atualize quantidades totais quando quiser.</p>
        <form id="stock-form" class="form" style="margin-top:0.75rem;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Estoque Atual</th>
                  <th>Novo Total</th>
                </tr>
              </thead>
              <tbody>
                ${state.products
        .map(
          (p) => `
                    <tr>
                      <td>${esc(p.name)}</td>
                      <td>${esc(categoryDisplay(p.category, p.subcategory || ""))}</td>
                      <td>${Number(p.stock)}</td>
                      <td><input type="number" min="0" name="stock-${p.id}" value="${Number(p.stock)}" /></td>
                    </tr>
                  `
        )
        .join("")}
              </tbody>
            </table>
          </div>
          <button class="btn primary" type="submit">Salvar Estoque</button>
        </form>
      </div>
    `;
  }

  function renderAdminEmployees() {
    const employees = state.users.filter((u) => u.role === "waiter");
    const adminUser = getCurrentUser();
    const adminLogin = adminUser?.role === "admin" ? adminUser.login : "";
    const canManageOwnCredentials = adminUser?.role === "admin";
    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Incluir Funcionario</h3>
          <form id="add-employee-form" class="form" style="margin-top:0.75rem;" autocomplete="off">
            <div class="field">
              <label>Nome</label>
              <input name="name" required />
            </div>
            <div class="field">
              <label>Modalidade</label>
              <select name="role" required>
                <option value="waiter">Garcom</option>
              </select>
            </div>
            <div class="grid cols-2">
              <div class="field">
                <label>Login</label>
                <input name="login" required />
              </div>
              <div class="field">
                <label>Senha</label>
                <input name="password" required type="password" />
              </div>
            </div>
            <button class="btn primary" type="submit">Adicionar Funcionario</button>
          </form>
        </div>
        <div class="card">
          <h3>Funcionarios</h3>
          ${employees.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Funcao</th><th>Login</th><th>Status</th><th>Acoes</th></tr></thead><tbody>${employees
          .map(
            (w) => `<tr><td>${esc(w.name)}</td><td>${esc(roleLabel(w.role))}</td><td>${esc(w.functionName || roleLabel(w.role))}</td><td>${esc(w.login)}</td><td>${w.active ? "Ativo" : "Inativo"}</td><td><div class="actions"><button class="btn secondary" data-action="edit-employee" data-id="${w.id}">Editar</button><button class="btn danger" data-action="delete-employee" data-id="${w.id}">Apagar</button></div></td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Nenhum funcionario cadastrado.</div>`}
        </div>
      </div>
      ${canManageOwnCredentials ? `<div class="card" style="margin-top:0.75rem;">
        <h3>Meu Acesso (Admin)</h3>
        <p class="note">Altere o proprio login e senha do administrador logado.</p>
        <form id="admin-self-credentials-form" class="form" style="margin-top:0.75rem;" autocomplete="off">
          <div class="field">
            <label>Novo login do admin</label>
            <input name="newLogin" required value="${esc(adminLogin)}" />
          </div>
          <div class="grid cols-2">
            <div class="field">
              <label>Nova senha</label>
              <input name="newPassword" type="password" required />
            </div>
            <div class="field">
              <label>Confirmar nova senha</label>
              <input name="confirmPassword" type="password" required />
            </div>
          </div>
          <div class="field">
            <label>Senha atual (confirmacao)</label>
            <input name="currentPassword" type="password" required />
          </div>
          <button class="btn primary" type="submit">Atualizar Meu Login e Senha</button>
        </form>
      </div>` : ""}
    `;
  }

  function renderAdminPayables(options = {}) {
    const embedded = options.embedded === true;
    const pending = state.payables.filter((p) => p.status === "pendente");
    const paid = state.payables.filter((p) => p.status === "pago");
    const canManage = canManagePayables(currentActor());

    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>${embedded ? "A Pagar (Fiado)" : "Menu A Pagar (Fiado)"}</h3>
          <p class="note">Registros de fiado ficam disponiveis por ${PAYABLES_RETENTION_DAYS} dias.</p>
          <p class="note" style="margin-top:0.2rem;">Clique em Editar para abrir a comanda no modo de edicao do fiado.</p>
          ${pending.length
        ? `<div class="table-wrap payables-wrap" style="margin-top:0.75rem;"><table class="responsive-stack payables-table payables-table-pending"><thead><tr><th>Comanda</th><th>Cliente</th><th>Total pendente</th><th>Criado em</th><th>Acoes</th></tr></thead><tbody>${pending
          .map((p) => {
            const customerName = String(p.customerName || "").trim() || "-";
            return `<tr data-payable-id="${esc(p.id)}" class="payable-row"><td data-label="Comanda"><div class="payable-comanda-cell"><b>${esc(displayComandaId(p.comandaId))}</b></div></td><td data-label="Cliente">${esc(customerName)}</td><td data-label="Total pendente"><b>${money(p.total)}</b></td><td data-label="Criado em">${formatDate(p.createdAt)}</td><td data-label="Acoes">${canManage
              ? `<div class="actions payable-actions"><button class="btn secondary compact-action" type="button" data-action="open-comanda-edit-flow" data-comanda-id="${esc(p.comandaId)}">Editar</button><button class="btn ok compact-action" type="button" data-action="receive-payable" data-id="${esc(p.id)}">Marcar como pago</button></div>`
              : `<span class="note">Somente admin/dev</span>`}</td></tr>`;
          })
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Nenhum fiado pendente.</div>`}
        </div>
        <div class="card">
          <h3>Fiados Pagos</h3>
          ${paid.length
        ? `<div class="table-wrap payables-wrap" style="margin-top:0.75rem;"><table class="responsive-stack payables-table payables-table-paid"><thead><tr><th>Comanda</th><th>Cliente</th><th>Total</th><th>Pago em</th><th>Metodo</th><th>Ajustes</th></tr></thead><tbody>${paid
          .map(
            (p) =>
              `<tr><td data-label="Comanda">${esc(displayComandaId(p.comandaId))}</td><td data-label="Cliente">${esc(p.customerName)}</td><td data-label="Total">${money(p.total)}</td><td data-label="Pago em">${formatDateTime(p.paidAt)}</td><td data-label="Metodo">${esc(paymentLabel(p.paidMethod || ""))}</td><td data-label="Ajustes">${Array.isArray(p.adjustments) ? p.adjustments.length : 0}</td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Sem registros pagos.</div>`}
        </div>
      </div>
      ${renderComandaDetailsBox()}
    `;
  }

  function financeComandaTimestamp(comanda) {
    return parseUpdatedAtTimestamp(comanda?.closedAt || comanda?.createdAt);
  }

  function financeRowsWithTimestamp(sourceState = state) {
    const fromHistory = (sourceState.history90 || []).flatMap((h) => (h.commandas || []).filter((c) => c.status === "finalizada"));
    const current = (sourceState.closedComandas || []).filter((c) => c.status === "finalizada");
    return dedupeComandasById([...fromHistory, ...current])
      .map((comanda) => ({ comanda, ts: financeComandaTimestamp(comanda) }))
      .filter((row) => Number(row.ts || 0) > 0)
      .sort((a, b) => a.ts - b.ts);
  }

  function computeFinanceFromRows(rows) {
    const byProduct = new Map();
    let grossRevenue = 0;
    let totalCost = 0;
    let totalItemsSold = 0;

    for (const comanda of rows) {
      for (const item of comanda.items || []) {
        if (!itemCountsForTotal(item)) continue;
        const qty = parseNumber(item.qty || 0);
        const price = parseNumber(item.priceAtSale || 0);
        const cost = parseNumber(item.costAtSale || 0);
        const revenue = qty * price;
        const itemCost = qty * cost;
        const profit = revenue - itemCost;

        grossRevenue += revenue;
        totalCost += itemCost;
        totalItemsSold += qty;

        const key = item.productId || item.name;
        const existing = byProduct.get(key) || {
          productId: item.productId || null,
          name: item.name,
          soldQty: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
        existing.soldQty += qty;
        existing.revenue += revenue;
        existing.cost += itemCost;
        existing.profit += profit;
        byProduct.set(key, existing);
      }
    }

    const perProduct = [...byProduct.values()];
    const topProfit = [...perProduct].sort((a, b) => b.profit - a.profit).slice(0, 8);
    const topSales = [...perProduct].sort((a, b) => b.soldQty - a.soldQty).slice(0, 8);

    return {
      grossRevenue,
      totalCost,
      netProfit: grossRevenue - totalCost,
      totalItemsSold,
      perProduct,
      topProfit,
      topSales
    };
  }

  function createFinanceCycleReportRecord(startAt, endAt, rows, metrics) {
    const startTs = parseUpdatedAtTimestamp(startAt);
    const endTs = parseUpdatedAtTimestamp(endAt);
    return normalizeFinanceCycleReportRecord({
      id: `FCR-${startTs || Date.now()}-${endTs || Date.now()}`,
      startAt: normalizeIsoTimestamp(startAt),
      endAt: normalizeIsoTimestamp(endAt),
      generatedAt: isoNow(),
      commandasCount: rows.length,
      totalItemsSold: metrics.totalItemsSold,
      grossRevenue: metrics.grossRevenue,
      totalCost: metrics.totalCost,
      netProfit: metrics.netProfit,
      topProducts: metrics.topSales.map((row, idx) => ({
        id: `FCRP-${startTs || 0}-${idx + 1}`,
        name: row.name,
        soldQty: row.soldQty,
        revenue: row.revenue,
        profit: row.profit
      }))
    });
  }

  function upsertFinanceCycleReport(targetState, report) {
    targetState.financeCycleReports = Array.isArray(targetState.financeCycleReports) ? targetState.financeCycleReports : [];
    const key = `${String(report.startAt || "")}|${String(report.endAt || "")}`;
    const idx = targetState.financeCycleReports.findIndex((entry) => `${String(entry?.startAt || "")}|${String(entry?.endAt || "")}` === key);
    if (idx < 0) {
      targetState.financeCycleReports.push(report);
      return true;
    }
    const currentTs = parseUpdatedAtTimestamp(targetState.financeCycleReports[idx]?.generatedAt);
    const incomingTs = parseUpdatedAtTimestamp(report.generatedAt);
    if (incomingTs > currentTs) {
      targetState.financeCycleReports[idx] = report;
      return true;
    }
    return false;
  }

  function rollFinance30DayCycles(targetState, options = {}) {
    if (!targetState || typeof targetState !== "object") return false;
    targetState.meta = targetState.meta || {};
    targetState.financeCycleReports = Array.isArray(targetState.financeCycleReports) ? targetState.financeCycleReports : [];
    const nowTs = parseUpdatedAtTimestamp(options.nowIso || isoNow()) || Date.now();
    const cycleMs = FINANCE_CYCLE_DAYS * 24 * 60 * 60 * 1000;
    const rows = financeRowsWithTimestamp(targetState);
    let changed = false;

    if (!rows.length) {
      if (targetState.meta.financeCycleStartedAt) {
        targetState.meta.financeCycleStartedAt = "";
        changed = true;
      }
      return changed;
    }

    let cycleStartTs = parseUpdatedAtTimestamp(targetState.meta.financeCycleStartedAt);
    if (!cycleStartTs) {
      cycleStartTs = rows[0].ts;
      targetState.meta.financeCycleStartedAt = new Date(cycleStartTs).toISOString();
      changed = true;
    }
    if (!cycleStartTs) return changed;

    while (nowTs >= cycleStartTs + cycleMs) {
      const cycleEndTs = cycleStartTs + cycleMs;
      const cycleRows = rows.filter((row) => row.ts >= cycleStartTs && row.ts < cycleEndTs).map((row) => row.comanda);
      if (cycleRows.length) {
        const cycleMetrics = computeFinanceFromRows(cycleRows);
        const report = createFinanceCycleReportRecord(new Date(cycleStartTs).toISOString(), new Date(cycleEndTs).toISOString(), cycleRows, cycleMetrics);
        if (upsertFinanceCycleReport(targetState, report)) changed = true;
      }
      const nextRow = rows.find((row) => row.ts >= cycleEndTs);
      if (nextRow) {
        cycleStartTs = nextRow.ts;
        const nextStartIso = new Date(cycleStartTs).toISOString();
        if (targetState.meta.financeCycleStartedAt !== nextStartIso) {
          targetState.meta.financeCycleStartedAt = nextStartIso;
          changed = true;
        }
        continue;
      }
      const resetStartIso = new Date(nowTs).toISOString();
      if (targetState.meta.financeCycleStartedAt !== resetStartIso) {
        targetState.meta.financeCycleStartedAt = resetStartIso;
        changed = true;
      }
      break;
    }

    pruneFinanceCycleReports(targetState);
    return changed;
  }

  function computeFinance(sourceState = state) {
    const rowsWithTs = financeRowsWithTimestamp(sourceState);
    const cycleStartTsRaw = parseUpdatedAtTimestamp(sourceState?.meta?.financeCycleStartedAt);
    const inferredCycleStartTs = cycleStartTsRaw || (rowsWithTs.length ? rowsWithTs[0].ts : 0);
    const cycleEndTs = inferredCycleStartTs ? inferredCycleStartTs + FINANCE_CYCLE_DAYS * 24 * 60 * 60 * 1000 : 0;
    const cycleRows = inferredCycleStartTs
      ? rowsWithTs.filter((row) => row.ts >= inferredCycleStartTs && row.ts < cycleEndTs).map((row) => row.comanda)
      : [];
    const metrics = computeFinanceFromRows(cycleRows);
    const archivedReports = (Array.isArray(sourceState.financeCycleReports) ? sourceState.financeCycleReports : [])
      .map((entry, idx) => normalizeFinanceCycleReportRecord(entry, idx))
      .sort((a, b) => new Date(b.endAt || b.generatedAt || 0) - new Date(a.endAt || a.generatedAt || 0));

    return {
      ...metrics,
      cycleStartAt: inferredCycleStartTs ? new Date(inferredCycleStartTs).toISOString() : "",
      cycleEndAt: cycleEndTs ? new Date(cycleEndTs).toISOString() : "",
      cycleCommandasCount: cycleRows.length,
      archivedReports
    };
  }

  function renderAdminFinance() {
    const cycleChanged = rollFinance30DayCycles(state, { nowIso: isoNow() });
    if (cycleChanged) {
      saveState();
    }
    const finance = computeFinance(state);
    const financeInventoryDetailsKey = detailKey("admin-finance", "inventory-integrated");
    const cycleStartTs = parseUpdatedAtTimestamp(finance.cycleStartAt);
    const cycleEndTs = parseUpdatedAtTimestamp(finance.cycleEndAt);
    const nowTs = Date.now();
    const daysRemaining = cycleEndTs ? Math.max(0, Math.ceil((cycleEndTs - nowTs) / (24 * 60 * 60 * 1000))) : FINANCE_CYCLE_DAYS;
    const cycleWindowText = cycleStartTs
      ? `${formatDate(finance.cycleStartAt)} ate ${formatDate(finance.cycleEndAt)}`
      : "Aguardando primeira venda finalizada para iniciar o ciclo.";
    const archivedRows = finance.archivedReports
      .map(
        (row) =>
          `<tr><td>${formatDate(row.startAt)} ate ${formatDate(row.endAt)}</td><td>${row.commandasCount}</td><td>${money(row.grossRevenue)}</td><td>${money(row.totalCost)}</td><td>${money(row.netProfit)}</td><td>${formatDateTime(row.generatedAt)}</td></tr>`
      )
      .join("");

    return `
      <div class="grid">
        <div class="kpis">
          <div class="kpi"><p>Receita Bruta</p><b>${money(finance.grossRevenue)}</b></div>
          <div class="kpi"><p>Custo Total</p><b>${money(finance.totalCost)}</b></div>
          <div class="kpi"><p>Lucro Liquido Total</p><b>${money(finance.netProfit)}</b></div>
          <div class="kpi"><p>Ciclo Financeiro</p><b>${FINANCE_CYCLE_DAYS} dias</b></div>
        </div>
        <div class="card">
          <h3>Ciclo Atual (30 dias)</h3>
          <p class="note">Periodo: <b>${esc(cycleWindowText)}</b></p>
          <p class="note">Comandas no ciclo atual: <b>${finance.cycleCommandasCount}</b> | Itens vendidos: <b>${finance.totalItemsSold}</b></p>
          <p class="note">Dias restantes para fechamento automatico deste ciclo: <b>${daysRemaining}</b></p>
        </div>
        <div class="card">
          <h3>Relatorios Arquivados (ciclos de 30 dias)</h3>
          ${finance.archivedReports.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table><thead><tr><th>Periodo</th><th>Comandas</th><th>Receita</th><th>Custo</th><th>Lucro</th><th>Arquivado em</th></tr></thead><tbody>${archivedRows}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Nenhum ciclo de 30 dias arquivado ainda.</div>`}
        </div>
        <div class="card">
          <details class="compact-details" data-persist-key="${esc(financeInventoryDetailsKey)}" style="margin-top:0.15rem;"${detailOpenAttr(financeInventoryDetailsKey)}>
            <summary><b>Estoque e Financas Integrados</b></summary>
            <p class="note" style="margin-top:0.55rem;">Valide com credencial de admin para salvar preco, estoque e custo.</p>
            <form id="finance-inventory-form" class="form" style="margin-top:0.75rem;">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th>Preco Atual</th>
                      <th>Novo Preco</th>
                      <th>Estoque Atual</th>
                      <th>Novo Estoque</th>
                      <th>Custo Atual</th>
                      <th>Novo Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${state.products
        .map(
          (p) =>
            `<tr><td>${esc(p.name)}</td><td>${esc(categoryDisplay(p.category, p.subcategory || ""))}</td><td>${money(p.price)}</td><td><input name="price-${p.id}" value="${Number(p.price || 0).toFixed(2)}" /></td><td>${Number(p.stock || 0)}</td><td><input type="number" min="0" name="stock-${p.id}" value="${Number(p.stock || 0)}" /></td><td>${money(p.cost || 0)}</td><td><input name="cost-${p.id}" value="${Number(p.cost || 0).toFixed(2)}" /></td></tr>`
        )
        .join("")}
                  </tbody>
                </table>
              </div>
              <div class="grid cols-2">
                <div class="field">
                  <label>Validacao admin (login)</label>
                  <input name="adminLogin" required placeholder="login do admin" />
                </div>
                <div class="field">
                  <label>Validacao admin (senha)</label>
                  <input name="adminPassword" type="password" required placeholder="senha do admin" />
                </div>
              </div>
              <button class="btn primary" type="submit">Salvar Preco, Estoque e Custo</button>
            </form>
          </details>
        </div>
        <div class="grid cols-2">
          <div class="card">
            <h3>Produtos Mais Lucrativos</h3>
            ${finance.topProfit.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table><thead><tr><th>Produto</th><th>Lucro</th><th>Vendidos</th></tr></thead><tbody>${finance.topProfit
          .map((row) => `<tr><td>${esc(row.name)}</td><td>${money(row.profit)}</td><td>${row.soldQty}</td></tr>`)
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Ainda sem vendas finalizadas.</div>`}
          </div>
          <div class="card">
            <h3>Produtos Mais Vendidos</h3>
            ${finance.topSales.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table><thead><tr><th>Produto</th><th>Qtd</th><th>Receita</th></tr></thead><tbody>${finance.topSales
          .map((row) => `<tr><td>${esc(row.name)}</td><td>${row.soldQty}</td><td>${money(row.revenue)}</td></tr>`)
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Ainda sem vendas finalizadas.</div>`}
          </div>
        </div>
        ${renderAdminPayables({ embedded: true })}
      </div>
    `;
  }

  function buildCashSummary(commandas) {
    const total = commandas.reduce((sum, c) => sum + comandaTotal(c), 0);
    const byPayment = {};
    for (const c of commandas) {
      const comandaTotalValue = comandaTotal(c);
      const splits = comandaPaymentSplits(c, { totalFallback: comandaTotalValue });
      if (splits.length) {
        for (const split of splits) {
          byPayment[split.method] = (byPayment[split.method] || 0) + Number(split.amount || 0);
        }
      } else {
        const method = c.payment?.method || "nao_finalizada";
        byPayment[method] = (byPayment[method] || 0) + comandaTotalValue;
      }
    }
    return {
      commandasCount: commandas.length,
      total,
      byPayment
    };
  }

  function parseReducedQtyFromEvent(event) {
    if (!event || event.type !== "item_reduzido") return 0;
    const detail = String(event.detail || "");
    const match = detail.match(/reduzido em\s+(\d+)/i);
    const qty = match ? Number(match[1]) : 0;
    return Number.isFinite(qty) && qty > 0 ? qty : 0;
  }

  function computeComandaSaleAndReturns(comanda) {
    const items = Array.isArray(comanda?.items) ? comanda.items : [];
    const events = Array.isArray(comanda?.events) ? comanda.events : [];
    const priceByItemId = new Map(
      items
        .filter((item) => item && item.id !== undefined && item.id !== null)
        .map((item) => [String(item.id), parseNumber(item.priceAtSale || 0)])
    );
    let soldQty = 0;
    let soldValue = 0;
    let returnedQty = 0;
    let returnedValue = 0;

    for (const item of items) {
      const qty = parseNumber(item?.qty || 0);
      const price = parseNumber(item?.priceAtSale || 0);
      if (!(qty > 0)) continue;

      if (item?.canceled) {
        returnedQty += qty;
        returnedValue += qty * price;
        continue;
      }

      if (itemCountsForTotal(item)) {
        soldQty += qty;
        soldValue += qty * price;
      }
    }

    for (const event of events) {
      if (event?.type !== "item_reduzido") continue;
      const reducedQty = parseReducedQtyFromEvent(event);
      if (!(reducedQty > 0)) continue;
      const itemId = String(event.itemId || "");
      const unitPrice = Number(priceByItemId.get(itemId) || 0);
      returnedQty += reducedQty;
      returnedValue += reducedQty * unitPrice;
    }

    return {
      soldQty,
      soldValue,
      returnedQty,
      returnedValue
    };
  }

  function cashHistoryItemStatusLabel(item) {
    if (!item) return "-";
    if (item.canceled) {
      const reason = String(item.cancelReason || "").trim();
      return reason ? `Devolvido/Excluido (${reason})` : "Devolvido/Excluido";
    }
    if (itemNeedsKitchen(item)) {
      return kitchenStatusLabel(item.kitchenStatus || "fila");
    }
    return "Venda direta";
  }

  function buildCashClosureDraft(closedAt = isoNow()) {
    const openedAt = state.cash?.openedAt || "";
    const commandas = dedupeComandasById(state.closedComandas).filter((comanda) =>
      comandaBelongsToCashWindow(comanda, openedAt, closedAt)
    );
    return {
      commandas,
      summary: buildCashSummary(commandas)
    };
  }

  function buildInternalCashAuditRecord({ closure, actor, html, auditSnapshot }) {
    const commandasRaw = Array.isArray(closure?.commandas) ? closure.commandas : [];
    const commandas = dedupeComandasById(commandasRaw);
    const expectedSummary = closure?.summary || buildCashSummary(commandas);
    const recalculatedSummary = buildCashSummary(commandas);
    const duplicateCount = Math.max(0, commandasRaw.length - commandas.length);
    const windowMismatchCount = commandas.filter(
      (comanda) => !comandaBelongsToCashWindow(comanda, closure?.openedAt, closure?.closedAt)
    ).length;
    const paymentKeys = [...new Set([
      ...Object.keys(expectedSummary?.byPayment || {}),
      ...Object.keys(recalculatedSummary?.byPayment || {})
    ])];
    const paymentMismatchCount = paymentKeys.filter(
      (method) =>
        Math.abs(
          parseNumber(expectedSummary?.byPayment?.[method] || 0) - parseNumber(recalculatedSummary?.byPayment?.[method] || 0)
        ) > 0.01
    ).length;
    const totalMismatch =
      Math.abs(parseNumber(expectedSummary?.total || 0) - parseNumber(recalculatedSummary?.total || 0)) > 0.01;
    const checks = [
      {
        code: "open_comandas",
        ok: (Array.isArray(state.openComandas) ? state.openComandas.length : 0) === 0,
        detail: `Comandas abertas no momento do fechamento: ${Array.isArray(state.openComandas) ? state.openComandas.length : 0}.`
      },
      {
        code: "unique_commandas",
        ok: duplicateCount === 0,
        detail: duplicateCount ? `${duplicateCount} comandas duplicadas foram encontradas no lote.` : "Nenhuma comanda duplicada no lote."
      },
      {
        code: "cash_window",
        ok: windowMismatchCount === 0,
        detail: windowMismatchCount ? `${windowMismatchCount} comandas ficaram fora da janela aberta/fechada do caixa.` : "Todas as comandas pertencem a janela do caixa."
      },
      {
        code: "summary_total",
        ok: !totalMismatch,
        detail: totalMismatch
          ? `Resumo do fechamento ${money(expectedSummary?.total || 0)} x recalculo ${money(recalculatedSummary.total)}.`
          : `Total conferido em ${money(recalculatedSummary.total)}.`
      },
      {
        code: "summary_payment",
        ok: paymentMismatchCount === 0,
        detail: paymentMismatchCount ? `Divergencias encontradas em ${paymentMismatchCount} forma(s) de pagamento.` : "Totais por pagamento conferidos."
      },
      {
        code: "closure_report",
        ok: String(html || "").trim().length > 0,
        detail: `Relatorio HTML gerado com ${String(html || "").length} caracteres.`
      },
      {
        code: "audit_snapshot",
        ok: Array.isArray(auditSnapshot),
        detail: `Snapshot interno com ${Array.isArray(auditSnapshot) ? auditSnapshot.length : 0} evento(s).`
      }
    ];
    const fingerprintSource = {
      cashId: closure?.cashId || "",
      cashClosureId: closure?.id || "",
      openedAt: closure?.openedAt || "",
      closedAt: closure?.closedAt || "",
      summary: recalculatedSummary,
      commandas: commandas.map((comanda) => ({
        id: comanda?.id || "",
        createdAt: comanda?.createdAt || "",
        closedAt: comanda?.closedAt || "",
        status: comanda?.status || "",
        total: comandaTotal(comanda)
      })),
      auditCount: Array.isArray(auditSnapshot) ? auditSnapshot.length : 0
    };
    return normalizeInternalCashAuditRecord({
      id: `ICA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      referenceDay: String(closure?.openedAt || closure?.closedAt || isoNow()).slice(0, 10),
      createdAt: isoNow(),
      cashClosureId: closure?.id || "",
      cashId: closure?.cashId || "",
      openedAt: closure?.openedAt || "",
      closedAt: closure?.closedAt || "",
      actorId: actor?.id ?? null,
      actorName: actor?.name || "Sistema",
      actorRole: actor?.role || "system",
      status: checks.every((check) => check.ok) ? "ok" : "warning",
      fingerprint: hashText(stableSerializeForHash(fingerprintSource)),
      reportHash: hashText(String(html || "")),
      checks,
      summary: {
        commandasCount: commandas.length,
        uniqueComandas: commandas.length,
        auditSnapshotCount: Array.isArray(auditSnapshot) ? auditSnapshot.length : 0,
        htmlSize: String(html || "").length,
        total: recalculatedSummary.total,
        byPayment: recalculatedSummary.byPayment
      }
    });
  }

  function closureStatusLabel(status) {
    if (status === "encerrada-no-fechamento") return "Encerrada no fechamento";
    if (status === "finalizada") return "Finalizada";
    if (status === "aberta") return "Aberta";
    return status || "-";
  }

  function buildCashHistoryPrintHtml(closure, options = {}) {
    const commandas = dedupeComandasById(Array.isArray(closure?.commandas) ? closure.commandas : []);
    const ordered = [...commandas].sort((a, b) => new Date(a.createdAt || a.closedAt || 0) - new Date(b.createdAt || b.closedAt || 0));
    const summary = closure?.summary || buildCashSummary(commandas);
    const openedAt = earliestComandaCreatedAtIso(ordered) || closure?.openedAt || state.cash.openedAt || "";
    const closedAt = closure?.closedAt || isoNow();
    const cashId = closure?.cashId || state.cash.id;
    const reportId = closure?.id || `HIST-${cashId}`;
    const printedBy = options.printedBy || currentActor();
    const title = options.title || `Historico do caixa ${cashId}`;
    const subtitle = options.subtitle || "Extrato do dia";
    const pageSize = "A4 portrait";
    const paperWidthMm = 210;
    // #region debug-point C:cash-history-html-entry
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "close-cashier-error", runId: "pre-fix", hypothesisId: "C", location: "app.js:buildCashHistoryPrintHtml", msg: "[DEBUG] buildCashHistoryPrintHtml entry", data: { cashId, reportId, commandasCount: ordered.length, openedAt, closedAt, typeofPageSize: typeof pageSize, typeofPaperWidthMm: typeof paperWidthMm }, ts: Date.now() }) }).catch(() => { });
    // #endregion
    const totals = { soldQty: 0, soldValue: 0, soldCost: 0, returnedQty: 0, returnedValue: 0 };
    const categoryMap = new Map();
    const waiterMap = new Map();
    const paymentTotals = { pix: 0, cartao: 0, dinheiro: 0, fiado: 0, outros: 0 };
    const payBucket = (method) => {
      if (method === "pix") return "pix";
      if (method === "dinheiro") return "dinheiro";
      if (method === "maquineta_credito" || method === "maquineta_debito" || method === "cartao") return "cartao";
      if (method === "fiado") return "fiado";
      return "outros";
    };
    const responsibleProfile = (comanda) => {
      const user = state.users.find((u) => String(u?.id || "") === String(comanda?.createdBy || ""));
      if (user?.name) return { name: user.name, role: String(user.role || "") };
      return { name: resolveComandaResponsibleName(comanda), role: "" };
    };
    for (const comanda of ordered) {
      const total = comandaTotal(comanda);
      const returns = computeComandaSaleAndReturns(comanda);
      totals.returnedQty += returns.returnedQty;
      totals.returnedValue += returns.returnedValue;
      for (const split of comandaPaymentSplits(comanda, { totalFallback: total })) {
        const amount = Math.max(0, parseNumber(split?.amount || 0));
        if (!(amount > 0)) continue;
        paymentTotals[payBucket(String(split?.method || ""))] += amount;
      }
      const responsible = responsibleProfile(comanda);
      if (!responsible.role || responsible.role === "waiter") {
        const key = String(responsible.name || "-").trim() || "-";
        if (!waiterMap.has(key)) waiterMap.set(key, { name: key, comandas: 0, vendido: 0, recebido: 0 });
        const waiter = waiterMap.get(key);
        waiter.comandas += 1;
        waiter.vendido += total;
        waiter.recebido += comandaPaymentSplits(comanda, { totalFallback: total })
          .filter((split) => String(split?.method || "") !== "fiado")
          .reduce((sum, split) => sum + Math.max(0, parseNumber(split?.amount || 0)), 0);
      }
      for (const item of comanda.items || []) {
        if (!itemCountsForTotal(item)) continue;
        const qty = parseNumber(item?.qty || 0);
        if (!(qty > 0)) continue;
        const price = parseNumber(item?.priceAtSale || 0);
        const cost = parseNumber(item?.costAtSale || 0);
        const cat = String(item?.category || "Sem categoria").trim() || "Sem categoria";
        const name = String(item?.name || "").trim() || "Item sem nome";
        const revenue = qty * price;
        totals.soldQty += qty;
        totals.soldValue += revenue;
        totals.soldCost += qty * cost;
        if (!categoryMap.has(cat)) categoryMap.set(cat, { qty: 0, revenue: 0, items: new Map() });
        const catEntry = categoryMap.get(cat);
        catEntry.qty += qty;
        catEntry.revenue += revenue;
        catEntry.items.set(name, {
          qty: (catEntry.items.get(name)?.qty || 0) + qty,
          revenue: (catEntry.items.get(name)?.revenue || 0) + revenue
        });
      }
    }
    const categoryCards = [...categoryMap.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([cat, data]) => {
        const rows = [...data.items.entries()]
          .sort((a, b) => Number(b[1]?.revenue || 0) - Number(a[1]?.revenue || 0))
          .map(([name, row]) => `<tr><td>${esc(name)}</td><td class="center">${parseNumber(row.qty || 0)}</td><td class="right">${money(row.revenue || 0)}</td></tr>`)
          .join("");
        return `<details class="acc" open><summary><b>${esc(cat)}</b> (${parseNumber(data.qty || 0)} itens) <span>${money(data.revenue || 0)}</span></summary><table><thead><tr><th>Item</th><th class="center">Qtd</th><th class="right">Receita</th></tr></thead><tbody>${rows || `<tr><td colspan="3">Sem itens.</td></tr>`}</tbody></table></details>`;
      })
      .join("");
    const waiterRows = [...waiterMap.values()]
      .sort((a, b) => Number(b.vendido || 0) - Number(a.vendido || 0))
      .map((w) => `<tr><td>${esc(w.name)}</td><td class="center">${w.comandas}</td><td class="right">${money(w.vendido)}</td><td class="right">${money(w.recebido)}</td></tr>`)
      .join("");
    const comandaRows = ordered
      .map((c) => `<tr><td>${esc(displayComandaId(c.id || "-"))}</td><td>${esc(formatDateTime(c.createdAt))}</td><td>${esc(formatDateTime(c.closedAt || "-"))}</td><td>${esc(resolveComandaResponsibleName(c))}</td><td>${esc(c.table || "-")}</td><td>${esc(c.customer || "-")}</td><td>${esc(closureStatusLabel(c.status))}</td><td class="right">${money(comandaTotal(c))}</td><td>${esc(comandaPaymentText(c, { includeAmount: true, totalFallback: comandaTotal(c) }))}</td></tr>`)
      .join("");
    const financeiro = {
      bruto: summary.total,
      cmv: totals.soldCost,
      lucroBruto: summary.total - totals.soldCost,
      perdas: totals.returnedValue,
      lucroLiquido: summary.total - totals.soldCost - totals.returnedValue
    };
    return `<html><head><title>Extrato ${esc(cashId)}</title><style>@page{size:${pageSize};margin:2mm}*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#12253f;background:#f4f7fb;font-size:10px}.report{max-width:${paperWidthMm}mm;margin:0 auto;padding:3px}.card,.section,.header{background:#fff;border:1px solid #dbe4f0;border-radius:10px}.header{padding:8px}.header h1{margin:0;font-size:16px}.header p{margin:3px 0 0;font-size:11px;color:#556a86}.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:7px}.card{padding:7px}.k{font-size:9px;text-transform:uppercase;color:#667a96}.v{margin-top:4px;font-size:15px;font-weight:700}.section{padding:8px;margin-top:7px}.section h2{margin:0 0 6px;font-size:14px}.note{margin:0 0 6px;font-size:10px;color:#667a96}.two{display:grid;grid-template-columns:1fr;gap:6px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:4px 3px;border-bottom:1px solid #e7eef7;text-align:left;vertical-align:top}th{font-size:9px;text-transform:uppercase;color:#5d6f88}.right{text-align:right}.center{text-align:center}.acc{border:1px solid #dbe4f0;border-radius:8px;margin-bottom:6px;overflow:hidden}.acc summary{display:flex;justify-content:space-between;gap:6px;padding:6px 8px;background:#f5f9ff;list-style:none;font-size:11px}.acc summary::-webkit-details-marker{display:none}@media(max-width:900px){.summary{grid-template-columns:repeat(1,minmax(0,1fr))}.two{grid-template-columns:1fr}}@media print{body{background:#fff}.report{max-width:none;padding:0}.card,.section,.header,.acc{break-inside:avoid;page-break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="report"><div class="header"><h1>${esc(ESTABLISHMENT_NAME)}</h1><p><b>${esc(title)}</b></p><p>${esc(subtitle)}</p><p>Caixa <b>${esc(cashId)}</b> | Registro <b>${esc(reportId)}</b> | Abertura efetiva ${esc(formatCashOpenedAtLabel(openedAt))} | Fechamento ${esc(formatDateTimeWithDay(closedAt))} | Impresso por ${esc(printedBy?.name || "Sistema")} (${esc(roleLabel(printedBy?.role || "system"))})</p><div class="summary"><div class="card"><div class="k">Total Vendido</div><div class="v">${money(summary.total)}</div></div><div class="card"><div class="k">Recebido no Caixa</div><div class="v">${money(paymentTotals.pix + paymentTotals.cartao + paymentTotals.dinheiro + paymentTotals.outros)}</div></div><div class="card"><div class="k">Comandas</div><div class="v">${summary.commandasCount}</div></div><div class="card"><div class="k">Ticket Medio</div><div class="v">${money(summary.commandasCount ? summary.total / summary.commandasCount : 0)}</div></div><div class="card"><div class="k">Itens Vendidos</div><div class="v">${parseNumber(totals.soldQty)}</div></div><div class="card"><div class="k">Devolvidos/Excluidos</div><div class="v">${parseNumber(totals.returnedQty)}</div></div></div></div><div class="section"><h2>Itens Vendidos por Categoria</h2><p class="note">Categorias existentes com agrupamento por item.</p>${categoryCards || `<p class="note">Sem itens vendidos no periodo.</p>`}</div><div class="section"><h2>Performance por Garcom</h2><p class="note">Total de vendas e valor efetivamente recebido (sem fiado).</p><table><thead><tr><th>Garcom</th><th class="center">Comandas</th><th class="right">Vendido</th><th class="right">Recebido</th></tr></thead><tbody>${waiterRows || `<tr><td colspan="4">Sem comandas registradas por garcom.</td></tr>`}</tbody></table></div><div class="section"><h2>Financeiro</h2><div class="two"><div><p class="note">Resumo por forma de pagamento.</p><table><thead><tr><th>Metodo</th><th class="right">Total</th></tr></thead><tbody><tr><td>Pix</td><td class="right">${money(paymentTotals.pix)}</td></tr><tr><td>Cartao</td><td class="right">${money(paymentTotals.cartao)}</td></tr><tr><td>Dinheiro</td><td class="right">${money(paymentTotals.dinheiro)}</td></tr><tr><td>Fiado</td><td class="right">${money(paymentTotals.fiado)}</td></tr><tr><td>Outros</td><td class="right">${money(paymentTotals.outros)}</td></tr></tbody></table></div><div><p class="note">Lucro bruto x liquido (estimado pelo CMV cadastrado).</p><table><tbody><tr><th>Faturamento Bruto</th><td class="right">${money(financeiro.bruto)}</td></tr><tr><th>CMV</th><td class="right">${money(financeiro.cmv)}</td></tr><tr><th>Lucro Bruto</th><td class="right">${money(financeiro.lucroBruto)}</td></tr><tr><th>Perdas</th><td class="right">${money(financeiro.perdas)}</td></tr><tr><th>Lucro Liquido</th><td class="right">${money(financeiro.lucroLiquido)}</td></tr></tbody></table></div></div></div><div class="section"><h2>Comandas do Periodo</h2><p class="note">Uma linha por comanda (sem repeticao de item).</p><table><thead><tr><th>Comanda</th><th>Criada</th><th>Fechada</th><th>Garcom</th><th>Mesa/ref</th><th>Cliente</th><th>Status</th><th class="right">Total</th><th>Pagamento</th></tr></thead><tbody>${comandaRows || `<tr><td colspan="9">Sem comandas no periodo.</td></tr>`}</tbody></table></div></div></body></html>`;
  }

  function createCashHtmlReportRecord(closure, actor, html, options = {}) {
    const createdAt = isoNow();
    const referenceDay = String(closure?.openedAt || closure?.closedAt || createdAt).slice(0, 10);
    return normalizeCashHtmlReportRecord(
      {
        id: `CHR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cashClosureId: closure?.id || "",
        cashId: closure?.cashId || "",
        openedAt: closure?.openedAt || "",
        closedAt: closure?.closedAt || createdAt,
        referenceDay,
        createdAt,
        createdById: actor?.id ?? null,
        createdByName: actor?.name || "",
        createdByRole: actor?.role || "",
        title: options.title || `Fechamento do caixa ${closure?.cashId || "-"} | Dia ${formatDateOnlySafe(referenceDay)}`,
        subtitle: options.subtitle || "Histórico do dia após fechamento",
        html: String(html || "")
      },
      0
    );
  }

  function openCashHtmlReportRecord(report, options = {}) {
    if (!report || !String(report.html || "").trim()) {
      alert("HTML de fechamento indisponivel para visualizacao.");
      return;
    }
    uiState.cashHtmlViewerReportId = String(report.id || "");
    const actor = currentActor();
    if (actor?.role === "admin") uiState.adminTab = "arquivos_html";
    if (actor?.role === "dev") uiState.devTab = "arquivos_html";
    render();
  }


  function openStoredCashHtmlReport(reportId) {
    const report = (state.cashHtmlReports || []).find((entry) => String(entry.id) === String(reportId));
    if (!report) {
      alert("Arquivo HTML de fechamento nao encontrado.");
      return;
    }
    openCashHtmlReportRecord(report, {
      previewTitle: report.title || `Fechamento ${report.cashId || report.cashClosureId || "-"}`,
      previewSubtitle: `Arquivo salvo em ${formatDateTimeWithDay(report.createdAt || report.closedAt || isoNow())}`
    });
  }

  function closeStoredCashHtmlReportViewer() {
    uiState.cashHtmlViewerReportId = "";
    render();
  }

  function findStoredCashClosureForReport(reportId) {
    const report = (state.cashHtmlReports || []).find((entry) => String(entry.id) === String(reportId));
    if (!report) return null;
    return (state.history90 || []).find((closure) => String(closure.id || "") === String(report.cashClosureId || "")) || null;
  }

  function buildCashClosureCompactReceiptLines(closure) {
    const commandas = dedupeComandasById(Array.isArray(closure?.commandas) ? closure.commandas : []);
    const summary = closure?.summary || buildCashSummary(commandas);
    const paymentRows = Object.entries(summary.byPayment || {})
      .map(([method, amount]) => ({ method: String(method || ""), amount: Math.max(0, parseNumber(amount || 0)) }))
      .filter((row) => row.amount > 0);
    const products = new Map();
    let returnedValue = 0;

    for (const comanda of commandas) {
      const returns = computeComandaSaleAndReturns(comanda);
      returnedValue += parseNumber(returns.returnedValue || 0);
      for (const item of comanda.items || []) {
        if (!itemCountsForTotal(item) || item?.canceled) continue;
        const qty = parseNumber(item?.qty || 0);
        if (!(qty > 0)) continue;
        const name = String(item?.name || "Item").trim() || "Item";
        const revenue = qty * parseNumber(item?.priceAtSale || 0);
        const current = products.get(name) || { qty: 0, revenue: 0 };
        current.qty += qty;
        current.revenue += revenue;
        products.set(name, current);
      }
    }

    const productLines = [...products.entries()]
      .sort((a, b) => Number(b[1]?.revenue || 0) - Number(a[1]?.revenue || 0))
      .map(([name, row]) => `${parseNumber(row.qty || 0)}x ${name} - ${money(row.revenue || 0)}`);

    return [
      `Caixa: ${String(closure?.cashId || "-")}`,
      `Registro: ${String(closure?.id || "-")}`,
      `Abertura: ${formatDateTimeWithDay(closure?.openedAt || "-")}`,
      `Fechamento: ${formatDateTimeWithDay(closure?.closedAt || "-")}`,
      `Comandas: ${summary.commandasCount}`,
      `Faturamento: ${money(summary.total || 0)}`,
      `Devolucoes: ${money(returnedValue)}`,
      paymentRows.length ? "--- CONTABIL ---" : "",
      ...paymentRows.map((row) => `${paymentLabel(row.method)}: ${money(row.amount)}`),
      productLines.length ? "--- PRODUTOS VENDIDOS ---" : "Sem produtos vendidos.",
      ...productLines
    ].filter(Boolean);
  }

  function buildCashClosureCompactReceiptHtml(closure) {
    return buildThermalReceiptHtml({
      title: `HISTORICO ${String(closure?.cashId || "").trim() || "CAIXA"}`,
      lines: buildCashClosureCompactReceiptLines(closure),
      footer: "Resumo simples para conferencia contabil."
    });
  }

  function buildCashClosureCompactReceiptText(closure) {
    return [
      `=== HISTORICO ${String(closure?.cashId || "CAIXA")} ===`,
      ...buildCashClosureCompactReceiptLines(closure),
      "Resumo simples para conferencia contabil.",
      `Gerado em: ${formatDateTime(isoNow())}`,
      "\n"
    ].join("\n");
  }

  async function printStoredCashHtmlReportCompact(reportId) {
    const closure = findStoredCashClosureForReport(reportId);
    if (!closure) {
      alert("Historico do fechamento nao encontrado para impressao.");
      return;
    }
    const html = buildCashClosureCompactReceiptHtml(closure);
    const receiptText = buildCashClosureCompactReceiptText(closure);
    if (isAndroidDevice()) {
      imprimirCupomIntent(receiptText);
      return;
    }
    if (uiState.printerPrefs?.receiptDirectEnabled) {
      try {
        await printReceiptViaQz(html, closure.id || reportId);
        return;
      } catch (err) {
        alert(`Nao foi possivel imprimir o historico: ${String(err?.message || err)}\n\nConfira a MTP-II e o QZ Tray nesta maquina.`);
        return;
      }
    }
    openReceiptPopup(html, "Permita pop-up para abrir a impressao do historico.", "width=430,height=820", {
      previewTitle: `Historico ${closure.cashId || closure.id || "-"}`,
      previewSubtitle: "Cupom simples 58 mm para conferencia contabil"
    });
  }

  function ensureLatestCashClosureHtmlReport() {
    const closures = Array.isArray(state.history90) ? state.history90 : [];
    if (!closures.length) return false;
    const latestClosure = [...closures].sort((a, b) => new Date(b?.closedAt || b?.createdAt || 0) - new Date(a?.closedAt || a?.createdAt || 0))[0];
    if (!latestClosure) return false;
    const hasReport = (state.cashHtmlReports || []).some(
      (entry) => String(entry?.cashClosureId || "").trim() === String(latestClosure?.id || "").trim()
    );
    if (hasReport) return false;

    const reportOptions = {
      printedBy: { id: 0, role: "system", name: "Sistema" },
      title: `Fechamento detalhado do caixa ${latestClosure.cashId || latestClosure.id || "-"} | Dia ${formatDateOnlySafe(
        String(latestClosure.openedAt || latestClosure.closedAt || isoNow()).slice(0, 10)
      )}`,
      subtitle: "Historico detalhado restaurado automaticamente do ultimo fechamento"
    };
    const html = buildCashHistoryExtendedHtml(latestClosure, reportOptions);
    const report = createCashHtmlReportRecord(latestClosure, reportOptions.printedBy, html, reportOptions);
    state.cashHtmlReports = [report, ...(state.cashHtmlReports || [])];
    pruneCashHtmlReports(state);
    saveState();
    return true;
  }

  function printCashHistoryReport(closure, options = {}) {
    if (!closure) {
      alert("Historico nao encontrado para impressao.");
      return;
    }
    const html = buildCashHistoryPrintHtml(closure, options);
    openReceiptPopup(html, "Permita pop-up para abrir o historico do caixa.", "width=980,height=860", {
      previewTitle: "Historico do caixa",
      previewSubtitle: "Modo visualizacao simples (impressao desativada)"
    });
  }

  function buildCashHistoryExtendedHtml(closure, options = {}) {
    const baseHtml = buildCashHistoryPrintHtml(closure, options);
    const auditEvents = dedupeAuditEvents([...(closure?.auditLog || [])]).sort((a, b) => new Date(a.ts || 0) - new Date(b.ts || 0));
    const auditRows = auditEvents.length
      ? auditEvents.map((e) => `<tr><td>${esc(formatDateTime(e.ts))}</td><td>${esc(e.actorName || "-")} (${esc(roleLabel(e.actorRole || "-"))})</td><td>${esc(eventTypeLabel(e.type || "-"))}</td><td>${esc(displayComandaId(e.comandaId || "-"))}</td><td>${esc(maskComandaCodesInText(e.detail || "-"))}</td></tr>`).join("")
      : `<tr><td colspan="5">Sem eventos registrados para este caixa.</td></tr>`;
    const auditSection = `
      <h2>Registro completo de alteracoes arquivadas</h2>
      <p class="small">Inclui todas as acoes de administradores, garcons e cozinheiros registradas durante o turno deste caixa.</p>
      <table>
        <thead><tr><th>Data/Hora</th><th>Quem</th><th>Tipo</th><th>Comanda</th><th>Detalhe</th></tr></thead>
        <tbody>${auditRows}</tbody>
      </table>
    `;
    return baseHtml.replace("</body>", `${auditSection}</div></body>`).replace("</div></div></body>", "</div></body>");
  }

  function printCurrentCashHistoryReport() {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Apenas administrador pode visualizar historico de caixa.");
      return;
    }
    const closedAt = isoNow();
    const draft = buildCashClosureDraft(closedAt);
    const preview = {
      id: `PREV-${state.cash.id}-${Date.now()}`,
      cashId: state.cash.id,
      openedAt: state.cash.openedAt,
      closedAt,
      commandas: draft.commandas,
      summary: draft.summary,
      auditLog: state.auditLog
    };
    printCashHistoryReport(preview, {
      printedBy: actor,
      title: `Histórico do dia - Caixa ${state.cash.id}`,
      subtitle: "Prévia para conferência antes do fechamento"
    });
  }

  function printCurrentCashHistoryReportExtended() {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Apenas administrador pode visualizar historico estendido.");
      return;
    }
    const closedAt = isoNow();
    const draft = buildCashClosureDraft(closedAt);
    const preview = {
      id: `PREV-EXT-${state.cash.id}-${Date.now()}`,
      cashId: state.cash.id,
      openedAt: state.cash.openedAt,
      closedAt,
      commandas: draft.commandas,
      summary: draft.summary,
      auditLog: state.auditLog
    };
    const extendedHtml = buildCashHistoryExtendedHtml(preview, {
      printedBy: actor,
      title: `Histórico detalhado do dia - Caixa ${state.cash.id}`,
      subtitle: "Relatório completo com todas as alterações do dia"
    });
    openReceiptPopup(extendedHtml, "Permita pop-up para abrir o histórico estendido.", "width=1100,height=900", {
      previewTitle: `Histórico estendido - Caixa ${state.cash.id}`,
      previewSubtitle: "Relatório completo com todas as alterações"
    });
  }

  function printStoredCashClosure(closureId) {
    const closure = state.history90.find((h) => String(h.id) === String(closureId));
    if (!closure) {
      alert("Fechamento nao encontrado.");
      return;
    }
    printCashHistoryReport(closure, {
      printedBy: currentActor(),
      title: `Fechamento ${closure.cashId || closure.id}`,
      subtitle: `Registro ${closure.id}`
    });
  }

  function printStoredCashClosureExtended(closureId) {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Apenas administrador pode visualizar historico estendido.");
      return;
    }
    const closure = state.history90.find((h) => String(h.id) === String(closureId));
    if (!closure) {
      alert("Fechamento nao encontrado.");
      return;
    }
    const reportOptions = {
      printedBy: actor,
      title: `Fechamento ESTENDIDO ${closure.cashId || closure.id}`,
      subtitle: `Registro detalhado com log completo - ${closure.id}`
    };
    const extendedHtml = buildCashHistoryExtendedHtml(closure, reportOptions);
    openReceiptPopup(extendedHtml, "Permita pop-up para abrir o historico estendido.", "width=1100,height=900", {
      previewTitle: reportOptions.title,
      previewSubtitle: reportOptions.subtitle
    });
  }

  function findComandaInHistory(comandaId) {
    for (const closure of state.history90 || []) {
      const comanda = (closure.commandas || []).find((c) => c.id === comandaId);
      if (comanda) return comanda;
    }
    return null;
  }

  function findComandaForDetails(comandaId) {
    return state.openComandas.find((c) => c.id === comandaId) || state.closedComandas.find((c) => c.id === comandaId) || findComandaInHistory(comandaId);
  }

  function formatEventTypeTagForHistory(e) {
    if (!e) return "";
    const type = e.type || "";
    const isActorAdmin = e.actorRole === "admin" || String(e.actorName || "").toLowerCase().includes("admin");
    
    if (type === "comanda_aberta") {
      return `<span class="tag event-type-tag event-type-gray">Comanda aberta</span>`;
    }
    if (type === "comanda_finalizada" || type === "comanda_finalizada_auto") {
      return `<span class="tag event-type-tag event-type-green">Comanda finalizada</span>`;
    }
    if (type === "item_add" || type === "garcom_adicionou_pedido" || type.includes("adicionou") || type === "venda_avulsa" || type.includes("fiado_ajuste_produto_add")) {
      const actorLabel = isActorAdmin ? "administrador" : "garçom";
      return `<span class="tag event-type-tag event-type-blue">Adicionado pelo ${actorLabel}</span>`;
    }
    
    // Fallback:
    const label = eventTypeLabel(type);
    return `<span class="tag event-type-tag event-type-gray">${esc(label)}</span>`;
  }

  function formatEventDetailForHistory(e, comanda) {
    if (!e) return "";
    const type = e.type || "";
    const detail = String(e.detail || "");
    
    if (type === "comanda_aberta") {
      return "(Início do atendimento)";
    }
    
    if (type === "comanda_finalizada" || type === "comanda_finalizada_auto") {
      const valMatch = detail.match(/no valor (R\$\s*\d+[\d,.]*)/i);
      const val = valMatch ? valMatch[1] : (comanda ? money(comandaTotal(comanda)) : "");
      
      let methodText = "";
      if (detail.includes("Dinheiro")) methodText = "Dinheiro";
      else if (detail.includes("Pix")) methodText = "Pix";
      else if (detail.includes("Debito") || detail.includes("debito")) methodText = "Débito";
      else if (detail.includes("Credito") || detail.includes("credito")) methodText = "Crédito";
      else if (detail.includes("Fiado") || detail.includes("fiado")) methodText = "Fiado";
      else methodText = comanda ? comandaPaymentText(comanda, { includeAmount: false }) : "";
      
      if (!methodText) methodText = "Dinheiro";
      
      return `(Total ${val}, Pago em ${methodText})`;
    }
    
    const addMatch = detail.match(/Item (.*?) x(\d+) adicionado/i) || detail.match(/Venda avulsa.*? (.*?) x(\d+)/i) || detail.match(/adicionou (\d+)x (.*?)/i) || detail.match(/Adicionou (\d+)x (.*?)/i);
    if (addMatch) {
      let qty = "";
      let name = "";
      if (detail.match(/Item (.*?) x(\d+) adicionado/i) || detail.match(/Venda avulsa.*? (.*?) x(\d+)/i)) {
        name = addMatch[1];
        qty = addMatch[2];
      } else {
        qty = addMatch[1];
        name = addMatch[2];
      }
      return `(Adicionou ${qty}x ${name} ao pedido)`;
    }
    
    return `(${detail})`;
  }

  function renderComandaDetailsBox() {
    if (!uiState.comandaDetailsId) return "";
    const comanda = findComandaForDetails(uiState.comandaDetailsId);
    if (!comanda) {
      uiState.adminInlineEditComandaId = null;
      return "";
    }
    const viewer = getCurrentUser();
    if (!canActorAccessComanda(viewer, comanda)) {
      uiState.comandaDetailsId = null;
      return "";
    }
    const openEvent = (comanda.events || []).find((event) => event.type === "comanda_aberta");
    const creatorUser = state.users.find((u) => String(u.id) === String(comanda.createdBy));
    const creatorName = resolveComandaResponsibleName(comanda);
    const creatorRole = String(creatorUser?.role || openEvent?.actorRole || "").trim();
    const creatorRoleText = creatorRole ? ` (${roleLabel(creatorRole)})` : "";
    const isOpenComanda = state.openComandas.some((entry) => String(entry?.id || "") === String(comanda.id || ""));
    const isFiadoPendingComanda = hasPendingPayableForComanda(comanda.id);
    const pendingPayable = isFiadoPendingComanda ? findPendingPayableByComandaId(comanda.id) : null;
    if (!isOpenComanda && !isFiadoPendingComanda && String(uiState.adminInlineEditComandaId || "") === String(comanda.id || "")) {
      uiState.adminInlineEditComandaId = null;
    }
    const showCreatorForAdmin = isAdminOrDev(viewer);
    const showAdminControls = isAdminOrDev(viewer) && (isOpenComanda || isFiadoPendingComanda);
    const showReadOnlyAdminNotice = isAdminOrDev(viewer) && !isOpenComanda && !isFiadoPendingComanda;
    const inlineEditMode =
      showAdminControls && String(uiState.adminInlineEditComandaId || "") === String(comanda.id || "");

    if (!showAdminControls) {
      const groups = groupComandaItems(comanda.items || []);
      const rows = groups.map(({ main, addons }) => {
        const itemStatus = main.canceled ? "Cancelado" : main.delivered ? "Entregue" : "Pendente";
        const statusClass = main.canceled ? "status-cancelado" : main.delivered ? "status-entregue" : "status-pendente";
        const statusHtml = `<span class="status-pill ${statusClass}">${itemStatus}</span>`;
        const addonRows = addons.map(addon => {
          const addonStatus = addon.canceled ? "Cancelado" : addon.delivered ? "Entregue" : "Pendente";
          const addonStatusClass = addon.canceled ? "status-cancelado" : addon.delivered ? "status-entregue" : "status-pendente";
          const addonStatusHtml = `<span class="status-pill ${addonStatusClass}">${addonStatus}</span>`;
          return `
            <tr style="background:#f9f9f9;">
              <td style="padding-left:16px;"><small>+ ${esc(addon.name)}</small></td>
              <td class="separator-col">|</td>
              <td class="center-col"><small>${addon.qty}</small></td>
              <td class="separator-col">|</td>
              <td class="price-col"><small>${money(addon.priceAtSale)}</small></td>
              <td class="separator-col">|</td>
              <td class="status-col">${addonStatusHtml}</td>
              <td class="separator-col">|</td>
              <td><small>${esc(addon.waiterNote || "-")}</small></td>
            </tr>
          `;
        }).join("");
        return `
          <tr>
            <td><b>${esc(main.name)}</b></td>
            <td class="separator-col">|</td>
            <td class="center-col">${main.qty}</td>
            <td class="separator-col">|</td>
            <td class="price-col">${money(main.priceAtSale)}</td>
            <td class="separator-col">|</td>
            <td class="status-col">${statusHtml}</td>
            <td class="separator-col">|</td>
            <td>${esc(main.waiterNote || "-")}</td>
          </tr>
          ${addonRows}
        `;
      }).join("");

      const comandaEvents = (comanda.events || []).slice(-40).reverse();
      const events = comandaEvents
        .map((e) => {
          const dateStr = formatDateTime(e.ts);
          const tagHtml = formatEventTypeTagForHistory(e);
          const detailHtml = formatEventDetailForHistory(e, comanda);
          return `
            <tr>
              <td class="event-time-col">${dateStr}</td>
              <td class="event-actor-col">${esc(e.actorName)}</td>
              <td class="event-detail-col">
                <div class="event-pill-row">${tagHtml}</div>
                <div class="event-subtext-row">${esc(detailHtml)}</div>
              </td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="comanda-details-container history-comanda-details" style="margin-top:0.75rem;">
          <div class="details-section-header">
            <h4>DETALHES DA COMANDA (Nº ${esc(displayComandaId(comanda.id))})</h4>
            <button class="btn secondary close-details-btn" data-action="close-comanda-details">Fechar</button>
          </div>
          
          <div class="details-card-table">
            <table class="comanda-details-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="separator-col">|</th>
                  <th class="center-col">Qtd</th>
                  <th class="separator-col">|</th>
                  <th class="price-col">Unit.</th>
                  <th class="separator-col">|</th>
                  <th class="status-col">Status</th>
                  <th class="separator-col">|</th>
                  <th>Obs</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="9">Sem itens.</td></tr>`}
              </tbody>
            </table>
          </div>
          
          <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: bold; text-transform: uppercase;">HISTÓRICO DE ALTERAÇÕES (REGISTRO INFORMATIVO)</h4>
          
          <div class="details-card-table">
            <table class="comanda-history-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Ator</th>
                  <th>Ação / Tipo (Detalhes)</th>
                </tr>
              </thead>
              <tbody>
                ${events || `<tr><td colspan="3">Sem eventos.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    const groups = groupComandaItems(comanda.items || []);
    const rows = groups.map(({ main, addons }) => {
      const itemStatus =
        itemNeedsKitchen(main) && !main.canceled
          ? `${esc(kitchenStatusLabel(main.kitchenStatus || "fila"))} | ${esc(kitchenPriorityLabel(main.kitchenPriority || "normal"))}`
          : main.canceled
            ? "Cancelado"
            : main.delivered
              ? "Entregue"
              : "Pendente";
      const adminActions =
        showAdminControls && main.id && !isFiadoPendingComanda
          ? `<td><div class="actions admin-item-actions"><button class="btn secondary compact-action" data-action="admin-edit-comanda-item" data-comanda-id="${esc(comanda.id)}" data-item-id="${esc(main.id)}">Editar</button><button class="btn danger compact-action" data-action="admin-remove-comanda-item" data-comanda-id="${esc(comanda.id)}" data-item-id="${esc(main.id)}">Remover</button></div></td>`
          : "";
      const addonRows = addons.map(addon => {
        const addonStatus =
          itemNeedsKitchen(addon) && !addon.canceled
            ? `${esc(kitchenStatusLabel(addon.kitchenStatus || "fila"))} | ${esc(kitchenPriorityLabel(addon.kitchenPriority || "normal"))}`
            : addon.canceled
              ? "Cancelado"
              : addon.delivered
                ? "Entregue"
                : "Pendente";
        const addonAdminActions =
          showAdminControls && addon.id && !isFiadoPendingComanda
            ? `<td><div class="actions admin-item-actions"><button class="btn secondary compact-action" data-action="admin-edit-comanda-item" data-comanda-id="${esc(comanda.id)}" data-item-id="${esc(addon.id)}">Editar</button><button class="btn danger compact-action" data-action="admin-remove-comanda-item" data-comanda-id="${esc(comanda.id)}" data-item-id="${esc(addon.id)}">Remover</button></div></td>`
            : "";
        return `<tr style="background:#f9f9f9;"><td style="padding-left:16px;"><small>+ ${esc(addon.name)}</small></td><td><small>${addon.qty}</small></td><td><small>${money(addon.priceAtSale)}</small></td><td><small>${addonStatus}</small></td><td><small>${esc(addon.waiterNote || "-")}${addon.deliveryRequested ? ` | Entrega: ${esc(addon.deliveryRecipient || "-")} @ ${esc(addon.deliveryLocation || "-")}` : ""}</small></td>${addonAdminActions}</tr>`;
      }).join("");
      return `<tr><td>${esc(main.name)}</td><td>${main.qty}</td><td>${money(main.priceAtSale)}</td><td>${itemStatus}</td><td>${esc(main.waiterNote || "-")}${main.deliveryRequested ? ` | Entrega: ${esc(main.deliveryRecipient || "-")} @ ${esc(main.deliveryLocation || "-")}` : ""}</td>${adminActions}</tr>${addonRows}`;
    }).join("");
    const comandaEvents = (comanda.events || []).slice(-40).reverse();
    const events = comandaEvents
      .map((e) => `<tr><td>${formatDateTime(e.ts)}</td><td>${esc(e.actorName)}</td><td>${renderEventTypeTag(e.type)}</td><td>${esc(maskComandaCodesInText(e.detail))}</td></tr>`)
      .join("");

    return `
      <div class="detail-box admin-comanda-detail-view" style="margin-top:0.75rem;">
        <div class="detail-header">
          <div class="detail-title-group">
            <div class="detail-badge-row">
              <span class="detail-badge detail-badge-accent">${esc(displayComandaId(comanda.id))}</span>
              <span class="detail-badge ${isOpenComanda ? "detail-badge-open" : "detail-badge-closed"}">${esc(comanda.status || "aberta")}</span>
            </div>
            <h4>Detalhes da comanda</h4>
          </div>
          <button class="btn secondary" data-action="close-comanda-details">Fechar</button>
        </div>
        <div class="detail-meta-grid">
          <span class="detail-meta-chip">Mesa: ${esc(comanda.table || "-")}</span>
          <span class="detail-meta-chip">Cliente: ${esc(comanda.customer || "-")}</span>
          <span class="detail-meta-chip">Status: ${esc(comanda.status || "aberta")}</span>
        </div>
        <div class="detail-meta-grid secondary">
          ${showCreatorForAdmin ? `<span class="detail-meta-chip subtle">Criada por: ${esc(creatorName)}${esc(creatorRoleText)}</span>` : ""}
          <span class="detail-meta-chip subtle">Criada em ${formatDateTime(comanda.createdAt)}${comanda.closedAt ? ` | Fechada em ${formatDateTime(comanda.closedAt)}` : ""}</span>
          <span class="detail-meta-chip subtle">Pagamento: ${esc(comandaPaymentText(comanda, { includeAmount: true, totalFallback: comandaTotal(comanda) }))} | Total: <b>${money(isFiadoPendingComanda ? parseNumber(pendingPayable?.total || 0) : comandaTotal(comanda))}</b>${isFiadoPendingComanda ? " (fiado pendente)" : ""}</span>
        </div>
        ${isFiadoPendingComanda ? `<p class="note" style="margin-top:0.6rem;">Comanda com fiado pendente: edicao de itens liberada sem reabrir a comanda.</p>` : ""}
        ${showReadOnlyAdminNotice ? `<p class="note" style="margin-top:0.35rem;">Comanda fechada/historica: somente visualizacao de dados.</p>` : ""}
        ${showAdminControls
        ? inlineEditMode
          ? `<div class="actions" style="margin-top:0.6rem;"><button class="btn secondary" data-action="close-comanda-inline-edit">Voltar ao resumo</button>${isFiadoPendingComanda ? `<button class="btn warn" data-action="reduce-payable-value" data-comanda-id="${esc(comanda.id)}">Reduzir valor</button>` : ""}</div><div class="detail-comanda-surface" style="margin-top:0.65rem;">${renderComandaCard(comanda, { forceExpanded: true, fiadoEditMode: isFiadoPendingComanda && !isOpenComanda })}</div>`
          : isFiadoPendingComanda && !isOpenComanda
            ? `<div class="actions" style="margin-top:0.6rem;"><button class="btn ok" data-action="open-comanda-edit-flow" data-comanda-id="${esc(comanda.id)}">Editar</button></div><p class="note" style="margin-top:0.35rem;">Modo fiado: edite os itens da comanda para ajustar o valor total pendente.</p>`
            : `<div class="actions" style="margin-top:0.6rem;">${isOpenComanda ? `<button class="btn ok" data-action="open-comanda-edit-flow" data-comanda-id="${esc(comanda.id)}">Editar</button>` : ""}<button class="btn secondary" data-action="admin-edit-comanda" data-comanda-id="${esc(comanda.id)}">Editar dados da comanda</button><button class="btn ok" data-action="admin-add-comanda-item" data-comanda-id="${esc(comanda.id)}">Adicionar item pelo administrador</button></div><p class="note" style="margin-top:0.35rem;">As alteracoes registram: adicionado, alterado ou removido pelo administrador.</p>`
        : ""
      }
        ${inlineEditMode
        ? ""
        : `<div class="detail-comanda-surface" style="margin-top:0.75rem;">${renderComandaCard(comanda, { forceExpanded: true, fiadoEditMode: isFiadoPendingComanda && !isOpenComanda })}</div>`
      }
        <details class="compact-details" style="margin-top:0.75rem;">
          <summary>Acoes da comanda (${comandaEvents.length})</summary>
          <div class="table-wrap detail-table-wrap" style="margin-top:0.5rem;">
            <table class="history-table">
              <thead><tr><th>Data</th><th>Ator</th><th>Tipo</th><th>Detalhe</th></tr></thead>
              <tbody>${events || `<tr><td colspan="4">Sem eventos.</td></tr>`}</tbody>
            </table>
          </div>
        </details>
      </div>
    `;
  }

  function comandaUpdatedAt(comanda) {
    const lastEventAt = (comanda.events || []).length ? (comanda.events || []).slice(-1)[0]?.ts : null;
    return comanda.closedAt || lastEventAt || comanda.createdAt;
  }

  function comandaKitchenNotice(comanda) {
    const items = Array.isArray(comanda?.items) ? comanda.items : [];
    const hasMissing = items.some((item) => itemNeedsKitchen(item) && !item.canceled && (item.kitchenStatus || "fila") === "em_falta");
    if (hasMissing) {
      return { tone: "falta", text: "Aviso: cozinha marcou item em falta." };
    }
    const hasReady = items.some((item) => itemNeedsKitchen(item) && !item.canceled && isKitchenReadyForWaiter(item));
    if (hasReady) {
      return { tone: "pronto", text: "Aviso: ha item disponivel para entrega da cozinha." };
    }
    return null;
  }

  function renderComandaRecordsCompact(commandas, options = {}) {
    const limit = Number(options.limit || 60);
    const title = options.title || "Registros por Comanda";
    const keyPrefix = detailKey("comanda-records", options.keyPrefix || title);
    const showKitchenNotice = options.showKitchenNotice === true;
    const viewer = getCurrentUser();
    const showAdminInlineEdit = isAdminOrDev(viewer);
    const tone = options.tone === "laranja" ? "laranja" : options.tone === "azul" ? "azul" : "";
    const cardToneClass = tone ? ` comanda-lista-${tone}` : "";
    if (!commandas.length) {
      return `
        <div class="card${cardToneClass}">
          <h3>${esc(title)}</h3>
          <div class="empty" style="margin-top:0.75rem;">Sem registros de comandas para o filtro atual.</div>
        </div>
      `;
    }

    const ordered = [...commandas]
      .sort((a, b) => new Date(comandaUpdatedAt(b) || 0) - new Date(comandaUpdatedAt(a) || 0))
      .slice(0, limit);
    return `
      <div class="card${cardToneClass}">
        <h3>${esc(title)}</h3>
        <p class="note">Cada comanda fica minimizada para evitar poluicao visual.</p>
        ${options.headerHtml ? options.headerHtml : ""}
        ${ordered
        .map((comanda) => {
          const validItems = (comanda.items || []).filter((i) => !i.canceled).length;
          const events = (comanda.events || []).slice(-20).reverse();
          const comandaDetailKey = detailKey(keyPrefix, comanda.id);
          const isClosed = String(comanda.status || "") === "finalizada" || String(comanda.status || "").includes("encerrada");
          const isOpenComanda = state.openComandas.some((entry) => String(entry?.id || "") === String(comanda.id || ""));
          const deliveryRequestedCount = (comanda.items || []).filter((item) => !item.canceled && item.deliveryRequested).length;
          const hasDeliveryRequested = isOpenComanda && deliveryRequestedCount > 0;
          const statusClass = isClosed ? "comanda-status-fechada" : "comanda-status-aberta";
          const statusText = isClosed ? "Fechada" : "Aberta";
          const kitchenNotice = !isClosed ? comandaKitchenNotice(comanda) : null;
          const kitchenBadgeCompact = !isClosed ? renderKitchenIndicatorBadge(comanda, true) : "";
          const waiterName = resolveComandaResponsibleName(comanda);
          const useAdminEditShortcut = showAdminInlineEdit && isOpenComanda;
          const comandaRowsSimple = (comanda.items || [])
            .map((item) => {
              const itemStatus =
                itemNeedsKitchen(item) && !item.canceled
                  ? `${esc(kitchenStatusLabel(item.kitchenStatus || "fila"))} | ${esc(kitchenPriorityLabel(item.kitchenPriority || "normal"))}`
                  : item.canceled
                    ? "Cancelado"
                    : item.delivered
                      ? "Entregue"
                      : "Pendente";
              return `<tr><td>${esc(item.name)}</td><td>${item.qty}</td><td>${money(item.priceAtSale)}</td><td>${itemStatus}</td><td>${esc(item.waiterNote || "-")}${item.deliveryRequested ? ` | Entrega: ${esc(item.deliveryRecipient || "-")} @ ${esc(item.deliveryLocation || "-")}` : ""}</td></tr>`;
            })
            .join("");
          return `
              <details class="compact-details ${statusClass}" data-persist-key="${esc(comandaDetailKey)}" style="margin-top:0.65rem;"${detailOpenAttr(comandaDetailKey)}>
                <summary>
                  <b>${esc(displayComandaId(comanda.id))}</b> | <span class="tag ${isClosed ? "status-comanda-fechada" : "status-comanda-aberta"}">${statusText}</span>${hasDeliveryRequested ? ` | <span class="tag">Entrega solicitada (${deliveryRequestedCount})</span>` : ""}${kitchenBadgeCompact ? ` | ${kitchenBadgeCompact}` : ""} | Mesa/ref: ${esc(comanda.table || "-")} | Garcom: ${esc(waiterName)} | Cliente: ${esc(comanda.customer || "-")} | Itens: ${validItems} | Total: ${money(comandaTotal(comanda))}
                </summary>
                <div class="note" style="margin-top:0.45rem;">Atualizada em: ${formatDateTime(comandaUpdatedAt(comanda))}</div>
                ${hasDeliveryRequested ? `<div class="note" style="margin-top:0.35rem;">Comanda aberta com pedido para entrega.</div>` : ""}
                ${kitchenNotice ? `<div class="note ${kitchenNotice.tone === "pronto" ? "comanda-alerta-pronto" : "comanda-alerta-falta"}" style="margin-top:0.35rem;">${esc(kitchenNotice.text)}</div>` : ""}
                ${showAdminInlineEdit
              ? useAdminEditShortcut
                ? `<div class="actions" style="margin-top:0.5rem;"><button class="btn ok" data-action="open-comanda-edit-flow" data-comanda-id="${esc(comanda.id)}">Editar</button></div><p class="note" style="margin-top:0.35rem;">Clique em <b>Editar</b> para abrir esta comanda no modo garcom. No historico, as alteracoes ficam registradas como adicionado, alterado e removido pelo administrador.</p>`
                : `<p class="note" style="margin-top:0.35rem;">Comanda fechada/historica: somente visualizacao dos dados.</p><div class="table-wrap" style="margin-top:0.5rem;"><table><thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Status</th><th>Obs</th></tr></thead><tbody>${comandaRowsSimple || `<tr><td colspan="5">Sem itens.</td></tr>`}</tbody></table></div>`
              : ""
            }
                <div class="table-wrap" style="margin-top:0.5rem;">
                  <table class="history-table">
                    <thead><tr><th>Data</th><th>Ator</th><th>Tipo</th><th>Detalhe</th></tr></thead>
                    <tbody>
                      ${events.length
              ? events.map((e) => `<tr><td>${formatDateTime(e.ts)}</td><td>${esc(e.actorName || "-")}</td><td>${renderEventTypeTag(e.type || "-")}</td><td>${esc(maskComandaCodesInText(e.detail || "-"))}</td></tr>`).join("")
              : `<tr><td colspan="4">Sem eventos registrados.</td></tr>`}
                    </tbody>
                  </table>
                </div>
                ${showAdminInlineEdit
              ? ""
              : `<div class="actions" style="margin-top:0.5rem;"><button class="btn secondary" data-action="open-comanda-details" data-comanda-id="${comanda.id}">Abrir detalhe completo</button></div>`
            }
              </details>
            `;
        })
        .join("")}
      </div>
    `;
  }

  function dedupeComandasById(commandas) {
    const map = new Map();
    for (const comanda of Array.isArray(commandas) ? commandas : []) {
      const id = String(comanda?.id || "").trim();
      if (!id) continue;
      const current = map.get(id);
      if (!current) {
        map.set(id, comanda);
        continue;
      }
      const incomingUpdated = new Date(comandaUpdatedAt(comanda) || 0).getTime();
      const currentUpdated = new Date(comandaUpdatedAt(current) || 0).getTime();
      if (incomingUpdated >= currentUpdated) {
        map.set(id, comanda);
      }
    }
    return [...map.values()];
  }

  function dedupeAuditEvents(events) {
    const map = new Map();
    for (const event of Array.isArray(events) ? events : []) {
      if (!event || typeof event !== "object") continue;
      const key = String(event.id || `${event.ts || ""}|${event.actorId || ""}|${event.type || ""}|${event.comandaId || ""}|${event.detail || ""}`);
      if (!map.has(key)) {
        map.set(key, event);
      }
    }
    return [...map.values()];
  }

  function summarizeRealtimeAction(event) {
    if (!event) return "-";
    const type = String(event.type || "");
    if (type === "comanda_aberta") return "Comanda aberta";
    if (type === "comanda_finalizada") return "Comanda finalizada";
    if (type === "item_add") return "Item adicionado";
    if (type === "item_cancelado") return "Item cancelado";
    if (type === "item_reduzido") return "Item reduzido";
    if (type === "admin_item_add") return "Adicionado pelo administrador";
    if (type === "admin_item_edit") return "Alterado pelo administrador";
    if (type === "admin_item_remove") return "Removido pelo administrador";
    if (type === "cozinha_status") return "Atualizacao da cozinha";
    if (type === "cozinha_recebido") return "Cozinha recebeu pedidos";
    if (type === "garcom_ciente_alerta") return "Garcom leu alerta";
    if (type === "admin_comanda_edit") return "Comanda alterada pelo administrador";
    if (type === "funcionario_add") return "Funcionario criado";
    if (type === "funcionario_edit") return "Funcionario alterado";
    if (type === "funcionario_delete") return "Funcionario removido";
    if (type === "produto_add") return "Produto criado";
    if (type === "produto_edit") return "Produto alterado";
    if (type === "produto_delete") return "Produto removido";
    if (type === "caixa_fechado") return "Caixa fechado";
    if (type === "caixa_novo") return "Novo caixa aberto";
    return eventTypeLabel(type);
  }

  function renderAdminHistory() {
    const currentAudit = state.auditLog.slice(0, 5000);
    const currentCashOpenedAtMs = new Date(state.cash?.openedAt || 0).getTime();
    const realtimeAuditResetAtMs = parseUpdatedAtTimestamp(state.meta?.realtimeAuditResetAt);
    const currentAuditCutoffMs = Math.max(
      Number.isFinite(currentCashOpenedAtMs) ? currentCashOpenedAtMs : 0,
      Number.isFinite(realtimeAuditResetAtMs) ? realtimeAuditResetAtMs : 0
    );
    const remoteCurrentCashAudit = uiState.remoteMonitorEvents.filter((event) => {
      if (!Number.isFinite(currentAuditCutoffMs) || currentAuditCutoffMs <= 0) return true;
      const eventTs = new Date(event?.ts || event?.broadcastAt || 0).getTime();
      return Number.isFinite(eventTs) && eventTs >= currentAuditCutoffMs;
    });
    const closures = state.history90;
    const displayedAuditAll = dedupeAuditEvents([...remoteCurrentCashAudit, ...currentAudit])
      .sort((a, b) => new Date(b.ts || b.broadcastAt || 0) - new Date(a.ts || a.broadcastAt || 0))
      .slice(0, 1800);
    const closureComandas = closures.flatMap((closure) => closure.commandas || []);
    const openComandas = dedupeComandasById(state.openComandas).sort((a, b) => new Date(comandaUpdatedAt(b) || 0) - new Date(comandaUpdatedAt(a) || 0));
    const closedCurrentComandas = dedupeComandasById(state.closedComandas).sort((a, b) => new Date(comandaUpdatedAt(b) || 0) - new Date(comandaUpdatedAt(a) || 0));
    const archivedComandas = dedupeComandasById(closureComandas).sort((a, b) => new Date(comandaUpdatedAt(b) || 0) - new Date(comandaUpdatedAt(a) || 0));
    const historyComandaSearch = String(uiState.adminHistoryComandaSearch || "").trim();
    const searchableComandas = dedupeComandasById([...openComandas, ...closedCurrentComandas, ...archivedComandas]);
    const searchableComandasById = new Map(
      searchableComandas.map((comanda) => [String(comanda?.id || "").trim(), comanda]).filter((entry) => Boolean(entry[0]))
    );
    const displayedAudit = displayedAuditAll.filter((event) => {
      if (!historyComandaSearch) return true;
      const comandaId = String(event?.comandaId || "").trim();
      if (!comandaId) return false;
      const comanda = searchableComandasById.get(comandaId);
      if (comanda) {
        return matchesComandaSearch(comanda, historyComandaSearch);
      }
      return comandaId.toLowerCase().includes(historyComandaSearch.toLowerCase());
    });
    const totalComandasHistorico = dedupeComandasById([...openComandas, ...closedCurrentComandas, ...archivedComandas]).sort(
      (a, b) => new Date(comandaUpdatedAt(b) || 0) - new Date(comandaUpdatedAt(a) || 0)
    ).length;
    const auditDetailsKey = detailKey("admin-history", "audit-day");
    const openCount = openComandas.length;
    const closedCount = closedCurrentComandas.length;
    const archivedCount = totalComandasHistorico;

    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Eventos em tempo real</h3>
          <p class="note">Mostra apenas eventos em tempo real do caixa atual.</p>
          <p class="note" style="margin-top:0.25rem;">Comandas abertas agora: <b>${openCount}</b> | Comandas fechadas no caixa atual: <b>${closedCount}</b> | Total de comandas no historico minimizado: <b>${archivedCount}</b></p>
          <details class="compact-details" data-persist-key="${esc(auditDetailsKey)}" style="margin-top:0.75rem;"${detailOpenAttr(auditDetailsKey)}>
            <summary>Ver alteracoes em tempo real (${displayedAudit.length})</summary>
            ${displayedAudit.length
        ? `<div class="table-wrap" style="margin-top:0.55rem;"><table class="history-table responsive-stack"><thead><tr><th>Quando</th><th>Quem</th><th>Acao</th><th>Comanda</th><th>Resumo</th><th>Abrir</th></tr></thead><tbody>${displayedAudit
          .map(
            (e) =>
              `<tr><td data-label="Quando">${formatDateTime(e.ts || e.broadcastAt)}</td><td data-label="Quem">${esc(e.actorName || "-")} (${esc(roleLabel(e.actorRole || "-"))})</td><td data-label="Acao">${esc(maskComandaCodesInText(summarizeRealtimeAction(e)))}</td><td data-label="Comanda">${esc(displayComandaId(e.comandaId || "-"))}</td><td data-label="Resumo">${esc(maskComandaCodesInText(e.detail || "-"))}</td><td data-label="Abrir">${e.comandaId ? `<button class="btn secondary compact-action" data-action="open-comanda-details" data-comanda-id="${e.comandaId}">Ver</button>` : "-"
              }</td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.55rem;">Sem eventos registrados ainda.</div>`}
          </details>
          ${renderComandaDetailsBox()}
        </div>
        ${renderComandaRecordsCompact(openComandas.filter(c => !historyComandaSearch || matchesComandaSearch(c, historyComandaSearch)), {
          title: "Comandas abertas (caixa atual)",
          limit: 500,
          keyPrefix: "admin-history-comandas-open",
          tone: "azul",
          showKitchenNotice: true,
          headerHtml: `
            <div class="field" style="margin-top:0.75rem; margin-bottom:0.25rem;">
              <label>Buscar comanda nestas listas (numero, mesa ou referencia)</label>
              <input data-role="admin-history-comanda-search" value="${esc(uiState.adminHistoryComandaSearch)}" placeholder="Ex.: CMD-0005, mesa 7, joana..." />
            </div>
          `
        })}
      </div>
      <div style="margin-top:0.75rem;">
        ${renderComandaRecordsCompact(closedCurrentComandas, {
          title: "Comandas fechadas (caixa atual)",
          limit: 500,
          keyPrefix: "admin-history-comandas-closed-current",
          tone: "laranja"
        })}
      </div>
      <div class="card" style="margin-top:0.75rem;">
        <h3>Fechamentos de Caixa (90 dias)</h3>
        ${closures.length
        ? closures
          .map((h) => {
            const summary = h.summary || buildCashSummary(h.commandas || []);
            const closureDetailsKey = detailKey("admin-history", "cash-closure", h.id);
            return `<details class="compact-details" data-persist-key="${esc(closureDetailsKey)}" style="margin-top:0.65rem;"${detailOpenAttr(closureDetailsKey)}>
                  <summary><b>${esc(h.id)}</b> | Aberto: ${formatDateTimeWithDay(h.openedAt)} | Fechado: ${formatDateTimeWithDay(h.closedAt)} | ${summary.commandasCount} comandas | ${money(summary.total)}</summary>
                  <div class="actions" style="margin-top:0.6rem;">
                    <button class="btn secondary" data-action="print-cash-closure" data-id="${esc(h.id)}">Ver fechamento</button>
                    <button class="btn secondary" data-action="print-cash-closure-extended" data-id="${esc(h.id)}">Ver fechamento estendido</button>
                  </div>
                  <div class="table-wrap" style="margin-top:0.6rem;">
                    <table>
                      <thead><tr><th>Comanda</th><th>Status</th><th>Total</th><th>Cliente</th><th>Abrir</th></tr></thead>
                      <tbody>${(h.commandas || [])
                .map(
                  (c) =>
                    `<tr><td>${esc(displayComandaId(c.id))}</td><td>${esc(c.status)}</td><td>${money(comandaTotal(c))}</td><td>${esc(c.customer || "-")}</td><td><button class="btn secondary" data-action="open-comanda-details" data-comanda-id="${c.id}">Ver</button></td></tr>`
                )
                .join("")}</tbody>
                    </table>
                  </div>
                </details>`;
          })
          .join("")
        : `<div class="empty" style="margin-top:0.75rem;">Nenhum fechamento realizado ainda.</div>`}
      </div>
    `;
  }

  function renderAdminCash() {
    const openInfo = `Caixa ${state.cash.id} iniciado em ${formatCashOpenedAtLabel(state.cash.openedAt)}`;
    const pendingOpen = [...state.openComandas].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const hasPendingOpen = pendingOpen.length > 0;
    const pendingPreview = pendingOpen
      .slice(0, 8)
      .map((comanda) => `${displayComandaId(comanda.id)} (${comanda.table || "-"})`)
      .join(" | ");
    return `
      <div class="grid">
        <div class="card">
          <h3>Fechar Caixa</h3>
          <p class="note">Solicita segunda autenticacao para evitar fechamento por engano.</p>
          <p class="note" style="margin-top:0.35rem;">${esc(openInfo)}</p>
          ${hasPendingOpen
        ? `<div class="note" style="margin-top:0.45rem;color:var(--danger-text);"><b>Bloqueado:</b> existe(m) ${pendingOpen.length} comanda(s) aberta(s). Feche todas antes de encerrar o caixa.${pendingPreview ? ` Ex.: ${esc(pendingPreview)}${pendingOpen.length > 8 ? " ..." : ""}` : ""}</div>`
        : `<div class="note" style="margin-top:0.45rem;color:var(--ok-text);">Todas as comandas estao fechadas. Caixa liberado para encerramento.</div>`
      }
          <form id="close-cash-form" class="form" style="margin-top:0.75rem;" autocomplete="off">
            <div class="field">
              <label>Login admin (2a confirmacao)</label>
              <input name="login" required placeholder="login do admin" />
            </div>
            <div class="field">
              <label>Senha admin</label>
              <input name="password" type="password" required placeholder="senha do admin" />
            </div>
            <button type="submit" class="btn danger" ${hasPendingOpen ? "disabled title=\"Feche todas as comandas abertas para continuar.\"" : ""}>Fechar Caixa Agora</button>
          </form>
          <div class="actions" style="margin-top:0.75rem;">
            <button type="button" class="btn secondary" data-action="print-cash-day-history">Ver histórico do dia</button>
            <button type="button" class="btn secondary" data-action="print-cash-day-history-extended">Ver histórico do dia detalhado</button>
          </div>
          <p class="note" style="margin-top:0.35rem;">No fechamento, o historico detalhado do caixa e salvo automaticamente em HTML e fica disponivel para consulta por 30 dias.</p>
        </div>
      </div>
    `;
  }

  function renderAdminCashHtmlArchive() {
    ensureLatestCashClosureHtmlReport();
    const reports = (state.cashHtmlReports || [])
      .map((entry, idx) => normalizeCashHtmlReportRecord(entry, idx))
      .sort((a, b) => new Date(b.closedAt || b.createdAt || 0) - new Date(a.closedAt || a.createdAt || 0));
    const selectedReport = reports.find((entry) => String(entry.id) === String(uiState.cashHtmlViewerReportId || "")) || null;

    return `
      <div class="card">
        <h3>Arquivos HTML de Fechamento</h3>
        <p class="note">Cada fechamento de caixa gera um HTML detalhado com o resumo e o log completo do turno. Esses arquivos ficam salvos no sistema por 30 dias e sincronizados via Supabase.</p>
        ${reports.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table class="history-table"><thead><tr><th>Arquivo</th><th>Dia referencia</th><th>Caixa</th><th>Fechado em</th><th>Salvo em</th><th>Responsavel</th><th>Acoes</th></tr></thead><tbody>${reports
          .map(
            (report) =>
              `<tr><td>${esc(report.id)}</td><td>${esc(formatDateOnlySafe(report.referenceDay || report.openedAt || report.closedAt || report.createdAt || isoNow()))}</td><td>${esc(report.cashId || "-")}</td><td>${esc(formatDateTimeWithDay(report.closedAt || report.createdAt))}</td><td>${esc(formatDateTimeWithDay(report.createdAt || report.closedAt))}</td><td>${esc(report.createdByName || "-")} (${esc(roleLabel(report.createdByRole || "-"))})</td><td><div class="actions"><button class="btn ${selectedReport?.id === report.id ? "primary" : "secondary"}" data-action="open-cash-html-report" data-id="${esc(report.id)}">${selectedReport?.id === report.id ? "Em visualizacao" : "Consultar no site"}</button><button class="btn secondary" data-action="print-cash-html-report-compact" data-id="${esc(report.id)}">Imprimir 58mm</button></div></td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Nenhum HTML de fechamento salvo ainda.</div>`}
        ${selectedReport
        ? `<div class="card" style="margin-top:0.85rem;">
            <div class="actions" style="justify-content:space-between;align-items:center;gap:0.75rem;">
              <div>
                <h3 style="margin:0;">${esc(selectedReport.title || `Fechamento ${selectedReport.cashId || "-"}`)}</h3>
                <p class="note" style="margin:0.25rem 0 0;">${esc(selectedReport.subtitle || "Consulta interna do HTML salvo")} | Arquivo ${esc(selectedReport.id)}</p>
              </div>
              <button type="button" class="btn secondary" data-action="close-cash-html-report-viewer">Fechar visualizacao</button>
            </div>
            <div style="margin-top:0.75rem;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;">
              <iframe title="${esc(selectedReport.title || selectedReport.id)}" srcdoc="${esc(selectedReport.html)}" style="width:100%;min-height:78vh;border:0;background:#fff;"></iframe>
            </div>
          </div>`
        : reports.length
          ? `<div class="empty" style="margin-top:0.85rem;">Selecione um arquivo acima para consultar o HTML salvo sem sair do site.</div>`
          : ""}
      </div>
    `;
  }

  function renderAdminMonitor() {
    const actor = getCurrentUser();
    const isDevView = actor?.role === "dev";
    const employees = state.users.filter((u) => u.role === "waiter" || u.role === "cook" || (isDevView && u.role === "admin"));
    const selected = uiState.monitorWaiterId;
    const kitchenRows = listActiveKitchenOrders()
      .filter((row) => matchesKitchenCollaborator(row, selected))
      .filter((row) => matchesKitchenRowSearch(row, uiState.adminKitchenSearch));
    const kitchenHistoryRows = [...(state.cookHistory || [])]
      .sort((a, b) => new Date(b.deliveredAt || b.updatedAt || 0) - new Date(a.deliveredAt || a.updatedAt || 0))
      .filter((row) => {
        if (selected === "all") return true;
        const selectedId = String(selected || "");
        if (!selectedId) return true;
        if (String(row?.cookId || "") === selectedId) return true;
        const comanda = findComandaForDetails(String(row?.comandaId || ""));
        if (!comanda) return false;
        if (String(comanda.createdBy || "") === selectedId) return true;
        return (comanda.events || []).some((event) => String(event.actorId || "") === selectedId);
      })
      .filter((row) => {
        const query = String(uiState.adminKitchenSearch || "").trim().toLowerCase();
        if (!query) return true;
        const comanda = findComandaForDetails(String(row?.comandaId || ""));
        const responsible = comanda ? resolveComandaResponsibleName(comanda) : "";
        return (
          String(row?.comandaId || "").toLowerCase().includes(query) ||
          String(row?.table || "").toLowerCase().includes(query) ||
          String(row?.itemName || "").toLowerCase().includes(query) ||
          String(row?.waiterNote || "").toLowerCase().includes(query) ||
          String(row?.cookName || "").toLowerCase().includes(query) ||
          String(kitchenStatusLabel(row?.status || "fila")).toLowerCase().includes(query) ||
          String(responsible || "").toLowerCase().includes(query) ||
          (comanda ? matchesComandaSearch(comanda, query) : false)
        );
      });
    const kitchenFila = kitchenRows.filter((row) => (row.item.kitchenStatus || "fila") === "fila").length;
    const kitchenCooking = kitchenRows.filter((row) => (row.item.kitchenStatus || "fila") === "cozinhando").length;
    const kitchenDelivered = kitchenHistoryRows.filter((row) => row.status === "entregue").length;
    const kitchenMissing = kitchenHistoryRows.filter((row) => row.status === "em_falta").length;
    const activeCardsHtml = kitchenRows
      .map((row) => {
        const responsible = resolveComandaResponsibleName(row.comanda);
        const status = row.item.kitchenStatus || "fila";
        const statusLabel = kitchenStatusLabel(status);
        const statusClass = status === "cozinhando" ? "cooking" : status === "em_falta" ? "missing" : status === "entregue" ? "done" : "queue";
        const deliveryInfo = row.item.deliveryRequested
          ? `${row.item.deliveryRecipient || "-"} | ${row.item.deliveryLocation || "-"}`
          : "Balcao/Mesa";
        const statusActions = `
          <button class="btn secondary compact-action ${status === "cozinhando" ? "is-active" : ""}" data-action="cook-status" data-comanda-id="${esc(row.comanda.id)}" data-item-id="${esc(row.item.id)}" data-status="cozinhando" ${status === "cozinhando" ? "disabled" : ""}>Cozinhando</button>
          <button class="btn danger compact-action ${status === "em_falta" ? "is-active" : ""}" data-action="cook-status" data-comanda-id="${esc(row.comanda.id)}" data-item-id="${esc(row.item.id)}" data-status="em_falta" ${status === "em_falta" ? "disabled" : ""}>Em falta</button>
          <button class="btn ok compact-action ${status === "entregue" ? "is-active" : ""}" data-action="cook-status" data-comanda-id="${esc(row.comanda.id)}" data-item-id="${esc(row.item.id)}" data-status="entregue" ${status === "entregue" ? "disabled" : ""}>Entregue</button>
        `;
        return `
          <article class="monitor-order-card status-${statusClass}">
            <div class="monitor-order-head">
              <div>
                <h5>${esc(row.item.name || "-")} x${row.item.qty}</h5>
                <div class="monitor-order-pills">
                  <span class="monitor-order-pill">Comanda ${esc(displayComandaId(row.comanda.id))}</span>
                  <span class="monitor-order-pill">Mesa/ref ${esc(row.comanda.table || "-")}</span>
                  <span class="monitor-order-pill">Responsavel ${esc(responsible)}</span>
                  ${row.item.deliveryRequested ? `<span class="monitor-order-pill delivery">Entrega</span>` : ""}
                </div>
              </div>
              <span class="monitor-order-status ${statusClass}">${esc(statusLabel)}</span>
            </div>
            <div class="monitor-order-collapsed-note">
              Pedido minimizado para focar no fluxo.
            </div>
            <details class="monitor-order-details" data-persist-key="admin-monitor-row-${esc(row.comanda.id)}-${esc(row.item.id)}"${detailOpenAttr(`admin-monitor-row-${row.comanda.id}-${row.item.id}`)}>
              <summary>Expandir a&ccedil;&otilde;es do pedido</summary>
              <div class="monitor-order-meta">
                <div class="monitor-meta-box"><span>Atualizado em</span><b>${esc(formatDateTime(row.item.kitchenStatusAt || row.item.createdAt))}</b></div>
                <div class="monitor-meta-box"><span>Entrega</span><b>${esc(deliveryInfo)}</b></div>
                ${row.item.waiterNote
            ? `<div class="monitor-meta-box is-full"><span>Obs do pedido</span><b>${esc(row.item.waiterNote)}</b></div>`
            : ""
          }
              </div>
              <div class="monitor-order-actions">${statusActions}</div>
            </details>
          </article>
        `;
      })
      .join("");
    const historyRowsHtml = kitchenHistoryRows
      .slice(0, 180)
      .map((row) => {
        const comanda = findComandaForDetails(String(row?.comandaId || ""));
        const responsible = comanda ? resolveComandaResponsibleName(comanda) : "-";
        return `<tr><td>${formatDateTime(row.deliveredAt || row.updatedAt)}</td><td>${esc(displayComandaId(row.comandaId || "-"))}</td><td>${esc(row.table || "-")}</td><td>${esc(responsible)}</td><td>${esc(row.itemName || "-")}</td><td>${row.qty}</td><td>${esc(kitchenStatusLabel(row.status || "fila"))}</td><td>${esc(row.cookName || "-")}</td></tr>`;
      })
      .join("");

    return `
      <div class="grid">
        <div class="card">
          <h3>Monitor Pedido x Cozinha</h3>
          <p class="note">Painel restrito ao relacionamento entre pedidos e respostas da cozinha, com leitura simples para computador e celular.</p>
          <div class="field" style="margin-top:0.75rem;">
            <label>Filtrar colaborador</label>
            <select data-action="monitor-filter" data-role="monitor-filter">
              <option value="all" ${selected === "all" ? "selected" : ""}>Todos</option>
              ${employees
        .map((w) => `<option value="${w.id}" ${String(w.id) === String(selected) ? "selected" : ""}>${esc(w.name)}</option>`)
        .join("")}
            </select>
          </div>
          <div class="field" style="margin-top:0.5rem;">
            <label>Buscar pedido/cozinha</label>
            <input data-role="admin-kitchen-search" value="${esc(uiState.adminKitchenSearch)}" placeholder="Comanda, mesa/ref, item, observacao, garcom ou cozinheiro" />
          </div>
          <div class="kpis" style="margin-top:0.75rem;">
            <div class="kpi"><p>Na fila</p><b>${kitchenFila}</b></div>
            <div class="kpi"><p>Em preparo</p><b>${kitchenCooking}</b></div>
            <div class="kpi"><p>Entregues (hist.)</p><b>${kitchenDelivered}</b></div>
            <div class="kpi"><p>Em falta (hist.)</p><b>${kitchenMissing}</b></div>
          </div>
          <div class="grid cols-2" style="margin-top:0.8rem;">
            <div class="card">
              <h4>Pedidos aguardando resposta da cozinha</h4>
              <p class="note">Mostra somente pedidos ativos com fluxo de cozinha. O administrador pode atualizar o status aqui.</p>
              ${kitchenRows.length
        ? `<div class="monitor-orders-grid">${activeCardsHtml}</div>`
        : `<div class="empty" style="margin-top:0.65rem;">Sem pedidos ativos para o filtro aplicado.</div>`}
            </div>
            <div class="card">
              <h4>Respostas recentes da cozinha</h4>
              <p class="note">Historico resumido de respostas ja registradas no caixa atual.</p>
              ${kitchenHistoryRows.length
        ? `<div class="table-wrap" style="margin-top:0.65rem;"><table class="history-table responsive-stack"><thead><tr><th>Quando</th><th>Comanda</th><th>Mesa/ref</th><th>Responsavel</th><th>Item</th><th>Qtd</th><th>Resposta cozinha</th><th>Cozinheiro</th></tr></thead><tbody>${historyRowsHtml}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.65rem;">Sem respostas da cozinha para o filtro aplicado.</div>`}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAdminPrinting() {
    const prefs = normalizePrinterPrefs(uiState.printerPrefs);
    const configuredName = prefs.receiptPrinterName || "Impressora padrao do Windows";
    return `
      <div class="grid cols-2">
        <section class="card">
          <h3>Impressora de cupom</h3>
          <p class="note">Use nesta maquina que esta pareada por Bluetooth com a MTP-II. O QZ Tray envia o cupom para a fila do Windows sem abrir a janela de impressao.</p>
          <div class="field" style="margin-top:0.75rem;">
            <label><input type="checkbox" data-role="receipt-direct-enabled" ${prefs.receiptDirectEnabled ? "checked" : ""} /> Imprimir cupom automaticamente ao finalizar venda</label>
          </div>
          <div class="field">
            <label>Nome da impressora neste dispositivo</label>
            <input data-role="receipt-printer-name" value="${esc(prefs.receiptPrinterName)}" placeholder="Ex.: MTP-II" />
            <p class="note">Deixe vazio para usar a impressora padrao desta maquina.</p>
          </div>
          <div class="field">
            <label>Largura do papel</label>
            <select data-role="receipt-paper-width">
              <option value="58" ${prefs.receiptPaperWidthMm === 58 ? "selected" : ""}>58 mm (MTP-II)</option>
              <option value="80" ${prefs.receiptPaperWidthMm === 80 ? "selected" : ""}>80 mm</option>
            </select>
          </div>
          <div class="actions">
            <button class="btn primary" type="button" data-action="save-receipt-printer-config">Salvar configuracao</button>
            <button class="btn secondary" type="button" data-action="print-receipt-test">Imprimir teste</button>
          </div>
        </section>
        <section class="card">
          <h3>Status e emissao fiscal</h3>
          <p class="note">Destino atual: <b>${esc(configuredName)}</b>.</p>
          <p class="note">O cupom termico e impresso somente nesta maquina. Pedidos dos demais celulares sincronizam pelo Supabase, mas nao tentam usar o Bluetooth deles.</p>
          <p class="note">A MTP-II imprime o DANFE depois que a NFC-e for autorizada. A integracao com SEFAZ/provedor permanece bloqueada ate cadastrar UF, certificado e credenciais; o sistema nao apresenta cupom comum como documento fiscal.</p>
          <p class="note">Antes do primeiro uso: pareie a MTP-II neste dispositivo, instale a ponte de impressao compativel, defina o nome acima e deixe-a aberta.</p>
        </section>
      </div>
    `;
  }

  function renderAdminComandas() {
    const tabs = [
      { key: "abrir", label: "Abrir pedido/comanda" },
      { key: "abertas", label: "Comandas abertas" },
      { key: "finalizadas", label: "Comandas finalizadas" },
      { key: "cozinha", label: "Fila cozinha" },
      { key: "consulta", label: "Consulta precos" },
      { key: "historico", label: "Contas" }
    ];

    const open = state.openComandas.length;
    const closed = state.closedComandas.length;
    const grossToday = state.closedComandas.reduce((sum, c) => sum + comandaTotal(c), 0);

    let content = "";
    switch (uiState.waiterTab) {
      case "abrir":
        content = renderWaiterCreateComanda();
        break;
      case "abertas":
        content = renderWaiterOpenComandas();
        break;
      case "finalizadas":
        content = renderAdminFinalizadas();
        break;
      case "cozinha":
        content = renderWaiterKitchen();
        break;
      case "consulta":
        content = renderWaiterCatalog();
        break;
      case "historico":
        content = renderWaiterHistory();
        break;
      default:
        content = renderWaiterCreateComanda();
    }

    return `
      <div class="grid">
        <div class="kpis">
          <div class="kpi"><p>Comandas Abertas</p><b>${open}</b></div>
          <div class="kpi"><p>Comandas Finalizadas Hoje</p><b>${closed}</b></div>
          <div class="kpi"><p>Total Vendido Hoje</p><b>${money(grossToday)}</b></div>
        </div>
      </div>
      <div class="card">
        <h3>Comandas (modo garcom)</h3>
        <p class="note">Administrador pode abrir e operar comandas com o mesmo fluxo do garcom.</p>
      </div>
      ${renderTabs("waiter", tabs, uiState.waiterTab)}
      ${content}
    `;
  }

  function renderAdminFinalizadas() {
    const closed = state.closedComandas || [];
    const title = "Comandas finalizadas";
    return `
      <div class="card">
        <h3>${esc(title)}</h3>
        <p class="note">Lista simples de comandas finalizadas para abrir e verificar rapidamente.</p>
      </div>
      ${renderComandaRecordsCompact(closed, {
        title: title,
        limit: 200,
        keyPrefix: "admin-finalizadas-comandas"
      })}
    `;
  }

  function renderAdminKitchen() {
    return `
      <div class="card" style="margin-bottom:0.8rem;">
        <h3>Cozinha</h3>
        <p class="note">Painel da cozinha integrado ao administrador. Acompanhe e atualize os pedidos sem trocar de conta.</p>
      </div>
      ${renderCookActive()}
      <div style="margin-top:0.8rem;">${renderCookHistory()}</div>
    `;
  }

  function renderAdmin(user) {
    if (uiState.adminTab === "avulsa" || uiState.adminTab === "monitor" || uiState.adminTab === "impressao") {
      uiState.adminTab = "comandas";
    } else if (uiState.adminTab === "apagar") {
      uiState.adminTab = "financeiro";
    } else if (uiState.adminTab === "dashboard") {
      uiState.adminTab = "comandas";
    }
    const tabs = [
      { key: "comandas", label: "Comandas" },
      { key: "produtos", label: "Produtos" },
      { key: "funcionarios", label: "Funcionarios" },
      { key: "cozinha", label: "Cozinha" },
      { key: "financeiro", label: "Financas" },
      { key: "caixa", label: "Fechar Caixa" },
      { key: "arquivos_html", label: "Contas" }
    ];

    let content = "";
    switch (uiState.adminTab) {
      case "comandas":
        content = renderAdminComandas();
        break;
      case "produtos":
        content = renderAdminProducts();
        break;
      case "funcionarios":
        content = renderAdminEmployees();
        break;
      case "cozinha":
        content = renderAdminKitchen();
        break;
      case "financeiro":
        content = renderAdminFinance();
        break;
      case "caixa":
        content = renderAdminCash();
        break;
      case "arquivos_html":
        content = renderAdminCashHtmlArchive();
        break;
      default:
        content = renderAdminComandas();
    }

    app.innerHTML = `
      <div class="container app-shell role-admin">
        ${renderInstallBanner()}
        ${renderTopBar(user)}
        ${renderTabs("admin", tabs, uiState.adminTab)}
        ${content}
        ${renderComandaItemSelectorModal()}
        ${renderDeleteComandaAuthModal()}
      </div>
    `;
  }

  function renderDevDevices() {
    const rows = listDevicePresenceRows();
    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Dispositivos online</h3>
          <p class="note">Atualizacao em tempo real de sessoes ativas no sistema (admin, garcom, cozinha e dev).</p>
          <div class="kpis" style="margin-top:0.75rem;">
            <div class="kpi"><p>Sessoes ativas</p><b>${rows.length}</b></div>
            <div class="kpi"><p>Ultimo ping local</p><b>${formatDateTime(isoNow())}</b></div>
          </div>
          ${rows.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table class="history-table"><thead><tr><th>Sessao</th><th>Usuario</th><th>Papel</th><th>Dispositivo</th><th>Navegador</th><th>Plataforma</th><th>Tela</th><th>Ultimo sinal</th></tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr><td>${esc(row.sessionId)}</td><td>${esc(row.userName || "-")}</td><td>${esc(roleLabel(row.role || "-"))}</td><td>${esc(row.deviceType || "-")}${row.isSelf ? " (este)" : ""}</td><td>${esc(row.browser || "-")}</td><td>${esc(row.platform || "-")}</td><td>${esc(row.viewport || "-")}</td><td>${esc(formatDateTime(row.seenAt))}</td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Sem dispositivos ativos no momento.</div>`}
        </div>
        <div class="card">
          <h3>Eventos recentes</h3>
          ${uiState.remoteMonitorEvents.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table class="history-table"><thead><tr><th>Data</th><th>Ator</th><th>Tipo</th><th>Comanda</th><th>Detalhe</th></tr></thead><tbody>${uiState.remoteMonitorEvents
          .slice(0, 120)
          .map(
            (event) =>
              `<tr><td>${formatDateTime(event.ts || event.broadcastAt)}</td><td>${esc(event.actorName || "-")}</td><td>${renderEventTypeTag(event.type || "-")}</td><td>${esc(displayComandaId(event.comandaId || "-"))}</td><td>${esc(maskComandaCodesInText(event.detail || "-"))}</td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Sem eventos remotos recebidos ainda.</div>`}
        </div>
      </div>
    `;
  }

  function renderDevTools() {
    const adminUser = state.users.find(u => u.role === "admin");
    const waiterUsers = state.users.filter(u => u.role === "waiter");
    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Exclusao em Massa</h3>
          <p class="note">Aviso: Isso apagara dados permanentemente (incluindo do Supabase)!</p>
          <div class="actions" style="margin-top:0.75rem;">
            <button class="btn danger" data-action="dev-bulk-delete" data-target="produtos">Apagar Todos os Produtos</button>
            <button class="btn danger" data-action="dev-bulk-delete" data-target="comandas-abertas">Apagar Comandas Abertas</button>
            <button class="btn danger" data-action="dev-bulk-delete" data-target="comandas-fechadas">Apagar Comandas Fechadas</button>
            <button class="btn danger" data-action="dev-bulk-delete" data-target="historico">Apagar Historico (history90)</button>
            <button class="btn danger" data-action="dev-bulk-delete" data-target="financeiro">Apagar Dados Financeiros (payables)</button>
            <button class="btn danger" data-action="dev-bulk-delete" data-target="caixa">Apagar Relatorios de Caixa</button>
            <button class="btn danger" data-action="dev-bulk-delete" data-target="garcons">Apagar Todos os Garcons</button>
            <button class="btn danger" data-action="dev-bulk-delete" data-target="tudo">Apagar Tudo (Reset Completo)</button>
          </div>
        </div>
        <div class="card">
          <h3>Alterar Credenciais</h3>
          <p class="note">Altere login e senha do administrador e garcons.</p>
          <h4 style="margin-top:0.75rem;">Administrador</h4>
          ${adminUser ? `
            <form id="dev-change-admin-creds-form" class="form" style="margin-top:0.5rem;">
              <input type="hidden" name="userId" value="${adminUser.id}" />
              <div class="field">
                <label>Novo Login</label>
                <input name="login" required value="${esc(adminUser.login)}" />
              </div>
              <div class="field">
                <label>Nova Senha</label>
                <input name="password" type="password" required />
              </div>
              <button class="btn primary" type="submit">Salvar Credenciais do Admin</button>
            </form>
          ` : `<div class="empty">Nenhum administrador encontrado.</div>`}
          <h4 style="margin-top:1rem;">Garcons</h4>
          ${waiterUsers.length ? `
            <div class="table-wrap" style="margin-top:0.5rem;">
              <table class="responsive-stack">
                <thead>
                  <tr>
                    <th>Garcom</th>
                    <th>Login</th>
                    <th>Nova Senha</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  ${waiterUsers.map(waiter => `
                    <tr>
                      <td data-label="Garcom">${esc(waiter.name)}</td>
                      <td data-label="Login">
                        <form class="form inline-form" data-action="dev-change-waiter-login" style="margin:0;">
                          <input type="hidden" name="userId" value="${waiter.id}" />
                          <input type="text" name="login" value="${esc(waiter.login)}" required style="width:100%;" />
                          <button class="btn secondary compact-action" type="submit">Salvar</button>
                        </form>
                      </td>
                      <td data-label="Nova Senha">
                        <form class="form inline-form" data-action="dev-change-waiter-password" style="margin:0;">
                          <input type="hidden" name="userId" value="${waiter.id}" />
                          <input type="password" name="password" required style="width:100%;" />
                          <button class="btn secondary compact-action" type="submit">Salvar</button>
                        </form>
                      </td>
                      <td data-label="Acao">
                        <button class="btn danger compact-action" data-action="dev-delete-waiter" data-user-id="${waiter.id}">Excluir</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<div class="empty">Nenhum garcom encontrado.</div>`}
        </div>
      </div>
    `;
  }

  function performDevBulkDelete(target, actor) {
    switch (target) {
      case "produtos":
        for (const product of state.products) {
          trackDeletedEntity("deletedProductIds", product.id);
        }
        state.products = [];
        break;
      case "comandas-abertas":
        for (const comanda of state.openComandas) {
          trackDeletedEntity("deletedComandaIds", comanda.id);
        }
        state.openComandas = [];
        break;
      case "comandas-fechadas":
        for (const comanda of state.closedComandas) {
          trackDeletedEntity("deletedComandaIds", comanda.id);
        }
        state.closedComandas = [];
        break;
      case "historico":
        for (const closure of state.history90) {
          for (const comanda of (closure.commandas || [])) {
            trackDeletedEntity("deletedComandaIds", comanda.id);
          }
        }
        state.history90 = [];
        break;
      case "financeiro":
        state.payables = [];
        break;
      case "caixa":
        state.cashHtmlReports = [];
        state.internalCashAudits = [];
        break;
      case "garcons":
        for (const waiter of state.users.filter(u => u.role === "waiter")) {
          trackDeletedEntity("deletedUserIds", waiter.id);
        }
        state.users = state.users.filter(u => u.role !== "waiter");
        break;
      case "tudo":
        // Reset everything except users (keep admin/waiter)
        for (const product of state.products) {
          trackDeletedEntity("deletedProductIds", product.id);
        }
        for (const comanda of state.openComandas) {
          trackDeletedEntity("deletedComandaIds", comanda.id);
        }
        for (const comanda of state.closedComandas) {
          trackDeletedEntity("deletedComandaIds", comanda.id);
        }
        for (const closure of state.history90) {
          for (const comanda of (closure.commandas || [])) {
            trackDeletedEntity("deletedComandaIds", comanda.id);
          }
        }
        state.products = [];
        state.openComandas = [];
        state.closedComandas = [];
        state.history90 = [];
        state.payables = [];
        state.cashHtmlReports = [];
        state.internalCashAudits = [];
        state.cookHistory = [];
        state.auditLog = [];
        uiState.remoteMonitorEvents = [];
        // Reset cash
        state.cash = {
          id: `CX-${state.seq.cash++}`,
          openedAt: "",
          date: todayISO()
        };
        break;
    }

    saveState({
      actor,
      reason: "dev_bulk_delete",
      cloudDelayMs: 0
    });
    alert(`Dados "${target}" apagados com sucesso!`);
    render();
  }

  function performDevChangeAdminCreds(form, actor) {
    const userId = Number(form.userId.value);
    const login = form.login.value.trim();
    const password = form.password.value;

    const user = state.users.find(u => u.id === userId);
    if (!user) {
      alert("Usuario nao encontrado.");
      return;
    }

    user.login = login;
    user.password = password;
    user.updatedAt = isoNow();

    saveState({
      actor,
      reason: "dev_change_admin_creds",
      cloudDelayMs: 0
    });
    alert("Credenciais do admin alteradas com sucesso!");
    render();
  }

  function performDevChangeWaiterLogin(form, actor) {
    const userId = Number(form.userId.value);
    const login = form.login.value.trim();

    const user = state.users.find(u => u.id === userId);
    if (!user) {
      alert("Usuario nao encontrado.");
      return;
    }

    user.login = login;
    user.updatedAt = isoNow();

    saveState({
      actor,
      reason: "dev_change_waiter_login",
      cloudDelayMs: 0
    });
    alert("Login do garcom alterado com sucesso!");
    render();
  }

  function performDevChangeWaiterPassword(form, actor) {
    const userId = Number(form.userId.value);
    const password = form.password.value;

    const user = state.users.find(u => u.id === userId);
    if (!user) {
      alert("Usuario nao encontrado.");
      return;
    }

    user.password = password;
    user.updatedAt = isoNow();

    saveState({
      actor,
      reason: "dev_change_waiter_password",
      cloudDelayMs: 0
    });
    alert("Senha do garcom alterada com sucesso!");
    render();
  }

  function renderDev(user) {
    if (uiState.devTab === "avulsa" || uiState.devTab === "monitor" || uiState.devTab === "impressao") {
      uiState.devTab = "dashboard";
    } else if (uiState.devTab === "apagar") {
      uiState.devTab = "financeiro";
    }
    const tabs = [
      { key: "dashboard", label: "Dashboard" },
      { key: "comandas", label: "Comandas" },
      { key: "produtos", label: "Produtos" },
      { key: "funcionarios", label: "Funcionarios" },
      { key: "cozinha", label: "Cozinha" },
      { key: "devices", label: "Dispositivos" },
      { key: "financeiro", label: "Financas" },
      { key: "caixa", label: "Fechar Caixa" },
      { key: "arquivos_html", label: "Contas" },
      { key: "ferramentas-dev", label: "Ferramentas Dev" }
    ];

    let content = "";
    switch (uiState.devTab) {
      case "comandas":
        content = renderAdminComandas();
        break;
      case "produtos":
        content = renderAdminProducts();
        break;
      case "funcionarios":
        content = renderAdminEmployees();
        break;
      case "cozinha":
        content = renderAdminKitchen();
        break;
      case "devices":
        content = renderDevDevices();
        break;
      case "financeiro":
        content = renderAdminFinance();
        break;
      case "caixa":
        content = renderAdminCash();
        break;
      case "arquivos_html":
        content = renderAdminCashHtmlArchive();
        break;
      case "ferramentas-dev":
        content = renderDevTools();
        break;
      default:
        content = renderAdminDashboard();
    }

    app.innerHTML = `
      <div class="container app-shell role-dev">
        ${renderInstallBanner()}
        ${renderTopBar(user)}
        ${renderTabs("dev", tabs, uiState.devTab)}
        ${content}
        ${renderComandaItemSelectorModal()}
        ${renderDeleteComandaAuthModal()}
      </div>
    `;
  }

  function renderWaiterHome() {
    return `
      <div class="card">
        <h3>Inicio do Garcom</h3>
        <p class="note">Escolha uma acao:</p>
        <div class="actions" style="margin-top:0.75rem;">
          <button class="btn primary" data-action="set-tab" data-role="waiter" data-tab="abrir">Abrir pedido/comanda</button>
          <button class="btn secondary" data-action="set-tab" data-role="waiter" data-tab="abertas">Comandas abertas</button>
        </div>
      </div>
    `;
  }

  function renderWaiterCreateComanda() {
    const actor = currentActor();
    const visibleOpenComandas = listOpenComandasForActor(actor);
    const activeComanda = uiState.waiterActiveComandaId
      ? visibleOpenComandas.find((comanda) => String(comanda.id) === String(uiState.waiterActiveComandaId)) || null
      : null;
    if (uiState.waiterActiveComandaId && !activeComanda) {
      uiState.waiterActiveComandaId = null;
    }
    const visibleQueue = listPendingKitchenItems(actor);
    const visibleClosedToday = actor?.role === "waiter" ? state.closedComandas.filter((comanda) => canActorAccessComanda(actor, comanda)) : state.closedComandas;

    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Abrir Pedido/Comanda</h3>
          <p class="note">Depois de criar, a comanda continua aberta ate o fechamento pelo garcom.</p>
          <p class="note" style="margin-top:0.25rem;">A observacao para a cozinha deve ser informada ao adicionar cada item do pedido.</p>
          <form id="create-comanda-form" class="form" style="margin-top:0.75rem;">
            <div class="field">
              <label>Mesa ou referencia</label>
              <input name="table" placeholder="Mesa 07" />
            </div>
            <div class="field">
              <label>Nome do cliente (opcional)</label>
              <input name="customer" placeholder="Cliente" />
            </div>
            <button class="btn primary" type="submit">Criar Comanda</button>
          </form>
        </div>
        ${activeComanda
        ? `<div class="card">
          <h3>Comanda ativa agora: ${esc(displayComandaId(activeComanda.id))}</h3>
          <p class="note">Adicione pedidos, acompanhe a cozinha e finalize quando necessario.</p>
          <div class="actions" style="margin-top:0.55rem;">
            <button class="btn secondary compact-action" data-action="minimize-open-comanda" data-comanda-id="${activeComanda.id}">Minimizar pedido aberto</button>
          </div>
          <div style="margin-top:0.75rem;">${renderComandaCard(activeComanda, { forceExpanded: true })}</div>
        </div>`
        : `<div class="card">
          <h3>Resumo rapido</h3>
          <div class="kpis" style="margin-top:0.75rem;">
            <div class="kpi"><p>Abertas</p><b>${visibleOpenComandas.length}</b></div>
            <div class="kpi"><p>Fila Cozinha</p><b>${visibleQueue.length}</b></div>
            <div class="kpi"><p>Fechadas hoje</p><b>${visibleClosedToday.length}</b></div>
          </div>
        </div>`
      }
      </div>
    `;
  }

  function renderQuickSale(roleContext) {
    const title = roleContext === "admin" ? "Venda Avulsa (Admin)" : roleContext === "waiter" ? "Venda Avulsa (Garcom)" : "Venda Avulsa";
    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>${title}</h3>
          <p class="note">Venda rapida. Itens com fluxo de cozinha (Cozinha e Ofertas dependentes) entram na fila da cozinha com as mesmas regras da comanda.</p>
          <form id="quick-sale-form" data-role="quick-sale-form" data-context="${roleContext}" class="form" style="margin-top:0.75rem;">
            <div class="grid cols-2">
              <div class="field">
                <label>Categoria</label>
                <select name="category" data-role="quick-category">
                  ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label>Produto</label>
                <select name="productId" data-role="quick-product"></select>
              </div>
            </div>
            <div class="grid cols-2">
              <div class="field">
                <label>Quantidade</label>
                <input name="qty" type="number" min="1" value="1" required />
              </div>
              <div class="field">
                <label>Pagamento</label>
                <select name="paymentMethod" required>
                  ${PAYMENT_METHODS.filter((p) => p.value !== "fiado").map((m) => `<option value="${m.value}">${m.label}</option>`).join("")}
                </select>
              </div>
            </div>
            <div class="field">
              <label>Cliente/recebedor (opcional)</label>
              <input name="customer" placeholder="Nome do cliente" />
            </div>
            <div class="field">
              <label>Observacao do pedido (opcional)</label>
              <input name="note" placeholder="Ex: sem cebola, consumo no balcao" />
            </div>
            <div class="field" data-role="quick-delivery-box" style="display:none;">
              <label><input name="isDelivery" data-role="quick-delivery-check" type="checkbox" /> Pedido para entrega</label>
              <div class="grid cols-2" data-role="quick-delivery-fields" style="display:none;">
                <div class="field">
                  <label>Receber por</label>
                  <input name="deliveryRecipient" placeholder="Nome de quem recebe" />
                </div>
                <div class="field">
                  <label>Local da entrega</label>
                  <input name="deliveryLocation" placeholder="Endereco/local de entrega" />
                </div>
              </div>
            </div>
            <div class="field">
              <label><input name="paidConfirm" type="checkbox" ${uiState.quickSalePaidConfirm ? "checked" : ""} /> Venda paga e conferida</label>
            </div>
            <div class="note" data-role="quick-kitchen-note">Para categorias fora de cozinha, a venda fecha imediatamente.</div>
            <button class="btn primary" type="submit">Finalizar Venda Avulsa</button>
          </form>
        </div>
      </div>
    `;
  }

  function renderItemRow(comanda, item) {
    const flags = [];
    const isMissing = itemNeedsKitchen(item) && !item.canceled && (item.kitchenStatus || "fila") === "em_falta";
    const subtotal = parseNumber(item.qty || 0) * parseNumber(item.priceAtSale || 0);
    const linkedSnack = item.addonForItemId ? (comanda.items || []).find((entry) => entry.id === item.addonForItemId) : null;
    if (item.canceled) flags.push('<span class="tag">Cancelado</span>');
    if (item.delivered) flags.push('<span class="tag">Entregue</span>');
    if (item.deliveryRequested) flags.push('<span class="tag">Entrega</span>');
    const tone = waiterItemHighlightTone(item);
    if (tone === "missing") flags.unshift('<span class="tag item-flag-missing">Em falta (nao cobrar)</span>');
    if (tone === "new") flags.unshift('<span class="tag item-flag-new">Novo pedido</span>');
    if (tone === "ready") flags.unshift('<span class="tag item-flag-ready">Pronto para entrega</span>');
    if (!item.delivered && !item.canceled && itemNeedsKitchen(item)) {
      const remMin = Math.ceil(kitchenRemainingMs(item) / 60000);
      flags.push(`<span class="tag">Fila cozinha ~${remMin} min</span>`);
      flags.push(`<span class="tag">Status: ${esc(kitchenStatusLabel(item.kitchenStatus || "fila"))}</span>`);
      flags.push(`<span class="tag">Prioridade: ${esc(kitchenPriorityLabel(item.kitchenPriority || "normal"))}</span>`);
      if (item.kitchenStatusByName) {
        flags.push(`<span class="tag">${esc(item.kitchenStatusByName)}</span>`);
      }
    }

    return `
      <div class="item-row ${tone ? `item-row-${tone}` : ""}">
        <div><b>${esc(item.name)}</b> x${item.qty} | ${money(item.priceAtSale)} un | ${isMissing ? `<span class="item-subtotal-missing">Subtotal nao cobrado</span>` : `Subtotal ${money(subtotal)}`}</div>
        <div class="note">Categoria: ${esc(item.category)}${item.subcategory ? ` / ${esc(item.subcategory)}` : ""} | Criado em: ${formatDateTime(item.createdAt)}</div>
        ${linkedSnack ? `<div class="note"><b>Adicional do lanche:</b> ${esc(linkedSnack.name)}</div>` : ""}
        ${item.waiterNote ? `<div class="note">Obs do pedido: ${esc(item.waiterNote)}</div>` : ""}
        ${item.deliveryRequested ? `<div class="note"><b>Entrega:</b> ${esc(item.deliveryRecipient || "-")} | ${esc(item.deliveryLocation || "-")}</div>` : ""}
        ${item.canceled ? `<div class="note">Cancelamento: ${esc(item.cancelReason || "-")} ${item.cancelNote ? `| ${esc(item.cancelNote)}` : ""}</div>` : ""}
        <div class="actions">
          ${flags.join(" ")}
        </div>
      </div>
    `;
  }

  function getComandaPaymentSplits(comandaId, total) {
    uiState.finalizeSplitsByComanda = uiState.finalizeSplitsByComanda || {};
    const normalizedTotal = Math.max(0, parseNumber(total || 0));
    if (!Array.isArray(uiState.finalizeSplitsByComanda[comandaId]) || !uiState.finalizeSplitsByComanda[comandaId].length) {
      uiState.finalizeSplitsByComanda[comandaId] = [
        { method: "dinheiro", amount: normalizedTotal.toFixed(2) }
      ];
    }
    return uiState.finalizeSplitsByComanda[comandaId];
  }

  function syncSplitsFromForm(form, comandaId) {
    if (!form || !comandaId) return;
    const methodEls = form.querySelectorAll('[data-role="payment-method"]');
    const amountEls = form.querySelectorAll('[data-role="payment-amount"]');
    const rows = [];
    for (let i = 0; i < methodEls.length; i++) {
      rows.push({
        method: String(methodEls[i]?.value || "dinheiro").trim(),
        amount: String(amountEls[i]?.value ?? "").trim()
      });
    }
    if (rows.length) {
      uiState.finalizeSplitsByComanda = uiState.finalizeSplitsByComanda || {};
      uiState.finalizeSplitsByComanda[comandaId] = rows;
    }
  }

  function renderFinalizePanel(comanda) {
    const total = comandaTotal(comanda);
    const isZeroTotal = Math.max(0, parseNumber(total || 0)) <= 0.01;
    const splits = getComandaPaymentSplits(comanda.id, total);

    const zeroTotalNote = isZeroTotal
      ? `<div class="note">Esta comanda totaliza ${money(0)}. Voce pode finalizar sem informar pagamento.</div>`
      : `<div class="note">Informe as formas de pagamento (dinheiro, cartao, pix, etc.). Voce pode dividir o total em varias formas.</div>`;

    const splitsHtml = splits.map((split, index) => {
      const methodOptions = PAYMENT_METHODS.map((m) =>
        `<option value="${m.value}" ${m.value === split.method ? "selected" : ""}>${m.label}</option>`
      ).join("");
      return `
        <div class="payment-split-row card" style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:flex-end; margin-bottom:0.6rem; padding:0.6rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px;">
          <div style="flex:1; min-width:140px;">
            <label style="font-size:0.8rem; display:block; margin-bottom:4px; font-weight:600;">Forma #${index + 1}</label>
            <select name="paymentMethod_${index}" data-role="payment-method" data-index="${index}" style="width:100%;">
              ${methodOptions}
            </select>
          </div>
          <div style="flex:1; min-width:110px;">
            <label style="font-size:0.8rem; display:block; margin-bottom:4px; font-weight:600;">Valor (R$)</label>
            <input type="number" step="0.01" min="0" name="paymentAmount_${index}" data-role="payment-amount" data-index="${index}" value="${split.amount}" style="width:100%;" />
          </div>
          ${splits.length > 1 ? `
            <div>
              <button type="button" class="btn danger compact-action" data-action="remove-payment-split" data-comanda-id="${comanda.id}" data-index="${index}" title="Remover esta forma" style="height:38px; padding:0 0.8rem;">✕</button>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    return `
      <form class="card form" data-role="finalize-form" data-comanda-id="${comanda.id}">
        <h4>Finalizacao da comanda ${esc(displayComandaId(comanda.id))}</h4>
        ${zeroTotalNote}
        
        <div class="payment-splits-container" data-role="payment-splits-list">
          ${splitsHtml}
        </div>

        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.5rem; margin:0.5rem 0 0.8rem 0;">
          <button type="button" class="btn secondary compact-action" data-action="add-payment-split" data-comanda-id="${comanda.id}">
            + Adicionar outra forma de pagamento
          </button>
          ${splits.length > 1 ? `
            <button type="button" class="btn compact-action" data-action="auto-balance-payment" data-comanda-id="${comanda.id}" title="Ajusta a ultima forma para completar o total exato">
              ⚡ Equilibrar valor restante
            </button>
          ` : ""}
        </div>

        <div class="note" data-role="payment-breakdown-note" style="padding:0.5rem; border-radius:6px; background:rgba(255,255,255,0.02); font-weight:500;">Divisao ainda nao conferida.</div>
        
        <div class="field" data-role="fiado-box" style="display:none;">
          <label>Nome do cliente (obrigatorio no fiado)</label>
          <input name="fiadoCustomer" placeholder="Nome completo" />
        </div>
        <div class="field" data-role="pix-box" style="display:none;">
          <label>QR Pix (gerado automaticamente)</label>
          <div class="card" style="display:grid; place-items:center; gap:0.5rem;">
            <canvas data-role="pix-canvas"></canvas>
            <div class="note" data-role="pix-code"></div>
          </div>
        </div>
        <div class="field" data-role="manual-check-box">
          <label><input type="checkbox" name="manualCheck" data-role="manual-check" /> Pagamento conferido manualmente com cliente</label>
          <div class="note" data-role="manual-check-note" style="display:none;">No fiado, essa confirmacao e dispensada.</div>
        </div>
        <div class="note" style="font-size:1.05rem;"><b>Valor total da comanda:</b> ${money(total)}</div>
        <div class="actions finalize-actions">
          <button class="btn secondary" type="button" data-action="print-client-receipt" data-comanda-id="${comanda.id}">Gerar Nota</button>
          <button class="btn ok" type="submit">Confirmar finalizacao</button>
        </div>
      </form>
    `;
  }

  function renderComandaCard(comanda, options = {}) {
    const forceExpanded = Boolean(options.forceExpanded);
    const forceCollapsed = Boolean(options.forceCollapsed);
    const fiadoEditMode = options.fiadoEditMode === true;
    const formRole = fiadoEditMode ? "fiado-add-item-form" : "add-item-form";
    const total = comandaTotal(comanda);
    const fiadoPending = fiadoEditMode ? findPendingPayableByComandaId(comanda.id) : null;
    const totalDisplay = fiadoPending ? Math.max(0, parseNumber(fiadoPending.total || 0)) : total;
    const isCollapsed = forceExpanded ? false : forceCollapsed ? true : isWaiterComandaCollapsed(comanda.id);
    const isFinalizeOpen = Boolean(uiState.finalizeOpenByComanda[comanda.id]);
    const kitchenIndicator = renderKitchenIndicatorBadge(comanda);
    const hasKitchenItems = (comanda.items || []).some((item) => itemNeedsKitchen(item) && !item.canceled);
    const validItemsCount = (comanda.items || []).filter((item) => !item.canceled).length;
    const actor = getCurrentUser();
    const canResolveIndicator = actor && actor.role === "waiter" && hasKitchenItems && kitchenIndicator;
    const canDeleteComanda = actor && (actor.role === "waiter" || isAdminOrDev(actor));
    const canToggleCollapse = !fiadoEditMode && !forceExpanded && !forceCollapsed;
    const draftItems = getWaiterDraftItems(comanda.id);
    const tableRef = comanda.table || "-";
    const deliveryRequestedCount = (comanda.items || []).filter((item) => !item.canceled && item.deliveryRequested).length;
    const hasDeliveryRequested = deliveryRequestedCount > 0;

    return `
      <div class="comanda-card ${isCollapsed ? "is-collapsed" : ""} ${forceExpanded ? "is-focused" : ""}">
        <div class="comanda-header">
          <div>
            <div class="comanda-identity-box">
              <div class="comanda-identity-row">
                <span class="comanda-identity-label">Mesa/Ref.</span>
                <span class="comanda-identity-table">${esc(tableRef)}</span>
              </div>
            </div>
            ${kitchenIndicator ? `<div style="margin-top:0.3rem;">${kitchenIndicator}</div>` : ""}
            <p class="note comanda-meta-note">Garcom: ${esc(resolveComandaResponsibleName(comanda))} | Cliente: ${esc(comanda.customer || "Nao informado")} | Aberta em ${formatDateTime(comanda.createdAt)}</p>
            <p class="note">Total atual: <b>${money(totalDisplay)}</b>${fiadoPending ? ` | Fiado pendente` : ""}</p>
          </div>
          ${canToggleCollapse ? `<button class="btn secondary" type="button" data-action="toggle-comanda-collapse" data-comanda-id="${comanda.id}">${isCollapsed ? "Expandir" : "Minimizar"}</button>` : ""}
        </div>

        ${!isCollapsed && comanda.notes?.length ? `<div class="note">Obs da comanda: ${comanda.notes.map((n) => esc(n)).join(" | ")}</div>` : ""}
        ${!isCollapsed && canResolveIndicator ? `<div class="actions indicator-actions"><button class="btn secondary" data-action="resolve-kitchen-indicator" data-comanda-id="${comanda.id}" data-mode="entendi">Entendi o alerta</button></div>` : ""}
        ${!fiadoEditMode && !isCollapsed && validItemsCount
        ? `<div class="actions comanda-item-icon-actions"><button class="btn icon-action-btn plus" type="button" data-action="open-item-selector" data-comanda-id="${comanda.id}" data-mode="increment" title="Adicionar quantidade em item" aria-label="Adicionar quantidade em item">+</button><button class="btn icon-action-btn cancel" type="button" data-action="open-item-selector" data-comanda-id="${comanda.id}" data-mode="cancel" title="Devolver/cancelar quantidade" aria-label="Devolver ou cancelar quantidade">x</button></div>`
        : ""
      }

        ${isCollapsed
        ? `<div class="note">Itens: <b>${validItemsCount}</b> | ${forceCollapsed ? "Modo leitura rapida ativado para comandas abertas." : 'Toque em "Expandir" para detalhes.'}${hasDeliveryRequested ? ` Pedido para entrega: <b>${deliveryRequestedCount}</b>.` : ""}</div>${kitchenIndicator ? `<div style="margin-top:0.35rem;">${renderKitchenIndicatorBadge(comanda, false)}</div>` : ""}${forceCollapsed
          ? `<div class="actions"><button class="btn secondary compact-action" data-action="open-comanda-on-create" data-comanda-id="${comanda.id}">Abrir no painel de pedido</button></div>`
          : ""
        }`
        : `
        <div class="item-list">
          ${(comanda.items || []).length ? groupComandaItems(comanda.items || []).map(({ main, addons }) => `
            ${renderItemRow(comanda, main)}
            ${addons.map(addon => `<div style="padding-left:16px; border-left:3px solid #ddd; margin-left:8px;">${renderItemRow(comanda, addon)}</div>`).join("")}
          `).join("") : `<div class="empty">Sem itens ainda.</div>`}
        </div>

        <form class="form compact" data-role="${formRole}" data-comanda-id="${comanda.id}">
          <h4>Adicionar item</h4>
          <div class="grid cols-2">
            <div class="field">
              <label>Categoria</label>
              <select name="category" data-role="item-category">
                ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
            <div class="field" data-role="item-subcategory-box" style="display:none;">
              <label>Tipo de lanche</label>
              <select name="subcategory" data-role="item-subcategory">
                ${SNACK_SUBCATEGORIES.map((subcategory) => `<option value="${subcategory}">${subcategory}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Buscar produto</label>
              <input
                type="search"
                data-role="item-product-search"
                placeholder="Digite para filtrar"
                autocomplete="off"
              />
            </div>
          </div>
          <div class="field">
            <label>Produto</label>
            <select name="productId" data-role="item-product"></select>
          </div>
          <div class="field" data-role="lanche-addon-products-box" style="display:none;">
            <label>Adicionar adicionais ao lanche</label>
            <select name="addonProductIds" data-role="lanche-addon-products" multiple size="4"></select>
            <p class="note">Segure Ctrl/Cmd para selecionar mais de um adicional.</p>
          </div>
          <div class="field" data-role="lanche-addon-link-box" style="display:none;">
            <label>Associar adicional ao lanche</label>
            <select name="addonForItemId" data-role="lanche-addon-link"></select>
          </div>
          <div class="grid cols-2">
            <div class="field">
              <label>Quantidade</label>
              <input name="qty" type="number" min="1" value="1" required />
            </div>
            <div class="field" data-role="customize-item-toggle-box" style="display: flex; align-items: center; margin-top: 1.25rem;">
              <label style="display: flex; align-items: center; gap: 0.25rem; font-weight: bold; cursor: pointer;">
                <input type="checkbox" data-role="customize-item-check" />
                Marcar item
              </label>
            </div>
          </div>

          <div class="grid cols-2" data-role="item-options-box" style="display:none; margin-top: 0.5rem; gap: 0.5rem;">
            <div class="field" style="display: flex; align-items: center;">
              <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                <input type="checkbox" data-role="item-has-note-check" />
                Possui observação
              </label>
            </div>
            <div class="field" style="display: flex; align-items: center;">
              <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                <input type="checkbox" name="isDelivery" data-role="item-is-delivery-check" />
                É para viagem
              </label>
            </div>
          </div>

          <div class="field" data-role="item-note-input-box" style="display:none; margin-top: 0.5rem;">
            <label>Observação</label>
            <input name="waiterNote" data-role="item-note-input" placeholder="Ex: sem cebola, ponto da carne, etc..." />
          </div>

          <div class="grid cols-2" data-role="item-delivery-fields-box" style="display:none; margin-top: 0.5rem; gap: 0.5rem;">
            <div class="field">
              <label>Quem vai receber</label>
              <input name="deliveryRecipient" data-role="item-recipient-input" placeholder="Nome de quem recebe" />
            </div>
            <div class="field">
              <label>Local de entrega</label>
              <input name="deliveryLocation" data-role="item-location-input" placeholder="Endereço de entrega" />
            </div>
          </div>
          <div class="note" data-role="kitchen-estimate">Tempo estimado cozinha: -</div>
          ${!fiadoEditMode && draftItems.length
          ? `<div class="card comanda-draft-box"><b>Itens selecionados (${draftItems.length})</b><div class="comanda-draft-list">${draftItems
            .map(
              (draft, index) =>
                `<div class="comanda-draft-row"><span>${esc(draft.category)} | ${esc(state.products.find((p) => p.id === draft.productId && p.category === draft.category)?.name || `Produto ${draft.productId}`)} x${draft.qty}${draft.waiterNote ? ` | Obs: ${esc(draft.waiterNote)}` : ""}${draft.isDelivery ? ` | Entrega: ${esc(draft.deliveryRecipient || "-")} @ ${esc(draft.deliveryLocation || "-")}` : ""}</span><button type="button" class="btn danger compact-action" data-action="remove-draft-item" data-comanda-id="${comanda.id}" data-index="${index}">Remover</button></div>`
            )
            .join("")}</div></div>`
          : !fiadoEditMode
            ? `<div class="note">Nenhum item selecionado para envio em lote.</div>`
            : ""
        }
          <div class="actions draft-actions">
            <button class="btn primary compact-action" type="submit">${fiadoEditMode ? "Adicionar" : draftItems.length ? "Adicionar lote" : "Adicionar"}</button>
          </div>
        </form>
        `
      }

        ${!fiadoEditMode && !isCollapsed
        ? `<div class="actions">
          <button class="btn secondary" type="button" data-action="print-order-ticket" data-comanda-id="${comanda.id}">Enviar pedidos</button>
          ${canDeleteComanda ? `<button class="btn danger" type="button" data-action="delete-comanda" data-comanda-id="${comanda.id}">Excluir comanda</button>` : ""}
          <button class="btn primary" type="button" data-action="toggle-finalize" data-comanda-id="${comanda.id}">${isFinalizeOpen ? "Fechar painel" : "Finalizar comanda"}</button>
        </div>`
        : ""
      }

        ${!fiadoEditMode && !isCollapsed && isFinalizeOpen ? renderFinalizePanel(comanda) : ""}
      </div>
    `;
  }

  function renderWaiterOpenComandas() {
    const actor = currentActor();
    const isWaiterActor = actor?.role === "waiter";
    const visibleOpenComandas = listOpenComandasForActor(actor);
    if (!visibleOpenComandas.length) {
      return `<div class="empty">Nenhuma comanda aberta no momento.</div>`;
    }

    const sorted = [...visibleOpenComandas].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const filtered = sorted.filter((c) => matchesComandaSearch(c, uiState.waiterComandaSearch));
    let newCount = 0;
    let readyCount = 0;
    for (const comanda of filtered) {
      for (const item of comanda.items || []) {
        const tone = waiterItemHighlightTone(item);
        if (tone === "new") newCount += 1;
        if (tone === "ready") readyCount += 1;
      }
    }

    return `
      <div class="card">
        <div class="field">
          <label>Busca por comanda (mesa/referencia/cliente/codigo)</label>
          <input data-role="waiter-search" value="${esc(uiState.waiterComandaSearch)}" placeholder="Ex: Mesa 7, CMD-0001, Joao" />
        </div>
        <p class="note" style="margin-top:0.5rem;">No menu de comandas abertas, ${isWaiterActor ? "ficam visiveis apenas as comandas sob responsabilidade do usuario logado." : "todas as comandas ficam disponiveis neste modo."} Destaques: amarelo (pedido novo) e verde (pronto para entrega).</p>
        <div class="kpis" style="margin-top:0.65rem;">
          <div class="kpi"><p>Comandas filtradas</p><b>${filtered.length}</b></div>
          <div class="kpi"><p>Pedidos novos</p><b>${newCount}</b></div>
          <div class="kpi"><p>Prontos para entrega</p><b>${readyCount}</b></div>
        </div>
      </div>
      ${filtered.length ? (() => {
        if (!isWaiterActor && actor?.role === "admin") {
          const grouped = {};
          for (const c of filtered) {
            const creator = resolveComandaResponsibleName(c);
            if (!grouped[creator]) grouped[creator] = [];
            grouped[creator].push(c);
          }
          return Object.keys(grouped).sort().map(creator => `
            <h4 style="margin-top:1.5rem; margin-bottom:0.5rem; border-bottom:1px solid var(--border); padding-bottom:0.25rem;">Garçom: ${esc(creator)} <span class="tag">${grouped[creator].length}</span></h4>
            <div class="comanda-grid" style="margin-top:0.5rem;">${grouped[creator].map(c => renderComandaCard(c, { forceCollapsed: true })).join("")}</div>
          `).join("");
        }
        return `<div class="comanda-grid" style="margin-top:1rem;">${filtered.map(c => renderComandaCard(c, { forceCollapsed: true })).join("")}</div>`;
      })() : `<div class="empty" style="margin-top:1rem;">Nenhuma comanda encontrada para a busca.</div>`}
    `;
  }

  function renderWaiterReadyModal() {
    return "";
    const rows = uiState.waiterReadyModalItems || [];
    if (!rows.length) return "";
    const hasDanger = rows.some((row) => row.status === "em_falta");
    return `
      <div class="waiter-ready-modal-backdrop">
        <div class="card waiter-ready-modal ${hasDanger ? "has-danger" : ""}">
          <h3>${hasDanger ? "Alerta da cozinha" : "Atualizacao da cozinha"}</h3>
          <p class="note" style="margin-top:0.35rem;">Qualquer atualizacao da cozinha aparece aqui. Itens em falta ficam destacados em vermelho.</p>
          <div class="waiter-ready-list" style="margin-top:0.65rem;">
            ${rows
        .map(
          (row) =>
            `<div class="waiter-ready-item status-${esc(row.status || "fila")}"><div><b>${esc(row.itemName)}</b> x${row.qty} | Comanda <b>${esc(displayComandaId(row.comandaId))}</b> | Referencia ${esc(row.table || "-")}</div><div class="kitchen-alert-meta"><span class="tag">Status: ${esc(row.statusLabel || kitchenStatusLabel("fila"))}</span><span class="note">Atualizado em: ${formatDateTime(row.updatedAt)}</span></div>${row.waiterNote ? `<div class="note">Obs do pedido: ${esc(row.waiterNote)}</div>` : ""}${row.deliveryRequested ? `<div class="note">Entrega: ${esc(row.deliveryRecipient || "-")} | ${esc(row.deliveryLocation || "-")}</div>` : ""}</div>`
        )
        .join("")}
          </div>
          <div class="actions" style="margin-top:0.75rem;">
            <button class="btn secondary" data-action="waiter-ready-go-open">Ir para comandas abertas</button>
            <button class="btn ok" data-action="close-waiter-ready-modal">Fechar aviso</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderWaiterKitchen() {
    const queue = listPendingKitchenItems(currentActor());
    const avg = queue.length ? Math.ceil(queue.reduce((s, r) => s + r.remainingMs, 0) / queue.length / 60000) : 0;

    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Fila de Espera - Cozinha</h3>
          <p class="note">Tempo medio atual: <b>${avg} min</b></p>
          ${queue.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table class="responsive-stack waiter-kitchen-table"><thead><tr><th>Comanda</th><th>Produto</th><th>Qtd</th><th>Obs cozinha</th><th>Prioridade</th><th>Status Cozinha</th><th>Tempo restante</th><th>Mesa/ref</th></tr></thead><tbody>${queue
          .map(
            (r) =>
              `<tr><td data-label="Comanda">${esc(displayComandaId(r.comanda.id))}</td><td data-label="Produto">${esc(r.item.name)}</td><td data-label="Qtd">${r.item.qty}</td><td data-label="Obs cozinha">${esc(r.item.waiterNote || "-")}</td><td data-label="Prioridade"><span class="tag">${esc(kitchenPriorityLabel(r.item.kitchenPriority || "normal"))}</span></td><td data-label="Status Cozinha"><span class="tag">${esc(kitchenStatusLabel(r.item.kitchenStatus || "fila"))}</span></td><td data-label="Tempo restante">${Math.ceil(r.remainingMs / 60000)} min</td><td data-label="Mesa/ref">${esc(r.comanda.table)}</td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Sem pedidos pendentes da cozinha.</div>`}
        </div>
        <div class="card">
          <h3>Regra de calculo aplicada</h3>
          <p class="note">Tempo informado por produto (admin) + soma do restante dos pedidos de cozinha nao entregues, descontando o tempo que ja passou. Alertas de cozinha aparecem nas comandas abertas.</p>
        </div>
      </div>
    `;
  }

  function renderWaiterCatalog() {
    const search = String(uiState.waiterCatalogSearch || "").trim().toLowerCase();
    const categoryFilter = uiState.waiterCatalogCategory || "all";
    const rows = state.products
      .filter((product) => {
        if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
        if (!search) return true;
        return (
          String(product.name || "").toLowerCase().includes(search) ||
          String(product.category || "").toLowerCase().includes(search) ||
          String(product.subcategory || "").toLowerCase().includes(search)
        );
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));

    const availableCount = rows.filter((p) => p.available !== false && Number(p.stock || 0) > 0).length;
    const unavailableCount = rows.length - availableCount;

    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Consulta de preco e disponibilidade</h3>
          <p class="note">Consulte valores do cardapio e disponibilidade antes de abrir/atualizar pedidos.</p>
          <div class="grid cols-2" style="margin-top:0.75rem;">
            <div class="field">
              <label>Buscar produto</label>
              <input data-role="waiter-catalog-search" value="${esc(uiState.waiterCatalogSearch)}" placeholder="Ex: cerveja, combo, pastel" />
            </div>
            <div class="field">
              <label>Categoria</label>
              <select data-role="waiter-catalog-category">
                <option value="all" ${categoryFilter === "all" ? "selected" : ""}>Todas</option>
                ${CATEGORIES.map((category) => `<option value="${category}" ${categoryFilter === category ? "selected" : ""}>${esc(category)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="kpis" style="margin-top:0.75rem;">
            <div class="kpi"><p>Itens listados</p><b>${rows.length}</b></div>
            <div class="kpi"><p>Disponiveis</p><b>${availableCount}</b></div>
            <div class="kpi"><p>Indisponiveis</p><b>${unavailableCount}</b></div>
          </div>
        </div>
        <div class="card">
          <h3>Cardapio Atual</h3>
          ${rows.length
        ? `<div class="table-wrap" style="margin-top:0.75rem;"><table class="responsive-stack waiter-catalog-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preco</th><th>Disponibilidade</th><th>Estoque</th><th>Fluxo</th></tr></thead><tbody>${rows
          .map((p) => {
            const status =
              p.available === false ? "Indisponivel (admin)" : Number(p.stock || 0) <= 0 ? "Sem estoque" : "Disponivel";
            const flow = productNeedsKitchen(p) ? "Cozinha" : "Pronta entrega";
            return `<tr><td data-label="Produto">${esc(p.name)}</td><td data-label="Categoria">${esc(categoryDisplay(p.category, p.subcategory || ""))}</td><td data-label="Preco">${money(p.price)}</td><td data-label="Disponibilidade">${esc(status)}</td><td data-label="Estoque">${Number(p.stock || 0)}</td><td data-label="Fluxo">${flow}</td></tr>`;
          })
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.75rem;">Nenhum item encontrado para o filtro informado.</div>`}
        </div>
      </div>
    `;
  }

  function renderWaiterHistory() {
    const actor = currentActor();
    const dayOpen = listOpenComandasForActor(actor);
    const dayClosed = listFinalizedComandasForActor(actor);
    const dayComandaIds = new Set([...dayOpen, ...dayClosed].map((comanda) => String(comanda?.id || "").trim()).filter(Boolean));
    const todayAudit = state.auditLog
      .filter((entry) => isAuditEventVisibleToActor(entry, actor))
      .filter((entry) => dayComandaIds.has(String(entry?.comandaId || "").trim()))
      .slice(0, 250);
    const closed = listFinalizedComandasForActor(actor)
      .sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0))
      .slice(0, 150);
    const waiterHistoryDetailsKey = detailKey("waiter-history", "audit");

    return `
      <div class="grid cols-2">
        <div class="card">
          <h3>Historico de Alteracoes (imutavel)</h3>
          <p class="note" style="margin-top:0.35rem;">Mostra apenas alteracoes das comandas abertas/fechadas no caixa atual.</p>
          <details class="compact-details" data-persist-key="${esc(waiterHistoryDetailsKey)}" style="margin-top:0.75rem;"${detailOpenAttr(waiterHistoryDetailsKey)}>
            <summary>Ver alteracoes (${todayAudit.length})</summary>
            ${todayAudit.length
        ? `<div class="table-wrap" style="margin-top:0.55rem;"><table class="history-table"><thead><tr><th>Data</th><th>Ator</th><th>Tipo</th><th>Comanda</th><th>Detalhe</th></tr></thead><tbody>${todayAudit
          .map(
            (e) => `<tr><td>${formatDateTime(e.ts)}</td><td>${esc(e.actorName)}</td><td>${renderEventTypeTag(e.type)}</td><td>${esc(displayComandaId(e.comandaId || "-"))}</td><td>${esc(maskComandaCodesInText(e.detail))}</td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.55rem;">Sem eventos ainda.</div>`}
          </details>
        </div>
        ${renderComandaRecordsCompact(closed, {
          title: "Comandas Finalizadas do caixa atual (minimizadas)",
          limit: 150,
          keyPrefix: "waiter-history-comandas"
        })}
      </div>
      ${renderComandaDetailsBox()}
    `;
  }

  function listActiveKitchenOrders() {
    const rows = [];
    for (const comanda of state.openComandas) {
      for (const item of comanda.items || []) {
        if (isKitchenOrderActive(item)) {
          rows.push({ comanda, item });
        }
      }
    }
    rows.sort(kitchenSortRows);
    return rows;
  }

  function findUserNameById(userId) {
    if (userId === undefined || userId === null || userId === "") return "";
    const user = state.users.find((entry) => String(entry.id) === String(userId));
    return user?.name || "";
  }

  function resolveComandaResponsibleName(comanda) {
    const byId = findUserNameById(comanda?.createdBy);
    if (byId) return byId;
    const openEvent = (comanda?.events || []).find((event) => event.type === "comanda_aberta" && event.actorName);
    if (openEvent?.actorName) return openEvent.actorName;
    const firstKnownActor = (comanda?.events || []).find((event) => event.actorName);
    return firstKnownActor?.actorName || "-";
  }

  function matchesKitchenCollaborator(row, selectedActorId) {
    if (!row || selectedActorId === "all") return true;
    const selected = String(selectedActorId || "");
    if (!selected) return true;
    if (String(row.comanda?.createdBy || "") === selected) return true;
    if (String(row.item?.kitchenStatusById || "") === selected) return true;
    return (row.comanda?.events || []).some((event) => String(event.actorId || "") === selected);
  }

  function matchesKitchenRowSearch(row, searchTerm) {
    const query = String(searchTerm || "").trim().toLowerCase();
    if (!query) return true;
    const responsible = resolveComandaResponsibleName(row.comanda);
    return (
      matchesComandaSearch(row.comanda, query) ||
      String(row.item?.name || "").toLowerCase().includes(query) ||
      String(row.item?.waiterNote || "").toLowerCase().includes(query) ||
      String(row.item?.deliveryRecipient || "").toLowerCase().includes(query) ||
      String(row.item?.deliveryLocation || "").toLowerCase().includes(query) ||
      String(kitchenStatusLabel(row.item?.kitchenStatus || "fila")).toLowerCase().includes(query) ||
      String(kitchenPriorityLabel(row.item?.kitchenPriority || "normal")).toLowerCase().includes(query) ||
      String(responsible || "").toLowerCase().includes(query)
    );
  }

  function kitchenRemainingLabel(item) {
    const status = item?.kitchenStatus || "fila";
    if (status === "em_falta") return "Aguardando ajuste";
    const remainingMin = Math.ceil(kitchenRemainingMs(item) / 60000);
    if (remainingMin <= 0) return status === "cozinhando" ? "Pronto para finalizar" : "Aguardando";
    return `${remainingMin} min`;
  }

  function renderKitchenOpsBoard(rows, options = {}) {
    const actor = getCurrentUser();
    const canCollapseRows = isAdminOrDev(actor);
    const emptyMessage = options.emptyMessage || "Sem pedidos ativos na cozinha.";
    if (!rows.length) {
      return `<div class="empty" style="margin-top:0.75rem;">${esc(emptyMessage)}</div>`;
    }

    return `
      <div class="kitchen-board" style="margin-top:0.75rem;">
        ${rows
        .map((row) => {
          const status = row.item.kitchenStatus || "fila";
          const statusLabel = kitchenStatusLabel(status);
          const statusClass = status === "cozinhando" ? "cooking" : status === "em_falta" ? "missing" : status === "entregue" ? "done" : "queue";
          const responsible = resolveComandaResponsibleName(row.comanda);
          const deliveryInfo = row.item.deliveryRequested
            ? `${row.item.deliveryRecipient || "-"} | ${row.item.deliveryLocation || "-"}`
            : "Balcao/Mesa";
          const kitchenBy = row.item.kitchenStatusByName || "-";
          const queueInfo = kitchenRemainingLabel(row.item);
          const rowDetailsKey = detailKey("kitchen-row", row.comanda.id, row.item.id);
          const isCollapsed = canCollapseRows ? isAdminKitchenRowCollapsed(row.comanda.id, row.item.id) : false;

          const statusBadge = status === "fila" ? "Aguardando" : status === "cozinhando" ? "Em Preparo" : status === "em_falta" ? "Em Falta" : "Concluído";
          const waitingInfo = status === "entregue" ? "Concluído" : `⏱️ ${queueInfo}`;
          return `
              <div class="kitchen-order-card status-${statusClass}">
                <div class="kitchen-order-card-header">
                  <div class="kitchen-order-header-top">
                    <span class="kitchen-order-code">CMD-${esc(displayComandaId(row.comanda.id))}</span>
                    <span class="kitchen-order-table">Mesa ${esc(row.comanda.table || "-")}</span>
                  </div>
                  <div class="kitchen-order-eta">${esc(waitingInfo)}</div>
                </div>
                <div class="kitchen-order-main">
                  <div class="kitchen-order-qty">${esc(row.item.qty)}x</div>
                  <div class="kitchen-order-description">
                    <div class="kitchen-order-status-badge status-${statusClass}">${esc(statusBadge)}</div>
                    <h3>${esc(row.item.name)}</h3>
                    ${row.item.waiterNote ? `<p class="kitchen-order-note">⚠️ ${esc(row.item.waiterNote)}</p>` : ""}
                  </div>
                </div>
                <div class="kitchen-order-info-list">
                  <div class="kitchen-order-info-row"><span>Entrega</span><strong>${esc(deliveryInfo)}</strong></div>
                  <div class="kitchen-order-info-row"><span>Atendente</span><strong>${esc(responsible)}</strong></div>
                </div>
                <div class="kitchen-order-actions">
                  <button class="btn primary compact-action ${status === "cozinhando" ? "is-active" : ""}" data-action="cook-status" data-comanda-id="${row.comanda.id}" data-item-id="${row.item.id}" data-status="cozinhando" ${status === "cozinhando" ? "disabled" : ""}>Em Preparo</button>
                  <button class="btn danger compact-action ${status === "em_falta" ? "is-active" : ""}" data-action="cook-status" data-comanda-id="${row.comanda.id}" data-item-id="${row.item.id}" data-status="em_falta" ${status === "em_falta" ? "disabled" : ""}>Em Falta</button>
                  <button class="btn ok compact-action" data-action="cook-status" data-comanda-id="${row.comanda.id}" data-item-id="${row.item.id}" data-status="entregue">Concluir</button>
                </div>
              </div>
            `;
        })
        .join("")}
      </div>
    `;
  }

  function renderCookActive() {
    const rows = listActiveKitchenOrders().filter((row) => matchesKitchenRowSearch(row, uiState.cookSearch));
    const countFila = rows.filter((r) => (r.item.kitchenStatus || "fila") === "fila").length;
    const countCooking = rows.filter((r) => (r.item.kitchenStatus || "fila") === "cozinhando").length;
    const countMissing = (state.cookHistory || []).filter((row) => row.status === "em_falta").length;

    return `
      <div class="grid">
        <div class="kpis">
          <div class="kpi"><p>Na fila</p><b>${countFila}</b></div>
          <div class="kpi"><p>Cozinhando</p><b>${countCooking}</b></div>
          <div class="kpi"><p>Em falta (hist.)</p><b>${countMissing}</b></div>
        </div>
        <div class="card">
          <h3>Ambiente Cozinha</h3>
          <p class="note">Painel otimizado para celular, sem rolagem horizontal nos botoes de acao.</p>
          <p class="note" style="margin-top:0.25rem;">Mostra pedidos com fluxo de cozinha e informacoes do garcom. O administrador atualiza somente o status de preparo aqui.</p>
          <div class="field" style="margin-top:0.75rem;">
            <label>Busca da cozinha</label>
            <input data-role="cook-search" value="${esc(uiState.cookSearch)}" placeholder="Comanda, mesa, cliente, item, observacao ou responsavel" />
          </div>
          ${renderKitchenOpsBoard(rows, { emptyMessage: "Sem pedidos ativos na cozinha para o filtro aplicado." })}
        </div>
      </div>
    `;
  }

  function renderCookHistory() {
    const rows = [...(state.cookHistory || [])].sort((a, b) => new Date(b.deliveredAt || b.updatedAt || 0) - new Date(a.deliveredAt || a.updatedAt || 0));
    const cookHistoryDetailsKey = detailKey("cook-history", "delivered");
    return `
      <div class="card">
        <h3>Historico da Cozinha</h3>
        <p class="note">Limpo automaticamente ao fechar o caixa.</p>
        <details class="compact-details" data-persist-key="${esc(cookHistoryDetailsKey)}" style="margin-top:0.75rem;"${detailOpenAttr(cookHistoryDetailsKey)}>
          <summary>Ver historico (${rows.length})</summary>
          ${rows.length
        ? `<div class="table-wrap" style="margin-top:0.55rem;"><table><thead><tr><th>Data</th><th>Comanda</th><th>Mesa/ref</th><th>Produto</th><th>Qtd</th><th>Obs cozinha</th><th>Prioridade</th><th>Status final</th><th>Entrega</th><th>Cozinheiro</th></tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr><td>${formatDateTime(row.deliveredAt || row.updatedAt)}</td><td>${esc(displayComandaId(row.comandaId))}</td><td>${esc(row.table || "-")}</td><td>${esc(row.itemName)}</td><td>${row.qty}</td><td>${esc(row.waiterNote || "-")}</td><td>${esc(kitchenPriorityLabel(row.priority || "normal"))}</td><td>${esc(kitchenStatusLabel(row.status || "entregue"))}</td><td>${row.deliveryRequested ? `<div><b>${esc(row.deliveryRecipient || "-")}</b></div><div class="note">${esc(row.deliveryLocation || "-")}</div>` : "Balcao/Mesa"}</td><td>${esc(row.cookName || "-")}</td></tr>`
          )
          .join("")}</tbody></table></div>`
        : `<div class="empty" style="margin-top:0.55rem;">Sem registros da cozinha neste caixa.</div>`}
        </details>
      </div>
    `;
  }

  function renderWaiterKitchenReceiptNotice() {
    return "";
    const notices = uiState.waiterKitchenReceiptNotices || [];
    if (!notices.length) return "";
    const latest = notices[0];
    const extra = Math.max(0, notices.length - 1);

    return `
      <div class="waiter-kitchen-receipt-banner">
        <div class="waiter-kitchen-receipt-main">
          <span class="status-dot ok"></span>
          <div>
            <p><b>Cozinha recebeu o pedido</b></p>
            <p class="note">${esc(latest.itemName)} x${latest.qty} | Comanda ${esc(displayComandaId(latest.comandaId))} | Ref. ${esc(latest.table || "-")} | ${formatDateTime(latest.receivedAt)}${latest.cookName ? ` | ${esc(latest.cookName)}` : ""}${extra ? ` | +${extra} novo(s)` : ""}</p>
          </div>
        </div>
        <div class="actions waiter-kitchen-receipt-actions">
          ${extra ? `<button class="btn secondary compact-action" data-action="clear-kitchen-receipt-notices">Limpar</button>` : ""}
          <button class="btn secondary compact-action" data-action="dismiss-kitchen-receipt-notice">Entendi</button>
        </div>
      </div>
    `;
  }

  function renderCook(user) {
    const tabs = [
      { key: "ativos", label: "Pedidos Ativos" },
      { key: "historico", label: "Historico Cozinha" }
    ];
    const content = uiState.cookTab === "historico" ? renderCookHistory() : renderCookActive();

    app.innerHTML = `
      <div class="container app-shell role-cook">
        ${renderInstallBanner()}
        ${renderTopBar(user)}
        ${renderTabs("cook", tabs, uiState.cookTab)}
        ${content}
      </div>
    `;
  }

  function renderWaiter(user) {
    if (uiState.waiterTab === "avulsa") {
      uiState.waiterTab = "abrir";
    }
    const tabs = [
      { key: "abrir", label: "Abrir pedido/comanda" },
      { key: "abertas", label: "Comandas abertas" },
      { key: "cozinha", label: "Fila cozinha" },
      { key: "consulta", label: "Consulta precos" },
      { key: "historico", label: "Contas" }
    ];

    let content = "";
    switch (uiState.waiterTab) {
      case "abrir":
        content = renderWaiterCreateComanda();
        break;
      case "abertas":
        content = renderWaiterOpenComandas();
        break;
      case "cozinha":
        content = renderWaiterKitchen();
        break;
      case "consulta":
        content = renderWaiterCatalog();
        break;
      case "historico":
        content = renderWaiterHistory();
        break;
      default:
        content = renderWaiterCreateComanda();
    }

    app.innerHTML = `
      <div class="container app-shell role-waiter">
        ${renderInstallBanner()}
        ${renderTopBar(user)}
        ${renderWaiterKitchenReceiptNotice()}
        ${renderTabs("waiter", tabs, uiState.waiterTab)}
        ${content}
        ${renderWaiterReadyModal()}
        ${renderComandaItemSelectorModal()}
        ${renderDeleteComandaAuthModal()}
      </div>
    `;
  }

  function render() {
    const deleteAuthFormBeforeRender = document.querySelector("#delete-comanda-auth-form");
    if (deleteAuthFormBeforeRender) {
      syncDeleteComandaAuthDraftFromForm(deleteAuthFormBeforeRender);
    }
    const activeEl = document.activeElement;
    const activeSelector = activeEl?.id
      ? `#${activeEl.id}`
      : activeEl?.dataset?.role
        ? `[data-role="${activeEl.dataset.role}"]`
        : activeEl?.name
          ? `${activeEl.tagName.toLowerCase()}[name="${activeEl.name}"]`
          : null;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    const activeVal = isInput ? activeEl.value : null;
    const selectionStart = isInput ? activeEl.selectionStart : null;
    const selectionEnd = isInput ? activeEl.selectionEnd : null;
    const scrollY = window.scrollY;

    if (!uiState.initialCloudLoadComplete) {
      renderLoading();
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      renderLogin();
      return;
    }

    if (user.role === "admin") {
      renderAdmin(user);
    } else if (user.role === "dev") {
      renderDev(user);
    } else if (user.role === "cook") {
      acknowledgeKitchenReceiptInCookPanel(user);
      renderCook(user);
    } else {
      pruneWaiterDraftItems();
      syncWaiterReadyModal();
      syncWaiterKitchenReceiptNotices();
      renderWaiter(user);
    }

    hydrateAfterRender();

    if (activeSelector) {
      const el = document.querySelector(activeSelector);
      if (el) {
        el.focus();
        if (selectionStart !== null && selectionEnd !== null && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
          try {
            el.setSelectionRange(selectionStart, selectionEnd);
          } catch (e) {
            // Some input types (like number) throw if you try to set selection range
          }
        }
      }
    }
    if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
  }

  function hydrateAfterRender() {
    document.querySelectorAll("details[data-persist-key]").forEach((detailsEl) => {
      const key = String(detailsEl.dataset.persistKey || "").trim();
      if (!key) return;
      const defaultOpen = String(detailsEl.dataset.persistDefaultOpen || "") === "true";
      const shouldOpen = isDetailOpen(key, defaultOpen);
      if (detailsEl.open !== shouldOpen) {
        detailsEl.open = shouldOpen;
      }
      if (detailsEl.dataset.persistBound === "1") return;
      detailsEl.dataset.persistBound = "1";
      detailsEl.addEventListener("toggle", () => {
        uiState.persistedDetailsOpen[key] = Boolean(detailsEl.open);
      });
    });

    document.querySelectorAll('form[data-role="add-item-form"], form[data-role="fiado-add-item-form"]').forEach((form) => {
      refreshComandaProductSelect(form);
    });

    document.querySelectorAll('[data-role="payment-method"]').forEach((select) => {
      toggleFinalizeView(select);
    });

    document.querySelectorAll('form[data-role="quick-sale-form"]').forEach((form) => {
      fillQuickSaleProductSelect(form);
      updateQuickSaleFlow(form);
    });

    const addProductForm = document.getElementById("add-product-form");
    if (addProductForm) {
      updateAdminProductSubmenu(addProductForm);
    }
  }

  function updateAdminProductSubmenu(form) {
    const category = form?.category?.value || "";
    const offerBox = form?.querySelector('[data-role="admin-offer-kitchen"]');
    const lancheSubcategoryBox = form?.querySelector('[data-role="admin-lanche-subcategory"]');
    const offerNeedsKitchen = form?.offerNeedsKitchen;
    const isOffer = category === "Ofertas";
    if (offerBox) offerBox.style.display = isOffer ? "grid" : "none";
    if (lancheSubcategoryBox) lancheSubcategoryBox.style.display = category === "Lanche" ? "grid" : "none";
    if (offerNeedsKitchen && !isOffer) {
      offerNeedsKitchen.checked = false;
    }
  }

  function updateDeliveryFields(form) {
    const customizeCheck = form.querySelector('[data-role="customize-item-check"]');
    const optionsBox = form.querySelector('[data-role="item-options-box"]');
    const hasNoteCheck = form.querySelector('[data-role="item-has-note-check"]');
    const noteInputBox = form.querySelector('[data-role="item-note-input-box"]');
    const noteInput = form.querySelector('[data-role="item-note-input"]');
    const isDeliveryCheck = form.querySelector('[data-role="item-is-delivery-check"]');
    const deliveryFieldsBox = form.querySelector('[data-role="item-delivery-fields-box"]');
    const recipientInput = form.querySelector('[data-role="item-recipient-input"]');
    const locationInput = form.querySelector('[data-role="item-location-input"]');

    if (!customizeCheck) return;

    if (customizeCheck.checked) {
      if (optionsBox) optionsBox.style.display = "grid";
      
      // Note logic
      if (hasNoteCheck && hasNoteCheck.checked) {
        if (noteInputBox) noteInputBox.style.display = "block";
      } else {
        if (noteInputBox) noteInputBox.style.display = "none";
        if (noteInput) noteInput.value = "";
      }

      // Delivery logic
      if (isDeliveryCheck && isDeliveryCheck.checked) {
        if (deliveryFieldsBox) deliveryFieldsBox.style.display = "grid";
        if (recipientInput) recipientInput.required = true;
        if (locationInput) locationInput.required = true;
      } else {
        if (deliveryFieldsBox) deliveryFieldsBox.style.display = "none";
        if (recipientInput) {
          recipientInput.required = false;
          recipientInput.value = "";
        }
        if (locationInput) {
          locationInput.required = false;
          locationInput.value = "";
        }
      }
    } else {
      if (optionsBox) optionsBox.style.display = "none";
      if (noteInputBox) noteInputBox.style.display = "none";
      if (deliveryFieldsBox) deliveryFieldsBox.style.display = "none";

      if (hasNoteCheck) hasNoteCheck.checked = false;
      if (isDeliveryCheck) isDeliveryCheck.checked = false;

      if (noteInput) noteInput.value = "";
      if (recipientInput) {
        recipientInput.required = false;
        recipientInput.value = "";
      }
      if (locationInput) {
        locationInput.required = false;
        locationInput.value = "";
      }
    }
  }

  function normalizeSearchText(value) {
    const base = String(value || "").toLowerCase().trim();
    try {
      return base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (_err) {
      return base;
    }
  }

  function productMatchesSearch(product, normalizedSearch) {
    if (!normalizedSearch) return true;
    const idText = String(product?.id || "");
    const nameText = String(product?.name || "");
    const normalizedName = normalizeSearchText(nameText);
    return normalizedName.includes(normalizedSearch) || idText.includes(normalizedSearch);
  }

  function refreshComandaProductSelect(form, options = {}) {
    if (!form) return;
    const categorySel = form.querySelector('[data-role="item-category"]');
    const productSel = form.querySelector('[data-role="item-product"]');
    if (!categorySel || !productSel) return;
    const searchInput = form.querySelector('[data-role="item-product-search"]');
    const subcategorySel = form.querySelector('[data-role="item-subcategory"]');
    const subcategoryBox = form.querySelector('[data-role="item-subcategory-box"]');
    if (subcategoryBox) subcategoryBox.style.display = categorySel.value === "Lanche" ? "grid" : "none";
    if (options.resetSearch && searchInput) {
      searchInput.value = "";
    }
    const selectedValue = String(productSel.value || "").trim();
    fillProductSelect(productSel, categorySel.value, {
      selectedValue,
      searchTerm: searchInput ? searchInput.value : "",
      subcategory: categorySel.value === "Lanche" ? subcategorySel?.value || "Lanches" : ""
    });
    updateKitchenEstimate(form);
    updateDeliveryFields(form);
    updateLancheAddonLink(form);
    updateLancheAddonProducts(form);
  }

  function updateLancheAddonLink(form) {
    const box = form?.querySelector('[data-role="lanche-addon-link-box"]');
    const select = form?.querySelector('[data-role="lanche-addon-link"]');
    const category = form?.querySelector('[data-role="item-category"]')?.value;
    const productId = Number(form?.querySelector('[data-role="item-product"]')?.value || 0);
    const comandaId = String(form?.dataset?.comandaId || "");
    const product = state.products.find((item) => item.id === productId && item.category === category);
    if (!box || !select) return;
    const isAddon = product?.category === "Lanche" && product?.subcategory === "Adicionais";
    if (!isAddon) {
      box.style.display = "none";
      select.required = false;
      select.innerHTML = "";
      return;
    }
    const comanda = findOpenComanda(comandaId);
    const snackItems = (comanda?.items || []).filter(
      (item) => !item.canceled && item.category === "Lanche" && item.subcategory === "Lanches"
    );
    box.style.display = "grid";
    select.required = true;
    select.innerHTML = snackItems.length
      ? `<option value="">Selecione o lanche</option>${snackItems.map((item) => `<option value="${esc(item.id)}">${esc(item.name)} x${item.qty}</option>`).join("")}`
      : `<option value="">Adicione um lanche antes do adicional</option>`;
  }

  function updateLancheAddonProducts(form) {
    const box = form?.querySelector('[data-role="lanche-addon-products-box"]');
    const select = form?.querySelector('[data-role="lanche-addon-products"]');
    const category = form?.querySelector('[data-role="item-category"]')?.value;
    const subcategory = form?.querySelector('[data-role="item-subcategory"]')?.value;
    if (!box || !select) return;

    const shouldShow = category === "Lanche" && subcategory === "Lanches";
    if (!shouldShow) {
      box.style.display = "none";
      select.innerHTML = "";
      return;
    }

    const addonProducts = state.products.filter(
      (p) => p.category === "Lanche" && p.subcategory === "Adicionais"
    );
    box.style.display = "grid";
    select.disabled = false;
    if (!addonProducts.length) {
      select.innerHTML = `<option value="">Nenhum adicional disponivel</option>`;
      select.disabled = true;
      return;
    }

    select.innerHTML = addonProducts
      .map(
        (p) => `<option value="${p.id}" ${p.available === false ? "disabled" : ""}>${esc(p.name)} | ${money(p.price)} | estoque ${p.stock}</option>`
      )
      .join("");
  }

  function fillProductSelect(selectElement, category, options = {}) {
    if (!selectElement) return;
    const categoryOptions = state.products.filter(
      (p) => p.category === category && (!options.subcategory || p.subcategory === options.subcategory)
    );
    const normalizedSearch = normalizeSearchText(options.searchTerm);
    const selectedValue = String(options.selectedValue !== undefined ? options.selectedValue : selectElement.value || "").trim();
    const filteredOptions = normalizedSearch
      ? categoryOptions.filter((product) => productMatchesSearch(product, normalizedSearch))
      : categoryOptions;

    if (!categoryOptions.length) {
      selectElement.innerHTML = `<option value="">Sem produtos</option>`;
      return;
    }
    if (!filteredOptions.length) {
      selectElement.innerHTML = `<option value="">Nenhum produto encontrado</option>`;
      return;
    }

    selectElement.innerHTML = filteredOptions
      .map(
        (p) =>
          `<option value="${p.id}" ${!productIsAvailable(p) ? "disabled" : ""}>${esc(p.name)}${p.category === "Ofertas" ? ` (${p.requiresKitchen ? "cozinha" : "pronta entrega"})` : ""} | ${money(p.price)} | estoque ${p.stock}${p.available === false ? " | indisponivel" : ""}</option>`
      )
      .join("");

    if (selectedValue && filteredOptions.some((p) => String(p.id) === selectedValue && productIsAvailable(p))) {
      selectElement.value = selectedValue;
      return;
    }
    const firstAvailable = filteredOptions.find((p) => productIsAvailable(p));
    if (firstAvailable) {
      selectElement.value = String(firstAvailable.id);
    } else {
      selectElement.selectedIndex = 0;
    }
  }

  function fillQuickSaleProductSelect(form) {
    const category = form.querySelector('[data-role="quick-category"]')?.value;
    const selectElement = form.querySelector('[data-role="quick-product"]');
    if (!selectElement) return;
    const options = state.products.filter((p) => p.category === category && !(category === "Lanche" && p.subcategory === "Adicionais"));
    if (!options.length) {
      selectElement.innerHTML = `<option value="">Sem produtos</option>`;
      return;
    }
    selectElement.innerHTML = options
      .map(
        (p) =>
          `<option value="${p.id}" ${!productIsAvailable(p) ? "disabled" : ""}>${esc(p.name)}${p.category === "Ofertas" ? ` (${p.requiresKitchen ? "cozinha" : "pronta entrega"})` : ""} | ${money(p.price)} | estoque ${p.stock}${p.available === false ? " | indisponivel" : ""}</option>`
      )
      .join("");
    const firstAvailable = options.find((p) => productIsAvailable(p));
    if (firstAvailable) {
      selectElement.value = String(firstAvailable.id);
    } else {
      selectElement.selectedIndex = 0;
    }
  }

  function updateQuickSaleFlow(form) {
    if (!form) return;
    const category = form.querySelector('[data-role="quick-category"]')?.value;
    const productId = Number(form.querySelector('[data-role="quick-product"]')?.value || 0);
    const selectedProduct = state.products.find((p) => p.id === productId && p.category === category);
    const deliveryBox = form.querySelector('[data-role="quick-delivery-box"]');
    const deliveryFields = form.querySelector('[data-role="quick-delivery-fields"]');
    const deliveryCheck = form.querySelector('[data-role="quick-delivery-check"]');
    const recipient = form.querySelector('input[name="deliveryRecipient"]');
    const location = form.querySelector('input[name="deliveryLocation"]');
    const note = form.querySelector('[data-role="quick-kitchen-note"]');
    const isKitchen = selectedProduct ? productNeedsKitchen(selectedProduct) : KITCHEN_CATEGORIES.has(category);

    if (note) {
      note.textContent = isKitchen
        ? "Item com fluxo de cozinha: sera criada uma comanda avulsa e o pedido entrara na fila da cozinha."
        : "Item sem fluxo de cozinha: a venda fecha imediatamente.";
    }
    if (!deliveryBox || !deliveryFields || !deliveryCheck || !recipient || !location) return;

    if (!isKitchen) {
      deliveryBox.style.display = "none";
      deliveryFields.style.display = "none";
      deliveryCheck.checked = false;
      recipient.required = false;
      location.required = false;
      recipient.value = "";
      location.value = "";
      return;
    }

    deliveryBox.style.display = "grid";
    deliveryFields.style.display = deliveryCheck.checked ? "grid" : "none";
    recipient.required = deliveryCheck.checked;
    location.required = deliveryCheck.checked;
  }

  function updateKitchenEstimate(form) {
    const info = form.querySelector('[data-role="kitchen-estimate"]');
    if (!info) return;

    const category = form.querySelector('[data-role="item-category"]')?.value;
    const productId = Number(form.querySelector('[data-role="item-product"]')?.value || 0);
    const qty = Math.max(1, Number(form.querySelector('input[name="qty"]')?.value || 1));

    const product = state.products.find((p) => p.id === productId && p.category === category);
    if (!product) {
      info.textContent = "Tempo estimado cozinha: selecione um produto.";
      return;
    }
    if (!productNeedsKitchen(product)) {
      info.textContent = "Tempo estimado cozinha: nao aplicavel para esta categoria.";
      return;
    }

    const waitingMs = totalKitchenQueueMs();
    const prepMs = Number(product.prepTime || 0) * qty * 60 * 1000;
    const totalMs = waitingMs + prepMs;
    info.textContent = `Tempo estimado cozinha: ${Math.ceil(totalMs / 60000)} min (inclui fila atual).`;
  }

  function findOpenComanda(id) {
    return state.openComandas.find((c) => c.id === id) || null;
  }

  function findAnyComanda(id) {
    return state.openComandas.find((c) => c.id === id) || state.closedComandas.find((c) => c.id === id) || null;
  }

  function kitchenAlertCount(comanda) {
    return (comanda.items || []).filter((item) => itemNeedsKitchen(item) && item.kitchenAlertUnread).length;
  }

  function clearComandaKitchenAlerts(comandaId, options = {}) {
    const comanda = findOpenComanda(comandaId);
    if (!comanda) return;
    for (const item of comanda.items || []) {
      if (itemNeedsKitchen(item)) {
        item.kitchenAlertUnread = false;
      }
    }
    comanda.kitchenAlertUnread = false;
    if (!options.skipPersist) {
      saveState();
    }
    if (!options.skipRender) {
      render();
    }
  }

  function resolveComandaKitchenIndicator(comandaId, mode = "entendi") {
    const actor = currentActor();
    if (!actor || (actor.role !== "waiter" && !isAdminOrDev(actor))) {
      alert("Somente garcom ou administrador podem resolver alertas.");
      return;
    }
    const comanda = findOpenComandaForActor(comandaId, actor);
    if (!comanda) return;

    let resolvedCount = 0;
    for (const item of comanda.items || []) {
      if (!itemNeedsKitchen(item)) continue;
      const canResolveAlert = Boolean(item.kitchenAlertUnread);
      const canResolveReadyVisual = mode === "entendi" && item.waiterVisualState === "ready";
      if (!canResolveAlert && !canResolveReadyVisual) continue;

      item.kitchenAlertUnread = false;
      if (mode === "entregue" && item.kitchenStatus === "entregue") {
        item.waiterDeliveredAt = isoNow();
        item.waiterDeliveredById = actor.id;
        item.waiterDeliveredByName = actor.name;
        item.waiterVisualState = "";
        item.waiterVisualUpdatedAt = isoNow();
      } else if (mode === "entendi") {
        item.waiterVisualState = "seen";
        item.waiterVisualUpdatedAt = isoNow();
      }
      resolvedCount += 1;
    }

    comanda.kitchenAlertUnread = kitchenAlertCount(comanda) > 0;
    if (resolvedCount) {
      appendComandaEvent(comanda, {
        actor,
        type: mode === "entregue" ? "garcom_entregou_pedido" : "garcom_ciente_alerta",
        detail:
          mode === "entregue"
            ? `Garcom marcou ${resolvedCount} alerta(s) da cozinha como entregue ao cliente.`
            : `Garcom confirmou leitura de ${resolvedCount} alerta(s) da cozinha.`
      });
    }

    saveState();
    render();
  }

  function matchesComandaSearch(comanda, searchTerm) {
    const s = String(searchTerm || "").trim().toLowerCase();
    if (!s) return true;
    return (
      String(comanda.id || "").toLowerCase().includes(s) ||
      String(comanda.table || "").toLowerCase().includes(s) ||
      String(comanda.customer || "").toLowerCase().includes(s)
    );
  }

  function isWaiterComandaCollapsed(comandaId) {
    const key = String(comandaId || "");
    const value = uiState.waiterCollapsedByComanda[key];
    return value === undefined ? true : Boolean(value);
  }

  function toggleWaiterComandaCollapse(comandaId) {
    const key = String(comandaId || "");
    const nextCollapsed = !isWaiterComandaCollapsed(key);
    uiState.waiterCollapsedByComanda[key] = nextCollapsed;
    if (nextCollapsed) {
      delete uiState.finalizeOpenByComanda[key];
      if (uiState.waiterActiveComandaId === key) {
        uiState.waiterActiveComandaId = null;
      }
    } else {
      uiState.waiterActiveComandaId = key;
    }
    render();
  }

  function minimizeOpenComanda(comandaId) {
    const key = String(comandaId || "");
    if (!key) return;
    uiState.waiterCollapsedByComanda[key] = true;
    delete uiState.finalizeOpenByComanda[key];
    if (uiState.waiterActiveComandaId === key) {
      uiState.waiterActiveComandaId = null;
    }
    uiState.waiterTab = "abertas";
    render();
  }

  function toggleAdminKitchenRowCollapse(comandaId, itemId) {
    const keyComanda = String(comandaId || "");
    const keyItem = String(itemId || "");
    if (!keyComanda || !keyItem) return;
    const nextCollapsed = !isAdminKitchenRowCollapsed(keyComanda, keyItem);
    setAdminKitchenRowCollapsed(keyComanda, keyItem, nextCollapsed);
    if (nextCollapsed) {
      const rowDetailsKey = detailKey("kitchen-row", keyComanda, keyItem);
      uiState.persistedDetailsOpen[rowDetailsKey] = false;
    }
    render();
  }

  function waiterDraftKey(comandaId) {
    return String(comandaId || "");
  }

  function getWaiterDraftItems(comandaId) {
    const key = waiterDraftKey(comandaId);
    uiState.waiterDraftByComanda = uiState.waiterDraftByComanda || {};
    if (!Array.isArray(uiState.waiterDraftByComanda[key])) {
      uiState.waiterDraftByComanda[key] = [];
    }
    return uiState.waiterDraftByComanda[key];
  }

  function clearWaiterDraftItems(comandaId) {
    const key = waiterDraftKey(comandaId);
    if (uiState.waiterDraftByComanda?.[key]) {
      delete uiState.waiterDraftByComanda[key];
    }
  }

  function pruneWaiterDraftItems() {
    const openIds = new Set(state.openComandas.map((comanda) => waiterDraftKey(comanda.id)));
    for (const key of Object.keys(uiState.waiterDraftByComanda || {})) {
      if (!openIds.has(key)) {
        delete uiState.waiterDraftByComanda[key];
      }
    }
  }

  function parseItemDraftFromForm(form) {
    const category = form.category.value;
    const productId = Number(form.productId.value || 0);
    const qty = Math.max(1, Number(form.qty.value || 1));
    
    const customizeCheck = form.querySelector('[data-role="customize-item-check"]');
    const hasNoteCheck = form.querySelector('[data-role="item-has-note-check"]');
    const isDeliveryCheck = form.querySelector('[data-role="item-is-delivery-check"]');

    const hasCustomize = customizeCheck && customizeCheck.checked;
    const hasNote = hasCustomize && hasNoteCheck && hasNoteCheck.checked;
    const isDelivery = hasCustomize && isDeliveryCheck && isDeliveryCheck.checked;

    const waiterNoteRaw = hasNote ? String(form.waiterNote?.value || "").trim() : "";
    const deliveryRecipient = isDelivery ? String(form.deliveryRecipient?.value || "").trim() : "";
    const deliveryLocation = isDelivery ? String(form.deliveryLocation?.value || "").trim() : "";
    const addonForItemId = String(form.addonForItemId?.value || "").trim();
    const addonProductIds = Array.from(form.querySelector('[data-role="lanche-addon-products"]')?.selectedOptions || [])
      .map((option) => String(option.value || "").trim())
      .filter(Boolean);

    const product = state.products.find((p) => p.id === productId && p.category === category);
    if (!product) {
      return { error: "Produto invalido." };
    }
    if (product.available === false) {
      return { error: `Produto ${product.name} esta indisponivel no cardapio.` };
    }

    if (product.category === "Lanche" && product.subcategory === "Adicionais") {
      const comanda = findOpenComanda(String(form.dataset.comandaId || ""));
      const linkedSnack = (comanda?.items || []).find(
        (item) => item.id === addonForItemId && !item.canceled && item.category === "Lanche" && item.subcategory === "Lanches"
      );
      if (!linkedSnack) return { error: "Selecione o lanche ao qual este adicional pertence." };
    }

    const addonDrafts = [];
    if (product.category === "Lanche" && product.subcategory === "Lanches" && addonProductIds.length) {
      for (const addonProductId of addonProductIds) {
        const addonProduct = state.products.find(
          (p) => String(p.id) === String(addonProductId) && p.category === "Lanche" && p.subcategory === "Adicionais"
        );
        if (!addonProduct) {
          return { error: "Adicional inválido selecionado." };
        }
        if (addonProduct.available === false) {
          return { error: `Adicional ${addonProduct.name} está indisponível.` };
        }
        addonDrafts.push({
          category: "Lanche",
          subcategory: "Adicionais",
          productId: addonProduct.id,
          qty: 1,
          waiterNote: "",
          needsKitchen: productNeedsKitchen(addonProduct),
          isDelivery,
          deliveryRecipient: isDelivery ? deliveryRecipient : "",
          deliveryLocation: isDelivery ? deliveryLocation : "",
          addonForItemId: ""
        });
      }
    }

    const needsKitchen = productNeedsKitchen(product);
    if (isDelivery && (!deliveryRecipient || !deliveryLocation)) {
      return { error: "Para entrega, informe quem recebe e o local de entrega." };
    }

    return {
      value: {
        category,
        productId: product.id,
        qty,
        waiterNote: waiterNoteRaw,
        needsKitchen,
        isDelivery,
        deliveryRecipient: isDelivery ? deliveryRecipient : "",
        deliveryLocation: isDelivery ? deliveryLocation : "",
        addonForItemId: addonForItemId || "",
        linkedAddonDrafts: addonDrafts
      }
    };
  }

  function validateDraftBatch(drafts) {
    const qtyByProduct = {};
    for (const draft of drafts) {
      const key = `${draft.category}::${draft.productId}`;
      qtyByProduct[key] = (qtyByProduct[key] || 0) + Number(draft.qty || 0);
    }

    const errors = [];
    for (const key of Object.keys(qtyByProduct)) {
      const [category, productIdRaw] = key.split("::");
      const productId = Number(productIdRaw);
      const requestedQty = qtyByProduct[key];
      const product = state.products.find((p) => p.id === productId && p.category === category);
      if (!product) {
        errors.push(`Produto ${productId} da categoria ${category} nao foi encontrado.`);
        continue;
      }
      if (product.available === false) {
        errors.push(`Produto ${product.name} esta indisponivel no cardapio.`);
        continue;
      }
      if (Number(product.stock || 0) < requestedQty) {
        errors.push(`Estoque insuficiente para ${product.name}. Solicitado: ${requestedQty}, disponivel: ${product.stock}.`);
      }
    }
    return errors;
  }

  function appendDraftItemToComanda(comanda, actor, draft, options = {}) {
    const product = state.products.find((p) => p.id === draft.productId && p.category === draft.category);
    if (!product) return null;
    const adjustStock = options.adjustStock !== false;
    const qty = Number(draft.qty || 0);
    if (adjustStock) {
      product.stock -= qty;
    }

    const waitingBefore = totalKitchenQueueMs();

    const item = {
      id: generateUniqueItemId(state),
      productId: product.id,
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || "",
      qty,
      priceAtSale: parseNumber(product.price),
      costAtSale: parseNumber(product.cost || 0),
      prepTimeAtSale: Number(product.prepTime || 0),
      requiresKitchen: Boolean(product.requiresKitchen),
      needsKitchen: Boolean(draft.needsKitchen),
      waiterNote: draft.waiterNote || "",
      addonForItemId: draft.addonForItemId || "",
      noteType: "",
      createdAt: isoNow(),
      delivered: false,
      deliveredAt: null,
      kitchenStatus: draft.needsKitchen ? "fila" : "",
      kitchenStatusAt: draft.needsKitchen ? isoNow() : null,
      kitchenStatusById: null,
      kitchenStatusByName: "",
      kitchenPriority: draft.needsKitchen ? "normal" : "",
      kitchenPriorityById: null,
      kitchenPriorityByName: "",
      kitchenPriorityAt: draft.needsKitchen ? isoNow() : null,
      kitchenReceivedAt: null,
      kitchenReceivedById: null,
      kitchenReceivedByName: "",
      kitchenAlertUnread: Boolean(draft.needsKitchen),
      kitchenPrinted: false,
      waiterVisualState: "new",
      waiterVisualUpdatedAt: isoNow(),
      deliveryRequested: Boolean(draft.isDelivery),
      deliveryRecipient: draft.isDelivery ? draft.deliveryRecipient || "" : "",
      deliveryLocation: draft.isDelivery ? draft.deliveryLocation || "" : "",
      canceled: false,
      canceledAt: null,
      cancelReason: "",
      cancelNote: ""
    };

    if (itemNeedsKitchen(item)) {
      const prepMs = item.prepTimeAtSale * qty * 60 * 1000;
      item.etaAt = new Date(Date.now() + waitingBefore + prepMs).toISOString();
      comanda.kitchenAlertUnread = true;
    }

    comanda.items.push(item);
    const kitchenInfo = itemNeedsKitchen(item) ? ` Tempo estimado: ${Math.ceil((waitingBefore + item.prepTimeAtSale * qty * 60000) / 60000)} min.` : "";
    const deliveryInfo = item.deliveryRequested ? ` Entrega para ${item.deliveryRecipient} em ${item.deliveryLocation}.` : "";
    const eventType = String(options.eventType || "item_add");
    const eventDetail =
      typeof options.eventDetail === "string" && options.eventDetail.trim()
        ? options.eventDetail.trim()
        : `Item ${item.name} x${qty} adicionado.${kitchenInfo}${deliveryInfo}`;
    appendComandaEvent(comanda, {
      actor,
      type: eventType,
      detail: eventDetail,
      reason: "",
      itemId: item.id
    });
    comanda.updatedAt = isoNow();
    return item;
  }

  function queueComandaDraftItem(form) {
    const actor = currentActor();
    const comandaId = form.dataset.comandaId;
    const comanda = findOpenComandaForActor(comandaId, actor, { silent: true });
    if (!comanda) {
      alert("Comanda nao encontrada.");
      return;
    }

    const parsed = parseItemDraftFromForm(form);
    if (parsed.error) {
      alert(parsed.error);
      return;
    }

    const draftItems = getWaiterDraftItems(comandaId);
    draftItems.push(parsed.value);

    form.qty.value = "1";
    form.waiterNote.value = "";
    if (form.isDelivery) form.isDelivery.checked = false;
    if (form.deliveryRecipient) form.deliveryRecipient.value = "";
    if (form.deliveryLocation) form.deliveryLocation.value = "";

    updateDeliveryFields(form);
    updateKitchenEstimate(form);
    render();
  }

  function removeComandaDraftItem(comandaId, index) {
    const comanda = findOpenComandaForActor(comandaId, currentActor(), { silent: true });
    if (!comanda) {
      clearWaiterDraftItems(comandaId);
      render();
      return;
    }
    const items = getWaiterDraftItems(comandaId);
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= items.length) return;
    items.splice(idx, 1);
    if (!items.length) {
      clearWaiterDraftItems(comandaId);
    }
    render();
  }

  function listComandaSelectableItems(comandaId, actor = currentActor()) {
    const comanda = findOpenComandaForActor(comandaId, actor, { silent: true });
    if (!comanda) return [];
    return (comanda.items || []).filter((item) => !item.canceled && parseNumber(item.qty || 0) > 0);
  }

  function groupComandaItems(items) {
    const itemMap = new Map();
    const mainItems = [];
    for (const item of items || []) {
      if (!item) continue;
      itemMap.set(item.id, item);
      if (!item.addonForItemId) {
        mainItems.push(item);
      }
    }
    const groups = mainItems.map((main) => ({
      main,
      addons: (items || []).filter((i) => i && i.addonForItemId === main.id)
    }));
    // Add orphan add-ons as main items if any
    const orphanAddons = (items || []).filter((i) => i && i.addonForItemId && !itemMap.has(i.addonForItemId));
    for (const orphan of orphanAddons) {
      groups.push({ main: orphan, addons: [] });
    }
    return groups;
  }

  function openComandaItemSelector(comandaId, mode = "increment") {
    const actor = currentActor();
    const comanda = findOpenComandaForActor(comandaId, actor);
    if (!comanda) return;
    const allowedMode = mode === "cancel" ? "cancel" : "increment";
    const candidates = listComandaSelectableItems(comandaId, actor);
    if (!candidates.length) {
      alert("Nao ha itens validos nessa comanda.");
      return;
    }
    uiState.itemSelector = {
      open: true,
      comandaId: String(comandaId),
      mode: allowedMode
    };
    render();
  }

  function closeComandaItemSelector() {
    uiState.itemSelector = {
      open: false,
      comandaId: "",
      mode: "increment"
    };
    render();
  }

  function renderComandaItemSelectorModal() {
    const selector = uiState.itemSelector || {};
    if (!selector.open || !selector.comandaId) return "";
    const comanda = findOpenComandaForActor(selector.comandaId, currentActor(), { silent: true });
    if (!comanda) return "";

    const mode = selector.mode === "cancel" ? "cancel" : "increment";
    const candidates = listComandaSelectableItems(comanda.id, currentActor());
    if (!candidates.length) return "";

    return `
      <div class="item-selector-modal-backdrop">
        <div class="card item-selector-modal">
          <h3>${mode === "increment" ? "Adicionar quantidade no item" : "Devolver/cancelar quantidade"}</h3>
          <p class="note" style="margin-top:0.3rem;">Comanda ${esc(displayComandaId(comanda.id))} | Referencia: ${esc(comanda.table || "-")}.</p>
          <form class="form" data-role="item-selector-form" data-comanda-id="${comanda.id}" data-mode="${mode}" style="margin-top:0.7rem;">
            <div class="field">
              <label>Item</label>
              <select name="itemId" required>
                ${candidates
        .map(
          (item) =>
            `<option value="${item.id}">${esc(item.name)} | qtd atual ${item.qty}${itemNeedsKitchen(item)
              ? ` | ${esc(kitchenStatusLabel(item.kitchenStatus || "fila"))} | ${esc(kitchenPriorityLabel(item.kitchenPriority || "normal"))}`
              : ""
            }</option>`
        )
        .join("")}
              </select>
            </div>
            <div class="field">
              <label>Quantidade</label>
              <input name="qty" type="number" min="1" value="1" required />
            </div>
            ${mode === "cancel"
        ? `<div class="field"><label>Motivo</label><select name="reason">${CANCEL_REASONS.map((reason) => `<option value="${esc(reason)}">${esc(reason)}</option>`).join("")}</select></div><div class="field"><label>Observacao (opcional)</label><input name="note" placeholder="Ex: cliente desistiu" /></div>`
        : ""
      }
            <div class="actions">
              <button class="btn secondary" type="button" data-action="close-item-selector">Fechar</button>
              <button class="btn ${mode === "increment" ? "ok" : "danger"}" type="submit">${mode === "increment" ? "Aplicar +" : "Aplicar cancelamento"}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function closeDeleteComandaAuthModal(options = {}) {
    uiState.deleteComandaAuth = {
      open: false,
      comandaId: "",
      loginDraft: "",
      passwordDraft: ""
    };
    if (options.skipRender !== true) {
      render();
    }
  }

  function requestDeleteComanda(comandaId) {
    const actor = currentActor();
    if (!actor || (actor.role !== "waiter" && !isAdminOrDev(actor))) {
      alert("Somente garcom ou administrador podem excluir comanda.");
      return;
    }

    const comanda = findOpenComandaForActor(comandaId, actor, { silent: true });
    if (!comanda) {
      alert("Comanda nao encontrada na lista de comandas abertas.");
      return;
    }

    const impact = computeComandaDeletionImpact(comanda);
    const confirmText =
      `Excluir completamente a comanda ${displayComandaId(comanda.id)}?\n` +
      `Mesa/ref: ${comanda.table || "-"}\n` +
      `Cliente: ${comanda.customer || "-"}\n` +
      `Itens ativos: ${impact.activeItems}\n` +
      `Reposicao estimada no estoque: ${impact.restoredQty} unidade(s).`;
    if (!confirm(confirmText)) return;

    uiState.deleteComandaAuth = {
      open: true,
      comandaId: String(comanda.id || ""),
      loginDraft: String(actor.login || ""),
      passwordDraft: ""
    };
    render();
  }

  function renderDeleteComandaAuthModal() {
    const authState = uiState.deleteComandaAuth || {};
    if (!authState.open || !authState.comandaId) return "";
    const actor = currentActor();
    if (!actor || (actor.role !== "waiter" && !isAdminOrDev(actor))) return "";
    const comanda = findOpenComandaForActor(authState.comandaId, actor, { silent: true });
    if (!comanda) return "";
    const loginDraft =
      typeof authState.loginDraft === "string" ? authState.loginDraft : String(actor.login || "");
    const passwordDraft = typeof authState.passwordDraft === "string" ? authState.passwordDraft : "";

    const impact = computeComandaDeletionImpact(comanda);
    return `
      <div class="delete-comanda-modal-backdrop">
        <div class="card delete-comanda-modal">
          <h3>Confirmar exclusao da comanda ${esc(displayComandaId(comanda.id))}</h3>
          <p class="note" style="margin-top:0.35rem;">Informe os dados da conta conectada para concluir. Esta acao remove a comanda e repoe o estoque.</p>
          <div class="delete-comanda-summary">
            <div class="kpi"><p>Mesa/Ref.</p><b>${esc(comanda.table || "-")}</b></div>
            <div class="kpi"><p>Cliente</p><b>${esc(comanda.customer || "-")}</b></div>
            <div class="kpi"><p>Itens ativos</p><b>${impact.activeItems}</b></div>
            <div class="kpi"><p>Reposicao no estoque</p><b>${impact.restoredQty}</b></div>
          </div>
          <form id="delete-comanda-auth-form" class="form delete-comanda-auth-form" autocomplete="off" style="margin-top:0.85rem;">
            <div class="delete-comanda-auth-shell">
              <div class="grid cols-2">
                <div class="field">
                  <label>Login da conta conectada</label>
                  <input
                    name="login"
                    data-role="delete-comanda-auth-login"
                    required
                    value="${esc(loginDraft)}"
                    placeholder="Digite seu login"
                    autocomplete="username"
                  />
                </div>
                <div class="field">
                  <label>Senha da conta conectada</label>
                  <input
                    name="password"
                    data-role="delete-comanda-auth-password"
                    type="password"
                    required
                    value="${esc(passwordDraft)}"
                    placeholder="Digite sua senha"
                    autocomplete="current-password"
                  />
                </div>
              </div>
            </div>
            <div class="actions" style="margin-top:0.75rem;">
              <button class="btn secondary" type="button" data-action="close-delete-comanda-auth">Cancelar</button>
              <button class="btn danger" type="submit">Excluir comanda agora</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function submitDeleteComandaAuth(form) {
    syncDeleteComandaAuthDraftFromForm(form);
    const actor = currentActor();
    if (!actor || (actor.role !== "waiter" && !isAdminOrDev(actor))) {
      closeDeleteComandaAuthModal();
      alert("Somente garcom ou administrador podem excluir comanda.");
      return;
    }

    const targetComandaId = String(uiState.deleteComandaAuth?.comandaId || "").trim();
    if (!targetComandaId) {
      closeDeleteComandaAuthModal();
      return;
    }

    const comanda = findOpenComandaForActor(targetComandaId, actor, { silent: true });
    if (!comanda) {
      closeDeleteComandaAuthModal();
      alert("Comanda nao encontrada na lista de comandas abertas.");
      return;
    }

    const loginValue = String(form.login?.value || "").trim();
    const password = String(form.password?.value || "");
    const expectedLogin = String(actor.login || "").trim();
    const expectedPassword = actor.id === DEV_SESSION_ID ? DEV_ACCESS_PASSWORD : String(actor.password || "");
    if (loginValue !== expectedLogin || password !== expectedPassword) {
      alert("Login/senha invalidos para a conta conectada.");
      return;
    }

    closeDeleteComandaAuthModal({ skipRender: true });
    deleteComandaPermanently(comanda.id, actor);
  }

  function syncDeleteComandaAuthDraftFromForm(form) {
    if (!form || !uiState.deleteComandaAuth?.open) return;
    uiState.deleteComandaAuth.loginDraft = String(form.login?.value || "");
    uiState.deleteComandaAuth.passwordDraft = String(form.password?.value || "");
  }

  function submitComandaItemSelector(form) {
    const comandaId = form.dataset.comandaId;
    const mode = form.dataset.mode === "cancel" ? "cancel" : "increment";
    const itemId = form.itemId.value;
    const qty = Math.max(1, Number(form.qty.value || 1));
    if (!itemId || !Number.isFinite(qty) || qty <= 0) {
      alert("Informe item e quantidade valida.");
      return;
    }

    uiState.itemSelector = {
      open: false,
      comandaId: "",
      mode: "increment"
    };

    if (mode === "increment") {
      incrementItem(comandaId, itemId, qty);
      return;
    }

    const reason = String(form.reason?.value || "Desistencia de pedido").trim() || "Desistencia de pedido";
    const note = String(form.note?.value || "").trim();
    cancelItem(comandaId, itemId, { qty, reason, note, skipPrompt: true });
  }

  function login(login, password, rememberLogin = false) {
    // #region debug-point A:login-attempt
    debugReport("A", "app.js:login", "Tentativa de login", {
      login: String(login || "").trim(),
      userCount: Array.isArray(state.users) ? state.users.length : 0,
      users: (Array.isArray(state.users) ? state.users : []).map((u) => ({
        id: u?.id,
        login: u?.login,
        password: u?.password,
        updatedAt: u?.updatedAt,
        active: u?.active
      })),
      deletedUserIds: state?.meta?.deletedUserIds || [],
      localUpdatedAt: state?.meta?.updatedAt || ""
    });
    // #endregion
    const user = findUserByLoginPassword(login, password);
    if (!user) {
      // #region debug-point A:login-failed
      debugReport("A", "app.js:login", "Login rejeitado", {
        login: String(login || "").trim(),
        password: String(password || ""),
        users: (Array.isArray(state.users) ? state.users : []).map((u) => ({
          id: u?.id,
          login: u?.login,
          password: u?.password,
          updatedAt: u?.updatedAt,
          active: u?.active
        }))
      });
      // #endregion
      alert("Login/senha invalidos.");
      return;
    }

    // #region debug-point A:login-success
    debugReport("A", "app.js:login", "Login aceito", {
      login: user?.login,
      userId: user?.id,
      updatedAt: user?.updatedAt,
      role: user?.role
    });
    // #endregion
    sessionUserId = user.id;
    persistSessionUserId(sessionUserId, rememberLogin);
    saveState({ skipCloud: true, touchMeta: false });
    broadcastPresencePing();
    render();
  }

  function logout() {
    sessionUserId = null;
    persistSessionUserId(null);
    uiState.waiterActiveComandaId = null;
    uiState.waiterReadyModalItems = [];
    uiState.waiterReadySeenMap = {};
    uiState.waiterKitchenReceiptNotices = [];
    uiState.waiterKitchenReceiptSeenMap = {};
    uiState.waiterDraftByComanda = {};
    uiState.itemSelector = { open: false, comandaId: "", mode: "increment" };
    saveState({ skipCloud: true, touchMeta: false });
    broadcastPresencePing();
    render();
  }

  function removeAccents(str) {
    return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function createProduct(form) {
    const actor = currentActor();
    const name = removeAccents(form.name.value.trim());
    const category = form.category.value;
    const subcategory = (category === "Bar" || category === "Bebidas") ? "Geral" : "";
    const available = Boolean(form.available?.checked);
    const requiresKitchen = KITCHEN_CATEGORIES.has(category) ? true : category === "Ofertas" ? Boolean(form.offerNeedsKitchen?.checked) : false;
    const price = parseNumber(form.price.value);
    const stock = Math.max(0, Number(form.stock.value || 0));
    const prepTime = Math.max(0, Number(form.prepTime.value || 0));
    const cost = Math.max(0, parseNumber(form.cost.value));

    if (!name || !CATEGORIES.includes(category) || price <= 0) {
      alert("Preencha nome, categoria e preco valido.");
      return;
    }

    state.products.push({ id: state.seq.product++, name, category, subcategory, price, stock, prepTime, cost, available, requiresKitchen, updatedAt: isoNow() });
    appendAudit({ actor, type: "produto_add", detail: `Produto ${name} criado em ${categoryDisplay(category, subcategory)}.` });
    saveState();
    render();
  }

  function editProduct(productId) {
    const actor = currentActor();
    const p = state.products.find((prod) => prod.id === productId);
    if (!p) return;

    const name = removeAccents(prompt("Nome do produto:", p.name) || "");
    if (!name) return;
    const price = prompt("Preco:", String(p.price));
    if (price === null) return;
    const stock = prompt("Estoque:", String(p.stock));
    if (stock === null) return;
    const prepTime = prompt("Tempo de preparo (min):", String(p.prepTime || 0));
    if (prepTime === null) return;
    const cost = prompt("Custo unitario:", String(p.cost || 0));
    if (cost === null) return;
    const availablePrompt = prompt("Disponivel no cardapio? (sim/nao):", p.available === false ? "nao" : "sim");
    if (availablePrompt === null) return;
    const available = !["nao", "n", "0", "false"].includes(availablePrompt.trim().toLowerCase());
    p.subcategory = (p.category === "Bar" || p.category === "Bebidas") ? "Geral" : "";
    if (KITCHEN_CATEGORIES.has(p.category)) {
      p.requiresKitchen = true;
    } else if (p.category === "Ofertas") {
      const offerKitchenPrompt = prompt("Oferta depende da cozinha? (sim/nao):", p.requiresKitchen ? "sim" : "nao");
      if (offerKitchenPrompt === null) return;
      p.requiresKitchen = ["sim", "s", "1", "true"].includes(offerKitchenPrompt.trim().toLowerCase());
    } else {
      p.requiresKitchen = false;
    }

    p.name = name.trim() || p.name;
    p.price = Math.max(0, parseNumber(price));
    p.stock = Math.max(0, Number(stock));
    p.prepTime = Math.max(0, Number(prepTime));
    p.cost = Math.max(0, parseNumber(cost));
    p.available = available;
    p.updatedAt = isoNow();

    appendAudit({ actor, type: "produto_edit", detail: `Produto ${p.name} alterado.` });
    saveState();
    render();
  }

  function toggleProductAvailability(productId) {
    const actor = currentActor();
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;
    product.available = product.available === false;
    product.updatedAt = isoNow();
    appendAudit({
      actor,
      type: "produto_disponibilidade",
      detail: `Produto ${product.name} ${product.available ? "disponibilizado" : "indisponibilizado"} no cardapio.`
    });
    saveState();
    render();
  }

  function deleteProduct(productId) {
    const actor = currentActor();
    const p = state.products.find((prod) => prod.id === productId);
    if (!p) return;
    if (!confirm(`Apagar produto ${p.name}?`)) return;

    state.products = state.products.filter((prod) => prod.id !== productId);
    trackDeletedEntity("deletedProductIds", productId);
    appendAudit({ actor, type: "produto_delete", detail: `Produto ${p.name} removido.` });
    saveState();
    render();
  }

  function saveStock(form) {
    const actor = currentActor();
    for (const p of state.products) {
      const value = form[`stock-${p.id}`]?.value;
      if (value !== undefined) {
        p.stock = Math.max(0, Number(value || 0));
        p.updatedAt = isoNow();
      }
    }
    appendAudit({ actor, type: "estoque_update", detail: "Estoque atualizado manualmente pelo administrador." });
    saveState();
    render();
  }

  function createEmployee(form) {
    const actor = currentActor();
    const name = form.name.value.trim();
    const role = form.role.value;
    const functionName = roleLabel(role);
    const loginValue = form.login.value.trim();
    const password = form.password.value;

    if (!name || !loginValue || !password) {
      alert("Preencha nome, login e senha.");
      return;
    }
    if (role !== "waiter") {
      alert("Selecione um tipo valido de funcionario.");
      return;
    }

    if (state.users.some((u) => u.login === loginValue)) {
      alert("Login ja existe.");
      return;
    }

    state.users.push({
      id: state.seq.user++,
      role,
      name,
      functionName,
      login: loginValue,
      password,
      active: true,
      updatedAt: isoNow()
    });

    appendAudit({ actor, type: "funcionario_add", detail: `${roleLabel(role)} ${name} criado.` });
    saveState();
    render();
  }

  function editEmployee(userId) {
    const actor = currentActor();
    const user = state.users.find((u) => u.id === userId && u.role === "waiter");
    if (!user) return;

    const rolePrompt = prompt("Tipo (waiter):", user.role);
    if (rolePrompt === null) return;
    const role = rolePrompt.trim().toLowerCase();
    if (role !== "waiter") {
      alert("Tipo invalido. Use waiter.");
      return;
    }
    const name = prompt("Nome:", user.name);
    if (name === null) return;
    const functionName = prompt("Funcao:", user.functionName || roleLabel(role));
    if (functionName === null) return;
    const loginValue = prompt("Login:", user.login);
    if (loginValue === null) return;
    const password = prompt("Senha:", user.password);
    if (password === null) return;

    const conflict = state.users.find((u) => u.login === loginValue && u.id !== user.id);
    if (conflict) {
      alert("Esse login ja esta em uso.");
      return;
    }

    user.role = role;
    user.name = name.trim() || user.name;
    user.functionName = functionName.trim() || user.functionName;
    user.login = loginValue.trim();
    user.password = password;
    user.updatedAt = isoNow();

    appendAudit({ actor, type: "funcionario_edit", detail: `${roleLabel(user.role)} ${user.name} alterado.` });
    saveState();
    render();
  }

  function updateOwnAdminCredentials(form) {
    const actor = currentActor();
    if (actor.role !== "admin") {
      alert("Apenas administrador pode alterar este acesso.");
      return;
    }

    const adminUser = state.users.find((u) => u.id === actor.id && u.role === "admin");
    if (!adminUser || adminUser.active === false) {
      alert("Administrador logado nao encontrado.");
      return;
    }

    const currentPassword = String(form.currentPassword.value || "");
    const newLogin = String(form.newLogin.value || "").trim();
    const newPassword = String(form.newPassword.value || "");
    const confirmPassword = String(form.confirmPassword.value || "");

    if (!currentPassword || !newLogin || !newPassword || !confirmPassword) {
      alert("Preencha login, senha atual e nova senha.");
      return;
    }
    if (currentPassword !== adminUser.password) {
      alert("Senha atual incorreta.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Confirmacao da nova senha nao confere.");
      return;
    }

    const conflict = state.users.find((u) => u.login === newLogin && u.id !== adminUser.id);
    if (conflict) {
      alert("Esse login ja esta em uso.");
      return;
    }

    const loginChanged = newLogin !== adminUser.login;
    const passwordChanged = newPassword !== adminUser.password;
    if (!loginChanged && !passwordChanged) {
      alert("Nenhuma alteracao detectada.");
      return;
    }

    const oldLogin = adminUser.login;
    adminUser.login = newLogin;
    adminUser.password = newPassword;
    adminUser.updatedAt = isoNow();

    const details = [];
    if (loginChanged) details.push(`login: ${oldLogin} -> ${adminUser.login}`);
    if (passwordChanged) details.push("senha atualizada");
    appendAudit({
      actor,
      type: "admin_credenciais_update",
      detail: `Admin ${adminUser.name} alterou o proprio acesso (${details.join(" | ")}).`
    });

    saveState();
    alert("Login e senha do administrador atualizados.");
    render();
  }

  function deleteEmployee(userId) {
    const actor = currentActor();
    const employee = state.users.find((u) => u.id === userId && u.role === "waiter");
    if (!employee) return;
    if (!confirm(`Apagar acesso de ${roleLabel(employee.role)} ${employee.name}?`)) return;

    state.users = state.users.filter((u) => u.id !== userId);
    trackDeletedEntity("deletedUserIds", userId);
    appendAudit({ actor, type: "funcionario_delete", detail: `${roleLabel(employee.role)} ${employee.name} removido.` });

    if (sessionUserId === userId) {
      sessionUserId = null;
      persistSessionUserId(null);
    }

    saveState();
    render();
  }

  function canManagePayables(actor = currentActor()) {
    return Boolean(actor && isAdminOrDev(actor));
  }

  function findPendingPayableByComandaId(comandaId) {
    const key = String(comandaId || "").trim();
    if (!key) return null;
    return state.payables.find((entry) => entry.status === "pendente" && String(entry?.comandaId || "").trim() === key) || null;
  }

  function hasPendingPayableForComanda(comandaId) {
    return Boolean(findPendingPayableByComandaId(comandaId));
  }

  function findPayableById(id) {
    const key = String(id || "").trim();
    if (!key) return null;
    return state.payables.find((entry) => String(entry?.id || "").trim() === key) || null;
  }

  function applyPayableAdjustment(payable, actor, adjustment) {
    if (!payable || !actor || !adjustment) return null;
    const currentTotal = Math.max(0, parseNumber(payable.total || 0));
    const delta = parseNumber(adjustment.amountDelta || 0);
    if (!Number.isFinite(delta) || delta === 0) return null;
    if (delta < 0 && currentTotal + delta < 0) return null;

    const changedAt = isoNow();
    const nextTotal = Math.max(0, currentTotal + delta);
    payable.total = nextTotal;
    payable.updatedAt = changedAt;
    payable.adjustments = Array.isArray(payable.adjustments) ? payable.adjustments : [];
    payable.adjustments.unshift({
      id: `PGA-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ts: changedAt,
      type: String(adjustment.type || "fiado_ajuste_manual"),
      detail: String(adjustment.detail || ""),
      amountDelta: delta,
      productId: adjustment.productId !== undefined && adjustment.productId !== null ? Number(adjustment.productId) : null,
      productName: String(adjustment.productName || ""),
      qty: Math.max(0, parseNumber(adjustment.qty || 0)),
      unitPrice: Math.max(0, parseNumber(adjustment.unitPrice || 0)),
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name
    });
    return { currentTotal, nextTotal, delta, changedAt };
  }

  function syncComandaFiadoSplit(comanda, pendingPayable) {
    if (!comanda) return;
    const methods = normalizePaymentSplits(comanda?.payment?.methods);
    const map = new Map(methods.map((entry) => [entry.method, parseNumber(entry.amount || 0)]));
    const fiadoTotal = Math.max(0, parseNumber(pendingPayable?.total || 0));
    if (fiadoTotal > 0) {
      map.set("fiado", fiadoTotal);
    } else {
      map.delete("fiado");
    }
    const normalized = [...map.entries()]
      .map(([method, amount]) => ({ method, amount: Math.max(0, parseNumber(amount || 0)) }))
      .filter((entry) => entry.amount > 0);
    const method = normalized.length === 1 ? normalized[0].method : normalized.length ? "multiplo" : "nao_finalizada";
    comanda.payment = {
      ...(comanda.payment || {}),
      method,
      methodLabel: normalized.length ? paymentSplitsText(normalized, { includeAmount: true }) : paymentLabel(method),
      methods: normalized,
      verifiedAt: isoNow(),
      customerName: comanda.payment?.customerName || pendingPayable?.customerName || comanda.customer || ""
    };
    comanda.updatedAt = isoNow();
  }

  function adjustPayableByManualValue(id, mode = "increase") {
    const actor = currentActor();
    if (!canManagePayables(actor)) {
      alert("Somente administrador/dev pode ajustar fiados.");
      return;
    }
    const payable = findPayableById(id);
    if (!payable || payable.status !== "pendente") {
      alert("Fiado nao encontrado ou ja foi pago.");
      return;
    }

    const increaseMode = mode !== "decrease";
    const amountLabel = increaseMode ? "acrescentar" : "descontar";
    const amountRaw = prompt(`Valor para ${amountLabel} no fiado da comanda ${displayComandaId(payable.comandaId)}:`, "0");
    if (amountRaw === null) return;
    const amount = parseNumber(amountRaw);
    if (!(amount > 0)) {
      alert("Informe um valor maior que zero.");
      return;
    }
    const currentTotal = Math.max(0, parseNumber(payable.total || 0));
    if (!increaseMode && amount > currentTotal) {
      alert(`Nao e possivel descontar ${money(amount)} porque o saldo atual e ${money(currentTotal)}.`);
      return;
    }

    const defaultReason = increaseMode ? "Acrescimo manual no fiado" : "Desconto manual no fiado";
    const reasonRaw = prompt("Motivo do ajuste manual:", defaultReason);
    if (reasonRaw === null) return;
    const reason = String(reasonRaw || "").trim() || defaultReason;

    const delta = increaseMode ? amount : -amount;
    const result = applyPayableAdjustment(payable, actor, {
      type: "fiado_ajuste_manual",
      detail: `${increaseMode ? "Acrescimo" : "Desconto"} manual: ${reason}.`,
      amountDelta: delta
    });
    if (!result) {
      alert("Nao foi possivel aplicar o ajuste informado.");
      return;
    }

    appendAudit({
      actor,
      type: "fiado_ajuste_manual",
      detail:
        `Fiado da comanda ${displayComandaId(payable.comandaId)} ajustado manualmente (${increaseMode ? "+" : "-"}${money(amount)}). ` +
        `Saldo: ${money(result.currentTotal)} -> ${money(result.nextTotal)}. Motivo: ${reason}.`,
      comandaId: payable.comandaId
    });
    saveState();
    render();
  }

  function reducePendingPayableValueFromComanda(comandaId) {
    const actor = currentActor();
    if (!canManagePayables(actor)) {
      alert("Somente administrador/dev pode reduzir valor de fiado.");
      return;
    }
    const comanda = findComandaForDetails(String(comandaId || ""));
    if (!comanda) {
      alert("Comanda nao encontrada.");
      return;
    }
    const payable = findPendingPayableByComandaId(comanda.id);
    if (!payable) {
      alert("Esta comanda nao possui fiado pendente.");
      return;
    }
    const currentTotal = Math.max(0, parseNumber(payable.total || 0));
    if (!(currentTotal > 0)) {
      alert("Nao ha saldo pendente para reduzir.");
      return;
    }

    const amountRaw = prompt(`Valor para reduzir do fiado da comanda ${displayComandaId(comanda.id)}:`, Number(currentTotal).toFixed(2));
    if (amountRaw === null) return;
    const amount = parseNumber(amountRaw);
    if (!(amount > 0) || amount > currentTotal) {
      alert(`Informe um valor entre ${money(0.01)} e ${money(currentTotal)}.`);
      return;
    }

    const methodOptions = PAYMENT_METHODS.filter((entry) => entry.value !== "fiado")
      .map((entry) => entry.value)
      .join(", ");
    const methodRaw = prompt(`Forma de pagamento desta reducao (${methodOptions}):`, "dinheiro");
    if (methodRaw === null) return;
    const method = String(methodRaw || "").trim();
    const validMethods = new Set(PAYMENT_METHODS.filter((entry) => entry.value !== "fiado").map((entry) => entry.value));
    if (!validMethods.has(method)) {
      alert("Forma de pagamento invalida.");
      return;
    }

    if (!confirm(`Confirmar reducao de ${money(amount)} no fiado da comanda ${displayComandaId(comanda.id)} usando ${paymentLabel(method)}?`)) {
      return;
    }

    const result = applyPayableAdjustment(payable, actor, {
      type: "fiado_reducao_pagamento",
      detail: `Reducao de fiado via ${paymentLabel(method)}.`,
      amountDelta: -amount
    });
    if (!result) {
      alert("Nao foi possivel reduzir o valor do fiado.");
      return;
    }

    const methods = normalizePaymentSplits(comanda?.payment?.methods);
    const map = new Map(methods.map((entry) => [entry.method, parseNumber(entry.amount || 0)]));
    const fiadoCurrent = Math.max(0, parseNumber(map.get("fiado") || currentTotal));
    map.set("fiado", Math.max(0, fiadoCurrent - amount));
    map.set(method, Math.max(0, parseNumber(map.get(method) || 0) + amount));
    const normalizedMethods = [...map.entries()]
      .map(([methodName, methodAmount]) => ({ method: methodName, amount: Math.max(0, parseNumber(methodAmount || 0)) }))
      .filter((entry) => entry.amount > 0);
    const paymentMethod = normalizedMethods.length === 1 ? normalizedMethods[0].method : normalizedMethods.length ? "multiplo" : "nao_finalizada";
    comanda.payment = {
      ...(comanda.payment || {}),
      method: paymentMethod,
      methodLabel: normalizedMethods.length ? paymentSplitsText(normalizedMethods, { includeAmount: true }) : paymentLabel(paymentMethod),
      methods: normalizedMethods,
      verifiedAt: isoNow(),
      customerName: comanda.payment?.customerName || payable.customerName || comanda.customer || ""
    };

    if (Math.max(0, parseNumber(payable.total || 0)) <= 0) {
      payable.status = "pago";
      payable.paidAt = isoNow();
      payable.paidMethod = method;
      payable.updatedAt = payable.paidAt;
    }

    appendAudit({
      actor,
      type: "fiado_reducao_pagamento",
      detail:
        `Fiado da comanda ${displayComandaId(comanda.id)} reduzido em ${money(amount)} com ${paymentLabel(method)}. ` +
        `Saldo: ${money(result.currentTotal)} -> ${money(result.nextTotal)}.`,
      comandaId: comanda.id
    });

    saveState();
    render();
  }

  function adjustPayableByProduct(id, mode = "add", options = {}) {
    const actor = currentActor();
    if (!canManagePayables(actor)) {
      alert("Somente administrador/dev pode ajustar fiados.");
      return;
    }
    const payable = findPayableById(id);
    if (!payable || payable.status !== "pendente") {
      alert("Fiado nao encontrado ou ja foi pago.");
      return;
    }

    const providedCategory = String(options.category || "").trim();
    const providedProductId = Number(options.productId || 0);
    const providedQty = Math.max(0, Math.floor(parseNumber(options.qty || 0)));

    let product = null;
    let qty = 0;
    if (providedCategory && providedProductId > 0 && providedQty > 0) {
      product = state.products.find((entry) => Number(entry.id) === providedProductId && entry.category === providedCategory) || null;
      qty = providedQty;
    } else {
      const productPrompt = prompt(
        `Produto (ID ou nome) para ${mode === "remove" ? "remover" : "adicionar"} no fiado da comanda ${displayComandaId(payable.comandaId)}:`,
        ""
      );
      if (productPrompt === null) return;
      product = resolveProductForAdminInput(productPrompt);
      if (!product) {
        alert("Produto nao encontrado.");
        return;
      }

      const qtyPrompt = prompt("Quantidade:", "1");
      if (qtyPrompt === null) return;
      qty = Math.max(0, Math.floor(parseNumber(qtyPrompt)));
      if (!(qty > 0)) {
        alert("Quantidade invalida.");
        return;
      }
    }
    if (!product) {
      alert("Produto nao encontrado.");
      return;
    }

    const unitPrice = Math.max(0, parseNumber(options.unitPrice !== undefined ? options.unitPrice : product.price || 0));
    if (!(unitPrice >= 0)) {
      alert("Valor unitario invalido.");
      return;
    }

    const amount = qty * unitPrice;
    if (!(amount > 0)) {
      alert("Ajuste zerado. Informe quantidade/valor maiores que zero.");
      return;
    }
    if (mode !== "remove" && product.available === false) {
      alert(`Produto ${product.name} esta indisponivel no cardapio.`);
      return;
    }
    if (mode !== "remove" && Number(product.stock || 0) < qty) {
      alert(`Estoque insuficiente para ${product.name}. Disponivel: ${product.stock}.`);
      return;
    }
    const currentTotal = Math.max(0, parseNumber(payable.total || 0));
    if (mode === "remove" && amount > currentTotal) {
      alert(`Nao e possivel remover ${money(amount)} porque o saldo atual e ${money(currentTotal)}.`);
      return;
    }

    const delta = mode === "remove" ? -amount : amount;
    const actionLabel = mode === "remove" ? "Remocao" : "Adicao";
    if (mode === "remove") {
      product.stock = Math.max(0, parseNumber(product.stock || 0) + qty);
    } else {
      product.stock = Math.max(0, parseNumber(product.stock || 0) - qty);
    }
    const result = applyPayableAdjustment(payable, actor, {
      type: mode === "remove" ? "fiado_ajuste_produto_remove" : "fiado_ajuste_produto_add",
      detail: `${actionLabel} de produto no fiado: ${product.name} x${qty} (${money(unitPrice)} un). Estoque ${mode === "remove" ? "+" : "-"}${qty}.`,
      amountDelta: delta,
      productId: product.id,
      productName: product.name,
      qty,
      unitPrice
    });
    if (!result) {
      alert("Nao foi possivel aplicar o ajuste por produto.");
      return;
    }

    appendAudit({
      actor,
      type: mode === "remove" ? "fiado_ajuste_produto_remove" : "fiado_ajuste_produto_add",
      detail:
        `Fiado da comanda ${displayComandaId(payable.comandaId)} ${mode === "remove" ? "teve remocao" : "recebeu adicao"} ` +
        `de ${product.name} x${qty} (${money(unitPrice)} un). Saldo: ${money(result.currentTotal)} -> ${money(result.nextTotal)}. ` +
        `Estoque ${mode === "remove" ? "devolvido" : "baixado"}: ${qty}.`,
      comandaId: payable.comandaId
    });
    saveState();
    render();
  }

  function receivePayable(id) {
    const actor = currentActor();
    if (!canManagePayables(actor)) {
      alert("Somente administrador/dev pode marcar fiado como pago.");
      return;
    }
    const payable = findPayableById(id);
    if (!payable || payable.status === "pago") return;

    const msg = "Metodo de pagamento (dinheiro, maquineta_debito, maquineta_credito, pix):";
    const method = prompt(msg, "dinheiro");
    if (method === null) return;

    payable.status = "pago";
    payable.paidAt = isoNow();
    payable.updatedAt = payable.paidAt;
    payable.paidMethod = method;
    appendAudit({ actor, type: "fiado_pago", detail: `Fiado da comanda ${displayComandaId(payable.comandaId)} marcado como pago.` });
    saveState();
    render();
  }

  function createComanda(form) {
    const actor = currentActor();
    const tableInput = form.table.value.trim();
    const table = tableInput;
    const customer = form.customer.value.trim();
    const createdAt = isoNow();

    if (!table) {
      alert("Informe mesa ou referencia.");
      return;
    }

    const comandaId = generateUniqueComandaId(state);
    if (!comandaId) {
      alert("Nao foi possivel gerar um novo ID de comanda.");
      return;
    }

    const comanda = {
      id: comandaId,
      table,
      customer,
      createdAt,
      updatedAt: createdAt,
      createdBy: actor.id,
      status: "aberta",
      notes: [],
      items: [],
      events: [],
      payment: null,
      pixCodeDraft: null,
      kitchenAlertUnread: false,
      isAvulsa: false
    };

    state.openComandas.push(comanda);
    ensureCashOpenedAtFromComanda(createdAt);
    appendComandaEvent(comanda, {
      actor,
      type: "comanda_aberta",
      detail: `Comanda aberta na ${table}${customer ? ` para ${customer}` : ""}.`
    });

    uiState.waiterTab = "abrir";
    uiState.waiterActiveComandaId = comanda.id;
    uiState.waiterCollapsedByComanda[comanda.id] = true;
    saveState();
    publishComandaUpsert(comanda, [], actor, "Comanda criada");
    render();
  }

  function createQuickSale(form) {
    const actor = currentActor();
    const category = form.category.value;
    const productId = Number(form.productId.value || 0);
    const qty = Math.max(1, Number(form.qty.value || 1));
    const paymentMethod = form.paymentMethod.value;
    const customer = form.customer.value.trim();
    const note = form.note.value.trim();
    const isDeliveryRaw = Boolean(form.isDelivery?.checked);
    const deliveryRecipient = String(form.deliveryRecipient?.value || "").trim();
    const deliveryLocation = String(form.deliveryLocation?.value || "").trim();
    const paidConfirm = formCheckboxChecked(form, "paidConfirm", uiState.quickSalePaidConfirm);
    uiState.quickSalePaidConfirm = paidConfirm;
    const requiresPaidConfirm = paymentMethod !== "fiado";

    if (requiresPaidConfirm && !paidConfirm) {
      alert("Confirme que a venda foi paga para finalizar.");
      return;
    }

    const product = state.products.find((p) => p.id === productId && p.category === category);
    if (!product) {
      alert("Produto invalido para venda avulsa.");
      return;
    }
    if (product.available === false) {
      alert(`Produto ${product.name} esta indisponivel no cardapio.`);
      return;
    }
    if (product.stock < qty) {
      alert(`Estoque insuficiente para ${product.name}. Disponivel: ${product.stock}`);
      return;
    }
    const needsKitchen = productNeedsKitchen(product);
    const isDelivery = needsKitchen && isDeliveryRaw;
    if (needsKitchen && isDelivery && (!deliveryRecipient || !deliveryLocation)) {
      alert("Para entrega na cozinha, informe quem recebe e o local.");
      return;
    }

    product.stock -= qty;

    if (needsKitchen) {
      const waitingBefore = totalKitchenQueueMs();
      const createdAt = isoNow();
      const item = {
        id: generateUniqueItemId(state),
        productId: product.id,
        name: product.name,
        category: product.category,
        qty,
        priceAtSale: parseNumber(product.price),
        costAtSale: parseNumber(product.cost || 0),
        prepTimeAtSale: Number(product.prepTime || 0),
        requiresKitchen: Boolean(product.requiresKitchen),
        needsKitchen: true,
        waiterNote: note,
        noteType: "",
        createdAt,
        delivered: false,
        deliveredAt: null,
        kitchenStatus: "fila",
        kitchenStatusAt: createdAt,
        kitchenStatusById: null,
        kitchenStatusByName: "",
        kitchenPriority: "normal",
        kitchenPriorityById: null,
        kitchenPriorityByName: "",
        kitchenPriorityAt: createdAt,
        kitchenReceivedAt: null,
        kitchenReceivedById: null,
        kitchenReceivedByName: "",
        kitchenAlertUnread: true,
        waiterVisualState: "new",
        waiterVisualUpdatedAt: createdAt,
        deliveryRequested: isDelivery,
        deliveryRecipient: isDelivery ? deliveryRecipient : "",
        deliveryLocation: isDelivery ? deliveryLocation : "",
        canceled: false,
        canceledAt: null,
        cancelReason: "",
        cancelNote: ""
      };
      const prepMs = item.prepTimeAtSale * qty * 60 * 1000;
      item.etaAt = new Date(Date.now() + waitingBefore + prepMs).toISOString();

      const saleComanda = {
        id: `AVK-${String(state.seq.sale++).padStart(5, "0")}`,
        table: product.category === "Ofertas" ? "Avulsa Oferta (Cozinha)" : "Avulsa Cozinha",
        customer: customer || (isDelivery ? deliveryRecipient : ""),
        createdAt,
        updatedAt: createdAt,
        createdBy: actor.id,
        status: "aberta",
        notes: [product.category === "Ofertas" ? "Venda avulsa de oferta (cozinha)" : "Venda avulsa de cozinha", ...(note ? [note] : [])],
        items: [item],
        events: [],
        payment: {
          method: paymentMethod,
          methodLabel: paymentLabel(paymentMethod),
          verifiedAt: isoNow(),
          customerName: customer || (isDelivery ? deliveryRecipient : ""),
          pixCode: ""
        },
        pixCodeDraft: null,
        kitchenAlertUnread: true,
        isQuickKitchenSale: true,
        quickSalePrepaid: true
      };

      appendComandaEvent(saleComanda, {
        actor,
        type: "venda_avulsa_cozinha",
        detail: `Pedido avulso com fluxo de cozinha ${item.name} x${qty} criado. Pagamento ${paymentLabel(paymentMethod)}.${isDelivery ? ` Entrega para ${deliveryRecipient} em ${deliveryLocation}.` : ""}`,
        itemId: item.id
      });

      state.openComandas.push(saleComanda);
      ensureCashOpenedAtFromComanda(createdAt);
      appendAudit({
        actor,
        type: "venda_avulsa_cozinha",
        detail: `Comanda ${saleComanda.id} enviada para cozinha (${item.name} x${qty}).`,
        comandaId: saleComanda.id
      });
      if (actor.role === "waiter") {
        uiState.waiterTab = "abertas";
        uiState.waiterCollapsedByComanda[saleComanda.id] = true;
        uiState.waiterActiveComandaId = saleComanda.id;
      }
      saveState();
      publishKitchenOrderUpsert(saleComanda, [item], actor, "Venda avulsa cozinha");
      if (AUTO_OPEN_KITCHEN_PREVIEW_ON_ADD) {
        printKitchenTicket(saleComanda, [item], actor, { reason: "Venda avulsa cozinha" });
      }
      render();
      return;
    }

    const createdAt = isoNow();
    const saleComanda = {
      id: `AV-${String(state.seq.sale++).padStart(5, "0")}`,
      table: "Venda Avulsa",
      customer: customer || "",
      createdAt,
      updatedAt: createdAt,
      closedAt: createdAt,
      createdBy: actor.id,
      status: "finalizada",
      notes: note ? [note] : ["Venda avulsa"],
      items: [
        {
          id: generateUniqueItemId(state),
          productId: product.id,
          name: product.name,
          category: product.category,
          qty,
          priceAtSale: parseNumber(product.price),
          costAtSale: parseNumber(product.cost || 0),
          prepTimeAtSale: Number(product.prepTime || 0),
          requiresKitchen: false,
          needsKitchen: false,
          waiterNote: note,
          noteType: "",
          createdAt,
          delivered: true,
          deliveredAt: createdAt,
          kitchenStatus: "",
          kitchenStatusAt: null,
          kitchenStatusById: null,
          kitchenStatusByName: "",
          kitchenPriority: "",
          kitchenPriorityById: null,
          kitchenPriorityByName: "",
          kitchenPriorityAt: null,
          kitchenReceivedAt: null,
          kitchenReceivedById: null,
          kitchenReceivedByName: "",
          kitchenAlertUnread: false,
          canceled: false,
          canceledAt: null,
          cancelReason: "",
          cancelNote: ""
        }
      ],
      events: [
        {
          ts: createdAt,
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          type: "venda_avulsa",
          detail: `Venda avulsa de ${product.name} x${qty} finalizada.`,
          reason: "",
          itemId: null
        }
      ],
      payment: {
        method: paymentMethod,
        methodLabel: paymentLabel(paymentMethod),
        verifiedAt: createdAt,
        customerName: customer || "",
        pixCode: ""
      },
      pixCodeDraft: null,
      kitchenAlertUnread: false
    };

    state.closedComandas.unshift(saleComanda);
    ensureCashOpenedAtFromComanda(createdAt);
    appendAudit({
      actor,
      type: "venda_avulsa",
      detail: `Venda avulsa ${saleComanda.id}: ${product.name} x${qty} (${paymentLabel(paymentMethod)}).`,
      comandaId: saleComanda.id
    });
    saveState();
    render();
  }

  function addItemToComanda(form) {
    const actor = currentActor();
    const comandaId = form.dataset.comandaId;
    const comanda = findOpenComandaForActor(comandaId, actor, { silent: true });
    if (!comanda) {
      alert("Comanda nao encontrada.");
      return;
    }

    const queued = getWaiterDraftItems(comandaId);
    let drafts = [];
    if (queued.length) {
      drafts = queued.map((draft) => ({ ...draft }));
    } else {
      const parsed = parseItemDraftFromForm(form);
      if (parsed.error) {
        alert(parsed.error);
        return;
      }
      drafts = [parsed.value];
    }

    const draftsToValidate = [...drafts];
    for (const draft of drafts) {
      if (Array.isArray(draft.linkedAddonDrafts)) {
        draftsToValidate.push(...draft.linkedAddonDrafts);
      }
    }

    const validationErrors = validateDraftBatch(draftsToValidate);
    if (validationErrors.length) {
      alert(`Nao foi possivel adicionar os itens:\n- ${validationErrors.slice(0, 5).join("\n- ")}`);
      return;
    }

    const createdItems = [];
    for (const draft of drafts) {
      const createdMainItem = appendDraftItemToComanda(comanda, actor, draft);
      if (createdMainItem) {
        createdItems.push(createdMainItem);
      }
      for (const addonDraft of draft.linkedAddonDrafts || []) {
        addonDraft.addonForItemId = createdMainItem?.id || "";
        const createdAddonItem = appendDraftItemToComanda(comanda, actor, addonDraft);
        if (createdAddonItem) {
          createdItems.push(createdAddonItem);
        }
      }
    }

    clearWaiterDraftItems(comandaId);
    form.qty.value = "1";
    const customizeCheck = form.querySelector('[data-role="customize-item-check"]');
    const hasNoteCheck = form.querySelector('[data-role="item-has-note-check"]');
    const isDeliveryCheck = form.querySelector('[data-role="item-is-delivery-check"]');
    const noteInput = form.querySelector('[data-role="item-note-input"]');
    const recipientInput = form.querySelector('[data-role="item-recipient-input"]');
    const locationInput = form.querySelector('[data-role="item-location-input"]');
    if (customizeCheck) customizeCheck.checked = false;
    if (hasNoteCheck) hasNoteCheck.checked = false;
    if (isDeliveryCheck) isDeliveryCheck.checked = false;
    if (noteInput) noteInput.value = "";
    if (recipientInput) recipientInput.value = "";
    if (locationInput) locationInput.value = "";
    updateDeliveryFields(form);

    saveState();
    publishKitchenOrderUpsert(comanda, createdItems, actor, "Novo pedido");
    publishComandaUpsert(comanda, createdItems, actor, "Item adicionado à comanda");
    if (AUTO_OPEN_KITCHEN_PREVIEW_ON_ADD) {
      const kitchenItemsToPreview = createdItems.filter((item) => item && itemNeedsKitchen(item));
      if (kitchenItemsToPreview.length) {
        printKitchenTicket(comanda, kitchenItemsToPreview, actor, { reason: "Novo pedido" });
      }
    }
    render();
  }

  function addItemToPendingFiadoComanda(form) {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Somente administrador/dev pode editar comanda com fiado.");
      return;
    }
    const comandaId = String(form.dataset.comandaId || "").trim();
    const comanda = findComandaForAdminEdition(comandaId);
    if (!comanda) return;
    const pendingPayable = findPendingPayableByComandaId(comanda.id);
    if (!pendingPayable) {
      alert("Essa comanda nao possui fiado pendente.");
      return;
    }

    const parsed = parseItemDraftFromForm(form);
    if (parsed.error) {
      alert(parsed.error);
      return;
    }
    const draft = parsed.value;
    const draftsToAdd = [draft, ...(draft.linkedAddonDrafts || [])];

    const validationErrors = validateDraftBatch(draftsToAdd);
    if (validationErrors.length) {
      alert(`Nao foi possivel adicionar o item:\n- ${validationErrors.slice(0, 3).join("\n- ")}`);
      return;
    }

    const createdItems = [];
    const createdMainItem = appendDraftItemToComanda(comanda, actor, draft, {
      adjustStock: true,
      eventType: "admin_item_add",
      eventDetail: "Item adicionado na comanda com fiado pendente."
    });
    if (!createdMainItem) {
      alert("Nao foi possivel adicionar o item.");
      return;
    }
    createdItems.push(createdMainItem);

    for (const addonDraft of draft.linkedAddonDrafts || []) {
      addonDraft.addonForItemId = createdMainItem.id;
      const createdAddonItem = appendDraftItemToComanda(comanda, actor, addonDraft, {
        adjustStock: true,
        eventType: "admin_item_add",
        eventDetail: `Adicional ${addonDraft.productId} adicionado ao lanche ${createdMainItem.id}.`
      });
      if (createdAddonItem) {
        createdItems.push(createdAddonItem);
      }
    }

    if (!isComandaInOpenList(comanda.id)) {
      for (const createdItem of createdItems) {
        createdItem.kitchenAlertUnread = false;
        if (itemNeedsKitchen(createdItem)) {
          createdItem.kitchenStatus = "entregue";
          createdItem.kitchenStatusAt = isoNow();
        }
        createdItem.delivered = true;
        createdItem.deliveredAt = isoNow();
      }
      comanda.kitchenAlertUnread = false;
    }

    const payableDelta = createdItems.reduce((sum, item) => {
      const itemTotal = itemCountsForTotal(item) ? parseNumber(item.qty || 0) * parseNumber(item.priceAtSale || 0) : 0;
      return sum + itemTotal;
    }, 0);
    if (payableDelta > 0) {
      const payableResult = applyPayableAdjustment(pendingPayable, actor, {
        type: "fiado_ajuste_produto_add",
        detail: `Item ${createdMainItem.name} x${createdMainItem.qty} adicionado na comanda ${comanda.id}.`,
        amountDelta: payableDelta,
        productId: createdMainItem.productId,
        productName: createdMainItem.name,
        qty: createdMainItem.qty,
        unitPrice: createdMainItem.priceAtSale
      });
      if (payableResult) {
        appendAudit({
          actor,
          type: "fiado_ajuste_produto_add",
          detail:
            `Fiado da comanda ${comanda.id} atualizado pelo item ${createdItem.name} x${createdItem.qty}. ` +
            `Saldo: ${money(payableResult.currentTotal)} -> ${money(payableResult.nextTotal)}.`,
          comandaId: comanda.id
        });
      }
    }

    syncComandaFiadoSplit(comanda, pendingPayable);

    form.qty.value = "1";
    const customizeCheck = form.querySelector('[data-role="customize-item-check"]');
    const hasNoteCheck = form.querySelector('[data-role="item-has-note-check"]');
    const isDeliveryCheck = form.querySelector('[data-role="item-is-delivery-check"]');
    const noteInput = form.querySelector('[data-role="item-note-input"]');
    const recipientInput = form.querySelector('[data-role="item-recipient-input"]');
    const locationInput = form.querySelector('[data-role="item-location-input"]');
    if (customizeCheck) customizeCheck.checked = false;
    if (hasNoteCheck) hasNoteCheck.checked = false;
    if (isDeliveryCheck) isDeliveryCheck.checked = false;
    if (noteInput) noteInput.value = "";
    if (recipientInput) recipientInput.value = "";
    if (locationInput) locationInput.value = "";
    updateDeliveryFields(form);

    saveState();
    if (isComandaInOpenList(comanda.id)) {
      publishKitchenOrderUpsert(comanda, [createdItem], actor, "Item adicionado");
    }
    render();
  }

  function incrementItem(comandaId, itemId, amount = 1) {
    const actor = currentActor();
    const comanda = findOpenComandaForActor(comandaId, actor);
    if (!comanda) return;

    const item = (comanda.items || []).find((i) => i.id === itemId);
    if (!item || item.canceled) return;
    const delta = Math.max(1, Math.floor(Number(amount || 1)));

    const product = state.products.find((p) => p.id === item.productId);
    if (product && product.available === false) {
      alert(`Produto ${product.name} esta indisponivel no cardapio.`);
      return;
    }
    if (!product || Number(product.stock || 0) < delta) {
      alert(`Sem estoque para adicionar essa quantidade. Disponivel: ${product?.stock ?? 0}.`);
      return;
    }

    product.stock -= delta;
    item.qty = parseNumber(item.qty || 0) + delta;
    item.lastIncrementAt = isoNow();
    item.waiterVisualState = "new";
    item.waiterVisualUpdatedAt = isoNow();

    appendComandaEvent(comanda, {
      actor,
      type: "item_incrementado",
      detail: `Item ${item.name} incrementado (+${delta}). Nova quantidade: ${item.qty}.`,
      itemId: item.id
    });

    saveState();
    if (AUTO_OPEN_KITCHEN_PREVIEW_ON_ADD && itemNeedsKitchen(item) && !item.delivered && !item.canceled) {
      const extraItem = {
        ...item,
        qty: delta,
        waiterNote: item.waiterNote ? `${item.waiterNote} | Acrescimo +${delta}` : `Acrescimo +${delta}`
      };
      printKitchenTicket(comanda, [extraItem], actor, { reason: "Acrescimo de item" });
    }
    render();
  }

  function setKitchenItemPriority(comandaId, itemId, priority) {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Somente administrador pode alterar prioridade de pedido.");
      return;
    }
    const rawPriority = String(priority || "").trim().toLowerCase();
    const mappedPriority = rawPriority === "media" ? "comum" : rawPriority === "altissima" ? "maxima" : rawPriority;
    if (!["normal", "comum", "alta", "maxima"].includes(mappedPriority)) return;

    const comanda = findOpenComanda(comandaId);
    if (!comanda) return;
    const item = (comanda.items || []).find((entry) => entry.id === itemId);
    if (!item || !itemNeedsKitchen(item) || item.canceled || item.delivered) return;
    const currentPriority = item.kitchenPriority || "normal";
    const rowDetailsKey = detailKey("kitchen-row", comanda.id, item.id);
    if (currentPriority === mappedPriority) {
      if (mappedPriority === "comum") {
        setAdminKitchenRowCollapsed(comanda.id, item.id, true);
        uiState.persistedDetailsOpen[rowDetailsKey] = false;
        render();
      }
      return;
    }

    item.kitchenPriority = mappedPriority;
    item.kitchenPriorityById = actor.id;
    item.kitchenPriorityByName = actor.name;
    item.kitchenPriorityAt = isoNow();

    if (mappedPriority === "comum") {
      setAdminKitchenRowCollapsed(comanda.id, item.id, true);
      uiState.persistedDetailsOpen[rowDetailsKey] = false;
    } else {
      setAdminKitchenRowCollapsed(comanda.id, item.id, false);
    }

    appendComandaEvent(comanda, {
      actor,
      type: "cozinha_prioridade",
      detail: `Prioridade do pedido ${item.name} alterada para ${adminMonitorPriorityLabel(mappedPriority)}.`,
      itemId: item.id
    });

    saveState();
    publishKitchenOrderUpsert(comanda, [item], actor, "Prioridade alterada");
    publishComandaUpsert(comanda, [item], actor, "Prioridade alterada");
    render();
  }

  function appendCookHistoryEntry(comanda, item, actor, status) {
    state.cookHistory = state.cookHistory || [];
    state.cookHistory.unshift({
      id: `KHS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      deliveredAt: status === "entregue" ? item.deliveredAt : null,
      updatedAt: item.kitchenStatusAt,
      comandaId: comanda.id,
      table: comanda.table,
      customer: comanda.customer || "",
      itemId: item.id,
      itemName: item.name,
      qty: item.qty,
      waiterNote: item.waiterNote || "",
      status,
      priority: item.kitchenPriority || "normal",
      cookId: actor.id,
      cookName: actor.name,
      deliveryRequested: Boolean(item.deliveryRequested),
      deliveryRecipient: item.deliveryRecipient || "",
      deliveryLocation: item.deliveryLocation || ""
    });
  }

  function setKitchenItemStatus(comandaId, itemId, status) {
    const actor = currentActor();
    if (actor.role !== "cook" && !isAdminOrDev(actor)) {
      alert("Apenas cozinheiro ou administrador podem alterar status da cozinha.");
      return;
    }
    const comanda = findOpenComanda(comandaId);
    if (!comanda) return;
    const item = (comanda.items || []).find((i) => i.id === itemId);
    if (!item || !itemNeedsKitchen(item) || item.canceled) return;

    if (!["cozinhando", "em_falta", "entregue"].includes(status)) return;
    if (status === "entregue" && item.delivered) return;

    item.kitchenStatus = status;
    item.kitchenStatusAt = isoNow();
    item.kitchenStatusById = actor.id;
    item.kitchenStatusByName = actor.name;
    item.kitchenAlertUnread = true;
    comanda.kitchenAlertUnread = true;

    if (status === "entregue") {
      item.delivered = true;
      item.deliveredAt = isoNow();
      item.waiterVisualState = "ready";
      item.waiterVisualUpdatedAt = isoNow();
      appendCookHistoryEntry(comanda, item, actor, status);
    } else if (status === "em_falta") {
      item.waiterVisualState = "";
      item.waiterVisualUpdatedAt = isoNow();
      appendCookHistoryEntry(comanda, item, actor, status);
    } else if (item.waiterVisualState === "new" || item.waiterVisualState === "ready" || item.waiterVisualState === "seen") {
      item.waiterVisualState = "";
      item.waiterVisualUpdatedAt = isoNow();
    }

    appendComandaEvent(comanda, {
      actor,
      type: "cozinha_status",
      detail: `Pedido ${item.name} da comanda ${comanda.id} atualizado para ${kitchenStatusLabel(status)}.`,
      itemId: item.id
    });

    if ((status === "entregue" || status === "em_falta") && comanda.isQuickKitchenSale) {
      const hasPendingKitchenItems = (comanda.items || []).some((i) => isKitchenOrderActive(i));
      if (!hasPendingKitchenItems) {
        comanda.status = "finalizada";
        comanda.closedAt = isoNow();
        comanda.kitchenAlertUnread = false;
        appendComandaEvent(comanda, {
          actor,
          type: "comanda_finalizada_auto",
          detail: `Comanda avulsa ${comanda.id} finalizada automaticamente apos conclusao da cozinha.`
        });
        state.openComandas = state.openComandas.filter((c) => c.id !== comanda.id);
        state.closedComandas.unshift(comanda);
        clearWaiterDraftItems(comanda.id);
        delete uiState.finalizeOpenByComanda[comanda.id];
        if (uiState.waiterActiveComandaId === comanda.id) {
          uiState.waiterActiveComandaId = null;
        }
      }
    }

    saveState();
    publishKitchenOrderUpsert(comanda, [item], actor, `Status cozinha: ${kitchenStatusLabel(status)}`);
    publishComandaUpsert(comanda, [item], actor, `Status cozinha: ${kitchenStatusLabel(status)}`);
    render();
  }

  function deliverItem(comandaId, itemId) {
    const actor = currentActor();
    const comanda = findOpenComandaForActor(comandaId, actor);
    if (!comanda) return;

    const item = (comanda.items || []).find((i) => i.id === itemId);
    if (!item || item.delivered || item.canceled) return;
    if (itemNeedsKitchen(item)) {
      setKitchenItemStatus(comandaId, itemId, "entregue");
      return;
    }

    item.delivered = true;
    item.deliveredAt = isoNow();
    item.waiterVisualState = "";
    item.waiterVisualUpdatedAt = isoNow();

    appendComandaEvent(comanda, {
      actor,
      type: "item_entregue",
      detail: `Item ${item.name} marcado como entregue.`,
      itemId: item.id
    });

    saveState();
    render();
  }

  function cancelItem(comandaId, itemId, options = {}) {
    const actor = currentActor();
    const comanda = findOpenComandaForActor(comandaId, actor);
    if (!comanda) return;

    const item = (comanda.items || []).find((i) => i.id === itemId);
    if (!item || item.canceled) return;

    const currentQty = Math.max(1, parseNumber(item.qty || 1));
    const requestedQtyRaw = options.qty !== undefined ? parseNumber(options.qty) : currentQty;
    if (!Number.isFinite(requestedQtyRaw) || requestedQtyRaw <= 0) {
      alert("Quantidade invalida para devolucao/cancelamento.");
      return;
    }
    const qtyToCancel = Math.min(currentQty, Math.max(1, Math.floor(requestedQtyRaw)));

    let reason = "";
    let note = "";
    if (options.skipPrompt) {
      reason = String(options.reason || "Desistencia de pedido").trim() || "Desistencia de pedido";
      note = String(options.note || "").trim();
    } else {
      const reasonPrompt = `Motivo da devolucao/cancelamento:\n${CANCEL_REASONS.join(" | ")}`;
      const chosenReason = prompt(reasonPrompt, "Desistencia de pedido");
      if (chosenReason === null) return;
      reason = chosenReason;
      note = prompt("Observacao adicional (opcional):", "") || "";
    }

    const product = state.products.find((p) => p.id === item.productId);
    if (product) {
      product.stock += qtyToCancel;
    }

    if (qtyToCancel >= currentQty) {
      item.canceled = true;
      item.canceledAt = isoNow();
      item.cancelReason = reason;
      item.cancelNote = note;
      item.kitchenAlertUnread = false;
      item.waiterVisualState = "";
      item.waiterVisualUpdatedAt = isoNow();
      appendComandaEvent(comanda, {
        actor,
        type: "item_cancelado",
        detail: `Item ${item.name} cancelado/devolvido e estoque ajustado.`,
        reason,
        itemId: item.id
      });
    } else {
      item.qty = currentQty - qtyToCancel;
      item.lastIncrementAt = isoNow();
      item.waiterVisualState = "";
      item.waiterVisualUpdatedAt = isoNow();
      appendComandaEvent(comanda, {
        actor,
        type: "item_reduzido",
        detail: `Item ${item.name} reduzido em ${qtyToCancel}. Quantidade restante: ${item.qty}. Estoque ajustado.`,
        reason,
        itemId: item.id
      });
    }

    comanda.kitchenAlertUnread = kitchenAlertCount(comanda) > 0;

    saveState();
    publishComandaUpsert(comanda, [item], actor, "Item cancelado");
    publishKitchenOrderUpsert(comanda, [item], actor, "Item cancelado");
    render();
  }

  function addComandaNote(comandaId) {
    const actor = currentActor();
    const comanda = findOpenComandaForActor(comandaId, actor);
    if (!comanda) return;

    const note = prompt("Digite a observacao da comanda:", "");
    if (!note) return;

    comanda.notes = comanda.notes || [];
    comanda.notes.push(note.trim());

    appendComandaEvent(comanda, {
      actor,
      type: "comanda_obs",
      detail: `Observacao adicionada: ${note.trim()}`
    });

    saveState();
    publishComandaUpsert(comanda, [], actor, "Observacao adicionada");
    render();
  }

  function computeComandaDeletionImpact(comanda) {
    const restockRows = [];
    let restoredQty = 0;
    let restoredProducts = 0;
    let notFoundProducts = 0;
    for (const item of comanda?.items || []) {
      if (!item || item.canceled) continue;
      const qty = Math.max(0, parseNumber(item.qty || 0));
      if (!(qty > 0)) continue;
      const product = state.products.find((entry) => Number(entry.id) === Number(item.productId));
      if (!product) {
        notFoundProducts += 1;
        continue;
      }
      restockRows.push({ product, qty });
      restoredQty += qty;
      restoredProducts += 1;
    }
    return {
      restockRows,
      restoredQty,
      restoredProducts,
      notFoundProducts,
      activeItems: (comanda?.items || []).filter((item) => item && !item.canceled).length
    };
  }

  function deleteComandaPermanently(comandaId, actorOverride = null) {
    const actor = actorOverride || currentActor();
    if (!actor || (actor.role !== "waiter" && !isAdminOrDev(actor))) {
      alert("Somente garcom ou administrador podem excluir comanda.");
      return;
    }

    const comanda = findOpenComandaForActor(comandaId, actor, { silent: true });
    if (!comanda) {
      alert("Comanda nao encontrada na lista de comandas abertas.");
      return;
    }

    const impact = computeComandaDeletionImpact(comanda);
    trackDeletedEntity("deletedComandaIds", comanda.id);
    for (const row of impact.restockRows) {
      row.product.stock = Math.max(0, parseNumber(row.product.stock || 0) + row.qty);
    }

    const deletedId = String(comanda.id || "").trim();
    state.openComandas = state.openComandas.filter((entry) => String(entry?.id || "").trim() !== deletedId);
    state.closedComandas = state.closedComandas.filter((entry) => String(entry?.id || "").trim() !== deletedId);
    state.history90 = (state.history90 || []).map((closure) => ({
      ...closure,
      commandas: (Array.isArray(closure?.commandas) ? closure.commandas : []).filter(
        (entry) => String(entry?.id || "").trim() !== deletedId
      )
    }));
    clearWaiterDraftItems(comanda.id);
    delete uiState.finalizeOpenByComanda[comanda.id];
    delete uiState.waiterCollapsedByComanda[comanda.id];
    if (uiState.waiterActiveComandaId === comanda.id) uiState.waiterActiveComandaId = null;
    if (uiState.adminInlineEditComandaId === comanda.id) uiState.adminInlineEditComandaId = null;
    if (uiState.comandaDetailsId === comanda.id) uiState.comandaDetailsId = null;

    appendAudit({
      actor,
      type: "comanda_excluida",
      comandaId: comanda.id,
      detail:
        `Comanda ${comanda.id} excluida permanentemente. ` +
        `Estoque reposto: ${impact.restoredQty} unidade(s) em ${impact.restoredProducts} item(ns).` +
        `${impact.notFoundProducts ? ` ${impact.notFoundProducts} item(ns) sem produto vinculado para reposicao.` : ""}`
    });

    saveState();
    publishComandaDeleted(deletedId, actor, "Comanda excluida");
    render();
  }

  function findComandaForAdminEdition(comandaId) {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Somente administrador pode editar comandas por este painel.");
      return null;
    }
    const comanda = findComandaForDetails(String(comandaId || ""));
    if (!comanda) {
      alert("Comanda nao encontrada.");
      return null;
    }
    const isOpenComanda = isComandaInOpenList(comanda.id);
    const hasPendingFiado = hasPendingPayableForComanda(comanda.id);
    if (!isOpenComanda && !hasPendingFiado) {
      alert("Comanda fechada/historica sem fiado pendente nao pode ser editada. Apenas visualizacao.");
      return null;
    }
    return comanda;
  }

  function isComandaInOpenList(comandaId) {
    return state.openComandas.some((entry) => String(entry?.id || "") === String(comandaId || ""));
  }

  function openComandaEditFlow(comandaId) {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) return false;
    const id = String(comandaId || "");
    const comanda = findOpenComanda(id);
    if (!comanda) {
      const detailsComanda = findComandaForDetails(id);
      if (!detailsComanda || !hasPendingPayableForComanda(id)) return false;
      const keyClosed = String(detailsComanda.id || "").trim();
      if (!keyClosed) return false;
      uiState.adminInlineEditComandaId = keyClosed;
      uiState.comandaDetailsId = keyClosed;
      return true;
    }
    const key = String(comanda.id || "").trim();
    if (!key) return false;
    uiState.waiterActiveComandaId = key;
    uiState.waiterCollapsedByComanda[key] = false;
    uiState.waiterTab = "abrir";
    uiState.adminInlineEditComandaId = key;
    uiState.comandaDetailsId = key;
    return true;
  }

  function resolveProductForAdminInput(rawInput) {
    const input = String(rawInput || "").trim();
    if (!input) return null;
    const byId = Number(input);
    if (Number.isFinite(byId) && byId > 0) {
      const exactById = state.products.find((product) => Number(product.id) === byId);
      if (exactById) return exactById;
    }
    const query = input.toLowerCase();
    const exactByName = state.products.find((product) => String(product.name || "").trim().toLowerCase() === query);
    if (exactByName) return exactByName;
    const matches = state.products.filter((product) => String(product.name || "").toLowerCase().includes(query));
    if (!matches.length) return null;
    if (matches.length === 1) return matches[0];
    const options = matches.slice(0, 8).map((product) => `${product.id} - ${product.name}`).join(" | ");
    alert(`Foram encontrados varios produtos. Seja mais especifico.\n${options}`);
    return null;
  }

  function adminEditComanda(comandaId) {
    const actor = currentActor();
    const comanda = findComandaForAdminEdition(comandaId);
    if (!comanda) return;
    const pendingPayable = findPendingPayableByComandaId(comanda.id);

    const nextTableRaw = prompt("Mesa/referencia:", String(comanda.table || ""));
    if (nextTableRaw === null) return;
    const nextCustomerRaw = prompt("Cliente:", String(comanda.customer || ""));
    if (nextCustomerRaw === null) return;
    const extraNoteRaw = prompt("Observacao da edicao (opcional):", "");
    if (extraNoteRaw === null) return;

    const nextTable = String(nextTableRaw || "").trim() || String(comanda.table || "-");
    const nextCustomer = String(nextCustomerRaw || "").trim();
    const extraNote = String(extraNoteRaw || "").trim();

    const changes = [];
    if (String(comanda.table || "") !== nextTable) {
      changes.push(`mesa/ref ${comanda.table || "-"} -> ${nextTable}`);
      comanda.table = nextTable;
    }
    if (String(comanda.customer || "") !== nextCustomer) {
      changes.push(`cliente ${comanda.customer || "-"} -> ${nextCustomer || "-"}`);
      comanda.customer = nextCustomer;
      if (pendingPayable) {
        pendingPayable.customerName = nextCustomer || pendingPayable.customerName || "";
        pendingPayable.updatedAt = isoNow();
      }
    }
    if (extraNote) {
      comanda.notes = Array.isArray(comanda.notes) ? comanda.notes : [];
      comanda.notes.push(`Edicao do administrador: ${extraNote}`);
      changes.push(`obs: ${extraNote}`);
    }

    if (!changes.length) {
      alert("Nenhuma alteracao informada.");
      return;
    }

    appendComandaEvent(comanda, {
      actor,
      type: "admin_comanda_edit",
      detail: `Comanda alterada pelo administrador. ${changes.join(" | ")}.`
    });
    if (pendingPayable) {
      syncComandaFiadoSplit(comanda, pendingPayable);
    }

    saveState();
    render();
  }

  function adminAddComandaItem(comandaId) {
    const actor = currentActor();
    const comanda = findComandaForAdminEdition(comandaId);
    if (!comanda) return;
    if (!state.products.length) {
      alert("Nao ha produtos cadastrados para adicionar.");
      return;
    }

    const productHint = state.products
      .slice(0, 8)
      .map((product) => `${product.id}-${product.name}`)
      .join(" | ");
    const productInput = prompt(`Produto por codigo ou nome.\nEx.: ${productHint}`);
    if (productInput === null) return;
    const product = resolveProductForAdminInput(productInput);
    if (!product) {
      alert("Produto nao encontrado.");
      return;
    }

    const qtyInput = prompt("Quantidade:", "1");
    if (qtyInput === null) return;
    const qty = Math.max(1, Math.floor(Number(qtyInput || 1)));
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Quantidade invalida.");
      return;
    }

    const noteInput = prompt("Observacao do item (opcional):", "");
    if (noteInput === null) return;
    const waiterNote = String(noteInput || "").trim();

    const isOpenComanda = isComandaInOpenList(comanda.id);
    const pendingPayable = findPendingPayableByComandaId(comanda.id);
    const canAdjustStock = isOpenComanda || Boolean(pendingPayable);
    if (canAdjustStock && Number(product.stock || 0) < qty) {
      alert(`Estoque insuficiente para ${product.name}. Disponivel: ${product.stock}.`);
      return;
    }

    const draft = {
      category: product.category,
      productId: product.id,
      qty,
      waiterNote,
      needsKitchen: productNeedsKitchen(product),
      isDelivery: false,
      deliveryRecipient: "",
      deliveryLocation: ""
    };

    const stockInfo = canAdjustStock ? ` Estoque baixado: -${qty}.` : " Estoque nao foi alterado (comanda fechada/historica).";
    const createdItem = appendDraftItemToComanda(comanda, actor, draft, {
      adjustStock: canAdjustStock,
      eventType: "admin_item_add",
      eventDetail: `Item ${product.name} x${qty} adicionado pelo administrador.${stockInfo}`
    });

    if (!createdItem) {
      alert("Nao foi possivel adicionar o item.");
      return;
    }

    if (!isOpenComanda) {
      createdItem.kitchenAlertUnread = false;
      if (itemNeedsKitchen(createdItem)) {
        createdItem.kitchenStatus = "entregue";
        createdItem.kitchenStatusAt = isoNow();
      }
      createdItem.delivered = true;
      createdItem.deliveredAt = isoNow();
      comanda.kitchenAlertUnread = false;
    }

    if (pendingPayable) {
      const payableDelta = parseNumber(createdItem.qty || 0) * parseNumber(createdItem.priceAtSale || 0);
      const payableResult = applyPayableAdjustment(pendingPayable, actor, {
        type: "fiado_ajuste_produto_add",
        detail: `Item ${createdItem.name} x${createdItem.qty} adicionado na comanda ${comanda.id}.`,
        amountDelta: payableDelta,
        productId: createdItem.productId,
        productName: createdItem.name,
        qty: createdItem.qty,
        unitPrice: createdItem.priceAtSale
      });
      if (payableResult) {
        appendAudit({
          actor,
          type: "fiado_ajuste_produto_add",
          detail:
            `Fiado da comanda ${comanda.id} atualizado com item ${createdItem.name} x${createdItem.qty}. ` +
            `Saldo: ${money(payableResult.currentTotal)} -> ${money(payableResult.nextTotal)}.`,
          comandaId: comanda.id
        });
        syncComandaFiadoSplit(comanda, pendingPayable);
      }
    }

    saveState();
    if (isOpenComanda) {
      publishKitchenOrderUpsert(comanda, [createdItem], actor, "Item adicionado");
    }
    render();
  }

  function adminEditComandaItem(comandaId, itemId) {
    const actor = currentActor();
    const comanda = findComandaForAdminEdition(comandaId);
    if (!comanda) return;
    const item = (comanda.items || []).find((entry) => String(entry.id || "") === String(itemId || ""));
    if (!item) {
      alert("Item nao encontrado.");
      return;
    }

    const nextNameRaw = prompt("Nome do item:", String(item.name || ""));
    if (nextNameRaw === null) return;
    const nextQtyRaw = prompt("Quantidade:", String(item.qty || 1));
    if (nextQtyRaw === null) return;
    const nextPriceRaw = prompt("Preco unitario:", String(item.priceAtSale || 0));
    if (nextPriceRaw === null) return;
    const nextNoteRaw = prompt("Observacao:", String(item.waiterNote || ""));
    if (nextNoteRaw === null) return;

    const nextName = String(nextNameRaw || "").trim() || String(item.name || "");
    const nextQty = Math.max(1, Math.floor(parseNumber(nextQtyRaw || 1)));
    const nextPrice = Math.max(0, parseNumber(nextPriceRaw));
    const nextNote = String(nextNoteRaw || "").trim();
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      alert("Quantidade invalida.");
      return;
    }

    const prevName = String(item.name || "");
    const prevQty = parseNumber(item.qty || 0);
    const prevPrice = parseNumber(item.priceAtSale || 0);
    const prevNote = String(item.waiterNote || "");
    const isOpenComanda = isComandaInOpenList(comanda.id);
    const pendingPayable = findPendingPayableByComandaId(comanda.id);
    const canAdjustStock = isOpenComanda || Boolean(pendingPayable);
    const stockChanges = [];
    const product = state.products.find((entry) => Number(entry.id) === Number(item.productId));
    const qtyDelta = nextQty - prevQty;
    const prevBillable = itemCountsForTotal({ ...item, qty: prevQty, priceAtSale: prevPrice }) ? prevQty * prevPrice : 0;
    const nextBillable = itemCountsForTotal({ ...item, qty: nextQty, priceAtSale: nextPrice }) ? nextQty * nextPrice : 0;
    const payableDelta = pendingPayable ? nextBillable - prevBillable : 0;

    if (pendingPayable && payableDelta < 0 && Number(pendingPayable.total || 0) + payableDelta < 0) {
      alert("O ajuste deixaria o saldo do fiado negativo. Ajuste os valores antes de salvar.");
      return;
    }

    if (canAdjustStock && product && qtyDelta !== 0) {
      if (qtyDelta > 0) {
        if (Number(product.stock || 0) < qtyDelta) {
          alert(`Estoque insuficiente para aumentar ${qtyDelta} unidade(s) de ${product.name}. Disponivel: ${product.stock}.`);
          return;
        }
        product.stock -= qtyDelta;
        stockChanges.push(`estoque -${qtyDelta}`);
      } else {
        const restore = Math.abs(qtyDelta);
        product.stock += restore;
        stockChanges.push(`estoque +${restore}`);
      }
    }

    item.name = nextName;
    item.qty = nextQty;
    item.priceAtSale = nextPrice;
    item.waiterNote = nextNote;
    item.lastIncrementAt = isoNow();

    const changes = [];
    if (prevName !== nextName) changes.push(`nome ${prevName || "-"} -> ${nextName || "-"}`);
    if (prevQty !== nextQty) changes.push(`qtd ${prevQty} -> ${nextQty}`);
    if (prevPrice !== nextPrice) changes.push(`preco ${money(prevPrice)} -> ${money(nextPrice)}`);
    if (prevNote !== nextNote) changes.push(`obs ${prevNote || "-"} -> ${nextNote || "-"}`);
    if (stockChanges.length) changes.push(stockChanges.join(", "));
    if (pendingPayable && payableDelta !== 0) changes.push(`fiado ${money(prevBillable)} -> ${money(nextBillable)}`);

    if (!changes.length) {
      alert("Nenhuma alteracao informada.");
      return;
    }

    appendComandaEvent(comanda, {
      actor,
      type: "admin_item_edit",
      detail: `Item ${item.name} alterado pelo administrador. ${changes.join(" | ")}.`,
      itemId: item.id
    });

    if (pendingPayable && payableDelta !== 0) {
      const payableType = payableDelta > 0 ? "fiado_ajuste_produto_add" : "fiado_ajuste_produto_remove";
      const payableResult = applyPayableAdjustment(pendingPayable, actor, {
        type: payableType,
        detail: `Item ${item.name} alterado na comanda ${comanda.id}.`,
        amountDelta: payableDelta,
        productId: item.productId,
        productName: item.name,
        qty: nextQty,
        unitPrice: nextPrice
      });
      if (payableResult) {
        appendAudit({
          actor,
          type: payableType,
          detail:
            `Fiado da comanda ${comanda.id} ajustado pela edicao do item ${item.name}. ` +
            `Saldo: ${money(payableResult.currentTotal)} -> ${money(payableResult.nextTotal)}.`,
          comandaId: comanda.id
        });
        syncComandaFiadoSplit(comanda, pendingPayable);
      }
    }

    saveState();
    render();
  }

  function adminRemoveComandaItem(comandaId, itemId) {
    const actor = currentActor();
    const comanda = findComandaForAdminEdition(comandaId);
    if (!comanda) return;
    const item = (comanda.items || []).find((entry) => String(entry.id || "") === String(itemId || ""));
    if (!item) {
      alert("Item nao encontrado.");
      return;
    }
    if (!confirm(`Remover item ${item.name} da comanda ${comanda.id}?`)) return;

    const isOpenComanda = isComandaInOpenList(comanda.id);
    const pendingPayable = findPendingPayableByComandaId(comanda.id);
    const canAdjustStock = isOpenComanda || Boolean(pendingPayable);
    const qty = Math.max(0, parseNumber(item.qty || 0));
    const product = state.products.find((entry) => Number(entry.id) === Number(item.productId));
    const itemBillableValue = itemCountsForTotal(item) ? qty * parseNumber(item.priceAtSale || 0) : 0;
    const payableDelta = pendingPayable ? -itemBillableValue : 0;
    if (pendingPayable && payableDelta < 0 && Number(pendingPayable.total || 0) + payableDelta < 0) {
      alert("O ajuste deixaria o saldo do fiado negativo. Ajuste manualmente antes de remover este item.");
      return;
    }
    let stockInfo = "";
    if (canAdjustStock && product && qty > 0) {
      product.stock += qty;
      stockInfo = ` Estoque devolvido: +${qty}.`;
    } else if (!isOpenComanda) {
      stockInfo = " Estoque nao foi alterado (comanda fechada/historica).";
    }

    comanda.items = (comanda.items || []).filter((entry) => String(entry.id || "") !== String(itemId || ""));
    comanda.kitchenAlertUnread = kitchenAlertCount(comanda) > 0;

    appendComandaEvent(comanda, {
      actor,
      type: "admin_item_remove",
      detail: `Item ${item.name} x${qty} removido pelo administrador.${stockInfo}`,
      itemId: item.id
    });

    if (pendingPayable && payableDelta !== 0) {
      const payableResult = applyPayableAdjustment(pendingPayable, actor, {
        type: "fiado_ajuste_produto_remove",
        detail: `Item ${item.name} removido na comanda ${comanda.id}.`,
        amountDelta: payableDelta,
        productId: item.productId,
        productName: item.name,
        qty,
        unitPrice: item.priceAtSale
      });
      if (payableResult) {
        appendAudit({
          actor,
          type: "fiado_ajuste_produto_remove",
          detail:
            `Fiado da comanda ${comanda.id} ajustado pela remocao do item ${item.name}. ` +
            `Saldo: ${money(payableResult.currentTotal)} -> ${money(payableResult.nextTotal)}.`,
          comandaId: comanda.id
        });
        syncComandaFiadoSplit(comanda, pendingPayable);
      }
    }

    saveState();
    render();
  }

  function toggleFinalize(comandaId) {
    uiState.finalizeOpenByComanda[comandaId] = !uiState.finalizeOpenByComanda[comandaId];
    const comanda = findOpenComandaForActor(comandaId, currentActor(), { silent: true });
    if (!comanda) {
      delete uiState.finalizeOpenByComanda[comandaId];
      render();
      return;
    }
    if (uiState.finalizeOpenByComanda[comandaId] && comanda && comandaTotal(comanda) > 0 && !comanda.pixCodeDraft) {
      comanda.pixCodeDraft = generatePixCode();
      saveState();
    }
    render();
  }

  function parseFinalizePaymentRows(rawRows, total) {
    const validMethods = new Set(PAYMENT_METHODS.map((entry) => entry.value));
    const normalizedTotal = Math.max(0, parseNumber(total || 0));
    const isZeroTotal = normalizedTotal <= 0.01;
    const chosenRows = [];
    for (const row of Array.isArray(rawRows) ? rawRows : []) {
      const method = String(row?.method || "").trim();
      const amount = Math.max(0, parseNumber(row?.amountRaw !== undefined ? row.amountRaw : row?.amount || 0));
      const rowName = String(row?.rowName || "pagamento").trim() || "pagamento";
      if (!method && !(amount > 0)) continue;
      if (!method && amount > 0) {
        return { error: `Informe a forma do ${rowName}.` };
      }
      if (!method) continue;
      if (!validMethods.has(method)) {
        return { error: `Forma de pagamento invalida no ${rowName}.` };
      }
      if (!(amount > 0)) {
        if (isZeroTotal) continue;
        return { error: `Informe valor maior que zero para ${paymentLabel(method)}.` };
      }
      chosenRows.push({ method, amount });
    }

    if (isZeroTotal) {
      const totalPaid = chosenRows.reduce((sum, row) => sum + parseNumber(row.amount || 0), 0);
      if (Math.abs(totalPaid - normalizedTotal) > 0.01) {
        return {
          error: `A soma dos pagamentos (${money(totalPaid)}) precisa ser igual ao total da comanda (${money(normalizedTotal)}).`
        };
      }
      return { value: [{ method: "sem_cobranca", amount: 0 }] };
    }

    if (!chosenRows.length) {
      return { error: "Informe ao menos uma forma de pagamento." };
    }

    const splits = normalizePaymentSplits(chosenRows);
    const totalPaid = splits.reduce((sum, row) => sum + parseNumber(row.amount || 0), 0);
    if (Math.abs(totalPaid - normalizedTotal) > 0.01) {
      return {
        error: `A soma dos pagamentos (${money(totalPaid)}) precisa ser igual ao total da comanda (${money(normalizedTotal)}).`
      };
    }
    return { value: splits };
  }

  function parseFinalizePaymentSplits(form, total) {
    if (!form) return { error: "Formulario nao encontrado." };
    const methodEls = form.querySelectorAll('[data-role="payment-method"]');
    const amountEls = form.querySelectorAll('[data-role="payment-amount"]');
    const rawRows = [];
    for (let i = 0; i < methodEls.length; i++) {
      rawRows.push({
        method: String(methodEls[i]?.value || "").trim(),
        amountRaw: String(amountEls[i]?.value || "0").trim(),
        rowName: `pagamento ${i + 1}`
      });
    }
    if (!rawRows.length && form.paymentMethodPrimary) {
      rawRows.push({
        method: String(form.paymentMethodPrimary.value || "").trim(),
        amountRaw: String(form.paymentAmountPrimary?.value || "0").trim(),
        rowName: "pagamento"
      });
    }
    return parseFinalizePaymentRows(rawRows, total);
  }

  function updateFinalizePaymentUi(form) {
    if (!form) return;
    const fiadoBox = form.querySelector('[data-role="fiado-box"]');
    const pixBox = form.querySelector('[data-role="pix-box"]');
    const manualCheck = form.querySelector('[data-role="manual-check"]');
    const manualCheckNote = form.querySelector('[data-role="manual-check-note"]');
    const breakdownNote = form.querySelector('[data-role="payment-breakdown-note"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const comandaId = String(form.dataset.comandaId || "");
    const comanda = findOpenComanda(comandaId);
    const total = comanda ? comandaTotal(comanda) : 0;
    const isZeroTotal = Math.max(0, parseNumber(total || 0)) <= 0.01;

    // Sync input values to uiState
    syncSplitsFromForm(form, comandaId);

    const methodEls = Array.from(form.querySelectorAll('[data-role="payment-method"]'));
    const selectedMethods = methodEls.map((el) => String(el.value || "").trim()).filter(Boolean);

    const parsed = parseFinalizePaymentSplits(form, total);
    const splits = parsed.value || [];
    const hasFiado = selectedMethods.includes("fiado");
    const hasPix = selectedMethods.includes("pix");
    const hasNonFiado = selectedMethods.some((method) => method !== "fiado");

    if (fiadoBox) fiadoBox.style.display = !isZeroTotal && hasFiado ? "grid" : "none";
    if (pixBox) pixBox.style.display = !isZeroTotal && hasPix ? "grid" : "none";
    if (manualCheck) {
      manualCheck.disabled = isZeroTotal || !hasNonFiado;
      if (isZeroTotal || !hasNonFiado) manualCheck.checked = false;
    }
    if (manualCheckNote) {
      manualCheckNote.style.display = isZeroTotal || !hasNonFiado ? "block" : "none";
      manualCheckNote.textContent = isZeroTotal
        ? "Comanda com total zerado: finalize sem informar pagamento."
        : hasNonFiado
          ? ""
          : "Quando a comanda e totalmente no fiado, essa confirmacao e dispensada.";
    }

    if (breakdownNote) {
      if (isZeroTotal) {
        breakdownNote.textContent = "Comanda zerada. Nenhum pagamento precisa ser informado para finalizar.";
        breakdownNote.style.color = "";
      } else if (parsed.error) {
        breakdownNote.textContent = `⚠️ ${parsed.error}`;
        breakdownNote.style.color = "#ff6b6b";
      } else {
        const paid = splits.reduce((sum, row) => sum + parseNumber(row.amount || 0), 0);
        breakdownNote.textContent = `✓ Pagamento conferido (${money(paid)}): ${paymentSplitsText(splits, { includeAmount: true })}.`;
        breakdownNote.style.color = "#51cf66";
      }
    }

    if (submitBtn && !isZeroTotal) {
      submitBtn.disabled = Boolean(parsed.error);
    }

    if (!isZeroTotal && hasPix && comanda) {
      if (!comanda.pixCodeDraft) {
        comanda.pixCodeDraft = generatePixCode();
      }
      const codeEl = form.querySelector('[data-role="pix-code"]');
      const canvas = form.querySelector('[data-role="pix-canvas"]');
      if (codeEl) codeEl.textContent = comanda.pixCodeDraft;
      if (canvas) drawPseudoQr(canvas, comanda.pixCodeDraft);
    }
  }

  function finalizeComanda(form) {
    const actor = currentActor();
    const comandaId = form.dataset.comandaId;
    const comanda = findOpenComandaForActor(comandaId, actor, { silent: true });
    if (!comanda) {
      alert("Comanda nao encontrada.");
      return;
    }

    const manualCheck = formCheckboxChecked(form, "manualCheck", false);
    const fiadoCustomer = form.fiadoCustomer.value.trim();
    const total = comandaTotal(comanda);
    const parsedSplits = parseFinalizePaymentSplits(form, total);
    if (parsedSplits.error) {
      alert(parsedSplits.error);
      return;
    }
    const paymentSplits = parsedSplits.value || [];
    const hasFiado = paymentSplits.some((row) => row.method === "fiado");
    const hasPix = paymentSplits.some((row) => row.method === "pix");
    const requiresManualCheck = paymentSplits.some((row) => row.method !== "fiado" && row.method !== "sem_cobranca");

    if (requiresManualCheck && !manualCheck) {
      alert("Confirme manualmente o pagamento antes de finalizar.");
      return;
    }

    if (hasFiado && !fiadoCustomer) {
      alert("No fiado, o nome do cliente e obrigatorio.");
      return;
    }

    if (!comanda.items.some((item) => itemCountsForTotal(item))) {
      if (!confirm("Comanda sem itens validos. Finalizar mesmo assim?")) return;
    }

    if (hasPix && !comanda.pixCodeDraft) {
      comanda.pixCodeDraft = generatePixCode();
    }

    const normalizedSplits = normalizePaymentSplits(paymentSplits);
    const paymentMethod = normalizedSplits.length === 1 ? normalizedSplits[0].method : normalizedSplits.length ? "multiplo" : "nao_finalizada";
    const fiadoAmount = normalizedSplits
      .filter((entry) => entry.method === "fiado")
      .reduce((sum, entry) => sum + parseNumber(entry.amount || 0), 0);

    comanda.status = "finalizada";
    comanda.closedAt = isoNow();
    comanda.updatedAt = comanda.closedAt;
    comanda.payment = {
      method: paymentMethod,
      methodLabel: paymentSplitsText(normalizedSplits, { includeAmount: true }),
      methods: normalizedSplits,
      verifiedAt: isoNow(),
      customerName: hasFiado ? fiadoCustomer : comanda.customer || "",
      pixCode: hasPix ? comanda.pixCodeDraft : ""
    };

    if (fiadoAmount > 0) {
      const createdAt = isoNow();
      state.payables.push({
        id: `PG-${String(state.seq.payable++).padStart(5, "0")}`,
        comandaId: comanda.id,
        customerName: fiadoCustomer,
        total: fiadoAmount,
        status: "pendente",
        createdAt,
        updatedAt: createdAt,
        paidAt: null,
        paidMethod: null,
        adjustments: []
      });
    }

    appendComandaEvent(comanda, {
      actor,
      type: "comanda_finalizada",
      detail: `Comanda finalizada com ${paymentSplitsText(normalizedSplits, { includeAmount: true })} no valor ${money(total)}.`
    });

    state.openComandas = state.openComandas.filter((c) => c.id !== comanda.id);
    state.closedComandas.unshift(comanda);
    clearWaiterDraftItems(comanda.id);

    if (uiState.waiterActiveComandaId === comanda.id) {
      uiState.waiterActiveComandaId = null;
    }
    delete uiState.finalizeOpenByComanda[comanda.id];
    delete (uiState.finalizeSplitsByComanda || {})[comanda.id];

    saveState();
    publishComandaClosed(comanda, actor, "Comanda finalizada");
    render();
    const shouldPrint = confirm("Deseja imprimir a nota do cliente agora?");
    if (shouldPrint) {
      void printComanda(comanda.id, { isClientReceipt: true });
    }
  }

  function toggleFinalizeView(select) {
    const form = select.closest('form[data-role="finalize-form"]');
    if (!form) return;
    updateFinalizePaymentUi(form);
  }

  function extractBodyFromHtml(html) {
    const raw = String(html || "");
    const match = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : raw;
  }

  function buildSimplePreviewPage(html, options = {}) {
    const title = String(options.previewTitle || "Visualizacao de cupom");
    const subtitle = String(options.previewSubtitle || "Impressao fisica desativada temporariamente.");
    const bodyContent = extractBodyFromHtml(html);
    return `
      <html>
        <head>
          <title>${esc(title)}</title>
          <style>
            :root { color-scheme: light; }
            body { margin: 0; font-family: Arial, sans-serif; background: #f3f5f8; color: #102033; }
            .preview-shell { max-width: 980px; margin: 0 auto; padding: 16px; }
            .preview-header { margin-bottom: 12px; border: 1px solid #c7d4e7; border-radius: 10px; background: #ffffff; padding: 12px; }
            .preview-header h1 { margin: 0; font-size: 18px; }
            .preview-header p { margin: 6px 0 0; color: #4a5f7d; font-size: 13px; }
            .preview-content { border: 1px solid #c7d4e7; border-radius: 10px; background: #ffffff; padding: 12px; overflow: auto; }
            .preview-content table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            .preview-content th, .preview-content td { border: 1px solid #d6deeb; padding: 6px 7px; font-size: 12px; vertical-align: top; }
            .preview-content th { background: #f4f7fb; }
            .preview-content p { font-size: 12px; line-height: 1.35; }
            .preview-content h1, .preview-content h2, .preview-content h3, .preview-content h4 { margin: 8px 0 6px; }
            .preview-footer { margin-top: 10px; color: #4a5f7d; font-size: 12px; }
            @media print {
              @page { margin: 0; }
              body { background: #fff; }
              .preview-shell { max-width: none; padding: 0; }
              .preview-header, .preview-footer { display: none; }
              .preview-content { border: 0; border-radius: 0; padding: 0; overflow: visible; }
            }
          </style>
        </head>
        <body>
          <div class="preview-shell">
            <div class="preview-header">
              <h1>${esc(title)}</h1>
              <p>${esc(subtitle)}</p>
            </div>
            <div class="preview-content">${bodyContent}</div>
            <div class="preview-footer">Documento aberto somente para visualizacao no navegador/PWA.</div>
          </div>
        </body>
      </html>
    `;
  }

  function openReceiptPopup(
    html,
    blockedMessage = "Permita pop-up para abrir a visualizacao do cupom.",
    popupFeatures = "width=420,height=760",
    options = {}
  ) {
    const popup = window.open("", "_blank", popupFeatures);
    if (!popup) {
      alert(blockedMessage);
      return null;
    }
    const htmlToRender = buildSimplePreviewPage(html, options);

    popup.document.open();
    popup.document.write(htmlToRender);
    popup.document.close();
    setTimeout(() => {
      try {
        popup.focus();
      } catch (_err) { }
    }, 220);
    return popup;
  }

  function qzLibraryAvailable() {
    return Boolean(window.qz && window.qz.websocket && window.qz.configs && window.qz.printers && window.qz.print);
  }

  function ensureQzSecurityConfig() {
    if (!qzLibraryAvailable() || uiState.qzSecurityConfigured) return;
    try {
      // Modo simples para ambiente local. Em producao o ideal e assinatura valida.
      window.qz.security.setCertificatePromise((resolve) => resolve());
      window.qz.security.setSignaturePromise(() => (resolve) => resolve());
      uiState.qzSecurityConfigured = true;
    } catch (_err) { }
  }

  async function ensureQzConnected() {
    if (!qzLibraryAvailable()) {
      throw new Error("QZ Tray nao detectado no navegador.");
    }
    ensureQzSecurityConfig();
    if (window.qz.websocket.isActive()) return;
    await window.qz.websocket.connect({ retries: 2, delay: 1 });
  }

  async function resolvePrinterName(preferredName = "") {
    const preferred = String(preferredName || "").trim();
    if (preferred) return preferred;
    return (await window.qz.printers.getDefault()) || "";
  }

  async function printHtmlViaQz(html, options = {}) {
    await ensureQzConnected();
    const printerName = await resolvePrinterName(options.printerName);
    if (!printerName) {
      throw new Error("Nenhuma impressora configurada ou definida como padrao no Windows.");
    }
    const config = window.qz.configs.create(printerName, {
      copies: 1,
      jobName: String(options.jobName || "cupom"),
      colorType: "blackwhite"
    });
    const data = [{ type: "pixel", format: "html", flavor: "plain", data: html }];
    await window.qz.print(config, data);
  }

  async function printKitchenTicketViaQz(html, comandaId = "") {
    return printHtmlViaQz(html, {
      printerName: uiState.printerPrefs?.kitchenPrinterName,
      jobName: `cozinha-${String(comandaId || "pedido")}`
    });
  }

  async function printReceiptViaQz(html, receiptId = "") {
    return printHtmlViaQz(html, {
      printerName: uiState.printerPrefs?.receiptPrinterName,
      jobName: `cupom-${String(receiptId || "venda")}`
    });
  }

  function setKitchenDirectPrintEnabled(enabled) {
    uiState.printerPrefs = normalizePrinterPrefs({
      ...uiState.printerPrefs,
      kitchenDirectEnabled: Boolean(enabled)
    });
    persistPrinterPrefs();
    render();
  }

  function saveKitchenPrinterConfigFromUi() {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Somente administrador pode configurar a impressora da cozinha.");
      return;
    }
    const input = document.querySelector('[data-role="kitchen-printer-name"]');
    const kitchenPrinterName = String(input?.value || "").trim();
    uiState.printerPrefs = normalizePrinterPrefs({
      ...uiState.printerPrefs,
      kitchenPrinterName
    });
    persistPrinterPrefs();
    alert(
      kitchenPrinterName
        ? `Impressora da cozinha salva: ${kitchenPrinterName}`
        : "Impressora da cozinha limpa. Sera usada a impressora padrao do computador."
    );
    render();
  }

  function saveReceiptPrinterConfigFromUi() {
    const actor = currentActor();
    if (!isAdminOrDev(actor)) {
      alert("Somente administrador pode configurar a impressora de cupom.");
      return;
    }
    const printerName = String(document.querySelector('[data-role="receipt-printer-name"]')?.value || "").trim();
    const paperWidthMm = Number(document.querySelector('[data-role="receipt-paper-width"]')?.value || DEFAULT_RECEIPT_PAPER_WIDTH_MM);
    const directEnabled = Boolean(document.querySelector('[data-role="receipt-direct-enabled"]')?.checked);
    uiState.printerPrefs = normalizePrinterPrefs({
      ...uiState.printerPrefs,
      receiptDirectEnabled: directEnabled,
      receiptPrinterName: printerName,
      receiptPaperWidthMm: paperWidthMm
    });
    persistPrinterPrefs();
    alert(`Configuracao salva. Destino: ${printerName || "impressora padrao do Windows"}; papel: ${uiState.printerPrefs.receiptPaperWidthMm} mm.`);
    render();
  }

  function buildReceiptTestHtml() {
    return buildThermalReceiptHtml({
      title: "TESTE DE IMPRESSAO",
      lines: ["MTP-II conectada pelo Windows", "Supabase + impressao local", `Gerado: ${formatDateTime(isoNow())}`],
      footer: "Este nao e um documento fiscal."
    });
  }

  async function printReceiptTest() {
    try {
      await printReceiptViaQz(buildReceiptTestHtml(), "teste");
      alert("Teste enviado para a impressora.");
    } catch (err) {
      alert(`Nao foi possivel imprimir o teste: ${String(err?.message || err)}\n\nConfira se a MTP-II esta pareada, configurada no Windows e se o QZ Tray esta aberto.`);
    }
  }

  function buildThermalReceiptHtml({ title, lines = [], footer = "" }) {
    const width = normalizePrinterPrefs(uiState.printerPrefs).receiptPaperWidthMm;
    const renderedLines = lines.map((line) => `<p>${line}</p>`).join("");
    return `
      <html><head><meta charset="utf-8"><style>
        @page { size: ${width}mm auto; margin: 0; }
        body { width: ${width}mm; margin: 0; padding: 1.5mm 1.5mm 1mm; box-sizing: border-box; font-family: Arial, sans-serif; color: #000; }
        .receipt { width: 100%; font-size: 11px; line-height: 1.2; }
        h3 { margin: 0 0 4px; font-size: 14px; text-align: center; }
        p { margin: 2px 0; overflow-wrap: anywhere; }
        hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
        .footer { font-size: 9px; text-align: center; margin: 0; }
      </style></head><body><div class="receipt"><h3>${esc(title)}</h3><hr>${renderedLines}<hr><p class="footer">${esc(footer)}</p></div></body></html>`;
  }

  function printKitchenTicket(comanda, items, actor, options = {}) {
    if (!comanda || !Array.isArray(items) || !items.length) return;
    if (!actor || (actor.role !== "waiter" && !isAdminOrDev(actor))) return;

    const kitchenItems = items.filter((item) => item && itemNeedsKitchen(item) && !item.canceled);
    if (!kitchenItems.length) return;

    const reason = String(options.reason || "Novo pedido");
    const generatedAt = isoNow();
    const groups = groupComandaItems(kitchenItems);
    const printableItems = groups
      .map(({ main, addons }) => {
        const note = main.waiterNote ? `<p class="line note">Obs do pedido: ${esc(main.waiterNote)}</p>` : "";
        const delivery = main.deliveryRequested
          ? `<p class="line note">Entrega: ${esc(main.deliveryRecipient || "-")} | ${esc(main.deliveryLocation || "-")}</p>`
          : "";
        const addonLines = addons.map(addon => `<p class="line">&nbsp;&nbsp;+ ${esc(addon.name)} x${parseNumber(addon.qty || 0)}</p>`).join("");
        return `
          <div class="item">
            <p class="line"><b>${esc(main.name)}</b></p>
            <p class="line">Qtd: <b>${parseNumber(main.qty || 0)}</b> | Prioridade: ${esc(kitchenPriorityLabel(main.kitchenPriority || "normal"))}</p>
            ${addonLines}
            ${note}
            ${delivery}
          </div>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Cozinha ${esc(displayComandaId(comanda.id))}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { width: 80mm; font-family: monospace; margin: 0; padding: 1.5mm 1.5mm 1mm; box-sizing: border-box; }
            .ticket { width: 100%; margin: 0 auto; color: #000; }
            h2 { margin: 0 0 4px; font-size: 18px; text-align: center; }
            p { margin: 2px 0; font-size: 12px; line-height: 1.25; }
            hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
            .meta { font-size: 11px; }
            .item { margin: 0 0 4px; }
            .line.note { font-size: 11px; }
            .strong { font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h2>${esc(ESTABLISHMENT_NAME)} | COZINHA</h2>
            <p class="strong">Pedido: ${esc(reason)}</p>
            <p class="meta">Comanda: ${esc(displayComandaId(comanda.id))} | Mesa/ref: ${esc(comanda.table || "-")}</p>
            <p class="meta">Cliente: ${esc(comanda.customer || "-")}</p>
            <p class="meta">Solicitante: ${esc(actor.name || "-")} (${esc(roleLabel(actor.role || ""))})</p>
            <p class="meta">Gerado em: ${esc(formatDateTime(generatedAt))}</p>
            <hr>
            ${printableItems}
            <hr>
            <p class="meta">${uiState.printerPrefs?.kitchenDirectEnabled ? "Cupom de cozinha - envio direto configurado" : "Cupom de cozinha - visualizacao simples no navegador/PWA"}</p>
          </div>
        </body>
      </html>
    `;

    if (uiState.printerPrefs?.kitchenDirectEnabled) {
      void printKitchenTicketViaQz(html, comanda.id).catch((err) => {
        alert(`Falha na impressao da cozinha: ${String(err?.message || err)}`);
      });
      return;
    }
    openReceiptPopup(html, "Permita pop-up para abrir a visualizacao do cupom da cozinha.", "width=420,height=760", {
      previewTitle: `Cupom da cozinha ${displayComandaId(comanda.id)}`,
      previewSubtitle: "Modo visualizacao simples (impressao desativada)"
    });
  }

  function isAndroidDevice() {
    return /Android/i.test(String(navigator.userAgent || ""));
  }

  function imprimirCupomIntent(textoCupom) {
    const textoSeguro = String(textoCupom || "").replace(/\u0000/g, "");
    const urlRawBT =
      "intent:" + encodeURIComponent(textoSeguro) +
      "#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";
    window.location.href = urlRawBT;
  }

  function buildComandaReceiptText(comanda, options = {}) {
    const actor = currentActor() || { name: "N/A" };
    const isOrderTicket = options.isOrderTicket;
    
    // Find delivery details from items
    const deliveryItem = (comanda?.items || []).find((i) => i && i.deliveryRequested && !i.canceled);
    const hasDelivery = !!deliveryItem;
    const recipient = deliveryItem?.deliveryRecipient || "";
    const location = deliveryItem?.deliveryLocation || "";
    const notesText = (comanda?.notes || []).join(" | ");

    if (isOrderTicket) {
      const targetItems = Array.isArray(options.itemsToPrint)
        ? options.itemsToPrint
        : (comanda?.items || []).filter((i) => i && !i.canceled && i.category === "Cozinha");
      const groups = groupComandaItems(targetItems);
      const itemsText = groups
        .map(({ main, addons }) => {
          const obs = main.waiterNote ? `  * OBS COZINHA: ${main.waiterNote}\n` : "";
          const del = main.deliveryRequested ? `  * PARA VIAGEM: ${main.deliveryRecipient} - ${main.deliveryLocation}\n` : "";
          const addonLines = addons.map(addon => `  + ${addon.name} x${parseNumber(addon.qty || 0)}\n`).join("");
          return `${String(main.name)} x${parseNumber(main.qty)}\n${addonLines}${obs}${del}`;
        })
        .join("") || "Sem itens\n";

      const ticketLines = [
        `=== ENVIO DE PEDIDO ===`,
        `${ESTABLISHMENT_NAME}`,
        `Pedido: ${displayComandaId(comanda?.id)}`,
        `Garçom: ${actor.name || "-"}`,
        `Mesa/Ref: ${String(comanda?.table || "-")}`,
        `Cliente: ${String(comanda?.customer || "-")}`,
        "------------------------------",
        hasDelivery ? `ENTREGA: SIM\nRecebe: ${recipient}\nOnde: ${location}` : "Entrega: No local",
        "------------------------------",
        notesText ? `OBSERVAÇÕES DA COMANDA:\n${notesText}\n------------------------------` : "",
        `ITENS DO PEDIDO:\n${itemsText}`,
        "------------------------------",
        `Gerado em: ${formatDateTime(isoNow())}`,
        "\n"
      ];

      return ticketLines.filter(Boolean).join("\n");
    } else {
      // Client receipt
      const targetItems = (comanda?.items || []).filter((i) => i && !i.canceled && itemCountsForTotal(i));
      const groups = groupComandaItems(targetItems);
      const itemsText = groups
        .map(({ main, addons }) => {
          const unit = parseNumber(main.priceAtSale || 0);
          const qty = parseNumber(main.qty || 0);
          const obs = main.waiterNote ? `  * Obs: ${main.waiterNote}\n` : "";
          const del = main.deliveryRequested ? `  * Para Viagem: ${main.deliveryRecipient} - ${main.deliveryLocation}\n` : "";
          const addonLines = addons.map(addon => {
            const addonUnit = parseNumber(addon.priceAtSale || 0);
            const addonQty = parseNumber(addon.qty || 0);
            return `  + ${addon.name} x${addonQty}  ${money(addonUnit * addonQty)}\n`;
          }).join("");
          return `${String(main.name)} x${qty}  ${money(unit * qty)}\n${addonLines}${obs}${del}`.trim();
        })
        .join("\n") || "Sem itens";

      const receiptLines = [
        `=== CUPOM DO CLIENTE ===`,
        `${ESTABLISHMENT_NAME}`,
        `Mesa: ${String(comanda?.table || "-")}`,
        `Cliente: ${String(comanda?.customer || "-")}`,
        `Atendido por: ${actor.name || "-"}`,
        hasDelivery ? `Entrega para: ${recipient}\nEndereço: ${location}` : "Entrega: No local",
        notesText ? `Observações: ${notesText}` : "",
        "------------------------------",
        itemsText,
        "------------------------------",
        `TOTAL: ${money(comandaTotal(comanda || {}))}`,
        `Pagamento: ${comandaPaymentText(comanda || {}, { includeAmount: true, totalFallback: comandaTotal(comanda || {}) })}`,
        `Conferência de consumo. Obrigado!`,
        `Gerado em: ${formatDateTime(isoNow())}`,
        "\n"
      ];

      return receiptLines.filter(Boolean).join("\n");
    }
  }

  async function printComanda(comandaId, options = {}) {
    const comanda = findAnyComandaForActor(comandaId, currentActor());
    if (!comanda) return;

    const actor = currentActor() || { name: "Garçom", role: "waiter" };
    const isOrderTicket = options.isOrderTicket; // Check if we want the kitchen order ticket

    // Extract delivery details
    const deliveryItem = (comanda.items || []).find((i) => i && i.deliveryRequested && !i.canceled);
    const hasDelivery = !!deliveryItem;
    const recipient = deliveryItem?.deliveryRecipient || "";
    const location = deliveryItem?.deliveryLocation || "";
    const comandaNotes = (comanda.notes || []).map((n) => esc(n)).join(" | ");

    let html = "";
    const paperWidthMm = normalizePrinterPrefs(uiState.printerPrefs).receiptPaperWidthMm;

    let itemsToPrint = [];
    if (isOrderTicket) {
      // REGRA: 'Enviar Pedidos' deve enviar APENAS pedidos da categoria 'Cozinha'
      const kitchenItems = (comanda.items || []).filter((i) => i && !i.canceled && i.category === "Cozinha");
      if (kitchenItems.length === 0) {
        alert("Esta comanda não possui itens da categoria 'Cozinha' para enviar.");
        return;
      }
      itemsToPrint = kitchenItems.filter((i) => !i.kitchenPrinted);
      if (itemsToPrint.length === 0) {
        const reprint = confirm("Todos os itens de Cozinha dessa comanda já foram enviados. Deseja reimprimir o pedido da Cozinha?");
        if (reprint) {
          itemsToPrint = kitchenItems;
        } else {
          return;
        }
      }
    }

    if (isOrderTicket) {
      // 1. KITCHEN / ORDER TICKET (Pedido)
      const groups = groupComandaItems(itemsToPrint);
      const rows = groups
        .map(({ main, addons }) => {
          const qty = parseNumber(main.qty || 0);
          const obs = main.waiterNote ? `<div class="item-obs">-> OBS COZINHA: <b>${esc(main.waiterNote)}</b></div>` : "";
          const del = main.deliveryRequested ? `<div class="item-obs">-> PARA VIAGEM: <b>${esc(main.deliveryRecipient)}</b> @ <b>${esc(main.deliveryLocation)}</b></div>` : "";
          const addonLines = addons.map(addon => `<div style="padding-left: 8px;"><small>+ ${esc(addon.name)} x${parseNumber(addon.qty || 0)}</small></div>`).join("");
          return `
            <tr>
              <td>
                <b>${esc(main.name)}</b>
                ${addonLines}
                ${obs}
                ${del}
              </td>
              <td class="qty-cell"><b>${qty}</b></td>
            </tr>
          `;
        })
        .join("");

      html = `
        <html>
          <head>
            <title>Envio de Pedido ${esc(displayComandaId(comanda.id))}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 1.5mm 1.5mm 1mm; color: #000; background: #fff; }
              @page { size: ${paperWidthMm}mm auto; margin: 0; }
              .receipt { width: min(100%, ${paperWidthMm}mm); margin: 0 auto; padding: 1.5mm 1.5mm 1mm; border: 2px dashed #000; }
              h2, h3, p { margin: 0; }
              h2 { font-size: 14px; text-align: center; font-weight: bold; }
              h3 { font-size: 16px; text-align: center; margin-top: 3px; font-weight: bold; text-transform: uppercase; border: 1px solid #000; padding: 3px; }
              p { margin-top: 2px; font-size: 11px; }
              .delivery-box { border: 1px dashed #000; padding: 4px; margin-top: 4px; font-size: 11px; background: #f9f9f9; }
              table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12px; }
              th, td { border-bottom: 1px dashed #000; padding: 4px 2px; text-align: left; vertical-align: top; }
              th { font-size: 9px; text-transform: uppercase; }
              .qty-cell { text-align: right; font-size: 14px; }
              .item-obs { margin-top: 2px; font-size: 10px; color: #000; padding-left: 4px; }
              .footer { margin-top: 5px; text-align: center; font-size: 9px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <h2>${esc(ESTABLISHMENT_NAME)}</h2>
              <h3>*** ENVIO DE PEDIDO ***</h3>
              <p><b>Mesa/Referência:</b> ${esc(comanda.table || "-")}</p>
              <p><b>Pedido:</b> ${esc(displayComandaId(comanda.id))}</p>
              <p><b>Garçom:</b> ${esc(actor.name || "-")}</p>
              <p><b>Data:</b> ${esc(formatDateTime(isoNow()))}</p>
              
              ${hasDelivery ? `
                <div class="delivery-box">
                  <strong>* PEDIDO PARA ENTREGA *</strong><br>
                  <b>Quem recebe:</b> ${esc(recipient)}<br>
                  <b>Onde recebe:</b> ${esc(location)}
                </div>
              ` : `
                <p><b>Entrega:</b> No local</p>
              `}

              ${comandaNotes ? `
                <div style="border: 1px dashed #000; padding: 4px; margin-top: 4px; font-size: 11px; background: #f9f9f9;">
                  <strong>Observações da Comanda:</strong><br>
                  ${comandaNotes}
                </div>
              ` : ""}

              <table>
                <thead><tr><th>Item</th><th style="text-align: right;">Qtd</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="2">Sem itens</td></tr>`}</tbody>
              </table>
              <div class="footer">Cupom interno de produção e controle.</div>
            </div>
          </body>
        </html>
      `;
    } else {
      // 2. CLIENT RECEIPT (Gerar Nota) - More simplified, clearly marked for client
      const targetItems = (comanda.items || []).filter((i) => i && !i.canceled && itemCountsForTotal(i));
      const groups = groupComandaItems(targetItems);
      const rows = groups
        .map(({ main, addons }) => {
          const qty = parseNumber(main.qty || 0);
          const unit = parseNumber(main.priceAtSale || 0);
          const obs = main.waiterNote ? `<small style="display:block;">Obs: ${esc(main.waiterNote)}</small>` : "";
          const del = main.deliveryRequested ? `<small style="display:block;">Para Viagem: ${esc(main.deliveryRecipient)} - ${esc(main.deliveryLocation)}</small>` : "";
          const addonRows = addons.map(addon => {
            const addonQty = parseNumber(addon.qty || 0);
            const addonUnit = parseNumber(addon.priceAtSale || 0);
            return `
              <tr>
                <td style="padding-left:12px;"><small>+ ${esc(addon.name)}</small></td>
                <td><small>${addonQty}</small></td>
                <td><small>${esc(money(addonUnit))}</small></td>
                <td><small>${money(addonQty * addonUnit)}</small></td>
              </tr>
            `;
          }).join("");
          return `
            <tr>
              <td>
                <b>${esc(main.name)}</b>
                ${obs}
                ${del}
              </td>
              <td>${qty}</td>
              <td>${esc(money(unit))}</td>
              <td><b>${money(qty * unit)}</b></td>
            </tr>
            ${addonRows}
          `;
        })
        .join("");

      html = `
        <html>
          <head>
            <title>Cupom Cliente ${esc(displayComandaId(comanda.id))}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 1.5mm 1.5mm 1mm; color: #000; background: #fff; }
              @page { size: ${paperWidthMm}mm auto; margin: 0; }
              .receipt { width: min(100%, ${paperWidthMm}mm); margin: 0 auto; padding: 1.5mm 1.5mm 1mm; border: 1px solid #ccc; border-radius: 6px; }
              h2, h3, p { margin: 0; }
              h2 { font-size: 15px; text-align: center; }
              h3 { margin-top: 3px; font-size: 14px; text-align: center; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; }
              p { margin-top: 2px; font-size: 11px; }
              .delivery-info { margin-top: 3px; padding: 3px; border: 1px solid #eee; font-size: 11px; }
              table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
              th, td { border-bottom: 1px solid #eee; padding: 4px 2px; text-align: left; vertical-align: top; }
              th { font-size: 9px; text-transform: uppercase; font-weight: bold; }
              td:nth-child(2), td:nth-child(3), td:nth-child(4), th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
              .total { margin-top: 5px; padding: 4px; border-radius: 4px; background: #f4f4f5; font-size: 14px; text-align: center; font-weight: bold; }
              .center { text-align: center; }
              .footer-msg { margin-top: 5px; text-align: center; font-size: 10px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <h2>${esc(ESTABLISHMENT_NAME)}</h2>
              <h3>CUPOM DO CLIENTE</h3>
              <p><b>Conta:</b> ${esc(displayComandaId(comanda.id))}</p>
              <p><b>Mesa/Referência:</b> ${esc(comanda.table || "-")}</p>
              <p><b>Atendido por:</b> ${esc(actor.name || "-")}</p>
              <p><b>Abertura:</b> ${esc(formatDateTime(comanda.createdAt))}</p>
              
              ${hasDelivery ? `
                <div class="delivery-info">
                  <strong>* Entrega Solicitada *</strong><br>
                  <b>Cliente:</b> ${esc(recipient)}<br>
                  <b>Endereço:</b> ${esc(location)}
                </div>
              ` : `
                <p><b>Cliente:</b> ${esc(comanda.customer || "-")}</p>
                <p><b>Entrega:</b> No local</p>
              `}

              ${comandaNotes ? `
                <div class="delivery-info">
                  <strong>Observações:</strong><br>
                  ${comandaNotes}
                </div>
              ` : ""}

              <table>
                <thead><tr><th>Item</th><th>Qtd</th><th>Un.</th><th>Total</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="4">Sem itens</td></tr>`}</tbody>
              </table>
              <div class="total">Valor Total: ${money(comandaTotal(comanda))}</div>
              <p><b>Forma de Pagamento:</b> ${esc(comandaPaymentText(comanda, { includeAmount: true, totalFallback: comandaTotal(comanda) }))}</p>
              <div class="footer-msg">Obrigado pela preferência! Volte sempre!</div>
              <p class="center" style="font-size: 8px; margin-top: 5px; color: #666;">Documento sem valor fiscal para conferência de consumo.</p>
            </div>
          </body>
        </html>
      `;
    }

    const receiptText = buildComandaReceiptText(comanda, { isOrderTicket, itemsToPrint });

    if (isAndroidDevice()) {
      imprimirCupomIntent(receiptText);
      if (isOrderTicket) {
        let markedAny = false;
        for (const item of itemsToPrint) {
          if (!item.kitchenPrinted) {
            item.kitchenPrinted = true;
            markedAny = true;
          }
        }
        if (markedAny) {
          saveState();
          render();
        }
      }
      return true;
    }

    if (uiState.printerPrefs?.receiptDirectEnabled) {
      try {
        await printReceiptViaQz(html, comanda.id);
      } catch (err) {
        const message = `Falha ao imprimir o pedido: ${String(err?.message || err)}\n\nConfira a MTP-II e o QZ Tray nesta maquina.`;
        if (!options.silent) alert(message);
        else console.warn(message);
      }
      if (isOrderTicket) {
        let markedAny = false;
        for (const item of itemsToPrint) {
          if (!item.kitchenPrinted) {
            item.kitchenPrinted = true;
            markedAny = true;
          }
        }
        if (markedAny) {
          saveState();
          render();
        }
      }
      return true;
    }
    if (options.silent) return;
    openReceiptPopup(html, "Permita pop-up para abrir o pedido.", "width=430,height=820", {
      previewTitle: `Pedido ${displayComandaId(comanda.id)}`,
      previewSubtitle: "Nota de consumo para conferencia do cliente"
    });
    if (isOrderTicket) {
      let markedAny = false;
      for (const item of itemsToPrint) {
        if (!item.kitchenPrinted) {
          item.kitchenPrinted = true;
          markedAny = true;
        }
      }
      if (markedAny) {
        saveState();
        render();
      }
    }
    return true;
  }

  function closeCash(form) {
    const actor = currentActor();
    const loginValue = form.login.value.trim();
    const password = form.password.value;
    const secondAuth = validateAdminCredentials(loginValue, password);
    // #region debug-point A:close-cash-entry
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "close-cashier-error", runId: "pre-fix", hypothesisId: "A", location: "app.js:closeCash:entry", msg: "[DEBUG] closeCash entry", data: { actorId: actor?.id ?? null, actorRole: actor?.role || "", cashId: state.cash?.id || "", hasLogin: Boolean(form?.login), hasPassword: Boolean(form?.password), openComandas: Array.isArray(state.openComandas) ? state.openComandas.length : -1, closedComandas: Array.isArray(state.closedComandas) ? state.closedComandas.length : -1 }, ts: Date.now() }) }).catch(() => { });
    // #endregion

    if (!secondAuth) {
      alert("Segunda autenticacao invalida.");
      return;
    }

    sanitizeOperationalComandasAgainstHistory(state);
    synchronizeCashOpenedAt(state);

    const pendingOpen = [...state.openComandas].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    if (pendingOpen.length) {
      const preview = pendingOpen
        .slice(0, 8)
        .map((comanda) => `${comanda.id} (${comanda.table || "-"})`)
        .join(" | ");
      alert(
        `Nao e possivel fechar o caixa com comandas abertas.\n\n` +
        `Comandas pendentes: ${pendingOpen.length}\n` +
        `${preview ? `Ex.: ${preview}${pendingOpen.length > 8 ? " ..." : ""}\n\n` : ""}` +
        "Finalize todas as comandas e tente novamente."
      );
      return;
    }

    const closedAt = isoNow();
    const closureDraft = buildCashClosureDraft(closedAt);
    const openedAt = earliestComandaCreatedAtIso(closureDraft.commandas) || state.cash.openedAt || "";
    const confirmText =
      `Confirmar fechamento do caixa ${state.cash.id}?\n` +
      `Aberto em: ${formatCashOpenedAtLabel(openedAt)}\n` +
      `Fechamento em: ${formatDateTimeWithDay(closedAt)}\n\n` +
      "Comandas do dia serao movidas para historico e dados operacionais limpos.";
    if (!confirm(confirmText)) {
      return;
    }
    const allDayComandas = closureDraft.commandas;
    const closure = {
      id: `HIST-${Date.now()}`,
      cashId: state.cash.id,
      openedAt,
      closedAt,
      commandas: allDayComandas,
      auditLog: [
        {
          id: `EV-${state.seq.event++}`,
          ts: closedAt,
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          type: "caixa_fechado",
          detail: `Caixa ${state.cash.id} fechado com segunda autenticacao. Aberto em ${formatCashOpenedAtLabel(openedAt)} e fechado em ${formatDateTimeWithDay(closedAt)}.`,
          comandaId: null,
          itemId: null,
          reason: ""
        },
        ...state.auditLog
      ],
      summary: closureDraft.summary
    };
    const reportOptions = {
      printedBy: actor,
      title: `Fechamento detalhado do caixa ${closure.cashId} | Dia ${formatDateOnlySafe(String(closure.openedAt || closedAt).slice(0, 10))}`,
      subtitle: "Historico detalhado do dia apos fechamento"
    };
    // #region debug-point B:close-cash-before-html
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "close-cashier-error", runId: "pre-fix", hypothesisId: "B", location: "app.js:closeCash:before-buildCashHistoryPrintHtml", msg: "[DEBUG] closeCash before buildCashHistoryPrintHtml", data: { closureId: closure.id, cashId: closure.cashId, openedAt, closedAt, commandasCount: Array.isArray(allDayComandas) ? allDayComandas.length : -1, typeofPageSize: typeof pageSize, typeofPaperWidthMm: typeof paperWidthMm }, ts: Date.now() }) }).catch(() => { });
    // #endregion
    const closureHtml = buildCashHistoryExtendedHtml(closure, reportOptions);
    const archivedHtmlReport = createCashHtmlReportRecord(closure, actor, closureHtml, reportOptions);
    const internalCashAudit = buildInternalCashAuditRecord({
      closure,
      actor,
      html: closureHtml,
      auditSnapshot: closure.auditLog
    });

    state.history90.unshift(closure);
    pruneHistory(state);
    state.cashHtmlReports = [archivedHtmlReport, ...(state.cashHtmlReports || [])];
    pruneCashHtmlReports(state);
    state.internalCashAudits = [internalCashAudit, ...(state.internalCashAudits || [])];
    pruneInternalCashAudits(state);

    state.openComandas = [];
    state.closedComandas = [];
    state.cookHistory = [];
    state.auditLog = [];
    uiState.remoteMonitorEvents = [];
    state.meta = state.meta || {};
    state.meta.realtimeAuditResetAt = closedAt;
    state.cash = {
      id: `CX-${state.seq.cash++}`,
      openedAt: "",
      date: todayISO(),
      updatedAt: isoNow()
    };

    saveState({
      actor,
      reason: "fechamento_caixa",
      cloudDelayMs: 0
    });
    openCashHtmlReportRecord(archivedHtmlReport, {
      previewTitle: reportOptions.title,
      previewSubtitle: `${reportOptions.subtitle} | Arquivo ${archivedHtmlReport.id}`
    });
    alert(`Caixa fechado com sucesso.\nAbertura: ${formatCashOpenedAtLabel(openedAt)}\nFechamento: ${formatDateTimeWithDay(closedAt)}\nHistorico operacional mantido por 90 dias.\nHTML detalhado disponivel para consulta por 30 dias.`);
    render();
  }

  function validateAdminCredentials(loginValue, password) {
    const user = findUserByLoginPassword(loginValue, password);
    if (!user || !user.active || !isAdminOrDev(user)) return null;
    return user;
  }

  function saveFinanceInventory(form) {
    const actor = currentActor();
    const loginValue = form.adminLogin.value.trim();
    const password = form.adminPassword.value;
    if (!validateAdminCredentials(loginValue, password)) {
      alert("Validacao do administrador invalida. Alteracoes nao salvas.");
      return;
    }

    const errors = [];
    for (const p of state.products) {
      const newPrice = parseNumber(form[`price-${p.id}`]?.value);
      const newStock = Number(form[`stock-${p.id}`]?.value);
      const newCost = parseNumber(form[`cost-${p.id}`]?.value);

      if (!(newPrice > 0)) errors.push(`${p.name}: preco deve ser maior que zero.`);
      if (!Number.isInteger(newStock) || newStock < 0) errors.push(`${p.name}: estoque deve ser inteiro >= 0.`);
      if (newCost < 0) errors.push(`${p.name}: custo deve ser >= 0.`);
    }

    if (errors.length) {
      alert(`Corrija os campos antes de salvar:\n- ${errors.slice(0, 10).join("\n- ")}`);
      return;
    }

    for (const p of state.products) {
      p.price = parseNumber(form[`price-${p.id}`]?.value);
      p.stock = Number(form[`stock-${p.id}`]?.value);
      p.cost = parseNumber(form[`cost-${p.id}`]?.value);
      p.updatedAt = isoNow();
    }

    appendAudit({ actor, type: "finance_inventory_update", detail: "Preco, estoque e custo atualizados na area de financas." });
    saveState();
    render();
  }

  function reportUiRuntimeError(context, err) {
    console.error(`[ui:${context}]`, err);
    // #region debug-point D:ui-runtime-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "close-cashier-error", runId: "pre-fix", hypothesisId: "D", location: "app.js:reportUiRuntimeError", msg: `[DEBUG] ui runtime error in ${context}`, data: { context, name: err?.name || "", message: err?.message || String(err || ""), stack: String(err?.stack || "").split("\n").slice(0, 6).join(" | ") }, ts: Date.now() }) }).catch(() => { });
    // #endregion
    alert("Ocorreu um erro ao processar a acao. A tela foi recarregada.");
  }

  app.addEventListener("click", async (event) => {
    try {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;

      if (action === "logout") {
        logout();
        return;
      }

      if (action === "install-pwa") {
        if (uiState.deferredPrompt) {
          uiState.deferredPrompt.prompt();
          await uiState.deferredPrompt.userChoice;
          uiState.deferredPrompt = null;
          render();
        }
        return;
      }

      if (action === "set-tab") {
        const role = button.dataset.role;
        const tab = button.dataset.tab;
        if (role === "admin") uiState.adminTab = tab;
        if (role === "dev") uiState.devTab = tab;
        if (role === "waiter") uiState.waiterTab = tab;
        if (role === "cook") uiState.cookTab = tab;
        render();
        return;
      }

      if (action === "close-waiter-ready-modal") {
        uiState.waiterReadyModalItems = [];
        render();
        return;
      }

      if (action === "waiter-ready-go-open") {
        uiState.waiterTab = "abertas";
        uiState.waiterReadyModalItems = [];
        render();
        return;
      }

      if (action === "dismiss-kitchen-receipt-notice") {
        uiState.waiterKitchenReceiptNotices = (uiState.waiterKitchenReceiptNotices || []).slice(1);
        render();
        return;
      }

      if (action === "clear-kitchen-receipt-notices") {
        uiState.waiterKitchenReceiptNotices = [];
        render();
        return;
      }

      if (action === "open-comanda-on-create") {
        const comandaId = button.dataset.comandaId;
        if (comandaId) {
          uiState.waiterActiveComandaId = comandaId;
          uiState.waiterTab = "abrir";
        }
        render();
        return;
      }

      if (action === "minimize-open-comanda") {
        minimizeOpenComanda(button.dataset.comandaId);
        return;
      }

      if (action === "open-item-selector") {
        openComandaItemSelector(button.dataset.comandaId, button.dataset.mode || "increment");
        return;
      }

      if (action === "close-item-selector") {
        closeComandaItemSelector();
        return;
      }

      if (action === "close-delete-comanda-auth") {
        closeDeleteComandaAuthModal();
        return;
      }

      if (action === "edit-product") {
        editProduct(Number(button.dataset.id));
        return;
      }

      if (action === "toggle-product-availability") {
        toggleProductAvailability(Number(button.dataset.id));
        return;
      }

      if (action === "delete-product") {
        deleteProduct(Number(button.dataset.id));
        return;
      }

      if (action === "dev-bulk-delete") {
        const target = button.dataset.target;
        const actor = currentActor();
        if (actor?.role !== "dev") {
          alert("Apenas dev pode fazer exclusao em massa.");
          return;
        }
        if (!confirm(`Tem certeza que deseja apagar "${target}"? Isso inclui o Supabase!`)) {
          return;
        }
        performDevBulkDelete(target, actor);
        return;
      }

      if (action === "dev-delete-waiter") {
        const actor = currentActor();
        if (actor?.role !== "dev") {
          alert("Apenas dev pode excluir garcons.");
          return;
        }
        deleteEmployee(Number(button.dataset.userId));
        return;
      }

      if (action === "edit-employee") {
        editEmployee(Number(button.dataset.id));
        return;
      }

      if (action === "delete-employee") {
        deleteEmployee(Number(button.dataset.id));
        return;
      }

      if (action === "print-cash-day-history") {
        printCurrentCashHistoryReport();
        return;
      }

      if (action === "print-cash-day-history-extended") {
        printCurrentCashHistoryReportExtended();
        return;
      }

      if (action === "print-cash-closure") {
        printStoredCashClosure(button.dataset.id);
        return;
      }

      if (action === "print-cash-closure-extended") {
        printStoredCashClosureExtended(button.dataset.id);
        return;
      }

      if (action === "open-cash-html-report") {
        openStoredCashHtmlReport(button.dataset.id);
        return;
      }

      if (action === "close-cash-html-report-viewer") {
        closeStoredCashHtmlReportViewer();
        return;
      }

      if (action === "print-cash-html-report-compact") {
        await printStoredCashHtmlReportCompact(button.dataset.id);
        return;
      }

      if (action === "receive-payable") {
        receivePayable(button.dataset.id);
        return;
      }

      if (action === "reduce-payable-value") {
        reducePendingPayableValueFromComanda(button.dataset.comandaId);
        return;
      }

      if (action === "payable-increase-manual") {
        adjustPayableByManualValue(button.dataset.id, "increase");
        return;
      }

      if (action === "payable-decrease-manual") {
        adjustPayableByManualValue(button.dataset.id, "decrease");
        return;
      }

      if (action === "save-kitchen-printer-config") {
        saveKitchenPrinterConfigFromUi();
        return;
      }

      if (action === "save-receipt-printer-config") {
        saveReceiptPrinterConfigFromUi();
        return;
      }

      if (action === "print-receipt-test") {
        await printReceiptTest();
        return;
      }

      if (action === "deliver-item") {
        deliverItem(button.dataset.comandaId, button.dataset.itemId);
        return;
      }

      if (action === "cook-status") {
        setKitchenItemStatus(button.dataset.comandaId, button.dataset.itemId, button.dataset.status);
        return;
      }

      if (action === "toggle-kitchen-row-collapse") {
        toggleAdminKitchenRowCollapse(button.dataset.comandaId, button.dataset.itemId);
        return;
      }

      if (action === "kitchen-priority") {
        setKitchenItemPriority(button.dataset.comandaId, button.dataset.itemId, button.dataset.priority);
        return;
      }

      if (action === "increment-item") {
        incrementItem(button.dataset.comandaId, button.dataset.itemId);
        return;
      }

      if (action === "cancel-item") {
        cancelItem(button.dataset.comandaId, button.dataset.itemId);
        return;
      }

      if (action === "queue-draft-item") {
        const form = button.closest('form[data-role="add-item-form"]');
        if (!form) return;
        queueComandaDraftItem(form);
        return;
      }

      if (action === "remove-draft-item") {
        removeComandaDraftItem(button.dataset.comandaId, Number(button.dataset.index));
        return;
      }

      if (action === "add-comanda-note") {
        addComandaNote(button.dataset.comandaId);
        return;
      }

      if (action === "toggle-comanda-collapse") {
        toggleWaiterComandaCollapse(button.dataset.comandaId);
        return;
      }

      if (action === "resolve-kitchen-indicator") {
        resolveComandaKitchenIndicator(button.dataset.comandaId, button.dataset.mode || "entendi");
        return;
      }

      if (action === "toggle-finalize") {
        toggleFinalize(button.dataset.comandaId);
        return;
      }

      if (action === "add-payment-split") {
        const comandaId = button.dataset.comandaId;
        const comanda = findOpenComanda(comandaId);
        const total = comanda ? comandaTotal(comanda) : 0;
        const form = button.closest('form[data-role="finalize-form"]');
        if (form) syncSplitsFromForm(form, comandaId);

        const splits = getComandaPaymentSplits(comandaId, total);
        const currentPaid = splits.reduce((sum, s) => sum + parseNumber(s.amount || 0), 0);
        const diff = Math.max(0, Math.round((total - currentPaid) * 100) / 100);
        const usedMethods = new Set(splits.map((s) => s.method));
        const nextMethod = PAYMENT_METHODS.find((m) => !usedMethods.has(m.value))?.value || "maquineta_debito";

        splits.push({ method: nextMethod, amount: diff.toFixed(2) });
        render();
        const updatedForm = document.querySelector(`form[data-role="finalize-form"][data-comanda-id="${comandaId}"]`);
        if (updatedForm) updateFinalizePaymentUi(updatedForm);
        return;
      }

      if (action === "remove-payment-split") {
        const comandaId = button.dataset.comandaId;
        const index = parseInt(button.dataset.index, 10);
        const form = button.closest('form[data-role="finalize-form"]');
        if (form) syncSplitsFromForm(form, comandaId);

        const splits = getComandaPaymentSplits(comandaId);
        if (splits.length > 1 && !isNaN(index)) {
          splits.splice(index, 1);
          render();
          const updatedForm = document.querySelector(`form[data-role="finalize-form"][data-comanda-id="${comandaId}"]`);
          if (updatedForm) updateFinalizePaymentUi(updatedForm);
        }
        return;
      }

      if (action === "auto-balance-payment") {
        const comandaId = button.dataset.comandaId;
        const comanda = findOpenComanda(comandaId);
        const total = comanda ? comandaTotal(comanda) : 0;
        const form = button.closest('form[data-role="finalize-form"]');
        if (form) syncSplitsFromForm(form, comandaId);

        const splits = getComandaPaymentSplits(comandaId, total);
        if (splits.length > 0) {
          const otherPaid = splits.slice(0, -1).reduce((sum, s) => sum + parseNumber(s.amount || 0), 0);
          const balance = Math.max(0, Math.round((total - otherPaid) * 100) / 100);
          splits[splits.length - 1].amount = balance.toFixed(2);
          render();
          const updatedForm = document.querySelector(`form[data-role="finalize-form"][data-comanda-id="${comandaId}"]`);
          if (updatedForm) updateFinalizePaymentUi(updatedForm);
        }
        return;
      }

      if (action === "print-comanda") {
        await printComanda(button.dataset.comandaId);
        return;
      }

      if (action === "print-order-ticket") {
        await printComanda(button.dataset.comandaId, { isOrderTicket: true });
        return;
      }

      if (action === "print-client-receipt") {
        await printComanda(button.dataset.comandaId, { isClientReceipt: true });
        return;
      }

      if (action === "delete-comanda") {
        requestDeleteComanda(button.dataset.comandaId);
        return;
      }

      if (action === "admin-edit-comanda") {
        adminEditComanda(button.dataset.comandaId);
        return;
      }

      if (action === "admin-add-comanda-item") {
        adminAddComandaItem(button.dataset.comandaId);
        return;
      }

      if (action === "admin-edit-comanda-item") {
        adminEditComandaItem(button.dataset.comandaId, button.dataset.itemId);
        return;
      }

      if (action === "admin-remove-comanda-item") {
        adminRemoveComandaItem(button.dataset.comandaId, button.dataset.itemId);
        return;
      }

      if (action === "open-comanda-edit-flow") {
        if (openComandaEditFlow(button.dataset.comandaId)) {
          render();
        }
        return;
      }

      if (action === "open-comanda-details") {
        uiState.adminInlineEditComandaId = null;
        uiState.comandaDetailsId = button.dataset.comandaId;
        render();
        return;
      }

      if (action === "close-comanda-inline-edit") {
        uiState.adminInlineEditComandaId = null;
        render();
        return;
      }

      if (action === "close-comanda-details") {
        uiState.adminInlineEditComandaId = null;
        uiState.comandaDetailsId = null;
        render();
        return;
      }
    } catch (err) {
      reportUiRuntimeError("click", err);
      render();
    }
  });

  app.addEventListener("submit", (event) => {
    try {
      event.preventDefault();

      const form = event.target;

      if (form.id === "login-form") {
        const rememberLogin = event.submitter?.dataset?.rememberLogin === "true";
        login(form.login.value.trim(), form.password.value, rememberLogin);
        return;
      }

      if (form.id === "add-product-form") {
        createProduct(form);
        return;
      }

      if (form.id === "add-employee-form") {
        createEmployee(form);
        return;
      }

      if (form.id === "admin-self-credentials-form") {
        updateOwnAdminCredentials(form);
        return;
      }

      if (form.id === "finance-inventory-form") {
        saveFinanceInventory(form);
        return;
      }

      if (form.id === "create-comanda-form") {
        createComanda(form);
        return;
      }

      if (form.id === "quick-sale-form") {
        createQuickSale(form);
        return;
      }

      if (form.matches('form[data-role="item-selector-form"]')) {
        submitComandaItemSelector(form);
        return;
      }

      if (form.matches('form[data-role="add-item-form"]')) {
        addItemToComanda(form);
        return;
      }

      if (form.matches('form[data-role="fiado-add-item-form"]')) {
        addItemToPendingFiadoComanda(form);
        return;
      }

      if (form.matches('form[data-role="finalize-form"]')) {
        finalizeComanda(form);
        return;
      }

      if (form.id === "close-cash-form") {
        closeCash(form);
        return;
      }

      if (form.id === "delete-comanda-auth-form") {
        submitDeleteComandaAuth(form);
      }

      if (form.id === "dev-change-admin-creds-form") {
        const actor = currentActor();
        if (actor?.role !== "dev") {
          alert("Apenas dev pode alterar credenciais.");
          return;
        }
        performDevChangeAdminCreds(form, actor);
        return;
      }

      if (form.matches('form[data-action="dev-change-waiter-login"]')) {
        const actor = currentActor();
        if (actor?.role !== "dev") {
          alert("Apenas dev pode alterar credenciais.");
          return;
        }
        performDevChangeWaiterLogin(form, actor);
        return;
      }

      if (form.matches('form[data-action="dev-change-waiter-password"]')) {
        const actor = currentActor();
        if (actor?.role !== "dev") {
          alert("Apenas dev pode alterar credenciais.");
          return;
        }
        performDevChangeWaiterPassword(form, actor);
        return;
      }
    } catch (err) {
      reportUiRuntimeError("submit", err);
      render();
    }
  });

  app.addEventListener("change", (event) => {
    try {
      const target = event.target;

      if (target.matches('[data-role="item-category"], [data-role="item-subcategory"]')) {
        const form = target.closest('form[data-role="add-item-form"], form[data-role="fiado-add-item-form"]');
        if (!form) return;
        refreshComandaProductSelect(form, { resetSearch: true });
        return;
      }

      if (target.matches('[data-role="item-product"]') || target.name === "qty") {
        const form = target.closest('form[data-role="add-item-form"], form[data-role="fiado-add-item-form"]');
        if (form) {
          updateKitchenEstimate(form);
          if (target.matches('[data-role="item-product"]')) {
            updateDeliveryFields(form);
            updateLancheAddonLink(form);
            updateLancheAddonProducts(form);
          }
        }
        return;
      }

      if (target.matches('[data-role="delivery-check"], [data-role="customize-item-check"], [data-role="item-has-note-check"], [data-role="item-is-delivery-check"]')) {
        const form = target.closest('form[data-role="add-item-form"], form[data-role="fiado-add-item-form"]');
        if (form) updateDeliveryFields(form);
        return;
      }

      if (target.matches('[data-role="quick-category"]')) {
        const form = target.closest('form[data-role="quick-sale-form"]');
        if (form) {
          fillQuickSaleProductSelect(form);
          updateQuickSaleFlow(form);
        }
        return;
      }

      if (target.matches('[data-role="quick-product"]')) {
        const form = target.closest('form[data-role="quick-sale-form"]');
        if (form) updateQuickSaleFlow(form);
        return;
      }

      if (target.matches('[data-role="quick-delivery-check"]')) {
        const form = target.closest('form[data-role="quick-sale-form"]');
        if (form) updateQuickSaleFlow(form);
        return;
      }

      if (target.name === "paidConfirm" && target.closest('form[data-role="quick-sale-form"]')) {
        uiState.quickSalePaidConfirm = Boolean(target.checked);
        return;
      }

      if (target.matches('[data-role="payment-method"]')) {
        toggleFinalizeView(target);
        return;
      }

      if (target.name === "category" && target.closest("#add-product-form")) {
        updateAdminProductSubmenu(target.closest("#add-product-form"));
        return;
      }

      if (target.matches('[data-role="monitor-filter"]')) {
        uiState.monitorWaiterId = target.value || "all";
        render();
        return;
      }

      if (target.matches('[data-role="kitchen-direct-enabled"]')) {
        setKitchenDirectPrintEnabled(Boolean(target.checked));
        return;
      }

      if (target.matches('[data-role="waiter-search"]')) {
        uiState.waiterComandaSearch = target.value || "";
        render();
        return;
      }

      if (target.matches('[data-role="waiter-catalog-search"]')) {
        uiState.waiterCatalogSearch = target.value || "";
        render();
        return;
      }

      if (target.matches('[data-role="waiter-catalog-category"]')) {
        uiState.waiterCatalogCategory = target.value || "all";
        render();
        return;
      }

      if (target.matches('[data-role="admin-search"]')) {
        uiState.adminComandaSearch = target.value || "";
        render();
        return;
      }

      if (target.matches('[data-role="admin-history-comanda-search"]')) {
        uiState.adminHistoryComandaSearch = target.value || "";
        render();
        return;
      }

      if (target.matches('[data-role="admin-kitchen-search"]')) {
        uiState.adminKitchenSearch = target.value || "";
        render();
        return;
      }

      if (target.matches('[data-role="cook-search"]')) {
        uiState.cookSearch = target.value || "";
        render();
        return;
      }
    } catch (err) {
      reportUiRuntimeError("change", err);
      render();
    }
  });

  app.addEventListener("input", (event) => {
    try {
      const target = event.target;
      if (target.closest("#delete-comanda-auth-form")) {
        const form = target.closest("#delete-comanda-auth-form");
        syncDeleteComandaAuthDraftFromForm(form);
        return;
      }
      if (target.matches('[data-role="payment-amount"]')) {
        const form = target.closest('form[data-role="finalize-form"]');
        if (form) updateFinalizePaymentUi(form);
        return;
      }
      if (target.matches('[data-role="item-product-search"]')) {
        const form = target.closest('form[data-role="add-item-form"], form[data-role="fiado-add-item-form"]');
        if (form) refreshComandaProductSelect(form);
        return;
      }
      if (target.matches('[data-role="waiter-catalog-search"]')) {
        uiState.waiterCatalogSearch = target.value || "";
        render();
        return;
      }
      if (target.matches('[data-role="admin-kitchen-search"]')) {
        uiState.adminKitchenSearch = target.value || "";
        render();
        return;
      }
      if (target.matches('[data-role="admin-history-comanda-search"]')) {
        uiState.adminHistoryComandaSearch = target.value || "";
        render();
        return;
      }
      if (target.matches('[data-role="cook-search"]')) {
        uiState.cookSearch = target.value || "";
        render();
      }
    } catch (err) {
      reportUiRuntimeError("input", err);
      render();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === PRINTER_PREFS_KEY) {
      uiState.printerPrefs = loadPrinterPrefs();
      render();
      return;
    }
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const incoming = JSON.parse(event.newValue);
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return;
      }
      const localUpdated = parseUpdatedAtTimestamp(state.meta?.updatedAt);
      const incomingUpdated = parseUpdatedAtTimestamp(incoming?.meta?.updatedAt);
      if (localUpdated > 0 && incomingUpdated <= 0) {
        return;
      }
      if (incomingUpdated && localUpdated && incomingUpdated < localUpdated) {
        return;
      }
      adoptIncomingState(incoming);
      render();
    } catch (_err) { }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    uiState.deferredPrompt = event;
    render();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => { });
    });
  }

  setInterval(() => {
    // Só re-renderiza se o estado realmente mudou (evita disrupcao no garcom/celular)
    if (stateVersion === lastRenderedVersion) return;
    lastRenderedVersion = stateVersion;
    const user = getCurrentUser();
    if (user?.role === "waiter" && uiState.waiterTab === "cozinha") {
      render();
    }
    if (user?.role === "cook" && uiState.cookTab === "ativos") {
      render();
    }
    if (
      user?.role === "admin" &&
      (uiState.adminTab === "monitor" ||
        uiState.adminTab === "dashboard" ||
        uiState.adminTab === "arquivos_html" ||
        (uiState.adminTab === "comandas" && uiState.waiterTab === "cozinha"))
    ) {
      render();
    }
    if (user?.role === "dev" && (uiState.devTab === "monitor" || uiState.devTab === "devices" || uiState.devTab === "dashboard")) {
      render();
    }
  }, 5000);

  setInterval(() => {
    broadcastPresencePing();
  }, DEVICE_PRESENCE_PING_MS);

  setInterval(() => {
    if (document.visibilityState === "hidden") return;
    void pollSupabaseRemoteMetadata();
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
  }

  broadcastPresencePing();
  void connectSupabase();
  render();
})();
