// @ts-check
/**
 * @file src/materials/decals.js
 * @description 工业集装箱标贴、警示图标与字模纹理 Canvas 程序化生成器
 */

import * as THREE from "three";

const CanvasTexture = THREE.CanvasTexture;
const SRGBColorSpace = THREE.SRGBColorSpace;
const LinearMipmapLinearFilter = THREE.LinearMipmapLinearFilter;
const LinearFilter = THREE.LinearFilter;
const RepeatWrapping = THREE.RepeatWrapping;
const MeshStandardMaterial = THREE.MeshStandardMaterial;
const DoubleSide = THREE.DoubleSide;

var stencilFontStack =
    '"PingFang SC", "PingFang SC", "PingFang SC", Impact, "PingFang SC", Arial, sans-serif',
  sansFontStack = '"PingFang SC", "PingFang SC", "PingFang SC", Arial, sans-serif',
  monoFontStack = '"PingFang SC", "PingFang SC", Menlo, Consolas, monospace',
  PALETTE = {
    white: [226, 223, 213],
    black: [24, 24, 26],
    yellow: [222, 172, 30],
    red: [168, 36, 28],
    navy: [24, 38, 58],
    orange: [206, 100, 30],
  },
  rgba = (i, e = 1) => `rgba(${i[0]},${i[1]},${i[2]},${e})`,
  NO_BRIDGE_CHARS = new Set(["I", "1", " ", "-", ".", "/", ":", ",", "'", "!", "\xB7"]);
