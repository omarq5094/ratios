/* Presentation only: financial values and report currencies are unchanged. */
(() => {
  "use strict";
  const scriptUrl = document.currentScript.src;
  const assetUrl = new URL("./public/assets/saudi-riyal.svg", scriptUrl).href;
  const asset = new Image();
  const ready = new Promise(resolve => {
    asset.onload = () => resolve(true);
    asset.onerror = () => resolve(false);
    asset.src = assetUrl;
  });
  function symbol() {
    const element = document.createElement("span");
    element.className = "saudi-riyal-symbol";
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", "ريال سعودي");
    element.setAttribute("title", "ريال سعودي");
    return element;
  }
  function render(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let text;
    // Keep input values, scripts, semantic SVG descriptions and copyable code intact.
    while ((text = walker.nextNode())) {
      if (text.data.includes("ر.س") && text.parentElement && !text.parentElement.closest("script,style,textarea,input,pre,code,svg,.saudi-riyal-symbol")) nodes.push(text);
    }
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      node.data.split("ر.س").forEach((part, i) => {
        if (i) fragment.append(symbol());
        if (part) fragment.append(document.createTextNode(part));
      });
      node.replaceWith(fragment);
    }
  }
  // Canvas exports need the same asset, tinted to the current text color.
  function drawText(context, value, x, y, maxWidth) {
    const text = String(value);
    if (!asset.complete || !asset.naturalWidth || !text.includes("ر.س")) {
      if (maxWidth === undefined) context.fillText(text, x, y);
      else context.fillText(text, x, y, maxWidth);
      return;
    }
    const height = (Number(context.font.match(/([\d.]+)px/)?.[1]) || 16) * .9;
    const width = height * asset.naturalWidth / asset.naturalHeight;
    const parts = text.split("ر.س");
    const total = parts.reduce((sum, part) => sum + context.measureText(part).width, 0) + (parts.length - 1) * width;
    const rtl = context.direction === "rtl";
    const rightAligned = context.textAlign === "right" || (context.textAlign === "start" && rtl) || (context.textAlign === "end" && !rtl);
    const left = context.textAlign === "center" ? x - total / 2 : rightAligned ? x - total : x;
    const ink = document.createElement("canvas");
    ink.width = Math.max(1, Math.ceil(width * 3)); ink.height = Math.max(1, Math.ceil(height * 3));
    const brush = ink.getContext("2d");
    brush.drawImage(asset, 0, 0, ink.width, ink.height);
    brush.globalCompositeOperation = "source-in";
    brush.fillStyle = context.fillStyle; brush.fillRect(0, 0, ink.width, ink.height);
    context.save();
    let cursor = rtl ? left + total : left;
    context.textAlign = rtl ? "right" : "left";
    parts.forEach((part, i) => {
      context.fillText(part, cursor, y);
      const partWidth = context.measureText(part).width;
      cursor += rtl ? -partWidth : partWidth;
      if (i < parts.length - 1) {
        const iconX = rtl ? cursor - width : cursor;
        context.drawImage(ink, iconX, y - height * .86, width, height);
        cursor += rtl ? -width : width;
      }
    });
    context.restore();
  }
  window.SaudiRiyal = Object.freeze({ ready, drawText, assetUrl });
  ready.then(loaded => {
    if (!loaded) return; // Keep the readable text fallback if the asset cannot load.
    const start = () => {
      render(document.body);
      const observer = new MutationObserver(records => {
        const roots = new Set();
        for (const record of records) {
          if (record.type === "characterData") roots.add(record.target.parentElement);
          else if (record.addedNodes.length) roots.add(record.target);
        }
        for (const root of roots) if (root?.isConnected) render(root);
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  });
})();
