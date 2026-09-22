"use strict";

const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "..", "app.js");
const jsonPath = path.resolve(__dirname, "products-data.json");
const prods = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

let content = fs.readFileSync(appPath, "utf8");
const isCrlf = content.includes("\r\n");
const eol = isCrlf ? "\r\n" : "\n";

const regex = /const DEFAULT_INITIAL_PRODUCTS = Object\.freeze\(\[[\s\S]*?\]\);/;
const replacement = "const DEFAULT_INITIAL_PRODUCTS = Object.freeze(" + JSON.stringify(prods, null, 2).replace(/\n/g, eol) + ");";

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(appPath, content, "utf8");
  console.log("DEFAULT_INITIAL_PRODUCTS atualizado com sucesso no app.js!");
} else {
  console.error("Regex nao encontrou DEFAULT_INITIAL_PRODUCTS no app.js.");
}
