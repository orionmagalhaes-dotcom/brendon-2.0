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

// ========================================================
// 1. UPDATE itemNeedsKitchen and productNeedsKitchen
// Only "Cozinha" (and Offer with requiresKitchen) need kitchen
// ========================================================
const targetNeedsKitchen = toFileEol(`  function productNeedsKitchen(product) {
    if (!product) return false;
    if (KITCHEN_CATEGORIES.has(product.category)) return true;
    return product.category === "Ofertas" && Boolean(product.requiresKitchen);
  }

  function itemNeedsKitchen(item) {
    if (!item) return false;
    if (item.needsKitchen !== undefined) return Boolean(item.needsKitchen);
    if (KITCHEN_CATEGORIES.has(item.category)) return true;
    return item.category === "Ofertas" && Boolean(item.requiresKitchen);
  }`);

const replaceNeedsKitchen = toFileEol(`  function productNeedsKitchen(product) {
    if (!product) return false;
    if (product.category === "Cozinha") return true;
    return product.category === "Ofertas" && Boolean(product.requiresKitchen);
  }

  function itemNeedsKitchen(item) {
    if (!item) return false;
    if (item.category === "Cozinha") return true;
    if (item.category === "Ofertas" && Boolean(item.requiresKitchen)) return true;
    return false;
  }`);

if (content.includes(targetNeedsKitchen)) {
  content = content.replace(targetNeedsKitchen, replaceNeedsKitchen);
  console.log("1. itemNeedsKitchen e productNeedsKitchen atualizados!");
} else {
  console.warn("1. targetNeedsKitchen nao encontrado!");
}

// ========================================================
// 2. UPDATE Enviar Pedidos button text in comanda card
// ========================================================
const targetOrderBtn = toFileEol(`          <button class="btn secondary" type="button" data-action="print-order-ticket" data-comanda-id="\${comanda.id}">Enviar pedido</button>`);
const replaceOrderBtn = toFileEol(`          <button class="btn secondary" type="button" data-action="print-order-ticket" data-comanda-id="\${comanda.id}">Enviar pedidos</button>`);

if (content.includes(targetOrderBtn)) {
  content = content.replace(targetOrderBtn, replaceOrderBtn);
  console.log("2. Botao 'Enviar pedidos' atualizado!");
} else {
  console.warn("2. targetOrderBtn nao encontrado!");
}

// ========================================================
// 3. UPDATE buildComandaReceiptText to only include "Cozinha"
// ========================================================
const targetReceiptTextKitchen = toFileEol(`    if (isOrderTicket) {
      const targetItems = Array.isArray(options.itemsToPrint) ? options.itemsToPrint : (comanda?.items || []).filter((i) => i && !i.canceled);`);

const replaceReceiptTextKitchen = toFileEol(`    if (isOrderTicket) {
      const targetItems = Array.isArray(options.itemsToPrint)
        ? options.itemsToPrint
        : (comanda?.items || []).filter((i) => i && !i.canceled && i.category === "Cozinha");`);

if (content.includes(targetReceiptTextKitchen)) {
  content = content.replace(targetReceiptTextKitchen, replaceReceiptTextKitchen);
  console.log("3. buildComandaReceiptText atualizado para filtrar apenas Cozinha!");
} else {
  console.warn("3. targetReceiptTextKitchen nao encontrado!");
}

// ========================================================
// 4. UPDATE printComanda to only send and print "Cozinha" items
// ========================================================
const targetPrintComandaKitchen = toFileEol(`    let itemsToPrint = [];
    if (isOrderTicket) {
      itemsToPrint = (comanda.items || []).filter((i) => i && !i.canceled && !i.kitchenPrinted);
      if (itemsToPrint.length === 0) {
        const reprint = confirm("Todos os itens desse pedido já foram enviados para a cozinha. Deseja reimprimir o pedido completo?");
        if (reprint) {
          itemsToPrint = (comanda.items || []).filter((i) => i && !i.canceled);
        } else {
          return;
        }
      }
    }`);

const replacePrintComandaKitchen = toFileEol(`    let itemsToPrint = [];
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
    }`);

if (content.includes(targetPrintComandaKitchen)) {
  content = content.replace(targetPrintComandaKitchen, replacePrintComandaKitchen);
  console.log("4. printComanda atualizado para filtrar apenas Cozinha!");
} else {
  console.warn("4. targetPrintComandaKitchen nao encontrado!");
}

