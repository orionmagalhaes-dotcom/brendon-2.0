"use strict";

const fs = require("fs");
const path = require("path");

const appJsPath = path.resolve(__dirname, "..", "app.js");
const productsPath = path.resolve(__dirname, "products-data.json");
const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

let content = fs.readFileSync(appJsPath, "utf8");
const isCrlf = content.includes("\r\n");
const eol = isCrlf ? "\r\n" : "\n";

// Normalize target string to file's EOL
function toFileEol(str) {
  return str.replace(/\r?\n/g, eol);
}

// 1. Update CATEGORIES and subcategories
const targetCat = toFileEol(`  const CATEGORIES = ["Bebidas", "Lanche", "Entradas", "Ofertas"];
  const BEVERAGE_SUBCATEGORIES = ["Geral"];
  const SNACK_SUBCATEGORIES = ["Lanches", "Adicionais"];
  const KITCHEN_CATEGORIES = new Set(["Lanche", "Entradas"]);`);

const replaceCat = toFileEol(`  const CATEGORIES = ["Bar", "Dose/Copo", "Cozinha", "Espetinhos", "Avulso", "Ofertas"];
  const BAR_SUBCATEGORIES = ["Geral"];
  const BEVERAGE_SUBCATEGORIES = ["Geral"];
  const SNACK_SUBCATEGORIES = ["Lanches", "Adicionais"];
  const KITCHEN_CATEGORIES = new Set(["Cozinha"]);`);

if (content.includes(targetCat)) {
  content = content.replace(targetCat, replaceCat);
  console.log("1. Categorias atualizadas!");
} else {
  console.warn("1. targetCat nao encontrado exatamente.");
}

// 2. Update normalizeCategoryName & normalizeProductSubcategory
const targetNorm = toFileEol(`  function normalizeCategoryName(category) {
    const raw = String(category || "").trim();
    if (!raw) return "Lanche";
    const flat = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (flat === "doses" || flat === "dose" || flat === "doses/copo" || flat === "dose/copo" || flat === "copo") return "Bebidas";
    if (flat === "bar" || flat === "bebida" || flat === "bebidas") return "Bebidas";
    if (flat === "cozinha" || flat === "lanche" || flat === "lanches") return "Lanche";
    if (flat === "espetinho" || flat === "espetinhos" || flat === "espertinho" || flat === "espertinhos") return "Lanche";
    if (flat === "adicional" || flat === "adicionais" || flat === "avulso" || flat === "avulsos" || flat === "variedades" || flat === "variados") return "Lanche";
    if (flat === "entrada" || flat === "entradas") return "Entradas";
    if (flat === "oferta" || flat === "ofertas") return "Ofertas";
    return "Lanche";
  }

  function normalizeProductCategory(category) {
    return normalizeCategoryName(category);
  }

  function normalizeProductSubcategory(product, normalizedCategory = product.category) {
    if (normalizedCategory === "Lanche") {
      const sourceCategory = String(product.category || "").trim().toLowerCase();
      const raw = String(product.subcategory || "").trim();
      if (["adicional", "adicionais", "avulso", "avulsos"].includes(sourceCategory) || raw === "Adicionais") return "Adicionais";
      return "Lanches";
    }
    if (normalizedCategory !== "Bebidas") return "";
    const raw = String(product.subcategory || "").trim();
    return BEVERAGE_SUBCATEGORIES.includes(raw) ? raw : "Geral";
  }`);

const replaceNorm = toFileEol(`  function normalizeCategoryName(category) {
    const raw = String(category || "").trim();
    if (!raw) return "Avulso";
    const flat = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (flat === "doses" || flat === "dose" || flat === "doses/copo" || flat === "dose/copo" || flat === "copo") return "Dose/Copo";
    if (flat === "bar" || flat === "bebida" || flat === "bebidas") return "Bar";
    if (flat === "cozinha") return "Cozinha";
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
  }`);

if (content.includes(targetNorm)) {
  content = content.replace(targetNorm, replaceNorm);
  console.log("2. Normalizacao de categorias atualizada!");
} else {
  console.warn("2. targetNorm nao encontrado exatamente.");
}

// 3. Update notes in Admin and QuickSale
content = content.replace(
  toFileEol(`<p class="note">Classificacao: Bebidas, Lanche (Lanches e Adicionais), Entradas e Ofertas (combos e promocionais).</p>`),
  toFileEol(`<p class="note">Classificacao: Bar, Dose/Copo, Cozinha, Espetinhos, Avulso e Ofertas (combos e promocionais).</p>`)
);
content = content.replace(
  toFileEol(`<p class="note">Venda rapida. Itens com fluxo de cozinha (Lanche, Entradas e Ofertas dependentes) entram na fila da cozinha com as mesmas regras da comanda.</p>`),
  toFileEol(`<p class="note">Venda rapida. Itens com fluxo de cozinha (Cozinha e Ofertas dependentes) entram na fila da cozinha com as mesmas regras da comanda.</p>`)
);

// 4. Update createProduct & editProduct
content = content.replace(
  toFileEol(`const subcategory = category === "Bebidas" ? "Geral" : category === "Lanche" ? String(form.lancheSubcategory?.value || "Lanches") : "";`),
  toFileEol(`const subcategory = (category === "Bar" || category === "Bebidas") ? "Geral" : "";`)
);
content = content.replace(
  toFileEol(`p.subcategory = p.category === "Bebidas" ? "Geral" : "";`),
  toFileEol(`p.subcategory = (p.category === "Bar" || p.category === "Bebidas") ? "Geral" : "";`)
);

// 5. Inject DEFAULT_INITIAL_PRODUCTS and update initialState
const productsFormatted = toFileEol(JSON.stringify(products, null, 2));
const defaultProductsConst = toFileEol(`  const DEFAULT_INITIAL_PRODUCTS = Object.freeze(${productsFormatted});\n\n`);

const targetInitialState = toFileEol(`  function initialState() {
    return {
      users: [
        { id: 1, role: "admin", name: "Administrador", functionName: "Administrador", login: "admin", password: "admin", active: true, updatedAt: isoNow() }
      ],
      products: [],`);

const replaceInitialState = `${defaultProductsConst}` + toFileEol(`  function initialState() {
    return {
      users: [
        { id: 1, role: "admin", name: "Administrador", functionName: "Administrador", login: "admin", password: "admin", active: true, updatedAt: isoNow() }
      ],
      products: DEFAULT_INITIAL_PRODUCTS.map((p) => ({ ...p })),`);

if (content.includes(targetInitialState)) {
  content = content.replace(targetInitialState, replaceInitialState);
  console.log("5. DEFAULT_INITIAL_PRODUCTS e initialState() atualizados!");
} else {
  console.warn("5. targetInitialState nao encontrado exatamente.");
}

// 6. Update seq.product in initialState()
const targetSeq = toFileEol(`      seq: {
        user: 2,
        product: 1,`);

const replaceSeq = toFileEol(`      seq: {
        user: 2,
        product: 99,`);

if (content.includes(targetSeq)) {
  content = content.replace(targetSeq, replaceSeq);
  console.log("6. seq.product atualizado para 99!");
} else {
  console.warn("6. targetSeq nao encontrado exatamente.");
}

fs.writeFileSync(appJsPath, content, "utf8");
console.log("app.js salvo com sucesso!");
