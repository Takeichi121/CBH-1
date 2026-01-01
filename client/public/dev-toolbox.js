// client/public/dev-toolbox.js
(() => {
  const STATE_KEY = "__WTB_STATE__";
  const ID_ATTR = "data-wtb-id";
  const CANVAS_ATTR = "data-wtb-canvas";
  const LAYER_ATTR = "data-wtb-layer";

  if (window.__WTB_LOADED__) return;
  window.__WTB_LOADED__ = true;

  // ---------- helpers ----------
  const nowId = () => "wtb-" + Math.random().toString(16).slice(2);
  const canHaveChildren = (el) => {
    const tag = el?.tagName?.toLowerCase?.();
    return el && !["img", "input", "textarea", "select", "br", "hr", "meta", "link"].includes(tag);
  };
  const camelToKebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

  const loadState = () => {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
    } catch {
      return {};
    }
  };
  const saveState = (st) => localStorage.setItem(STATE_KEY, JSON.stringify(st));

  const ensureId = (el) => {
    if (!el.getAttribute(ID_ATTR)) el.setAttribute(ID_ATTR, nowId());
    return el.getAttribute(ID_ATTR);
  };

  const css = `
#wtb{position:fixed;right:16px;bottom:16px;width:360px;max-height:80vh;overflow:auto;background:rgba(20,20,20,.95);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.35);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial;z-index:2147483647}
#wtb header{cursor:move;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:space-between;gap:10px}
#wtb header .t{font-weight:800;font-size:14px}
#wtb header .mini{display:flex;gap:8px}
#wtb button,#wtb input,#wtb select{font-size:12px}
#wtb .c{padding:12px;display:grid;gap:10px}
#wtb .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#wtb label{font-size:11px;opacity:.9;display:block;margin-bottom:4px}
#wtb input,#wtb select{width:100%;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;outline:none}
#wtb .hint{font-size:11px;opacity:.85;line-height:1.35}
#wtb .info{font-size:11px;opacity:.92;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);word-break:break-word}
#wtb .actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#wtb .actions button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;padding:9px 10px;border-radius:10px;cursor:pointer}
#wtb .actions button:hover{background:rgba(255,255,255,.14)}
#wtb .pill{display:flex;gap:8px;flex-wrap:wrap}
#wtb .pill .item{border:1px dashed rgba(255,255,255,.25);background:rgba(255,255,255,.06);padding:8px 10px;border-radius:999px;cursor:grab;user-select:none}
#wtb .pill .item:active{cursor:grabbing}
#wtb .danger{border-color:rgba(255,80,80,.35);background:rgba(255,80,80,.10)}
#wtb .ok{border-color:rgba(80,255,160,.35);background:rgba(80,255,160,.10)}
.wtb-hover{outline:2px dashed rgba(0,170,255,.85)!important;outline-offset:2px}
.wtb-sel{outline:2px solid rgba(0,255,170,.95)!important;outline-offset:2px}
.wtb-drop{outline:2px dashed rgba(255,220,80,.95)!important;outline-offset:3px}
  `;

  const html = `
<div id="wtb" hidden>
  <header id="wtbH">
    <div class="t">Dev Toolbox</div>
    <div class="mini">
      <button id="wtbTogglePick" type="button">Pick</button>
      <button id="wtbSetCanvas" type="button">Set Canvas</button>
      <button id="wtbHide" type="button">Hide</button>
    </div>
  </header>

  <div class="c">
    <div class="hint">
      คีย์ลัด: <b>Ctrl/⌘+Shift+E</b> เปิด/ปิด, <b>Pick</b> แล้วคลิกองค์ประกอบเพื่อเลือก, จากนั้น <b>Set Canvas</b> เพื่อกำหนดพื้นที่ “ลากวาง”
    </div>

    <div class="info" id="wtbInfo">Selected: (none)</div>
    <div class="info" id="wtbCanvasInfo">Canvas: (not set)</div>

    <div class="row">
      <div><label>Background</label><input id="wtbBg" placeholder="#111 / rgba(...)"/></div>
      <div><label>Text color</label><input id="wtbColor" placeholder="#fff"/></div>
    </div>

    <div class="row">
      <div><label>Font size (px)</label><input id="wtbFont" inputmode="numeric" placeholder="14"/></div>
      <div><label>Radius (px)</label><input id="wtbRadius" inputmode="numeric" placeholder="12"/></div>
    </div>

    <div class="row">
      <div><label>Padding</label><input id="wtbPad" placeholder="12px"/></div>
      <div><label>Margin</label><input id="wtbMar" placeholder="0"/></div>
    </div>

    <div class="row">
      <div><label>Display</label>
        <select id="wtbDisp">
          <option value="">(no change)</option>
          <option>block</option><option>inline-block</option><option>flex</option><option>grid</option><option>none</option>
        </select>
      </div>
      <div><label>Custom inline css</label><input id="wtbCustom" placeholder="border:1px solid #444;"/></div>
    </div>

    <div class="actions">
      <button id="wtbApply" class="ok" type="button">Apply Style</button>
      <button id="wtbReset" type="button">Reset Style</button>
      <button id="wtbDel" class="danger" type="button">Delete (created)</button>
      <button id="wtbClear" class="danger" type="button">Clear Canvas</button>
    </div>

    <div class="hint"><b>Drag & Drop Builder</b>: ลากไปวางใน Canvas ที่ตั้งไว้</div>
    <div class="pill" id="wtbPalette">
      <div class="item" draggable="true" data-wtb-type="button">+ Button</div>
      <div class="item" draggable="true" data-wtb-type="text">+ Text</div>
      <div class="item" draggable="true" data-wtb-type="container">+ Container</div>
      <div class="item" draggable="true" data-wtb-type="input">+ Input</div>
      <div class="item" draggable="true" data-wtb-type="badge">+ Badge</div>
    </div>

    <div class="actions">
      <button id="wtbExportJson" type="button">Export JSON</button>
      <button id="wtbExportHtml" type="button">Export HTML+CSS</button>
      <button id="wtbImport" type="button">Import JSON</button>
      <button id="wtbShow" type="button">Show</button>
    </div>

    <input id="wtbImportFile" type="file" accept="application/json" hidden />
  </div>
</div>
  `;

  // inject style + ui
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  document.body.appendChild(wrap.firstElementChild);

  const $ = (id) => document.getElementById(id);

  const box = $("wtb");
  const header = $("wtbH");
  const info = $("wtbInfo");
  const canvasInfo = $("wtbCanvasInfo");
  const btnPick = $("wtbTogglePick");
  const btnSetCanvas = $("wtbSetCanvas");
  const btnHide = $("wtbHide");
  const btnShow = $("wtbShow");

  const fBg = $("wtbBg");
  const fColor = $("wtbColor");
  const fFont = $("wtbFont");
  const fRadius = $("wtbRadius");
  const fPad = $("wtbPad");
  const fMar = $("wtbMar");
  const fDisp = $("wtbDisp");
  const fCustom = $("wtbCustom");

  const btnApply = $("wtbApply");
  const btnReset = $("wtbReset");
  const btnDel = $("wtbDel");
  const btnClear = $("wtbClear");

  const btnExportJson = $("wtbExportJson");
  const btnExportHtml = $("wtbExportHtml");
  const btnImport = $("wtbImport");
  const importFile = $("wtbImportFile");

  // toggle with Ctrl/⌘+Shift+E
  window.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && e.shiftKey && e.key.toLowerCase() === "e") box.hidden = !box.hidden;
  });

  // default show
  box.hidden = false;

  // drag panel
  let dragging = false, sx = 0, sy = 0, startRight = 16, startBottom = 16;
  header.addEventListener("mousedown", (e) => {
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    const rect = box.getBoundingClientRect();
    startRight = window.innerWidth - rect.right;
    startBottom = window.innerHeight - rect.bottom;
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    box.style.right = Math.max(8, startRight - dx) + "px";
    box.style.bottom = Math.max(8, startBottom - dy) + "px";
  });
  window.addEventListener("mouseup", () => dragging = false);

  btnHide.addEventListener("click", () => box.hidden = true);
  btnShow.addEventListener("click", () => box.hidden = false);

  // ---------- selection (Pick) ----------
  let picking = false;
  let hovered = null;
  let selected = null;

  const setHover = (el) => {
    if (hovered && hovered !== selected) hovered.classList.remove("wtb-hover");
    hovered = el;
    if (hovered && hovered !== selected) hovered.classList.add("wtb-hover");
  };

  const labelEl = (el) => {
    if (!el) return "(none)";
    const tag = el.tagName.toLowerCase();
    const id = el.id ? "#" + el.id : "";
    const cls = el.className ? "." + String(el.className).trim().split(/\s+/).slice(0,4).join(".") : "";
    const w = el.getAttribute(ID_ATTR) ? ` [${el.getAttribute(ID_ATTR)}]` : "";
    return `${tag}${id}${cls}${w}`;
  };

  const setSelected = (el) => {
    if (selected) selected.classList.remove("wtb-sel");
    selected = el;
    if (selected) selected.classList.add("wtb-sel");
    if (selected) ensureId(selected);
    refreshInfo();
  };

  const onMovePick = (e) => {
    if (!picking) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === box || box.contains(el)) return;
    setHover(el);
  };

  const onClickPick = (e) => {
    if (!picking) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === box || box.contains(el)) return;
    e.preventDefault(); e.stopPropagation();
    setSelected(el);
    togglePick(false);
  };

  const togglePick = (v) => {
    picking = v;
    btnPick.textContent = picking ? "Picking..." : "Pick";
    if (picking) {
      window.addEventListener("mousemove", onMovePick, true);
      window.addEventListener("click", onClickPick, true);
      document.body.style.cursor = "crosshair";
    } else {
      window.removeEventListener("mousemove", onMovePick, true);
      window.removeEventListener("click", onClickPick, true);
      document.body.style.cursor = "";
      if (hovered && hovered !== selected) hovered.classList.remove("wtb-hover");
      hovered = null;
    }
  };

  btnPick.addEventListener("click", () => togglePick(!picking));

  // ---------- canvas + layer ----------
  const getCanvasEl = () => {
    const st = loadState();
    if (!st.canvasId) return null;
    return document.querySelector(`[${ID_ATTR}="${CSS.escape(st.canvasId)}"]`);
  };

  const ensureLayer = (canvasEl) => {
    let layer = canvasEl.querySelector(`:scope > [${LAYER_ATTR}="1"]`);
    if (!layer) {
      layer = document.createElement("div");
      layer.setAttribute(LAYER_ATTR, "1");
      layer.style.minHeight = "40px";
      layer.style.padding = "8px";
      layer.style.border = "1px dashed rgba(255,255,255,.25)";
      layer.style.borderRadius = "12px";
      canvasEl.appendChild(layer);
    }
    return layer;
  };

  const saveSnapshot = () => {
    const st = loadState();
    const canvasEl = getCanvasEl();
    if (!canvasEl) return;
    const layer = ensureLayer(canvasEl);
    st.canvasHtml = layer.innerHTML;
    saveState(st);
  };

  const restoreSnapshot = () => {
    const st = loadState();
    const canvasEl = getCanvasEl();
    if (!canvasEl) return;
    const layer = ensureLayer(canvasEl);
    if (typeof st.canvasHtml === "string") layer.innerHTML = st.canvasHtml;

    // re-ensure ids for nodes inside layer
    layer.querySelectorAll("*").forEach((el) => ensureId(el));
  };

  const setCanvasFromSelected = () => {
    if (!selected) return alert("Pick element ก่อน แล้วค่อย Set Canvas");
    const st = loadState();

    // clear previous canvas mark
    const prev = getCanvasEl();
    if (prev) prev.removeAttribute(CANVAS_ATTR);

    const id = ensureId(selected);
    selected.setAttribute(CANVAS_ATTR, "1");
    st.canvasId = id;

    // ensure layer + snapshot
    ensureLayer(selected);
    saveState(st);
    restoreSnapshot();
    refreshInfo();
  };

  btnSetCanvas.addEventListener("click", setCanvasFromSelected);

  // ---------- styles store ----------
  const applyStyles = (el, styleObj) => {
    if (!el || !styleObj) return;
    Object.entries(styleObj).forEach(([k, v]) => {
      if (v === "" || v == null) return;
      el.style[k] = v;
    });
  };

  const parseCustomInline = (s) => {
    const out = {};
    if (!s) return out;
    s.split(";").map((x) => x.trim()).filter(Boolean).forEach((pair) => {
      const i = pair.indexOf(":");
      if (i === -1) return;
      const prop = pair.slice(0, i).trim();
      const val = pair.slice(i + 1).trim();
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[camel] = val;
    });
    return out;
  };

  const buildStyleObj = () => {
    const o = {};
    if (fBg.value) o.background = fBg.value;
    if (fColor.value) o.color = fColor.value;
    if (fFont.value) o.fontSize = fFont.value + "px";
    if (fRadius.value) o.borderRadius = fRadius.value + "px";
    if (fPad.value) o.padding = fPad.value;
    if (fMar.value) o.margin = fMar.value;
    if (fDisp.value) o.display = fDisp.value;
    Object.assign(o, parseCustomInline(fCustom.value));
    return o;
  };

  const applyAllFromState = () => {
    const st = loadState();
    const stylesById = st.stylesById || {};
    for (const [id, styleObj] of Object.entries(stylesById)) {
      const el = document.querySelector(`[${ID_ATTR}="${CSS.escape(id)}"]`);
      if (el) applyStyles(el, styleObj);
    }
  };

  btnApply.addEventListener("click", () => {
    if (!selected) return;
    const id = ensureId(selected);
    const st = loadState();
    st.stylesById = st.stylesById || {};
    st.stylesById[id] = { ...(st.stylesById[id] || {}), ...buildStyleObj() };
    saveState(st);
    applyAllFromState();
    refreshInfo();
    saveSnapshot();
  });

  btnReset.addEventListener("click", () => {
    if (!selected) return;
    const id = selected.getAttribute(ID_ATTR);
    if (!id) return;
    const st = loadState();
    if (st.stylesById) delete st.stylesById[id];
    saveState(st);
    selected.removeAttribute("style");
    refreshInfo();
    saveSnapshot();
  });

  // delete only created nodes (inside canvas layer)
  const isCreatedNode = (el) => {
    const canvasEl = getCanvasEl();
    if (!canvasEl) return false;
    const layer = ensureLayer(canvasEl);
    return layer.contains(el) && el !== layer;
  };

  btnDel.addEventListener("click", () => {
    if (!selected) return;
    if (!isCreatedNode(selected)) return alert("ลบได้เฉพาะชิ้นที่สร้างใน Canvas");
    const id = selected.getAttribute(ID_ATTR);
    selected.remove();
    const st = loadState();
    if (st.stylesById && id) delete st.stylesById[id];
    saveState(st);
    selected = null;
    refreshInfo();
    saveSnapshot();
  });

  btnClear.addEventListener("click", () => {
    const canvasEl = getCanvasEl();
    if (!canvasEl) return alert("ยังไม่ได้ Set Canvas");
    const layer = ensureLayer(canvasEl);
    layer.innerHTML = "";
    const st = loadState();
    st.canvasHtml = "";
    // ไม่ล้าง styles ทั้งหมด เพราะอาจมี style ของ element อื่นที่เคย pick
    saveState(st);
    selected = null;
    refreshInfo();
  });

  // ---------- builder (drag drop) ----------
  const makeNode = (type) => {
    let el;
    switch (type) {
      case "button":
        el = document.createElement("button");
        el.textContent = "Button";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "12px";
        el.style.border = "1px solid rgba(255,255,255,.18)";
        el.style.background = "rgba(255,255,255,.10)";
        el.style.color = "inherit";
        el.style.cursor = "pointer";
        break;
      case "text":
        el = document.createElement("p");
        el.textContent = "Text...";
        el.style.margin = "0";
        break;
      case "container":
        el = document.createElement("div");
        el.textContent = "Container";
        el.style.padding = "12px";
        el.style.borderRadius = "12px";
        el.style.border = "1px dashed rgba(255,255,255,.25)";
        el.style.minHeight = "40px";
        break;
      case "input":
        el = document.createElement("input");
        el.placeholder = "Input...";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "12px";
        el.style.border = "1px solid rgba(255,255,255,.18)";
        el.style.background = "rgba(255,255,255,.06)";
        el.style.color = "inherit";
        break;
      case "badge":
        el = document.createElement("span");
        el.textContent = "Badge";
        el.style.display = "inline-block";
        el.style.padding = "6px 10px";
        el.style.borderRadius = "999px";
        el.style.border = "1px solid rgba(255,255,255,.18)";
        el.style.background = "rgba(255,255,255,.08)";
        break;
      default:
        el = document.createElement("div");
        el.textContent = "Block";
    }
    ensureId(el);
    el.setAttribute("data-wtb-created", "1");
    return el;
  };

  let draggingType = null;
  let dropHover = null;

  const setDropHover = (el) => {
    if (dropHover) dropHover.classList.remove("wtb-drop");
    dropHover = el;
    if (dropHover) dropHover.classList.add("wtb-drop");
  };

  // palette dragstart
  document.querySelectorAll("#wtbPalette .item").forEach((it) => {
    it.addEventListener("dragstart", (e) => {
      draggingType = it.getAttribute("data-wtb-type");
      e.dataTransfer.setData("text/plain", draggingType);
      e.dataTransfer.effectAllowed = "copy";
    });
    it.addEventListener("dragend", () => {
      draggingType = null;
      setDropHover(null);
    });
  });

  // window drop handling (capture)
  window.addEventListener("dragover", (e) => {
    if (!draggingType) return;
    e.preventDefault();

    const canvasEl = getCanvasEl();
    if (!canvasEl) return;

    const layer = ensureLayer(canvasEl);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === box || box.contains(el)) return;

    if (layer.contains(el) || el === layer) {
      setDropHover(el);
    } else {
      setDropHover(null);
    }
  }, true);

  window.addEventListener("drop", (e) => {
    if (!draggingType) return;
    e.preventDefault();

    const canvasEl = getCanvasEl();
    if (!canvasEl) return alert("ยังไม่ได้ Set Canvas");
    const layer = ensureLayer(canvasEl);

    const elAt = document.elementFromPoint(e.clientX, e.clientY);
    if (!elAt || elAt === box || box.contains(elAt)) return;

    // only allow drop inside layer
    if (!(layer.contains(elAt) || elAt === layer)) {
      alert("ลากไปวางใน Canvas เท่านั้น");
      return;
    }

    const newNode = makeNode(draggingType);

    // choose insert target
    let target = elAt;
    if (target === layer) {
      layer.appendChild(newNode);
    } else if (canHaveChildren(target)) {
      target.appendChild(newNode);
    } else {
      target.insertAdjacentElement("afterend", newNode);
    }

    setSelected(newNode);
    saveSnapshot();
    draggingType = null;
    setDropHover(null);
  }, true);

  // ---------- export / import ----------
  const download = (filename, content, type = "application/octet-stream") => {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const buildCssFromStyles = (stylesById) => {
    if (!stylesById) return "";
    let out = "";
    for (const [id, obj] of Object.entries(stylesById)) {
      const rules = Object.entries(obj)
        .map(([k, v]) => `${camelToKebab(k)}:${v};`)
        .join("");
      if (rules) out += `[${ID_ATTR}="${id}"]{${rules}}\n`;
    }
    return out;
  };

  btnExportJson.addEventListener("click", () => {
    const st = loadState();
    download("wtb-export.json", JSON.stringify(st, null, 2), "application/json");
  });

  btnExportHtml.addEventListener("click", () => {
    const st = loadState();
    const canvasEl = getCanvasEl();
    if (!canvasEl) return alert("ยังไม่ได้ Set Canvas");
    const layer = ensureLayer(canvasEl);

    const cssText = buildCssFromStyles(st.stylesById || {});
    const htmlText = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>WTB Export</title>
<style>
/* Generated from Dev Toolbox */
${cssText}
</style>
</head>
<body>
<!-- Paste this layer into your component/page -->
<div id="wtb-layer">
${layer.innerHTML}
</div>
</body>
</html>`;
    download("wtb-export.html", htmlText, "text/html");
  });

  btnImport.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      localStorage.setItem(STATE_KEY, JSON.stringify(parsed));
      // restore after short delay (React may still render)
      setTimeout(() => {
        restoreSnapshot();
        applyAllFromState();
        refreshInfo();
        alert("Imported ✅");
      }, 250);
    } catch {
      alert("JSON ไม่ถูกต้อง");
    } finally {
      importFile.value = "";
    }
  });

  // ---------- info ----------
  const refreshInfo = () => {
    info.textContent = "Selected: " + labelEl(selected);

    const st = loadState();
    const canvasEl = getCanvasEl();
    canvasInfo.textContent = "Canvas: " + (canvasEl ? labelEl(canvasEl) : "(not set)");

    // mark saved style
    const sid = selected?.getAttribute?.(ID_ATTR);
    const hasStyle = sid && st.stylesById && st.stylesById[sid] && Object.keys(st.stylesById[sid]).length > 0;
    if (selected) info.textContent += hasStyle ? "  ✅ styled" : "";
  };

  // initial restore (delay to survive React render)
  setTimeout(() => {
    restoreSnapshot();
    applyAllFromState();
    refreshInfo();
  }, 350);

})();
