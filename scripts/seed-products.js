"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");

if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wgresekhrdwlxlmftuvs.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

const productsPath = path.join(__dirname, "products-data.json");
const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

console.log(`Carregados ${products.length} produtos para seed.`);

async function seed() {
  if (!SUPABASE_KEY) {
    console.error("Defina SUPABASE_SECRET_KEY ou SUPABASE_ANON_KEY no .env");
    return;
  }

  console.log(`Buscando registro 'main' no Supabase (${SUPABASE_URL})...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/restobar_state?id=eq.main&select=id,payload,updated_at`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    console.error(`Erro ao consultar Supabase: ${res.status} ${res.statusText}`, await res.text());
    console.log("Nota: Se a tabela restobar_state ainda nao foi criada, execute o SQL em supabase/schema.sql primeiro.");
    return;
  }

  const rows = await res.json();
  const now = new Date().toISOString();

  if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload) {
    const currentPayload = rows[0].payload;
    currentPayload.products = products.map(p => ({
      ...p,
      updatedAt: now
    }));
    currentPayload.seq = currentPayload.seq || {};
    currentPayload.seq.product = Math.max(Number(currentPayload.seq.product || 0), 99);
    currentPayload.meta = currentPayload.meta || {};
    currentPayload.meta.updatedAt = now;

    console.log("Atualizando produtos no estado existente...");
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/restobar_state?id=eq.main`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        payload: currentPayload,
        updated_at: now
      })
    });

    if (updateRes.ok) {
      console.log("Produtos atualizados com sucesso no Supabase!");
    } else {
      console.error("Falha ao atualizar produtos no Supabase:", await updateRes.text());
    }
  } else {
    console.log("Criando novo registro 'main' com os produtos...");
    const initialPayload = {
      users: [
        { id: 1, role: "admin", name: "Administrador", functionName: "Administrador", login: "admin", password: "admin", active: true, updatedAt: now }
      ],
      products: products,
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
        date: now.slice(0, 10),
        updatedAt: now
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
        updatedAt: now,
        lastCloudSyncAt: null,
        deletedProductIds: [],
        deletedUserIds: [],
        deletedComandaIds: []
      },
      session: {
        userId: null
      }
    };

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/restobar_state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        id: "main",
        payload: initialPayload,
        updated_at: now
      })
    });

    if (insertRes.ok) {
      console.log("Registro 'main' com 92 produtos inserido com sucesso no Supabase!");
    } else {
      console.error("Falha ao inserir estado inicial no Supabase:", await insertRes.text());
    }
  }
}

seed().catch(err => console.error(err));