// ========================================================
// 5. UPDATE renderFinalizePanel for MULTI-PAYMENT
// ========================================================
const targetRenderFinalize = toFileEol(`  function renderFinalizePanel(comanda) {
    const total = comandaTotal(comanda);
    const totalFixed = Number(total || 0).toFixed(2);
    const methodOptions = PAYMENT_METHODS.map((m) => \`<option value="\${m.value}">\${m.label}</option>\`).join("");
    const zeroTotalNote = Math.max(0, parseNumber(total || 0)) <= 0.01
      ? \`<div class="note">Esta comanda totaliza \${money(0)}. Voce pode finalizar sem informar pagamento.</div>\`
      : \`<div class="note">Confira os dados e escolha a forma de pagamento.</div>\`;
    return \`
      <form class="card form" data-role="finalize-form" data-comanda-id="\${comanda.id}">
        <h4>Finalizacao da comanda \${esc(displayComandaId(comanda.id))}</h4>
        \${zeroTotalNote}
        <div class="grid cols-2">
          <div class="field">
            <label>Forma de pagamento</label>
            <select name="paymentMethodPrimary" data-role="payment-method">
              \${methodOptions}
            </select>
          </div>
          <div class="field">
            <label>Valor a pagar</label>
            <input name="paymentAmountPrimary" data-role="payment-amount" value="\${totalFixed}" readonly />
          </div>
        </div>
        <div class="note" data-role="payment-breakdown-note">Divisao ainda nao conferida.</div>
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
        <div class="note"><b>Valor total:</b> \${money(total)}</div>
        <div class="actions finalize-actions">
          <button class="btn secondary" type="button" data-action="print-client-receipt" data-comanda-id="\${comanda.id}">Gerar Nota</button>
          <button class="btn ok" type="submit">Confirmar finalizacao</button>
        </div>
      </form>
    \`;
  }`);

const replaceRenderFinalize = toFileEol(`  function getComandaPaymentSplits(comandaId, total) {
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
      ? \`<div class="note">Esta comanda totaliza \${money(0)}. Voce pode finalizar sem informar pagamento.</div>\`
      : \`<div class="note">Informe as formas de pagamento (dinheiro, cartao, pix, etc.). Voce pode dividir o total em varias formas.</div>\`;

    const splitsHtml = splits.map((split, index) => {
      const methodOptions = PAYMENT_METHODS.map((m) =>
        \`<option value="\${m.value}" \${m.value === split.method ? "selected" : ""}>\${m.label}</option>\`
      ).join("");
      return \`
        <div class="payment-split-row card" style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:flex-end; margin-bottom:0.6rem; padding:0.6rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px;">
          <div style="flex:1; min-width:140px;">
            <label style="font-size:0.8rem; display:block; margin-bottom:4px; font-weight:600;">Forma #\${index + 1}</label>
            <select name="paymentMethod_\${index}" data-role="payment-method" data-index="\${index}" style="width:100%;">
              \${methodOptions}
            </select>
          </div>
          <div style="flex:1; min-width:110px;">
            <label style="font-size:0.8rem; display:block; margin-bottom:4px; font-weight:600;">Valor (R$)</label>
            <input type="number" step="0.01" min="0" name="paymentAmount_\${index}" data-role="payment-amount" data-index="\${index}" value="\${split.amount}" style="width:100%;" />
          </div>
          \${splits.length > 1 ? \`
            <div>
              <button type="button" class="btn danger compact-action" data-action="remove-payment-split" data-comanda-id="\${comanda.id}" data-index="\${index}" title="Remover esta forma" style="height:38px; padding:0 0.8rem;">✕</button>
            </div>
          \` : ""}
        </div>
      \`;
    }).join("");

    return \`
      <form class="card form" data-role="finalize-form" data-comanda-id="\${comanda.id}">
        <h4>Finalizacao da comanda \${esc(displayComandaId(comanda.id))}</h4>
        \${zeroTotalNote}
        
        <div class="payment-splits-container" data-role="payment-splits-list">
          \${splitsHtml}
        </div>

        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.5rem; margin:0.5rem 0 0.8rem 0;">
          <button type="button" class="btn secondary compact-action" data-action="add-payment-split" data-comanda-id="\${comanda.id}">
            + Adicionar outra forma de pagamento
          </button>
          \${splits.length > 1 ? \`
            <button type="button" class="btn compact-action" data-action="auto-balance-payment" data-comanda-id="\${comanda.id}" title="Ajusta a ultima forma para completar o total exato">
              ⚡ Equilibrar valor restante
            </button>
          \` : ""}
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
        <div class="note" style="font-size:1.05rem;"><b>Valor total da comanda:</b> \${money(total)}</div>
        <div class="actions finalize-actions">
          <button class="btn secondary" type="button" data-action="print-client-receipt" data-comanda-id="\${comanda.id}">Gerar Nota</button>
          <button class="btn ok" type="submit">Confirmar finalizacao</button>
        </div>
      </form>
    \`;
  }`);

if (content.includes(targetRenderFinalize)) {
  content = content.replace(targetRenderFinalize, replaceRenderFinalize);
  console.log("5. renderFinalizePanel atualizado para suporte a multi-pagamento!");
} else {
  console.warn("5. targetRenderFinalize nao encontrado!");
}

