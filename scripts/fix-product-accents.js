"use strict";

const fs = require("fs");
const path = require("path");

const jsonPath = path.resolve(__dirname, "products-data.json");
const prods = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const fixMap = {
  13: "Combo Almoço",
  15: "MEDALHÃO DE GADO",
  16: "LINGUIÇA",
  17: "Baião G",
  18: "Baião P",
  22: "Espaguete de Camarão",
  30: "Camarão no Alho e Óleo",
  31: "Camarão no Alho e Óleo 1/2",
  37: "Feijão Tropeiro G",
  38: "Feijão Tropeiro P",
  56: "TEACHER'S / DOSE",
  57: "TEACHER'S / LITRO",
  68: "SÃO JOÃO DA BARRA / DOSE",
  74: "ÁGUA C/GÁS",
  75: "ÁGUA S/GÁS",
  84: "ICE CABARÉ",
  86: "PRESTÍGIO"
};

let count = 0;
prods.forEach(p => {
  if (fixMap[p.id]) {
    console.log(`${p.id}: "${p.name}" -> "${fixMap[p.id]}"`);
    p.name = fixMap[p.id];
    count++;
  }
});

fs.writeFileSync(jsonPath, JSON.stringify(prods, null, 2), "utf8");
console.log(`Sucesso: ${count} nomes de produtos corrigidos em products-data.json.`);
