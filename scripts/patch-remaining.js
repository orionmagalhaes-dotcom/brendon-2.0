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

// 1. Insert localBroadcastChannel declaration
const target1 = toFileEol(`  const clientSessionId = buildClientSessionId();`);
const replace1 = toFileEol(`  const clientSessionId = buildClientSessionId();
  const LOCAL_BROADCAST_CHANNEL_NAME = "restobar_local_sync";
  let localBroadcastChannel = null;
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      localBroadcastChannel = new BroadcastChannel(LOCAL_BROADCAST_CHANNEL_NAME);
    }
  } catch (_e) { }`);

if (content.includes(target1)) {
  content = content.replace(target1, replace1);
  console.log("1. localBroadcastChannel declarado com sucesso!");
} else {
  console.error("1. target1 nao encontrado!");
}

// 2. Insert visibilitychange and online listeners
const target2 = toFileEol(`  setInterval(() => {
    if (document.visibilityState === "hidden") return;
    void pollSupabaseRemoteMetadata();
  }, CLOUD_POLL_INTERVAL_MS);`);

const replace2 = toFileEol(`  setInterval(() => {
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
  }`);

if (content.includes(target2)) {
  content = content.replace(target2, replace2);
  console.log("2. Listeners de visibility e conexao adicionados!");
} else {
  console.error("2. target2 nao encontrado!");
}

fs.writeFileSync(appJsPath, content, "utf8");
console.log("Patch concluido!");
