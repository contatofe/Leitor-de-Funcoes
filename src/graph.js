import * as THREE from "three";
import * as math from "mathjs";

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

export function generateSurface(f, domain, n = 60) {
  const [x0, x1] = domain.x;
  const [y0, y1] = domain.y;
  const side = n + 1;
  const pos = new Float32Array(side * side * 3);
  const valid = new Uint8Array(side * side);

  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const k = j * side + i;
      const x = x0 + (x1 - x0) * (i / n);
      const y = y0 + (y1 - y0) * (j / n);
      const z = f(x, y);
      valid[k] = Number.isNaN(z) ? 0 : 1;
      pos.set([x, valid[k] ? z : 0, y], k * 3);
    }
  }

  const index = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * side + i,
        b = a + 1,
        c = a + side,
        d = c + 1;
      if (valid[a] && valid[b] && valid[c] && valid[d]) {
        index.push(a, c, b, b, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.userData.valid = valid;
  return geo;
}

export function Robust(values, threshold = 0.02) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return [0, 0];
  const last = v.length - 1;
  return [
    v[Math.floor(threshold * last)],
    v[Math.ceil((1 - threshold) * last)],
  ];
}

export function normalize(geo, size = 0.2) {
  const pos = geo.attributes.position;
  const valid = geo.userData.valid;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;

  const height = [];
  for (let k = 0; k < pos.count; k++) {
    if (!valid || valid[k]) height.push(pos.getY(k));
  }
  const [lo, hi] = Robust(height);
  const maxHeight = size * 0.6;

  for (let k = 0; k < pos.count; k++) {
    const x = (pos.getX(k) - min.x) / (max.x - min.x || 1) - 0.5;
    const z = (pos.getZ(k) - min.z) / (max.z - min.z || 1) - 0.5;
    const h = Math.min(hi, Math.max(lo, pos.getY(k)));
    const y = hi > lo ? (h - lo) / (hi - lo) : 0.5;
    pos.setXYZ(k, x * size, y * maxHeight, z * size);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

export function heightColorize(geo) {
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  for (let k = 0; k < pos.count; k++) {
    const t = (pos.getY(k) - min.y) / (max.y - min.y || 1);
    color.setHSL(0.66 - 0.5 * t, 0.8, 0.5 + 0.1 * t); // azul, verde, amarelo
    colors.set([color.r, color.g, color.b], k * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function generateCurve(f, domain, n = 200, size = 0.2) {
  const [x0, x1] = domain.x;
  const points = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (i / n);
    points.push([x, f(x)]);
  }
  const [lo, hi] = Robust(points.map((p) => p[1]));
  const maxHeight = size * 0.6;

  const pieces = [[]];
  for (const [x, y] of points) {
    if (Number.isNaN(y)) {
      if (pieces.at(-1).length) pieces.push([]);
      continue;
    }
    const h = Math.min(hi, Math.max(lo, y));
    pieces
      .at(-1)
      .push(
        new THREE.Vector3(
          ((x - x0) / (x1 - x0) - 0.5) * size,
          hi > lo ? ((h - lo) / (hi - lo)) * maxHeight : maxHeight / 2,
          0,
        ),
      );
  }

  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f7cff,
    roughness: 0.4,
  });
  for (const piece of pieces) {
    if (piece.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(trecho);
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, piece.length * 2, 0.002, 8),
        material,
      ),
    );
  }
  return group;
}

export function createAxes(size = 0.2) {
  const m = size / 2;
  const points = [
    -m,
    0,
    0,
    m,
    0,
    0, // x
    0,
    0,
    -m,
    0,
    0,
    m, // y da função (eixo Z da cena)
    0,
    0,
    0,
    0,
    size * 0.65,
    0, // altura
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({
      color: 0x9aa3b2,
      transparent: true,
      opacity: 0.7,
    }),
  );
}

export function createGraph2D({
  expr,
  domain = { x: [-5, 5], y: [-5, 5] },
  size = 0.2,
  n = 200,
  thickness = size * 0.008,
}) {
  const f = compileExpr(expr);
  const [x0, x1] = domain.x;
  const [y0, y1] = domain.y;

  // Área ocupada pelo gráfico na cena.
  const width = size;
  const height = size * 0.6;

  function toPoint(x, y) {
    return new THREE.Vector3(
      ((x - x0) / (x1 - x0) - 0.5) * width,
      ((y - y0) / (y1 - y0) - 0.5) * height,
      0,
    );
  }

  const group = new THREE.Group();

  const curveMaterial = new THREE.MeshBasicMaterial({
    color: 0x4f7cff,
  });

  let points = [];

  function addCurve() {
    if (points.length >= 2) {
      const path = new THREE.CurvePath();

      for (let i = 1; i < points.length; i++) {
        path.add(new THREE.LineCurve3(points[i - 1], points[i]));
      }

      const geometry = new THREE.TubeGeometry(
        path,
        Math.max(points.length * 2, 32),
        thickness,
        8,
        false,
      );

      group.add(new THREE.Mesh(geometry, curveMaterial));
    }

    points = [];
  }

  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (i / n);
    const y = f(x);

    if (!Number.isFinite(y) || y < y0 || y > y1) {
      addCurve();
      continue;
    }

    points.push(toPoint(x, y));
  }

  addCurve();

  // Eixos matemáticos: passam pelo zero.
  const axisPoints = [];

  if (y0 <= 0 && y1 >= 0) {
    axisPoints.push(toPoint(x0, 0), toPoint(x1, 0));
  }

  if (x0 <= 0 && x1 >= 0) {
    axisPoints.push(toPoint(0, y0), toPoint(0, y1));
  }

  if (axisPoints.length) {
    const geometry = new THREE.BufferGeometry().setFromPoints(axisPoints);

    const material = new THREE.LineBasicMaterial({
      color: 0x9aa3b2,
      transparent: true,
      opacity: 0.7,
    });

    group.add(new THREE.LineSegments(geometry, material));
  }

  return group;
}

export function createGraph3D({
  expr,
  domain = { x: [-5, 5], y: [-5, 5] },
  size = 0.2,
  n = 60,
}) {
  const f = compileExpr(expr);

  const geo = generateSurface(f, domain, n);
  normalize(geo, size);
  heightColorize(geo);

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
  group.add(surface, wireframe, createAxes(size));

  return group;
}
