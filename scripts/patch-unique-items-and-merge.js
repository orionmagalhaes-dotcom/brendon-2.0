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

// 1. Add generateUniqueItemId right after generateUniqueComandaId
const targetGenComanda = toFileEol(`  function generateUniqueComandaId(targetState) {
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
      const candidate = \`CMD-\${String(seqNumber).padStart(4, "0")}-\${sessionChunk}\${timeChunk}\${randomChunk}\`;
      if (reservedIds.has(candidate)) continue;
      return candidate;
    }
    return "";
  }`);

const replaceGenComanda = toFileEol(`  function generateUniqueComandaId(targetState) {
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
      const candidate = \`CMD-\${String(seqNumber).padStart(4, "0")}-\${sessionChunk}\${timeChunk}\${randomChunk}\`;
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
    return \`IT-\${String(seq).padStart(5, "0")}-\${sessionChunk}\${timeChunk}\${randomChunk}\`;
  }`);

if (content.includes(targetGenComanda)) {
  content = content.replace(targetGenComanda, replaceGenComanda);
  console.log("1. generateUniqueItemId adicionada com sucesso!");
} else {
  console.warn("1. targetGenComanda nao encontrado!");
}

// 2. Replace all instances of `IT-${String(state.seq.item++).padStart(5, "0")}` with generateUniqueItemId(state)
const targetItemIdExpr = toFileEol(`\`IT-\${String(state.seq.item++).padStart(5, "0")}\``);
if (content.includes(targetItemIdExpr)) {
  content = content.split(targetItemIdExpr).join(`generateUniqueItemId(state)`);
  console.log("2. Geracao de IDs de itens atualizada para usar generateUniqueItemId!");
} else {
  console.warn("2. targetItemIdExpr nao encontrado!");
}

// 3. Update mergeComandasById to preserve items even if one side had 0 items
const targetItemLevelMerge = toFileEol(`      // Item-level merge: preserva itens de ambos os lados para evitar sumico
      if (previous && comanda && merged) {
        const prevItems = Array.isArray(previous.items) ? previous.items : [];
        const remoteItems = Array.isArray(comanda.items) ? comanda.items : [];
        if (prevItems.length > 0 && remoteItems.length > 0) {
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
      }`);

const replaceItemLevelMerge = toFileEol(`      // Item-level merge: preserva itens de ambos os lados para evitar sumico
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
      }`);

if (content.includes(targetItemLevelMerge)) {
  content = content.replace(targetItemLevelMerge, replaceItemLevelMerge);
  console.log("3. mergeComandasById atualizado com merge seguro de itens!");
} else {
  console.warn("3. targetItemLevelMerge nao encontrado!");
}

fs.writeFileSync(appJsPath, content, "utf8");
console.log("Patch de concorrencia e itens unicos aplicado com sucesso!");
