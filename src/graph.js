import * as THREE from "three";
import * as math from "mathjs";

const DEFAULT_DOMAIN = { x: [-5, 5], y: [-5, 5] };

// ---------------------------------------------------------------------------
// Utilidades compartilhadas
// ---------------------------------------------------------------------------

/** Texto -> função (x, y) que devolve número ou NaN. */
export function compileExpr(expr) {
  const code = math.compile(expr);
  return (x, y = 0) => {
    try {
      const v = code.evaluate({ x, y });
      return typeof v === "number" && Number.isFinite(v) ? v : NaN;
    } catch {
      return NaN;
    }
  };
}

/** Confere se a expressão é válida e só usa as variáveis permitidas. */
export function validateExpr(expr, type) {
  if (!expr?.trim()) return { ok: false, error: "A expressão está vazia." };

  let tree;
  try {
    tree = math.parse(expr);
  } catch {
    return {
      ok: false,
      error: "Não entendi essa expressão. Confira parênteses e operadores.",
    };
  }

  const allowed = type === "2d" ? ["x"] : ["x", "y"];
  const unknown = tree
    .filter((node) => node.isSymbolNode)
    .map((node) => node.name)
    .filter((name) => !allowed.includes(name) && !(name in math));

  if (unknown.length) {
    return {
      ok: false,
      error: `Variável desconhecida: ${[...new Set(unknown)].join(", ")}.`,
    };
  }
  return { ok: true };
}

/** Faixa [min, max] ignorando os 2% mais extremos de cada lado. */
export function robustRange(values, cut = 0.02) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return [0, 0];
  const last = v.length - 1;
  return [v[Math.floor(cut * last)], v[Math.ceil((1 - cut) * last)]];
}

/**
 * Faixa automática para desenhar. Usa o mínimo e o máximo reais, a menos que
 * existam picos isolados (como em 1/x perto de zero): aí usa a faixa robusta.
 * pad acrescenta uma folga proporcional nas duas pontas.
 */
export function autoRange(values, pad = 0) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [0, 0];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const [lo, hi] = robustRange(finite);
  const [a, b] = max - min > 4 * (hi - lo) ? [lo, hi] : [min, max];
  const margin = (b - a) * pad;
  return [a - margin, b + margin];
}

const lerp = (a, b, t) => a + (b - a) * t;

/** Leva v de [lo, hi] para [0, 1]. Faixa vazia (função constante) vira 0.5. */
const toUnit = (v, lo, hi) => (hi > lo ? (v - lo) / (hi - lo) : 0.5);

const axisMaterial = () =>
  new THREE.LineBasicMaterial({
    color: 0x9aa3b2,
    transparent: true,
    opacity: 0.7,
  });

// ---------------------------------------------------------------------------
// Gráfico 2D: y = f(x), em pé sobre a folha
// ---------------------------------------------------------------------------

/**
 * yRange: "auto" ajusta a janela vertical à curva (ignora só picos isolados);
 * um array [min, max] fixa a janela, como numa calculadora gráfica.
 */
export function createGraph2D({
  expr,
  domain = DEFAULT_DOMAIN,
  yRange = "auto",
  size = 0.2,
  n = 200,
  thickness = size * 0.008,
}) {
  const f = compileExpr(expr);
  const [x0, x1] = domain.x;

  const samples = [];
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    samples.push([x, f(x)]);
  }

  const [y0, y1] =
    yRange === "auto"
      ? autoRange(
          samples.map(([, y]) => y),
          0.05,
        )
      : yRange;

  const width = size;
  const height = size * 0.6;
  // Base em 0: no AR, o gráfico fica apoiado na folha em vez de atravessá-la.
  const toPoint = (x, y) =>
    new THREE.Vector3(
      (toUnit(x, x0, x1) - 0.5) * width,
      toUnit(y, y0, y1) * height,
      0,
    );

  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x4f7cff });

  let piece = [];
  const flush = () => {
    if (piece.length >= 2) {
      const path = new THREE.CurvePath();
      for (let i = 1; i < piece.length; i++) {
        path.add(new THREE.LineCurve3(piece[i - 1], piece[i]));
      }
      const tubularSegments = Math.max(piece.length * 2, 32);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(path, tubularSegments, thickness, 8, false),
          material,
        ),
      );
    }
    piece = [];
  };

  for (const [x, y] of samples) {
    if (!Number.isFinite(y) || y < y0 || y > y1) {
      flush(); // ponto inexistente ou fora da janela: fecha o trecho
      continue;
    }
    piece.push(toPoint(x, y));
  }
  flush();

  // Eixos matemáticos: só aparecem se o zero estiver dentro da janela.
  const axis = [];
  if (y0 <= 0 && y1 >= 0) axis.push(toPoint(x0, 0), toPoint(x1, 0));
  if (x0 <= 0 && x1 >= 0) axis.push(toPoint(0, y0), toPoint(0, y1));
  if (axis.length) {
    group.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(axis),
        axisMaterial(),
      ),
    );
  }

  return group;
}