// ========================================================
// 6. UPDATE parseFinalizePaymentSplits and updateFinalizePaymentUi
// ========================================================
const targetParseAndUi = toFileEol(`  function parseFinalizePaymentSplits(form, total) {
    return parseFinalizePaymentRows([
      {
        method: String(form.paymentMethodPrimary?.value || "").trim(),
        amountRaw: String(form.paymentAmountPrimary?.value || "0").trim(),
        rowName: "pagamento"
      }
    ], total);
  }

  function updateFinalizePaymentUi(form) {
    if (!form) return;
    const fiadoBox = form.querySelector('[data-role="fiado-box"]');
    const pixBox = form.querySelector('[data-role="pix-box"]');
    const manualCheck = form.querySelector('[data-role="manual-check"]');
    const manualCheckNote = form.querySelector('[data-role="manual-check-note"]');
    const breakdownNote = form.querySelector('[data-role="payment-breakdown-note"]');
    const comandaId = String(form.dataset.comandaId || "");
    const comanda = findOpenComanda(comandaId);
    const total = comanda ? comandaTotal(comanda) : 0;
    const isZeroTotal = Math.max(0, parseNumber(total || 0)) <= 0.01;
    const selectedMethods = [
      String(form.paymentMethodPrimary?.value || "").trim()
    ].filter(Boolean);

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
      if (parsed.error) {
        breakdownNote.textContent = parsed.error;
      } else if (isZeroTotal) {
        breakdownNote.textContent = "Comanda zerada. Nenhum pagamento precisa ser informado para finalizar.";
      } else {
        const paid = splits.reduce((sum, row) => sum + parseNumber(row.amount || 0), 0);
        breakdownNote.textContent = \`Pagamento informado: \${paymentSplitsText(splits, { includeAmount: true })} | Total conferido: \${money(paid)}.\`;
      }
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
  }`);

const replaceParseAndUi = toFileEol(`  function parseFinalizePaymentSplits(form, total) {
    if (!form) return { error: "Formulario nao encontrado." };
    const methodEls = form.querySelectorAll('[data-role="payment-method"]');
    const amountEls = form.querySelectorAll('[data-role="payment-amount"]');
    const rawRows = [];
    for (let i = 0; i < methodEls.length; i++) {
      rawRows.push({
        method: String(methodEls[i]?.value || "").trim(),
        amountRaw: String(amountEls[i]?.value || "0").trim(),
        rowName: \`pagamento \${i + 1}\`
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
        breakdownNote.textContent = \`⚠️ \${parsed.error}\`;
        breakdownNote.style.color = "#ff6b6b";
      } else {
        const paid = splits.reduce((sum, row) => sum + parseNumber(row.amount || 0), 0);
        breakdownNote.textContent = \`✓ Pagamento conferido (\${money(paid)}): \${paymentSplitsText(splits, { includeAmount: true })}.\`;
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
  }`);

if (content.includes(targetParseAndUi)) {
  content = content.replace(targetParseAndUi, replaceParseAndUi);
  console.log("6. parseFinalizePaymentSplits e updateFinalizePaymentUi atualizados!");
} else {
  console.warn("6. targetParseAndUi nao encontrado!");
}

// ========================================================
// 7. ADD ACTIONS IN CLICK LISTENER (add-payment-split, remove-payment-split, auto-balance-payment)
// ========================================================
const targetClickActions = toFileEol(`      if (action === "toggle-finalize") {
        toggleFinalize(button.dataset.comandaId);
        return;
      }`);

const replaceClickActions = toFileEol(`      if (action === "toggle-finalize") {
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
        const updatedForm = document.querySelector(\`form[data-role="finalize-form"][data-comanda-id="\${comandaId}"]\`);
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
          const updatedForm = document.querySelector(\`form[data-role="finalize-form"][data-comanda-id="\${comandaId}"]\`);
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
          const updatedForm = document.querySelector(\`form[data-role="finalize-form"][data-comanda-id="\${comandaId}"]\`);
          if (updatedForm) updateFinalizePaymentUi(updatedForm);
        }
        return;
      }`);

if (content.includes(targetClickActions)) {
  content = content.replace(targetClickActions, replaceClickActions);
  console.log("7. Click actions para multi-pagamento adicionados!");
} else {
  console.warn("7. targetClickActions nao encontrado!");
}

// ========================================================
// 8. CLEANUP SPLITS ON FINALIZE
// ========================================================
const targetFinalizeCleanup = toFileEol(`    delete uiState.finalizeOpenByComanda[comanda.id];

    saveState();`);

const replaceFinalizeCleanup = toFileEol(`    delete uiState.finalizeOpenByComanda[comanda.id];
    delete (uiState.finalizeSplitsByComanda || {})[comanda.id];

    saveState();`);

if (content.includes(targetFinalizeCleanup)) {
  content = content.replace(targetFinalizeCleanup, replaceFinalizeCleanup);
  console.log("8. Limpeza de finalizeSplitsByComanda adicionada!");
} else {
  console.warn("8. targetFinalizeCleanup nao encontrado!");
}

fs.writeFileSync(appJsPath, content, "utf8");
console.log("Todas as atualizacoes foram aplicadas com sucesso!");