function createSeededRandom(seed) {
  let e = seed >>> 0;
  return () => {
    ((e |= 0), (e = (e + 1831565813) | 0));
    let t = Math.imul(e ^ (e >>> 15), 1 | e);
    return (
      (t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t),
      ((t ^ (t >>> 14)) >>> 0) / 4294967296
    );
  };
}
function hashString(text) {
  let e = 2166136261;
  for (let t = 0; t < text.length; t++) ((e ^= text.charCodeAt(t)), (e = Math.imul(e, 16777619)));
  return e >>> 0;
}
/**
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
function createCanvas(width, height) {
  if (typeof document === "undefined") {
    return /** @type {any} */ ({
      width,
      height,
      getContext: () => ({
        fillRect: () => {},
        rect: () => {},
        roundRect: () => {},
        strokeRect: () => {},
        arc: () => {},
        arcTo: () => {},
        ellipse: () => {},
        bezierCurveTo: () => {},
        quadraticCurveTo: () => {},
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        measureText: () => ({ width: 50 }),
        fillText: () => {},
        setTransform: () => {},
        scale: () => {},
        translate: () => {},
        rotate: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        font: "",
        textBaseline: "",
        fillStyle: "",
        strokeStyle: "",
        globalAlpha: 1,
        globalCompositeOperation: "",
      }),
    });
  }
  const t = document.createElement("canvas");
  t.width = width;
  t.height = height;
  return t;
}
function drawBlob(canvasContext, centerX, centerY, radius, random, jitter = 0.35, pointCount = 9) {
  canvasContext.beginPath();
  for (let a = 0; a < pointCount; a++) {
    let l = (a / pointCount) * Math.PI * 2,
      c = radius * (1 - jitter + random() * jitter * 2),
      u = centerX + Math.cos(l) * c,
      h = centerY + Math.sin(l) * c;
    a ? canvasContext.lineTo(u, h) : canvasContext.moveTo(u, h);
  }
  canvasContext.closePath();
}
function applyDistress(canvasContext, width, height, amount, random) {
  if (amount <= 0) return;
  (canvasContext.save(), (canvasContext.globalCompositeOperation = "destination-out"));
  let o = Math.floor((amount * width * height) / 700);
  for (let r = 0; r < o; r++) {
    let a = Math.pow(random(), 3) * height * 0.09 + 0.6;
    ((canvasContext.globalAlpha = 0.45 + random() * 0.55),
      drawBlob(canvasContext, random() * width, random() * height, a, random, 0.5, 7),
      canvasContext.fill());
  }
  canvasContext.lineCap = "round";
  for (let r = 0; r < amount * 16; r++) {
    let a = random() * width,
      l = random() * height,
      c = (random() - 0.5) * 0.7,
      u = (0.1 + random() * 0.5) * width;
    ((canvasContext.globalAlpha = 0.5 + random() * 0.5),
      (canvasContext.lineWidth = 0.5 + random() * random() * 3),
      canvasContext.beginPath(),
      canvasContext.moveTo(a, l),
      canvasContext.lineTo(a + Math.cos(c) * u, l + Math.sin(c) * u),
      canvasContext.stroke());
  }
  canvasContext.globalAlpha = 0.8;
  for (let r = 0; r < (amount * width * height) / 60; r++)
    canvasContext.fillRect(random() * width, random() * height, 1 + random(), 1 + random());
  for (let r = 0; r < amount * 6; r++) {
    let a = random() * width,
      l = random() * height,
      c = (0.1 + random() * 0.25) * height,
      u = canvasContext.createRadialGradient(a, l, 0, a, l, c);
    (u.addColorStop(0, "rgba(0,0,0," + (0.25 + random() * 0.4) + ")"),
      u.addColorStop(1, "rgba(0,0,0,0)"),
      (canvasContext.globalAlpha = 1),
      (canvasContext.fillStyle = u),
      canvasContext.fillRect(a - c, l - c, c * 2, c * 2));
  }
  canvasContext.restore();
}
function measureTextWidth(canvasContext, text, fontSize, fontFamily, weight, letterSpacing) {
  canvasContext.font = `${weight} ${fontSize}px ${fontFamily}`;
  let r = 0;
  for (let a of text) r += canvasContext.measureText(a).width + letterSpacing;
  return r - letterSpacing;
}
function drawText(canvasContext, text, centerX, baselineY, fontSize, color, options = {}) {
  let a =
      options.font === "sans"
        ? sansFontStack
        : options.font === "mono"
          ? monoFontStack
          : stencilFontStack,
    l = options.weight || 700,
    c = options.spacing !== void 0 ? options.spacing : fontSize * 0.06,
    u = options.font !== "sans" && options.font !== "mono" && options.bridges !== !1,
    h = measureTextWidth(canvasContext, text, fontSize, a, l, c),
    f = options.maxW && h > options.maxW ? options.maxW / h : options.fitW ? options.fitW / h : 1,
    p = createCanvas(Math.ceil(h * f) + 8, Math.ceil(fontSize * 1.4)),
    d = p.getContext("2d");
  ((d.font = `${l} ${fontSize}px ${a}`),
    (d.textBaseline = "alphabetic"),
    (d.fillStyle = color),
    d.scale(f, 1));
  let v = 4 / f,
    g = fontSize * 1.08;
  for (let y of text) {
    let b = d.measureText(y).width;
    (d.fillText(y, v, g),
      u &&
        !NO_BRIDGE_CHARS.has(y) &&
        (d.save(),
        (d.globalCompositeOperation = "destination-out"),
        d.fillRect(v + b * 0.5 - fontSize * 0.032, 0, fontSize * 0.064, fontSize * 1.4),
        d.restore()),
      (v += b + c));
  }
  let x =
    options.align === "center"
      ? centerX - (h * f) / 2
      : options.align === "right"
        ? centerX - h * f
        : centerX;
  return (canvasContext.drawImage(p, x - 4, baselineY - g), h * f);
}
function createDecalFactory(canvasContext, anisotropy = 4) {
  let t = new Map(),
    n = [],
    s = 0;
  function o(v, g = {}) {
    let x = new CanvasTexture(v);
    ((x.colorSpace = SRGBColorSpace),
      (x.anisotropy = anisotropy),
      (x.generateMipmaps = !0),
      (x.minFilter = LinearMipmapLinearFilter),
      (s += v.width * v.height * 4 * 1.34));
    let y = new MeshStandardMaterial({
      map: x,
      transparent: !0,
      depthWrite: !1,
      polygonOffset: !0,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      roughness: g.rough !== void 0 ? g.rough : 0.7,
      metalness: g.metal || 0,
      opacity: g.opacity !== void 0 ? g.opacity : 1,
    });
    return (
      (y.name = "decal"),
      g.doubleSide && (y.side = DoubleSide),
      { material: y, aspect: v.width / v.height, texture: x }
    );
  }
  function r(v, g, x, y, b = {}) {
    let m = createCanvas(g, x),
      A = m.getContext("2d"),
      _ = () => {
        (A.setTransform(1, 0, 0, 1, 0, 0),
          A.clearRect(0, 0, g, x),
          (A.globalAlpha = 1),
          (A.globalCompositeOperation = "source-over"),
          b.bleed && ((A.fillStyle = rgba(b.bleed, 0.012)), A.fillRect(0, 0, g, x)),
          y(A, g, x, createSeededRandom(hashString(v) + 17)));
      };
    _();
    let M = o(m, b);
    return (
      b.text &&
        n.push(() => {
          (_(), (M.texture.needsUpdate = !0));
        }),
      M
    );
  }
  function a(v, g, x, y) {
    ((v.lineJoin = "round"),
      v.beginPath(),
      v.moveTo(g / 2, x * 0.12),
      v.lineTo(g * 0.9, x * 0.84),
      v.lineTo(g * 0.1, x * 0.84),
      v.closePath(),
      (v.lineWidth = g * 0.11),
      (v.strokeStyle = rgba(PALETTE.black)),
      v.stroke(),
      (v.fillStyle = y),
      v.fill(),
      (v.lineWidth = g * 0.035),
      (v.strokeStyle = rgba(PALETTE.black)),
      v.stroke());
  }
  function l(v, g, x, y, b, m, A, _) {
    v.fillStyle = v.strokeStyle = rgba(y);
    let M = x;
    (v.save(),
      v.translate(M * 0.5, M * 0.5),
      b(v, M * 0.38, rgba(_ || y)),
      v.restore(),
      drawText(v, m, M * 1, x * 0.6, x * 0.42, rgba(y), {
        weight: 900,
        bridges: !1,
        maxW: g - M * 1.05,
        spacing: x * 0.012,
      }),
      (v.fillStyle = rgba(_ || y)),
      v.fillRect(M * 1, x * 0.67, g - M * 1.12, x * 0.022),
      drawText(v, A, M * 1, x * 0.84, x * 0.115, rgba(y), {
        font: "sans",
        weight: 600,
        spacing: x * 0.035,
        maxW: g - M * 1.1,
      }));
  }
  let c = {
      hazard_flammable: () =>
        r(
          "hazard_flammable",
          256,
          256,
          (v, g, x, y) => {
            (v.save(),
              v.translate(g / 2, x / 2),
              v.rotate(Math.PI / 4),
              (v.fillStyle = rgba(PALETTE.red)),
              v.fillRect(-86, -86, 172, 172),
              (v.strokeStyle = rgba(PALETTE.white)),
              (v.lineWidth = 5),
              v.strokeRect(-76, -76, 152, 152),
              v.restore(),
              v.save(),
              v.translate(g / 2, x / 2 - 8),
              (v.fillStyle = rgba(PALETTE.white)),
              v.beginPath(),
              v.moveTo(2, -64),
              v.bezierCurveTo(34, -28, 40, 6, 24, 28),
              v.bezierCurveTo(12, 44, -12, 44, -24, 28),
              v.bezierCurveTo(-40, 6, -20, -12, -15, -34),
              v.bezierCurveTo(-6, -28, 0, -44, 2, -64),
              v.fill(),
              (v.fillStyle = rgba(PALETTE.red)),
              v.beginPath(),
              v.moveTo(1, -10),
              v.bezierCurveTo(15, 6, 15, 24, 0, 31),
              v.bezierCurveTo(-15, 24, -13, 8, 1, -10),
              v.fill(),
              (v.fillStyle = rgba(PALETTE.white)),
              v.fillRect(-34, 50, 68, 6),
              v.restore(),
              drawText(v, "3", g / 2, x * 0.9, 34, rgba(PALETTE.white), {
                align: "center",
                weight: 900,
                bridges: !1,
              }),
              applyDistress(v, g, x, 0.3, y));
          },
          { bleed: PALETTE.red, text: !0 },
        ),
      hazard_voltage: () =>
        r(
          "hazard_voltage",
          256,
          256,
          (v, g, x, y) => {
            (a(v, g, x, rgba(PALETTE.yellow)),
              (v.fillStyle = rgba(PALETTE.black)),
              v.save(),
              v.translate(g / 2, x * 0.56),
              v.beginPath(),
              [
                [12, -58],
                [-24, 4],
                [-3, 4],
                [-16, 50],
                [26, -14],
                [5, -14],
                [22, -58],
              ].forEach((b, m) => (m ? v.lineTo(b[0], b[1]) : v.moveTo(b[0], b[1]))),
              v.closePath(),
              v.fill(),
              v.restore(),
              applyDistress(v, g, x, 0.3, y));
          },
          { bleed: PALETTE.yellow },
        ),
      hazard_general: () =>
        r(
          "hazard_general",
          256,
          256,
          (v, g, x, y) => {
            (a(v, g, x, rgba(PALETTE.yellow)),
              (v.fillStyle = rgba(PALETTE.black)),
              v.beginPath(),
              v.moveTo(g / 2 - 13, x * 0.34),
              v.lineTo(g / 2 + 13, x * 0.34),
              v.lineTo(g / 2 + 7, x * 0.62),
              v.lineTo(g / 2 - 7, x * 0.62),
              v.closePath(),
              v.fill(),
              v.beginPath(),
              v.arc(g / 2, x * 0.715, 11, 0, 7),
              v.fill(),
              applyDistress(v, g, x, 0.3, y));
          },
          { bleed: PALETTE.yellow },
        ),
      arrow: () =>
        r(
          "arrow",
          384,
          192,
          (v, g, x, y) => {
            ((v.fillStyle = rgba(PALETTE.white)),
              v.beginPath(),
              [
                [20, 68],
                [226, 68],
                [226, 22],
                [364, 96],
                [226, 170],
                [226, 124],
                [20, 124],
              ].forEach((b, m) => (m ? v.lineTo(b[0], b[1]) : v.moveTo(b[0], b[1]))),
              v.closePath(),
              v.fill(),
              (v.globalCompositeOperation = "destination-out"),
              v.fillRect(118, 0, 9, x),
              v.fillRect(232, 0, 7, x),
              (v.globalCompositeOperation = "source-over"),
              applyDistress(v, g, x, 0.5, y));
          },
          { bleed: PALETTE.white },
        ),
      no_entry: () =>
        r(
          "no_entry",
          256,
          256,
          (v, g, x, y) => {
            ((v.fillStyle = rgba(PALETTE.white)),
              v.beginPath(),
              v.arc(128, 128, 112, 0, 7),
              v.fill(),
              (v.fillStyle = rgba(PALETTE.red)),
              v.beginPath(),
              v.arc(128, 128, 102, 0, 7),
              v.fill(),
              (v.fillStyle = rgba(PALETTE.white)),
              v.fillRect(52, 106, 152, 44),
              applyDistress(v, g, x, 0.3, y));
          },
          { bleed: PALETTE.red },
        ),
      logo_a: () =>
        r(
          "logo_a",
          640,
          192,
          (v, g, x, y) => {
            (l(
              v,
              g,
              x,
              PALETTE.white,
              (b, m, A) => {
                ((b.lineWidth = m * 0.13),
                  b.beginPath(),
                  b.arc(0, 0, m * 0.92, 0.25 * Math.PI, 1.75 * Math.PI),
                  b.stroke(),
                  b.beginPath(),
                  b.moveTo(0, -m * 1.08),
                  b.lineTo(m * 0.26, 0),
                  b.lineTo(0, m * 0.62),
                  b.lineTo(-m * 0.26, 0),
                  b.closePath(),
                  b.fill(),
                  b.beginPath(),
                  b.moveTo(m * 0.5, 0),
                  b.lineTo(m * 1.12, -m * 0.1),
                  b.lineTo(m * 1.12, m * 0.1),
                  b.closePath(),
                  b.fill());
              },
              "NORDKAP LINE",
              "ARCTIC  ·  ATLANTIC  ·  FEEDER",
            ),
              applyDistress(v, g, x, 0.35, y));
          },
          { bleed: PALETTE.white, text: !0 },
        ),
      logo_b: () =>
        r(
          "logo_b",
          640,
          192,
          (v, g, x, y) => {
            (l(
              v,
              g,
              x,
              PALETTE.white,
              (b, m, A) => {
                b.fillStyle = A;
                for (let _ = 0; _ < 2; _++) {
                  let M = -m * 0.35 + _ * m * 0.55,
                    E = m * (0.3 - _ * 0.06);
                  (b.beginPath(),
                    b.moveTo(-m * 1.05, M - m * 0.25),
                    b.quadraticCurveTo(-m * 0.3, M - m * 0.2, 0, M + m * 0.35),
                    b.quadraticCurveTo(m * 0.3, M - m * 0.2, m * 1.05, M - m * 0.25),
                    b.quadraticCurveTo(m * 0.35, M + E * 0.2, 0, M + m * 0.35 + E),
                    b.quadraticCurveTo(-m * 0.35, M + E * 0.2, -m * 1.05, M - m * 0.25),
                    b.fill());
                }
              },
              "TERN OCEANIC",
              "CONTAINER SERVICES",
              PALETTE.orange,
            ),
              applyDistress(v, g, x, 0.35, y));
          },
          { bleed: PALETTE.white, text: !0 },
        ),
      logo_c: () =>
        r(
          "logo_c",
          640,
          192,
          (v, g, x, y) => {
            (l(
              v,
              g,
              x,
              PALETTE.navy,
              (b, m, A) => {
                (b.beginPath(),
                  b.arc(0, m * 0.25, m * 0.55, Math.PI, 0),
                  b.closePath(),
                  b.fill(),
                  (b.lineWidth = m * 0.1),
                  (b.lineCap = "butt"));
                for (let _ = 0; _ < 7; _++) {
                  let M = Math.PI + ((_ + 0.5) / 7) * Math.PI;
                  (b.beginPath(),
                    b.moveTo(Math.cos(M) * m * 0.7, m * 0.25 + Math.sin(M) * m * 0.7),
                    b.lineTo(Math.cos(M) * m * 1.05, m * 0.25 + Math.sin(M) * m * 1.05),
                    b.stroke());
                }
                (b.fillRect(-m * 1.05, m * 0.42, m * 2.1, m * 0.13),
                  b.fillRect(-m * 0.8, m * 0.68, m * 1.6, m * 0.1));
              },
              "AUREL PACIFIC",
              "DEEP SEA  ·  REEFER  ·  BULK",
            ),
              applyDistress(v, g, x, 0.35, y));
          },
          { bleed: PALETTE.navy, text: !0 },
        ),
      logo_d: () =>
        r(
          "logo_d",
          640,
          192,
          (v, g, x, y) => {
            (l(
              v,
              g,
              x,
              PALETTE.white,
              (b, m, A) => {
                (b.fillRect(-m, -m, m * 0.5, m * 2),
                  b.fillRect(m * 0.5, -m, m * 0.5, m * 2),
                  b.fillRect(-m, -m * 0.2, m * 2, m * 0.4),
                  (b.fillStyle = A),
                  b.fillRect(-m * 0.32, -m, m * 0.64, m * 0.5),
                  b.fillRect(-m * 0.32, m * 0.5, m * 0.64, m * 0.5));
              },
              "HOLMGARD",
              "INTERMODAL  FREIGHT",
              PALETTE.yellow,
            ),
              applyDistress(v, g, x, 0.35, y));
          },
          { bleed: PALETTE.white, text: !0 },
        ),
      berth4: () =>
        r(
          "berth4",
          640,
          224,
          (v, g, x, y) => {
            ((v.strokeStyle = rgba(PALETTE.yellow)),
              (v.lineWidth = 12),
              v.strokeRect(14, 14, g - 28, x - 28),
              (v.globalCompositeOperation = "destination-out"));
            for (let b of [g * 0.25, g * 0.75]) v.fillRect(b - 6, 0, 12, x);
            ((v.globalCompositeOperation = "source-over"),
              drawText(v, "BERTH 4", g / 2, x * 0.76, x * 0.66, rgba(PALETTE.yellow), {
                align: "center",
                weight: 900,
                maxW: g - 80,
              }),
              applyDistress(v, g, x, 0.55, y));
          },
          { bleed: PALETTE.yellow, text: !0 },
        ),
      caution_stripes: () =>
        r(
          "caution_stripes",
          512,
          128,
          (v, g, x, y) => {
            ((v.fillStyle = rgba(PALETTE.black)),
              v.fillRect(0, 8, g, x - 16),
              v.save(),
              v.beginPath(),
              v.rect(0, 8, g, x - 16),
              v.clip(),
              (v.fillStyle = rgba(PALETTE.yellow)));
            for (let b = -x; b < g + x; b += 64)
              (v.beginPath(),
                v.moveTo(b, x),
                v.lineTo(b + 32, x),
                v.lineTo(b + 32 + x, 0),
                v.lineTo(b + x, 0),
                v.closePath(),
                v.fill());
            (v.restore(), applyDistress(v, g, x, 0.5, y));
          },
          { bleed: PALETTE.black },
        ),
      grime_streak: () =>
        r(
          "grime_streak",
          128,
          256,
          (v, g, x, y) => {
            for (let b = 0; b < 46; b++) {
              let m = g * (0.12 + 0.76 * (y() * 0.5 + y() * 0.5)),
                A = x * (0.25 + y() * 0.7),
                _ = 1.5 + y() * y() * 12,
                M = 0.05 + y() * 0.16,
                E = v.createLinearGradient(0, 0, 0, A);
              (E.addColorStop(0, `rgba(26,23,19,${M})`),
                E.addColorStop(0.15, `rgba(26,23,19,${M * 1.3})`),
                E.addColorStop(1, "rgba(26,23,19,0)"),
                (v.fillStyle = E),
                v.fillRect(m - _ / 2 + (y() - 0.5) * 2, 0, _, A));
            }
          },
          { rough: 0.85, bleed: [26, 23, 19] },
        ),
      rust_run: () =>
        r(
          "rust_run",
          128,
          256,
          (v, g, x, y) => {
            for (let b = 0; b < 40; b++) {
              let m = g * (0.2 + 0.6 * (y() * 0.5 + y() * 0.5)),
                A = x * (0.2 + y() * 0.75),
                _ = 1.2 + y() * y() * 9,
                M = 0.08 + y() * 0.22,
                E = y() < 0.5 ? "118,52,18" : "150,78,26",
                w = v.createLinearGradient(0, 8, 0, A);
              (w.addColorStop(0, `rgba(${E},${M * 1.4})`),
                w.addColorStop(0.3, `rgba(${E},${M})`),
                w.addColorStop(1, `rgba(${E},0)`),
                (v.fillStyle = w),
                v.fillRect(m - _ / 2, 8, _, A));
            }
            for (let b = 0; b < 9; b++)
              ((v.fillStyle = `rgba(${y() < 0.5 ? "70,30,14" : "104,44,16"},${0.5 + y() * 0.4})`),
                drawBlob(v, g * (0.3 + y() * 0.4), 6 + y() * 12, 3 + y() * 8, y, 0.5, 7),
                v.fill());
          },
          { rough: 0.9, bleed: [118, 52, 18] },
        ),
      oil_stain: () =>
        r(
          "oil_stain",
          256,
          256,
          (v, g, x, y) => {
            for (let b = 0; b < 26; b++) {
              let m = y() * 7,
                A = Math.pow(y(), 1.5) * g * 0.26,
                _ = g / 2 + Math.cos(m) * A,
                M = x / 2 + Math.sin(m) * A * 0.8,
                E = g * (0.06 + y() * 0.16),
                w = v.createRadialGradient(_, M, E * 0.2, _, M, E);
              (w.addColorStop(0, `rgba(10,10,11,${0.35 + y() * 0.3})`),
                w.addColorStop(0.75, "rgba(12,11,10,0.22)"),
                w.addColorStop(1, "rgba(12,11,10,0)"),
                (v.fillStyle = w),
                v.fillRect(_ - E, M - E, E * 2, E * 2));
            }
            for (let b = 0; b < 30; b++) {
              v.fillStyle = `rgba(10,10,11,${0.3 + y() * 0.4})`;
              let m = y() * 7,
                A = g * (0.25 + y() * 0.2);
              (v.beginPath(),
                v.arc(g / 2 + Math.cos(m) * A, x / 2 + Math.sin(m) * A, 1 + y() * 4, 0, 7),
                v.fill());
            }
          },
          { rough: 0.12, bleed: [10, 10, 11] },
        ),
      leak_stain: () =>
        r(
          "leak_stain",
          192,
          256,
          (v, g, x, y) => {
            for (let b = 0; b < 18; b++) {
              let m = g * (0.3 + y() * 0.4),
                A = x * (0.12 + y() * 0.2),
                _ = g * (0.1 + y() * 0.2),
                M = v.createRadialGradient(m, A, _ * 0.5, m, A, _);
              (M.addColorStop(0, "rgba(150,146,130,0.0)"),
                M.addColorStop(0.8, `rgba(168,162,140,${0.18 + y() * 0.2})`),
                M.addColorStop(1, "rgba(168,162,140,0)"),
                (v.fillStyle = M),
                v.fillRect(m - _, A - _, _ * 2, _ * 2));
            }
            for (let b = 0; b < 22; b++) {
              let m = g * (0.25 + 0.5 * y()),
                A = x * (0.3 + y() * 0.6),
                _ = 2 + y() * 9,
                M = 0.08 + y() * 0.16,
                E = y() < 0.6 ? "160,154,132" : "60,66,52",
                w = v.createLinearGradient(0, x * 0.2, 0, x * 0.2 + A);
              (w.addColorStop(0, `rgba(${E},${M})`),
                w.addColorStop(1, `rgba(${E},0)`),
                (v.fillStyle = w),
                v.fillRect(m, x * 0.2, _, A));
            }
          },
          { rough: 0.8, bleed: [160, 154, 132] },
        ),
      bullet_metal: () =>
        r(
          "bullet_metal",
          128,
          128,
          (v, g, x, y) => {
            ((v.fillStyle = "rgba(96,52,40,0.9)"),
              drawBlob(v, 64, 64, 30, y, 0.4, 11),
              v.fill(),
              (v.fillStyle = "rgba(150,152,156,0.95)"),
              drawBlob(v, 64, 64, 22, y, 0.3, 12),
              v.fill(),
              (v.strokeStyle = "rgba(205,207,210,0.9)"),
              (v.lineWidth = 1));
            for (let m = 0; m < 14; m++) {
              let A = y() * 7;
              (v.beginPath(),
                v.moveTo(64 + Math.cos(A) * 9, 64 + Math.sin(A) * 9),
                v.lineTo(64 + Math.cos(A) * (16 + y() * 10), 64 + Math.sin(A) * (16 + y() * 10)),
                v.stroke());
            }
            let b = v.createRadialGradient(64, 64, 2, 64, 64, 12);
            (b.addColorStop(0, "rgba(4,4,5,1)"),
              b.addColorStop(0.75, "rgba(10,10,12,1)"),
              b.addColorStop(1, "rgba(70,72,76,0.9)"),
              (v.fillStyle = b),
              drawBlob(v, 64, 64, 12, y, 0.15, 12),
              v.fill(),
              (v.strokeStyle = "rgba(230,232,235,0.85)"),
              (v.lineWidth = 1.5),
              v.beginPath(),
              v.arc(64, 64, 12.5, 3.6, 5.6),
              v.stroke());
          },
          { rough: 0.4, metal: 0.8, bleed: [96, 52, 40] },
        ),
      bullet_concrete: () =>
        r(
          "bullet_concrete",
          128,
          128,
          (v, g, x, y) => {
            let b = v.createRadialGradient(64, 64, 20, 64, 64, 60);
            (b.addColorStop(0, "rgba(176,172,162,0.5)"),
              b.addColorStop(1, "rgba(176,172,162,0)"),
              (v.fillStyle = b),
              v.fillRect(0, 0, g, x),
              (v.fillStyle = "rgba(168,164,154,0.95)"),
              drawBlob(v, 64, 64, 32, y, 0.35, 13),
              v.fill(),
              (v.fillStyle = "rgba(120,116,108,0.95)"),
              drawBlob(v, 65, 66, 20, y, 0.35, 11),
              v.fill(),
              (v.strokeStyle = "rgba(40,38,36,0.8)"),
              (v.lineWidth = 1));
            for (let A = 0; A < 6; A++) {
              let _ = y() * 7,
                M = 64 + Math.cos(_) * 14,
                E = 64 + Math.sin(_) * 14;
              (v.beginPath(), v.moveTo(M, E));
              for (let w = 0; w < 5; w++)
                ((_ += (y() - 0.5) * 0.9),
                  (M += Math.cos(_) * 8),
                  (E += Math.sin(_) * 8),
                  v.lineTo(M, E));
              v.stroke();
            }
            let m = v.createRadialGradient(64, 64, 1, 64, 64, 11);
            (m.addColorStop(0, "rgba(18,17,16,1)"),
              m.addColorStop(1, "rgba(60,58,54,0.95)"),
              (v.fillStyle = m),
              drawBlob(v, 64, 64, 10, y, 0.3, 9),
              v.fill());
            for (let A = 0; A < 40; A++) {
              v.fillStyle = `rgba(${y() < 0.5 ? "90,86,80" : "190,186,176"},0.8)`;
              let _ = y() * 7,
                M = 10 + y() * 24;
              v.fillRect(64 + Math.cos(_) * M, 64 + Math.sin(_) * M, 1 + y() * 2, 1 + y() * 2);
            }
          },
          { rough: 0.95, bleed: [168, 164, 154] },
        ),
      scorch: () =>
        r(
          "scorch",
          256,
          256,
          (v, g, x, y) => {
            for (let b = 0; b < 40; b++) {
              let m = y() * 7,
                A = Math.pow(y(), 1.2) * g * 0.3,
                _ = g / 2 + Math.cos(m) * A,
                M = x / 2 + Math.sin(m) * A,
                E = g * (0.07 + y() * 0.15) * (1.2 - A / (g * 0.4)),
                w = v.createRadialGradient(_, M, 0, _, M, Math.max(4, E));
              (w.addColorStop(0, `rgba(8,7,6,${0.3 + y() * 0.3})`),
                w.addColorStop(1, "rgba(8,7,6,0)"),
                (v.fillStyle = w),
                v.fillRect(0, 0, g, x));
            }
            v.strokeStyle = "rgba(8,7,6,0.25)";
            for (let b = 0; b < 50; b++) {
              let m = y() * 7,
                A = g * 0.1,
                _ = g * (0.25 + y() * 0.22);
              ((v.lineWidth = 1 + y() * 3),
                v.beginPath(),
                v.moveTo(g / 2 + Math.cos(m) * A, x / 2 + Math.sin(m) * A),
                v.lineTo(g / 2 + Math.cos(m) * _, x / 2 + Math.sin(m) * _),
                v.stroke());
            }
          },
          { rough: 0.95, bleed: [8, 7, 6] },
        ),
      crack: () =>
        r(
          "crack",
          256,
          256,
          (v, g, x, y) => {
            ((v.lineCap = "round"), (v.lineJoin = "round"));
            let b = (m, A, _, M, E, w) => {
              ((v.strokeStyle = `rgba(20,19,18,${0.6 + 0.35 * Math.min(1, E / 2.5)})`),
                (v.lineWidth = E),
                v.beginPath(),
                v.moveTo(m, A));
              let S = Math.floor(M / 9);
              for (let z = 0; z < S; z++)
                ((_ += (y() - 0.5) * 0.8),
                  (m += Math.cos(_) * 9),
                  (A += Math.sin(_) * 9),
                  v.lineTo(m, A),
                  w > 0 &&
                    y() < 0.22 &&
                    (v.stroke(),
                    b(
                      m,
                      A,
                      _ + (y() < 0.5 ? 1 : -1) * (0.5 + y() * 0.7),
                      M * (0.3 + y() * 0.3),
                      E * 0.6,
                      w - 1,
                    ),
                    (v.strokeStyle = `rgba(20,19,18,${0.6 + 0.35 * Math.min(1, E / 2.5)})`),
                    (v.lineWidth = E),
                    v.beginPath(),
                    v.moveTo(m, A)));
              v.stroke();
            };
            (b(g * 0.5, x * 0.5, y() * 7, g * 0.42, 2.6, 3),
              b(g * 0.5, x * 0.5, y() * 7 + 2, g * 0.4, 2.2, 3),
              b(g * 0.5, x * 0.5, y() * 7 + 4, g * 0.36, 1.8, 2));
          },
          { rough: 0.95, bleed: [20, 19, 18] },
        ),
      graffiti_tag: () =>
        r(
          "graffiti_tag",
          384,
          256,
          (v, g, x, y) => {
            ((v.lineCap = "round"), (v.lineJoin = "round"));
            let b = (_, M, E) => {
                ((v.strokeStyle = E), (v.lineWidth = M), v.beginPath(), v.moveTo(_[0][0], _[0][1]));
                for (let w = 1; w < _.length - 1; w += 2)
                  v.quadraticCurveTo(_[w][0], _[w][1], _[w + 1][0], _[w + 1][1]);
                v.stroke();
              },
              m = "rgba(206,214,208,0.92)",
              A = [
                [
                  [40, 60],
                  [36, 130],
                  [48, 200],
                  [70, 150],
                  [44, 128],
                  [80, 110],
                  [104, 70],
                ],
                [
                  [104, 70],
                  [76, 140],
                  [108, 190],
                  [150, 200],
                  [150, 110],
                  [140, 60],
                  [112, 84],
                ],
                [
                  [168, 196],
                  [172, 120],
                  [186, 62],
                  [200, 110],
                  [226, 92],
                  [214, 150],
                  [236, 196],
                ],
                [
                  [250, 76],
                  [300, 60],
                  [318, 66],
                  [282, 110],
                  [262, 178],
                  [300, 200],
                  [334, 176],
                ],
              ];
            for (let _ of A) (b(_, 12, "rgba(206,214,208,0.25)"), b(_, 7, m));
            (b(
              [
                [30, 222],
                [180, 236],
                [352, 206],
              ],
              5,
              m,
            ),
              b(
                [
                  [330, 40],
                  [344, 30],
                  [356, 44],
                ],
                5,
                m,
              ));
            for (let _ = 0; _ < 7; _++) {
              let M = 50 + y() * 290,
                E = 150 + y() * 50,
                w = 12 + y() * 46,
                S = v.createLinearGradient(0, E, 0, E + w);
              (S.addColorStop(0, m),
                S.addColorStop(1, "rgba(206,214,208,0)"),
                (v.fillStyle = S),
                v.fillRect(M, E, 2 + y() * 2, w));
            }
            for (let _ = 0; _ < 260; _++)
              ((v.fillStyle = `rgba(206,214,208,${y() * 0.5})`),
                v.fillRect(30 + y() * 330, 40 + y() * 190, 1.2, 1.2));
            applyDistress(v, g, x, 0.25, y);
          },
          { rough: 0.6, bleed: [206, 214, 208] },
        ),
      csc_plate: () =>
        r(
          "csc_plate",
          288,
          200,
          (v, g, x, y) => {
            let b = v.createLinearGradient(0, 0, g, x);
            (b.addColorStop(0, "rgb(150,152,150)"),
              b.addColorStop(0.5, "rgb(176,178,176)"),
              b.addColorStop(1, "rgb(138,140,138)"),
              (v.fillStyle = b),
              v.beginPath(),
              v.roundRect ? v.roundRect(3, 3, g - 6, x - 6, 8) : v.rect(3, 3, g - 6, x - 6),
              v.fill(),
              (v.strokeStyle = "rgba(40,42,44,0.8)"),
              (v.lineWidth = 2),
              v.strokeRect(11, 11, g - 22, x - 22));
            for (let [_, M] of [
              [20, 20],
              [g - 20, 20],
              [20, x - 20],
              [g - 20, x - 20],
            ])
              ((v.fillStyle = "rgb(96,98,98)"),
                v.beginPath(),
                v.arc(_, M, 5, 0, 7),
                v.fill(),
                (v.fillStyle = "rgba(230,232,232,0.7)"),
                v.beginPath(),
                v.arc(_ - 1.2, M - 1.2, 2, 0, 7),
                v.fill());
            let m = "rgba(28,30,32,0.92)";
            (drawText(v, "SAFETY APPROVAL PLATE", g / 2, 46, 19, m, {
              font: "sans",
              weight: 600,
              align: "center",
              spacing: 1.5,
              maxW: g - 60,
            }),
              [
                "APPROVAL REF   SL/PA-4207/19",
                "DATE MANUFACTURED   03/2019",
                "IDENT NO   SLTU 402719 6",
                "MAX GROSS   30 480 KG",
                "STACKING LOAD   192 000 KG",
                "RACKING TEST   150 KN",
                "NEXT EXAM   09/2027",
              ].forEach((_, M) => {
                (drawText(v, _, 30, 70 + M * 16.5, 11, m, {
                  font: "mono",
                  weight: 500,
                  spacing: 0,
                  maxW: g - 60,
                }),
                  (v.fillStyle = "rgba(28,30,32,0.35)"),
                  v.fillRect(30, 73 + M * 16.5, g - 60, 1));
              }),
              (v.fillStyle = "rgba(60,40,24,0.25)"));
            for (let _ = 0; _ < 30; _++)
              (drawBlob(v, y() * g, y() * x, 2 + y() * 9, y, 0.5, 7), v.fill());
          },
          { rough: 0.45, metal: 0.75, text: !0 },
        ),
      numbers_0_9: () =>
        r(
          "numbers_0_9",
          640,
          128,
          (v, g, x, y) => {
            for (let b = 0; b < 10; b++)
              drawText(v, String(b), b * 64 + 32, x * 0.86, x * 0.92, rgba(PALETTE.white), {
                align: "center",
                weight: 900,
                maxW: 54,
              });
            applyDistress(v, g, x, 0.3, y);
          },
          { bleed: PALETTE.white, text: !0 },
        ),
    },
    u = Object.keys(c),
    h = new Set();
  function f(v) {
    let g = t.get("d:" + v);
    if (g) return g;
    let x = c[v];
    if (!x)
      (h.has(v) || (h.add(v), console.warn(`[mats] unknown decal "${v}"`)),
        (g = f("grime_streak")));
    else {
      let y = x();
      ((g = { material: y.material, aspect: y.aspect }), (g.material.name = "decal_" + v));
    }
    return (t.set("d:" + v, g), g);
  }
  function p(v) {
    let g = "n:" + v,
      x = t.get(g);
    if (x) return x;
    let y = f("numbers_0_9").material,
      b = y.map.clone();
    (b.repeat.set(0.1, 1), b.offset.set((Math.abs(v | 0) % 10) / 10, 0), (b.needsUpdate = !0));
    let m = y.clone();
    return (
      (m.map = b),
      n.push(() => {
        b.needsUpdate = !0;
      }),
      (x = { material: m, aspect: 0.5 }),
      t.set(g, x),
      x
    );
  }
  function d(v, g = {}) {
    v = String(v === void 0 ? "" : v).toUpperCase() || " ";
    let x = PALETTE[g.color] ? g.color : "white",
      y = g.font === "sans" ? "sans" : "stencil",
      b = g.distress !== void 0 ? +g.distress : 0.35,
      m = `l:${v}|${x}|${y}|${b}`,
      A = t.get(m);
    if (A) return A;
    let _ = 128,
      M = 100,
      E = createCanvas(4, 4).getContext("2d"),
      w = y === "sans" ? sansFontStack : stencilFontStack,
      S = y === "sans" ? 600 : 700,
      z = M * 0.06,
      H = measureTextWidth(E, v, M, w, S, z),
      O = Math.min(1, 2e3 / (H + 32)),
      q = Math.max(48, Math.ceil((H + 32) * O)),
      U = Math.ceil(_ * O),
      T = r(
        m,
        q,
        U,
        (D, C, G, j) => {
          (D.save(),
            D.scale(O, O),
            drawText(D, v, 16, _ * 0.84, M, rgba(PALETTE[x]), {
              font: y,
              weight: S,
              spacing: z,
              fitW: H,
            }),
            D.restore(),
            applyDistress(D, C, G, b, j));
        },
        { bleed: PALETTE[x], text: !0, rough: 0.65 },
      );
    return (
      (A = { material: T.material, aspect: T.aspect }),
      (A.material.name = "label"),
      t.set(m, A),
      A
    );
  }
  try {
    if (typeof document < "u" && document.fonts && document.fonts.load) {
      let v = 0,
        g = () => {
          v = 0;
          for (let x of n)
            try {
              x();
            } catch {}
        };
      for (let x of [
        '700 20px "PingFang SC"',
        '900 20px "PingFang SC"',
        '600 20px "PingFang SC"',
        '500 20px "PingFang SC"',
      ])
        document.fonts.load(x).then(
          (y) => {
            y && y.length && !v && (v = setTimeout(g, 120));
          },
          () => {},
        );
    }
  } catch {}
  return { decal: f, label: d, number: p, names: u, bytes: () => s };
}

export {
  stencilFontStack,
  sansFontStack,
  monoFontStack,
  PALETTE,
  rgba,
  NO_BRIDGE_CHARS,
  createSeededRandom,
  hashString,
  createCanvas,
  drawBlob,
  applyDistress,
  measureTextWidth,
  drawText,
  createDecalFactory,
};