// ---------------------------------------------------------------------------
// Gráfico 3D: z = f(x, y), superfície deitada sobre a folha
// ---------------------------------------------------------------------------

export function generateSurface(f, domain, n = 60) {
  const [x0, x1] = domain.x;
  const [y0, y1] = domain.y;
  const side = n + 1;
  const pos = new Float32Array(side * side * 3);
  const valid = new Uint8Array(side * side);

  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const k = j * side + i;
      const x = lerp(x0, x1, i / n);
      const y = lerp(y0, y1, j / n);
      const z = f(x, y);
      valid[k] = Number.isNaN(z) ? 0 : 1;
      pos.set([x, valid[k] ? z : 0, y], k * 3); // altura no eixo Y da cena
    }
  }

  const index = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * side + i;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      if (valid[a] && valid[b] && valid[c] && valid[d])
        index.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.userData.valid = valid;
  return geo;
}

export function normalizeSurface(geo, size = 0.2) {
  const pos = geo.attributes.position;
  const valid = geo.userData.valid;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;

  const heights = [];
  for (let k = 0; k < pos.count; k++) {
    if (!valid || valid[k]) heights.push(pos.getY(k));
  }
  const [lo, hi] = autoRange(heights);
  const maxHeight = size * 0.6;

  for (let k = 0; k < pos.count; k++) {
    const x = toUnit(pos.getX(k), min.x, max.x) - 0.5;
    const z = toUnit(pos.getZ(k), min.z, max.z) - 0.5;
    const h = Math.min(hi, Math.max(lo, pos.getY(k)));
    pos.setXYZ(k, x * size, toUnit(h, lo, hi) * maxHeight, z * size);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

export function colorizeByHeight(geo) {
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  for (let k = 0; k < pos.count; k++) {
    const t = toUnit(pos.getY(k), min.y, max.y);
    color.setHSL(0.66 - 0.5 * t, 0.8, 0.5 + 0.1 * t); // azul, verde, amarelo
    colors.set([color.r, color.g, color.b], k * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function createAxes3D(size = 0.2) {
  const m = size / 2;
  const h = size * 0.65;
  // prettier-ignore
  const points = [
    -m, 0, 0,   m, 0, 0,  // x
     0, 0, -m,  0, 0, m,  // y da função (eixo Z da cena)
     0, 0, 0,   0, h, 0,  // altura
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(geo, axisMaterial());
}

export function createGraph3D({
  expr,
  domain = DEFAULT_DOMAIN,
  size = 0.2,
  n = 60,
}) {
  const f = compileExpr(expr);
  const geo = colorizeByHeight(
    normalizeSurface(generateSurface(f, domain, n), size),
  );

  const surface = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
    }),
  );
  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    }),
  );

  const group = new THREE.Group();
  group.add(surface, wireframe, createAxes3D(size));
  return group;
}

// ---------------------------------------------------------------------------
// Ponto de entrada usado pelo resto do app
// ---------------------------------------------------------------------------

/** O tipo vem do Gemini: "curva" -> "2d", "superficie" -> "3d". */
export const typeFromGemini = (tipo) => (tipo === "curva" ? "2d" : "3d");

export function createGraph({ type, ...options }) {
  return type === "2d" ? createGraph2D(options) : createGraph3D(options);
}

export function disposeGraph(group) {
  group.traverse((obj) => {
    obj.geometry?.dispose();
    obj.material?.dispose();
  });
  group.removeFromParent();
}
