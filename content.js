(() => {
  "use strict";

  const GLOBAL_KEY = "__GUIDELINES__";

  if (globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY].toggle();
    return;
  }

  const RULER = 20;
  const HIT = 9;
  const MINOR = 10;
  const MAJOR = 50;
  const Z = 2147483647;
  const LOGO_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAoUlEQVR42u2WsQ3EIAxFDWKEVMFeIEuxQkbJCqyV9iupbgeuIuLSXBw5VfgVSOCnL9l8HDNTFYCRDCQie12HtrCIbBYAALGCfEM1KX6u5Uopo2XxsxOvubDOE63zpIJ4elgd8AJAUPT059gsMtwCpJQuXfp3LudM6kluHYhccwAgBsX7MminuLdpB9jIMTMBME81APEnk2tQW4b+4eDJb8sXsT1AmKbOONMAAAAASUVORK5CYII=";
  const CLOSE_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVR42mNgGAUY4P///68pkceriCjNuBSTpBldE1maKbKZKi6gKAwoigWqpIOhBQD9nUJpVr2dbgAAAABJRU5ErkJggg==";

  class GuideLines {
    constructor() {
      this.enabled = true;
      this.guides = [];
      this.selectedId = null;
      this.drag = null;
      this.altHeld = false;
      this.infoOpen = false;
      this.raf = 0;
      this.lastPointer = null;
      this.storageKey = `guidelines:${location.origin}${location.pathname}`;
      this.legacyStorageKey = `ultra-rulers:${location.origin}${location.pathname}`;

      this.host = document.createElement("div");
      this.host.id = "guidelines-root";
      Object.assign(this.host.style, {
        all: "initial",
        position: "fixed",
        inset: "0",
        zIndex: String(Z),
        pointerEvents: "none"
      });

      this.shadow = this.host.attachShadow({ mode: "open" });
      this.shadow.innerHTML = `
        <style>
          :host { all: initial; }
          *, *::before, *::after { box-sizing: border-box; }

          #h-ruler, #v-ruler, #corner {
            position: fixed;
            z-index: 3;
            pointer-events: auto;
            user-select: none;
          }

          #h-ruler {
            top: 0;
            left: ${RULER}px;
            height: ${RULER}px;
            cursor: ns-resize;
          }

          #v-ruler {
            top: ${RULER}px;
            left: 0;
            width: ${RULER}px;
            cursor: ew-resize;
          }

          #corner {
            top: 0;
            left: 0;
            width: ${RULER}px;
            height: ${RULER}px;
            background: rgba(19, 19, 20, .94);
            border-right: 1px solid rgba(255,255,255,.10);
            border-bottom: 1px solid rgba(255,255,255,.10);
            cursor: default;
          }

          #corner::after {
            content: "";
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            left: 8px;
            top: 8px;
            background: rgba(255,255,255,.42);
          }

          #top-actions {
            position: fixed;
            top: ${RULER + 8}px;
            right: 12px;
            z-index: 5;
            display: flex;
            align-items: center;
            gap: 6px;
            pointer-events: auto;
          }

          #info, #exit, #info-close {
            appearance: none;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(24,24,26,.96);
            color: #fff;
            cursor: pointer;
            box-shadow: 0 1px 4px rgba(0,0,0,.28);
          }

          #exit {
            border-radius: 5px;
            padding: 6px 9px;
            font: 500 11px/14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            white-space: nowrap;
          }

          #info {
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            padding: 0;
            border-radius: 5px;
            font: 600 13px/1 Georgia, serif;
          }

          #info:hover, #exit:hover, #info-close:hover {
            background: rgba(38,38,40,.98);
          }

          #info[aria-expanded="true"] {
            border-color: rgba(246,140,70,.52);
          }

          #info-panel {
            display: none;
            position: fixed;
            top: ${RULER + 44}px;
            right: 12px;
            z-index: 6;
            width: min(434px, calc(100vw - 24px));
            max-height: calc(100vh - ${RULER + 56}px);
            overflow: auto;
            pointer-events: auto;
            padding: 16px;
            border: 1px solid rgba(255,255,255,.05);
            border-radius: 16px;
            background: rgba(24,24,26,.96);
            color: #fff;
            box-shadow: 0 12px 36px rgba(0,0,0,.36);
            font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            line-height: 16px;
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,.18) transparent;
          }

          #info-panel.open { display: flex; flex-direction: column; gap: 20px; }

          .info-intro {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }

          .info-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }

          .info-brand {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .info-logo {
            width: 24px;
            height: 24px;
            display: block;
            border: 1px solid rgba(255,255,255,.10);
            border-radius: 4px;
            object-fit: cover;
          }

          .info-name {
            color: #fff;
            font-size: 16px;
            line-height: 16px;
            font-weight: 400;
          }

          #info-close {
            width: 26px;
            height: 26px;
            display: grid;
            place-items: center;
            padding: 4px;
            border-color: rgba(255,255,255,.05);
            border-radius: 4px;
            background: #1c1c1c;
            box-shadow: none;
          }

          #info-close img {
            width: 16px;
            height: 16px;
            display: block;
          }

          .info-description {
            width: min(363px, 100%);
            min-height: 32px;
            margin: 0;
            color: #a3a3a3;
            font-size: 12px;
            line-height: 16px;
            font-weight: 400;
          }

          .info-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .info-section.interactions { gap: 6px; }

          .info-section-title {
            display: flex;
            align-items: center;
            min-height: 25px;
            padding: 4px 0;
            border-bottom: 1px solid rgba(255,255,255,.20);
            color: #ce5e12;
            font-size: 14px;
            line-height: 16px;
            font-weight: 500;
          }

          .shortcut-list, .interaction-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .shortcut-row {
            min-height: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
          }

          .shortcut-label {
            flex: 1 1 auto;
            min-width: 0;
            color: #a3a3a3;
          }

          .keys {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            color: #fff;
          }

          .key {
            min-width: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 8px;
            border: 1px solid rgba(255,255,255,.05);
            border-radius: 6px;
            background: #333;
            color: #fff;
            font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 12px;
            line-height: 16px;
            font-weight: 400;
            letter-spacing: -.12px;
            text-align: center;
            white-space: nowrap;
          }

          .interaction-row {
            min-height: 24px;
            display: grid;
            grid-template-columns: 200px minmax(0, 1fr);
            align-items: center;
            width: 100%;
          }

          .interaction-label { color: #a3a3a3; }
          .interaction-action { color: #fff; }
          .interaction-action .key { margin: 0 2px; }

          .info-footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,.20);
            font-size: 11px;
            line-height: 16px;
            text-align: center;
          }

          .footer-links {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .info-footer a {
            color: #5c5c5c;
            text-decoration: none;
          }

          .info-footer a:hover { color: #a3a3a3; }
          .info-footer .site-link { color: #7b7b7b; }

          @media (max-width: 460px) {
            #info-panel { right: 6px; width: calc(100vw - 12px); }
            .interaction-row { grid-template-columns: minmax(132px, 1fr) minmax(0, 1fr); gap: 8px; }
            .shortcut-row { align-items: flex-start; }
            .keys { gap: 5px; }
            .key { padding-inline: 6px; }
          }

          #guides, #measure {
            position: fixed;
            inset: 0;
            pointer-events: none;
          }

          #guides { z-index: 2; }
          #measure { z-index: 4; }

          .guide {
            position: fixed;
            pointer-events: auto;
            touch-action: none;
          }

          .guide::before {
            content: "";
            position: absolute;
            background: #F68C46;
          }

          .guide:hover::before {
            background: #F1934B;
          }

          .guide.selected::before {
            background: #4478C6;
          }

          .guide.vertical {
            top: ${RULER}px;
            bottom: 0;
            width: ${HIT}px;
            margin-left: -${Math.floor(HIT / 2)}px;
            cursor: ew-resize;
          }

          .guide.vertical::before {
            top: 0;
            bottom: 0;
            left: ${Math.floor(HIT / 2)}px;
            width: 1px;
          }

          .guide.horizontal {
            left: ${RULER}px;
            right: 0;
            height: ${HIT}px;
            margin-top: -${Math.floor(HIT / 2)}px;
            cursor: ns-resize;
          }

          .guide.horizontal::before {
            left: 0;
            right: 0;
            top: ${Math.floor(HIT / 2)}px;
            height: 1px;
          }

          .guide.selected::after {
            content: "";
            position: absolute;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #4478C6;
          }

          .guide.vertical.selected::after {
            left: ${Math.floor(HIT / 2) - 2}px;
            top: 5px;
          }

          .guide.horizontal.selected::after {
            top: ${Math.floor(HIT / 2) - 2}px;
            left: 5px;
          }

          #target {
            display: none;
            position: fixed;
            pointer-events: none;
            border: 1px solid rgba(65, 156, 255, .9);
            background: rgba(65, 156, 255, .045);
          }

          .measure-line {
            display: none;
            position: fixed;
            pointer-events: none;
            background: rgba(255, 78, 152, .95);
          }

          .measure-label, .position-label {
            display: none;
            position: fixed;
            pointer-events: none;
            min-width: 34px;
            padding: 2px 5px;
            border-radius: 4px;
            background: rgb(24, 24, 26);
            color: #fff;
            font: 500 10px/14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            text-align: center;
            white-space: nowrap;
            box-shadow: 0 1px 4px rgba(0,0,0,.28);
          }

          .measure-label {
            transform: translate(-50%, -50%);
          }

          .position-label {
            z-index: 5;
          }
        </style>
        <canvas id="h-ruler"></canvas>
        <canvas id="v-ruler"></canvas>
        <div id="corner" title="Double-click to clear guides"></div>
        <div id="top-actions">
          <button id="info" type="button" title="GuideLines info" aria-label="GuideLines info" aria-expanded="false">i</button>
          <button id="exit" type="button" title="Exit GuideLines">Exit GuideLines</button>
        </div>
        <aside id="info-panel" aria-hidden="true" aria-label="GuideLines shortcuts and interactions">
          <div class="info-intro">
            <div class="info-header">
              <div class="info-brand">
                <img class="info-logo" src="${LOGO_DATA}" alt="" width="24" height="24">
                <span class="info-name">GuideLines</span>
              </div>
              <button id="info-close" type="button" aria-label="Close GuideLines info"><img src="${CLOSE_DATA}" alt="" width="16" height="16"></button>
            </div>
            <p class="info-description">GuideLines is a lightweight tool for designers and developers to inspect layout and alignment on any webpage.</p>
          </div>

          <section class="info-section">
            <div class="info-section-title">Shortcuts</div>
            <div class="shortcut-list">
              <div class="shortcut-row"><span class="shortcut-label">Toggle GuideLines</span><span class="keys"><span class="key">Alt</span><span>+</span><span class="key">Shift</span><span>+</span><span class="key">R</span></span></div>
              <div class="shortcut-row"><span class="shortcut-label">Measure from selected GuideLine</span><span class="keys"><span>Hold</span><span class="key">Alt</span></span></div>
              <div class="shortcut-row"><span class="shortcut-label">Deselect GuideLine</span><span class="keys"><span class="key">Esc</span></span></div>
              <div class="shortcut-row"><span class="shortcut-label">Delete selected GuideLine</span><span class="keys"><span class="key">Del</span></span></div>
              <div class="shortcut-row"><span class="shortcut-label">Move horizontal GuideLine</span><span class="keys"><span class="key">↑</span><span class="key">↓</span></span></div>
              <div class="shortcut-row"><span class="shortcut-label">Move vertical GuideLine</span><span class="keys"><span class="key">←</span><span class="key">→</span></span></div>
              <div class="shortcut-row"><span class="shortcut-label">Move by 8px</span><span class="keys"><span class="key">Shift</span><span>+</span><span class="key">↑</span><span class="key">↓</span><span class="key">←</span><span class="key">→</span></span></div>
            </div>
          </section>

          <section class="info-section interactions">
            <div class="info-section-title">Interactions</div>
            <div class="interaction-list">
              <div class="interaction-row"><span class="interaction-label">Create GuideLine</span><span class="interaction-action">Drag from a ruler</span></div>
              <div class="interaction-row"><span class="interaction-label">Select GuideLine</span><span class="interaction-action">Click GuideLine</span></div>
              <div class="interaction-row"><span class="interaction-label">Delete by dragging</span><span class="interaction-action">Drag GuideLine back into ruler</span></div>
              <div class="interaction-row"><span class="interaction-label">Measure GuideLine-to-element</span><span class="interaction-action">Select GuideLine, hold <span class="key">Alt</span>, hover element</span></div>
              <div class="interaction-row"><span class="interaction-label">Measure GuideLine-to-GuideLine</span><span class="interaction-action">Select GuideLine, hold <span class="key">Alt</span>, hover another GuideLine</span></div>
              <div class="interaction-row"><span class="interaction-label">Clear all GuideLines</span><span class="interaction-action">Double-click ruler corner</span></div>
            </div>
          </section>

          <footer class="info-footer">
            <div class="footer-links">
              <a href="https://guidelines.thedanieldiya.com/terms" target="_blank" rel="noreferrer">Terms of Use</a>
              <a href="https://guidelines.thedanieldiya.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
            </div>
            <a class="site-link" href="https://guidelines.thedanieldiya.com" target="_blank" rel="noreferrer">guidelines.thedanieldiya.com</a>
          </footer>
        </aside>
        <div id="guides"></div>
        <div id="measure">
          <div id="target"></div>
          <div class="measure-line" id="line-a"></div>
          <div class="measure-label" id="label-a"></div>
          <div class="measure-line" id="line-b"></div>
          <div class="measure-label" id="label-b"></div>
          <div class="position-label" id="position-label"></div>
        </div>
      `;

      document.documentElement.appendChild(this.host);

      this.hCanvas = this.shadow.getElementById("h-ruler");
      this.vCanvas = this.shadow.getElementById("v-ruler");
      this.guidesLayer = this.shadow.getElementById("guides");
      this.targetBox = this.shadow.getElementById("target");
      this.lineA = this.shadow.getElementById("line-a");
      this.lineB = this.shadow.getElementById("line-b");
      this.labelA = this.shadow.getElementById("label-a");
      this.labelB = this.shadow.getElementById("label-b");
      this.positionLabel = this.shadow.getElementById("position-label");
      this.infoButton = this.shadow.getElementById("info");
      this.infoPanel = this.shadow.getElementById("info-panel");

      this.onViewportChange = this.onViewportChange.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      this.onBlur = this.onBlur.bind(this);

      this.hCanvas.addEventListener("pointerdown", (e) => this.startFromRuler(e, "horizontal"));
      this.vCanvas.addEventListener("pointerdown", (e) => this.startFromRuler(e, "vertical"));
      this.shadow.getElementById("corner").addEventListener("dblclick", () => this.clearGuides());
      this.shadow.getElementById("exit").addEventListener("click", () => this.toggle());
      this.infoButton.addEventListener("click", () => this.toggleInfo());
      this.shadow.getElementById("info-close").addEventListener("click", () => this.toggleInfo(false));

      window.addEventListener("pointermove", this.onPointerMove, true);
      window.addEventListener("pointerup", this.onPointerUp, true);
      window.addEventListener("scroll", this.onViewportChange, { passive: true });
      window.addEventListener("resize", this.onViewportChange, { passive: true });
      window.addEventListener("keydown", this.onKeyDown, true);
      window.addEventListener("keyup", this.onKeyUp, true);
      window.addEventListener("blur", this.onBlur);

      this.load();
      this.render();
    }

    toggleInfo(force) {
      this.infoOpen = typeof force === "boolean" ? force : !this.infoOpen;
      this.infoPanel.classList.toggle("open", this.infoOpen);
      this.infoPanel.setAttribute("aria-hidden", String(!this.infoOpen));
      this.infoButton.setAttribute("aria-expanded", String(this.infoOpen));
    }

    toggle() {
      this.enabled = !this.enabled;
      this.host.style.display = this.enabled ? "block" : "none";
      if (!this.enabled) {
        this.toggleInfo(false);
        this.altHeld = false;
        this.drag = null;
        this.hideMeasurement();
      } else {
        this.render();
      }
    }

    load() {
      chrome.storage.local.get([this.storageKey, this.legacyStorageKey], (result) => {
        const saved = Array.isArray(result[this.storageKey])
          ? result[this.storageKey]
          : result[this.legacyStorageKey];
        if (!Array.isArray(saved)) return;

        this.guides = saved
          .filter((g) => g && (g.axis === "vertical" || g.axis === "horizontal") && Number.isFinite(g.position))
          .map((g) => ({
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            axis: g.axis,
            position: Math.max(0, g.position)
          }));
        this.renderGuides();
        if (!Array.isArray(result[this.storageKey])) this.save();
      });
    }

    save() {
      const value = this.guides.map(({ axis, position }) => ({ axis, position: Math.round(position) }));
      chrome.storage.local.set({ [this.storageKey]: value });
    }

    clearGuides() {
      this.guides = [];
      this.selectedId = null;
      this.hideMeasurement();
      this.renderGuides();
      this.save();
    }

    deleteSelectedGuide() {
      if (!this.selectedId) return;
      this.guides = this.guides.filter((g) => g.id !== this.selectedId);
      this.selectedId = null;
      this.altHeld = false;
      this.hideMeasurement();
      this.renderGuides();
      this.save();
    }

    makeGuide(axis, position) {
      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        axis,
        position: Math.max(0, position)
      };
    }

    startFromRuler(event, axis) {
      if (!this.enabled || event.button !== 0) return;
      event.preventDefault();

      const position = axis === "vertical"
        ? event.clientX + window.scrollX
        : event.clientY + window.scrollY;
      const guide = this.makeGuide(axis, position);

      this.guides.push(guide);
      this.selectedId = guide.id;
      this.drag = { id: guide.id, axis, source: "ruler", pointerId: event.pointerId };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      this.renderGuides();
    }

    startGuideDrag(event, guide) {
      if (!this.enabled || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      this.selectedId = guide.id;
      this.drag = { id: guide.id, axis: guide.axis, source: "guide", pointerId: event.pointerId };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      this.hideMeasurement();
      this.renderGuides();
    }

    editGuide(guide) {
      const raw = prompt("Guide position (px)", String(Math.round(guide.position)));
      if (raw === null) return;
      const next = Number(raw.trim());
      if (!Number.isFinite(next) || next < 0) return;
      guide.position = next;
      this.renderGuides();
      this.save();
    }

    onPointerMove(event) {
      if (!this.enabled) return;
      this.lastPointer = { x: event.clientX, y: event.clientY };

      if (this.drag) {
        const guide = this.guides.find((g) => g.id === this.drag.id);
        if (!guide) return;

        guide.position = guide.axis === "vertical"
          ? Math.max(0, event.clientX + window.scrollX)
          : Math.max(0, event.clientY + window.scrollY);
        this.renderGuidePosition(guide);
        return;
      }

      if (this.altHeld && this.selectedId) {
        this.scheduleMeasurement(event.clientX, event.clientY);
      }
    }

    onPointerUp(event) {
      if (!this.enabled || !this.drag) return;

      const { id, axis } = this.drag;
      this.drag = null;

      const deleteGuide = axis === "vertical"
        ? event.clientX <= RULER
        : event.clientY <= RULER;

      if (deleteGuide) {
        this.guides = this.guides.filter((g) => g.id !== id);
        if (this.selectedId === id) this.selectedId = null;
      }

      this.renderGuides();
      this.save();
    }

    onKeyDown(event) {
      if (!this.enabled) return;

      if (event.key === "Delete" && this.selectedId) {
        event.preventDefault();
        event.stopPropagation();
        this.deleteSelectedGuide();
        return;
      }

      if (event.key === "Escape") {
        this.selectedId = null;
        this.altHeld = false;
        this.hideMeasurement();
        this.renderGuides();
        return;
      }

      if (this.selectedId && this.nudgeSelectedGuide(event)) {
        return;
      }

      if (event.key === "Alt" && this.selectedId) {
        this.altHeld = true;
        event.preventDefault();
        if (this.lastPointer) this.scheduleMeasurement(this.lastPointer.x, this.lastPointer.y);
      }
    }

    nudgeSelectedGuide(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return false;

      const guide = this.guides.find((g) => g.id === this.selectedId);
      if (!guide) return false;

      let direction = 0;

      if (guide.axis === "vertical") {
        if (event.key === "ArrowLeft") direction = -1;
        else if (event.key === "ArrowRight") direction = 1;
        else return false;
      } else {
        if (event.key === "ArrowUp") direction = -1;
        else if (event.key === "ArrowDown") direction = 1;
        else return false;
      }

      event.preventDefault();
      event.stopPropagation();

      const step = event.shiftKey ? 8 : 1;
      guide.position = Math.max(0, Math.round(guide.position) + direction * step);
      this.renderGuidePosition(guide);
      this.save();
      return true;
    }

    onKeyUp(event) {
      if (event.key !== "Alt") return;
      this.altHeld = false;
      this.hideMeasurement();
    }

    onBlur() {
      this.altHeld = false;
      this.drag = null;
      this.hideMeasurement();
    }

    onViewportChange() {
      if (!this.enabled) return;
      this.renderRulers();
      this.guides.forEach((g) => this.renderGuidePosition(g));
      if (this.altHeld && this.lastPointer) {
        this.scheduleMeasurement(this.lastPointer.x, this.lastPointer.y);
      }
    }

    render() {
      this.renderRulers();
      this.renderGuides();
    }

    resizeCanvas(canvas, cssWidth, cssHeight) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.floor(cssWidth));
      const height = Math.max(1, Math.floor(cssHeight));
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      return { ctx, width, height };
    }

    renderRulers() {
      const h = this.resizeCanvas(this.hCanvas, window.innerWidth - RULER, RULER);
      const v = this.resizeCanvas(this.vCanvas, RULER, window.innerHeight - RULER);
      this.drawHorizontal(h.ctx, h.width, h.height);
      this.drawVertical(v.ctx, v.width, v.height);
    }

    prepareRulerContext(ctx, width, height) {
      ctx.fillStyle = "rgba(19, 19, 20, .94)";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255,255,255,.23)";
      ctx.fillStyle = "rgba(255,255,255,.62)";
      ctx.lineWidth = 1;
      ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textBaseline = "top";
    }

    drawHorizontal(ctx, width, height) {
      this.prepareRulerContext(ctx, width, height);
      const start = Math.floor((window.scrollX + RULER) / MINOR) * MINOR;
      const end = window.scrollX + window.innerWidth + MINOR;

      for (let value = start; value <= end; value += MINOR) {
        const x = value - window.scrollX - RULER + 0.5;
        if (x < 0 || x > width) continue;
        const major = value % MAJOR === 0;
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - (major ? 7 : 4));
        ctx.stroke();
        if (major) ctx.fillText(String(value), x + 2, 2);
      }
    }

    drawVertical(ctx, width, height) {
      this.prepareRulerContext(ctx, width, height);
      const start = Math.floor((window.scrollY + RULER) / MINOR) * MINOR;
      const end = window.scrollY + window.innerHeight + MINOR;

      ctx.save();
      ctx.textBaseline = "top";
      for (let value = start; value <= end; value += MINOR) {
        const y = value - window.scrollY - RULER + 0.5;
        if (y < 0 || y > height) continue;
        const major = value % MAJOR === 0;
        ctx.beginPath();
        ctx.moveTo(width, y);
        ctx.lineTo(width - (major ? 7 : 4), y);
        ctx.stroke();

        if (major) {
          ctx.save();
          ctx.translate(2, y + 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(String(value), 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    renderGuides() {
      this.guidesLayer.replaceChildren();
      this.hideSelectedPosition();

      for (const guide of this.guides) {
        const el = document.createElement("div");
        el.className = `guide ${guide.axis}${guide.id === this.selectedId ? " selected" : ""}`;
        el.dataset.id = guide.id;
        el.addEventListener("pointerdown", (e) => this.startGuideDrag(e, guide));
        el.addEventListener("dblclick", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.selectedId = guide.id;
          this.editGuide(guide);
        });
        this.guidesLayer.appendChild(el);
        guide.el = el;
        this.renderGuidePosition(guide);
      }

      this.renderSelectedPosition();
    }

    renderGuidePosition(guide) {
      if (!guide.el) return;
      if (guide.axis === "vertical") {
        const x = Math.round(guide.position - window.scrollX);
        guide.el.style.left = `${x}px`;
      } else {
        const y = Math.round(guide.position - window.scrollY);
        guide.el.style.top = `${y}px`;
      }

      if (guide.id === this.selectedId) this.renderSelectedPosition(guide);
    }

    renderSelectedPosition(guide = null) {
      if (!this.selectedId) {
        this.hideSelectedPosition();
        return;
      }

      guide = guide || this.guides.find((g) => g.id === this.selectedId);
      if (!guide) {
        this.hideSelectedPosition();
        return;
      }

      const position = Math.round(guide.position);
      this.positionLabel.textContent = `${position}px`;
      this.positionLabel.style.display = "block";

      if (guide.axis === "vertical") {
        const x = Math.round(guide.position - window.scrollX);
        Object.assign(this.positionLabel.style, {
          left: `${x + 8}px`,
          top: `${RULER + 6}px`,
          transform: "none"
        });
      } else {
        const y = Math.round(guide.position - window.scrollY);
        Object.assign(this.positionLabel.style, {
          left: `${RULER + 6}px`,
          top: `${y - 6}px`,
          transform: "translateY(-100%)"
        });
      }
    }

    hideSelectedPosition() {
      this.positionLabel.style.display = "none";
    }

    scheduleMeasurement(x, y) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.measureAt(x, y);
      });
    }

    elementUnderPointer(x, y) {
      const stack = document.elementsFromPoint(x, y);
      return stack.find((el) => el !== this.host) || null;
    }

    guideUnderPointer(x, y, selectedGuide) {
      const candidates = this.guides.filter((guide) => {
        if (guide.id === selectedGuide.id || guide.axis !== selectedGuide.axis) return false;
        const viewportPosition = guide.position - (guide.axis === "vertical" ? window.scrollX : window.scrollY);
        const pointerPosition = guide.axis === "vertical" ? x : y;
        return Math.abs(pointerPosition - viewportPosition) <= HIT / 2 + 1;
      });

      if (!candidates.length) return null;

      const pointerPosition = selectedGuide.axis === "vertical" ? x : y;
      return candidates.sort((a, b) => {
        const ap = a.position - (a.axis === "vertical" ? window.scrollX : window.scrollY);
        const bp = b.position - (b.axis === "vertical" ? window.scrollX : window.scrollY);
        return Math.abs(pointerPosition - ap) - Math.abs(pointerPosition - bp);
      })[0];
    }

    measureGuideToGuide(selectedGuide, hoveredGuide, x, y) {
      this.targetBox.style.display = "none";

      if (selectedGuide.axis === "vertical") {
        const x1 = selectedGuide.position - window.scrollX;
        const x2 = hoveredGuide.position - window.scrollX;
        const measureY = Math.max(RULER + 12, Math.min(y, window.innerHeight - 12));
        this.showHorizontalMeasure(this.lineA, this.labelA, x1, x2, measureY);
      } else {
        const y1 = selectedGuide.position - window.scrollY;
        const y2 = hoveredGuide.position - window.scrollY;
        const measureX = Math.max(RULER + 12, Math.min(x, window.innerWidth - 12));
        this.showVerticalMeasure(this.lineA, this.labelA, y1, y2, measureX);
      }

      this.hidePair(this.lineB, this.labelB);
    }

    measureAt(x, y) {
      if (!this.enabled || !this.altHeld || !this.selectedId || this.drag) {
        this.hideMeasurement();
        return;
      }

      const guide = this.guides.find((g) => g.id === this.selectedId);
      if (!guide) {
        this.hideMeasurement();
        return;
      }

      const hoveredGuide = this.guideUnderPointer(x, y, guide);
      if (hoveredGuide) {
        this.measureGuideToGuide(guide, hoveredGuide, x, y);
        return;
      }

      const target = this.elementUnderPointer(x, y);
      if (!target) {
        this.hideMeasurement();
        return;
      }

      const rect = target.getBoundingClientRect();
      if (!Number.isFinite(rect.left) || rect.width === 0 && rect.height === 0) {
        this.hideMeasurement();
        return;
      }

      this.showTarget(rect);

      if (guide.axis === "vertical") {
        const gx = guide.position - window.scrollX;
        const cy = Math.max(rect.top, Math.min(y, rect.bottom));

        if (gx < rect.left) {
          this.showHorizontalMeasure(this.lineA, this.labelA, gx, rect.left, cy);
          this.hidePair(this.lineB, this.labelB);
        } else if (gx > rect.right) {
          this.showHorizontalMeasure(this.lineA, this.labelA, rect.right, gx, cy);
          this.hidePair(this.lineB, this.labelB);
        } else {
          this.showHorizontalMeasure(this.lineA, this.labelA, rect.left, gx, cy);
          this.showHorizontalMeasure(this.lineB, this.labelB, gx, rect.right, cy);
        }
      } else {
        const gy = guide.position - window.scrollY;
        const cx = Math.max(rect.left, Math.min(x, rect.right));

        if (gy < rect.top) {
          this.showVerticalMeasure(this.lineA, this.labelA, gy, rect.top, cx);
          this.hidePair(this.lineB, this.labelB);
        } else if (gy > rect.bottom) {
          this.showVerticalMeasure(this.lineA, this.labelA, rect.bottom, gy, cx);
          this.hidePair(this.lineB, this.labelB);
        } else {
          this.showVerticalMeasure(this.lineA, this.labelA, rect.top, gy, cx);
          this.showVerticalMeasure(this.lineB, this.labelB, gy, rect.bottom, cx);
        }
      }
    }

    showTarget(rect) {
      Object.assign(this.targetBox.style, {
        display: "block",
        left: `${Math.round(rect.left)}px`,
        top: `${Math.round(rect.top)}px`,
        width: `${Math.max(0, Math.round(rect.width))}px`,
        height: `${Math.max(0, Math.round(rect.height))}px`
      });
    }

    showHorizontalMeasure(line, label, x1, x2, y) {
      const left = Math.min(x1, x2);
      const width = Math.max(0, Math.abs(x2 - x1));
      const distance = Math.round(width);

      Object.assign(line.style, {
        display: "block",
        left: `${left}px`,
        top: `${Math.round(y)}px`,
        width: `${width}px`,
        height: "1px"
      });
      Object.assign(label.style, {
        display: "block",
        left: `${left + width / 2}px`,
        top: `${Math.round(y - 10)}px`
      });
      label.textContent = `${distance}px`;
    }

    showVerticalMeasure(line, label, y1, y2, x) {
      const top = Math.min(y1, y2);
      const height = Math.max(0, Math.abs(y2 - y1));
      const distance = Math.round(height);

      Object.assign(line.style, {
        display: "block",
        left: `${Math.round(x)}px`,
        top: `${top}px`,
        width: "1px",
        height: `${height}px`
      });
      Object.assign(label.style, {
        display: "block",
        left: `${Math.round(x + 24)}px`,
        top: `${top + height / 2}px`
      });
      label.textContent = `${distance}px`;
    }

    hidePair(line, label) {
      line.style.display = "none";
      label.style.display = "none";
    }

    hideMeasurement() {
      this.targetBox.style.display = "none";
      this.hidePair(this.lineA, this.labelA);
      this.hidePair(this.lineB, this.labelB);
    }
  }

  globalThis[GLOBAL_KEY] = new GuideLines();
})();
