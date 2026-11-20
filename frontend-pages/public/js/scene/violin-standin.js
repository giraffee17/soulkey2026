// Stand-in violin and bow made from simple shapes, used until the real model is bought.
// Every part is an Object3D whose userData.partId matches an id in data/parts.js,
// so the real model can replace this file without changing any other code.
// Units are centimetres. The violin lies along +Y (scroll up), its top facing +Z.
import * as THREE from "three";

// Half width of the body outline at height y (lower bout, waist, upper bout).
const OUTLINE = [
  [0, 0], [5.6, 0.6], [8.8, 2.6], [10.2, 6], [10.2, 9.5], [9.2, 12.5], [7.4, 14.6],
  [5.9, 16.5], [5.5, 18.5], [5.9, 20.6], [7.1, 22.5], [8.2, 25], [8.4, 28],
  [7.6, 31.2], [5.4, 34], [2.6, 35.3], [0, 35.5],
];
const BODY_LENGTH = 35.5;
const PLATE = 0.4;
const RIB_HEIGHT = 3;
const ARCH = 1.2;
const BRIDGE_Y = 15.5;
const NUT_Y = 48.5;

// A smooth curve through the outline points, sampled densely once.
const OUTLINE_SAMPLES = new THREE.SplineCurve(OUTLINE.map(([x, y]) => new THREE.Vector2(x, y))).getSpacedPoints(400);

function halfWidthAt(y) {
  if (y <= 0 || y >= BODY_LENGTH) return 0;
  for (let i = 1; i < OUTLINE_SAMPLES.length; i += 1) {
    const a = OUTLINE_SAMPLES[i - 1];
    const b = OUTLINE_SAMPLES[i];
    if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1);
  }
  return 0;
}

// Height of the arch above the flat plate at (x, y); zero at the edges.
function archAt(x, y) {
  const halfWidth = halfWidthAt(y);
  if (halfWidth <= 0 || y <= 0 || y >= BODY_LENGTH) return 0;
  const across = Math.max(0, 1 - (x / halfWidth) ** 2);
  const along = Math.sqrt(Math.sin((Math.PI * y) / BODY_LENGTH));
  return ARCH * across * along;
}

const ROWS = 72;
const COLS = 24;

function outlineShape(inset = 0) {
  const right = [];
  for (let i = 0; i <= ROWS; i += 1) {
    const y = (BODY_LENGTH * i) / ROWS;
    right.push(new THREE.Vector2(Math.max(0, halfWidthAt(y) - inset), inset + (y * (BODY_LENGTH - 2 * inset)) / BODY_LENGTH));
  }
  const left = [...right].reverse().slice(1, -1).map((point) => new THREE.Vector2(-point.x, point.y));
  return new THREE.Shape([...right, ...left]);
}

function material(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, ...options });
}

function varnish(color) {
  return material(color, { roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 });
}

function part(id, object) {
  object.name = id;
  object.userData.partId = id;
  return object;
}

function mesh(geometry, mat) {
  const result = new THREE.Mesh(geometry, mat);
  result.castShadow = false;
  result.receiveShadow = false;
  return result;
}

function tube(points, radius, mat, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), closed);
  return mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, 10, closed), mat);
}

function polyline(points, radius, mat) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i += 1) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  }
  return mesh(new THREE.TubeGeometry(path, 64, radius, 8, false), mat);
}

// An arched plate built as a grid over the outline: up for the top, down for the back.
// The inner face follows the arch, the outer face sits one plate thickness further out.
function archedPlate(direction, mat, zBase) {
  const positions = [];
  const indices = [];
  const perFace = (ROWS + 1) * (COLS + 1);
  const index = (face, row, col) => face * perFace + row * (COLS + 1) + col;

  for (let face = 0; face <= 1; face += 1) {
    for (let row = 0; row <= ROWS; row += 1) {
      const y = (BODY_LENGTH * row) / ROWS;
      const halfWidth = halfWidthAt(y);
      for (let col = 0; col <= COLS; col += 1) {
        const x = -halfWidth + (2 * halfWidth * col) / COLS;
        positions.push(x, y, zBase + direction * (archAt(x, y) + face * PLATE));
      }
    }
  }

  const quad = (a, b, c, d, outward) => (outward ? indices.push(a, b, c, b, d, c) : indices.push(a, c, b, b, c, d));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      for (let face = 0; face <= 1; face += 1) {
        const facesUp = (face === 1) === (direction === 1);
        quad(index(face, row, col), index(face, row, col + 1), index(face, row + 1, col), index(face, row + 1, col + 1), facesUp);
      }
    }
    for (const col of [0, COLS]) {
      quad(index(0, row, col), index(1, row, col), index(0, row + 1, col), index(1, row + 1, col), (col === 0) === (direction === 1));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  mat.side = THREE.DoubleSide;
  return mesh(geometry, mat);
}

function buildBody(palette) {
  const top = part("top", archedPlate(1, varnish(palette.wood), 0));
  const back = part("back", archedPlate(-1, varnish(palette.maple), -RIB_HEIGHT));

  const ribShape = outlineShape();
  ribShape.holes.push(outlineShape(0.2));
  const ribGeometry = new THREE.ExtrudeGeometry(ribShape, { depth: RIB_HEIGHT, bevelEnabled: false, curveSegments: 24 });
  ribGeometry.translate(0, 0, -RIB_HEIGHT);
  const ribs = part("ribs", mesh(ribGeometry, varnish(palette.maple)));

  const purflingPoints = OUTLINE.slice(1, -1).map(([x, y]) => {
    const inner = Math.max(0, x - 0.45);
    return [inner, y, PLATE + archAt(inner, y) + 0.01];
  });
  const loop = [...purflingPoints, ...[...purflingPoints].reverse().map(([x, y, z]) => [-x, y, z])];
  const purfling = part("purfling", tube(loop, 0.06, material(palette.ebony), true));

  const fHoles = part("f-holes", new THREE.Group());
  for (const side of [-1, 1]) {
    const points = [[3.2, 19.2], [3.9, 18], [3.5, 16.2], [3.3, 14.2], [3.9, 12.4], [3.4, 11.4]]
      .map(([x, y]) => [side * x, y, PLATE + archAt(side * x, y) + 0.02]);
    fHoles.add(tube(points, 0.13, material(palette.ebony, { roughness: 0.9 })));
  }

  const endButton = part("end-button", new THREE.Group());
  const peg = mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 16), material(palette.ebony));
  peg.position.set(0, -0.45, -RIB_HEIGHT / 2);
  const knob = mesh(new THREE.SphereGeometry(0.45, 16, 12), material(palette.ebony));
  knob.position.set(0, -0.95, -RIB_HEIGHT / 2);
  endButton.add(peg, knob);

  return [top, back, ribs, purfling, fHoles, endButton];
}

function buildNeck(palette) {
  const neckGeometry = new THREE.BoxGeometry(2.6, NUT_Y - BODY_LENGTH + 0.5, 1.8);
  const neck = part("neck", mesh(neckGeometry, varnish(palette.maple)));
  neck.position.set(0, (NUT_Y + BODY_LENGTH) / 2, -0.6);

  // Fingerboard: tapered, rising slightly above the top toward the bridge.
  const boardShape = new THREE.Shape();
  boardShape.moveTo(-1.2, NUT_Y);
  boardShape.lineTo(1.2, NUT_Y);
  boardShape.lineTo(2.1, 21.5);
  boardShape.lineTo(-2.1, 21.5);
  boardShape.closePath();
  const boardGeometry = new THREE.ExtrudeGeometry(boardShape, { depth: 0.6, bevelEnabled: false });
  const board = boardGeometry.attributes.position;
  for (let i = 0; i < board.count; i += 1) {
    const rise = 0.5 + ((NUT_Y - board.getY(i)) / (NUT_Y - 21.5)) * 1.1;
    board.setZ(i, board.getZ(i) + rise);
  }
  boardGeometry.computeVertexNormals();
  const fingerboard = part("fingerboard", mesh(boardGeometry, material(palette.ebony, { roughness: 0.3 })));

  const nut = part("nut", mesh(new THREE.BoxGeometry(2.5, 0.35, 0.8), material(palette.ebony)));
  nut.position.set(0, NUT_Y + 0.15, 0.85);

  const pegbox = part("pegbox", mesh(new THREE.BoxGeometry(2.2, 6.5, 2.4), varnish(palette.maple)));
  pegbox.position.set(0, NUT_Y + 3.4, -0.4);

  const pegs = part("pegs", new THREE.Group());
  [50, 51.6, 53.2, 54.8].forEach((y, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const shaft = mesh(new THREE.CylinderGeometry(0.22, 0.32, 4.6, 12), material(palette.ebony));
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(side * 1.2, y, -0.4);
    const head = mesh(new THREE.SphereGeometry(0.9, 16, 12), material(palette.ebony));
    head.scale.set(0.45, 1, 0.8);
    head.position.set(side * 3.6, y, -0.4);
    pegs.add(shaft, head);
  });

  // Scroll: a tube wound into a shrinking spiral at the end of the pegbox.
  const turns = 2.1;
  const spiral = [];
  for (let i = 0; i <= 60; i += 1) {
    const t = i / 60;
    const angle = Math.PI + t * turns * Math.PI * 2;
    const radius = 2.2 - 1.6 * t;
    spiral.push([0, 57.2 + radius * Math.cos(angle), -0.4 + radius * Math.sin(angle)]);
  }
  const scroll = part("scroll", tube(spiral, 0.65, varnish(palette.maple)));
  scroll.scale.x = 1.3;

  return [neck, fingerboard, nut, pegbox, pegs, scroll];
}

function stringPositions() {
  // x at the nut, the bridge and the tailpiece, from G (left) to E (right).
  return [
    { id: "string-g", nut: -0.82, bridge: -1.13, tail: -0.75, radius: 0.07 },
    { id: "string-d", nut: -0.27, bridge: -0.38, tail: -0.25, radius: 0.06 },
    { id: "string-a", nut: 0.27, bridge: 0.38, tail: 0.25, radius: 0.05 },
    { id: "string-e", nut: 0.82, bridge: 1.13, tail: 0.75, radius: 0.04 },
  ];
}

function buildFittings(palette) {
  const bridgeBase = PLATE + archAt(0, BRIDGE_Y);
  const bridgeShape = new THREE.Shape();
  const outline = [[-2.1, 0], [-1.3, 0], [-1.1, 0.5], [1.1, 0.5], [1.3, 0], [2.1, 0], [2, 1], [1.7, 2.6], [0.9, 3.2], [0, 3.35], [-0.9, 3.2], [-1.7, 2.6], [-2, 1]];
  bridgeShape.moveTo(...outline[0]);
  outline.slice(1).forEach(([x, y]) => bridgeShape.lineTo(x, y));
  bridgeShape.closePath();
  const bridgeGeometry = new THREE.ExtrudeGeometry(bridgeShape, { depth: 0.4, bevelEnabled: false });
  bridgeGeometry.rotateX(Math.PI / 2);
  const bridge = part("bridge", mesh(bridgeGeometry, material(palette.maple, { roughness: 0.6 })));
  bridge.position.set(0, BRIDGE_Y + 0.2, bridgeBase);
  const bridgeTop = (x) => bridgeBase + 3.35 - 0.25 * x * x;

  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.8, 0.9);
  tailShape.lineTo(0.8, 0.9);
  tailShape.lineTo(2, 10.5);
  tailShape.lineTo(-2, 10.5);
  tailShape.closePath();
  const tailGeometry = new THREE.ExtrudeGeometry(tailShape, { depth: 0.5, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.1, bevelSegments: 2 });
  const tailpiece = part("tailpiece", mesh(tailGeometry, material(palette.ebony, { roughness: 0.3 })));
  tailpiece.position.z = 1.5;
  const tailZ = 2.1;

  const strings = stringPositions().map(({ id, nut, bridge: atBridge, tail, radius }) => part(id, polyline(
    [[nut, NUT_Y + 0.3, 1.3], [atBridge, BRIDGE_Y, bridgeTop(atBridge) + 0.05], [tail, 9.6, tailZ]],
    radius,
    material(palette.string, { metalness: 0.6, roughness: 0.25 }),
  )));

  const fineTuners = part("fine-tuners", new THREE.Group());
  stringPositions().forEach(({ tail }) => {
    const screw = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 12), material(palette.metal, { metalness: 1, roughness: 0.2 }));
    screw.rotation.x = Math.PI / 2;
    screw.position.set(tail, 8.8, tailZ + 0.45);
    fineTuners.add(screw);
  });

  const chinrest = part("chinrest", mesh(new THREE.SphereGeometry(1, 24, 16), material(palette.ebony, { roughness: 0.35 })));
  chinrest.scale.set(3.6, 2.6, 0.6);
  chinrest.position.set(-4.6, 3, 1.6);

  const saddle = part("saddle", mesh(new THREE.BoxGeometry(2.6, 0.5, 0.6), material(palette.ebony)));
  saddle.position.set(0, 0.35, 0.6);

  return [bridge, tailpiece, ...strings, fineTuners, chinrest, saddle];
}

function buildInside(palette) {
  const postX = 1.0;
  const postY = BRIDGE_Y - 0.8;
  const topInner = archAt(postX, postY);
  const backInner = -RIB_HEIGHT - archAt(postX, postY);
  const length = topInner - backInner;
  const soundpost = part("soundpost", mesh(new THREE.CylinderGeometry(0.3, 0.3, length, 16), material(palette.maple, { roughness: 0.8 })));
  soundpost.rotation.x = Math.PI / 2;
  soundpost.position.set(postX, postY, backInner + length / 2);

  const barX = -1.1;
  const bassBar = part("bass-bar", mesh(new THREE.BoxGeometry(0.5, 22, 0.6), material(palette.maple, { roughness: 0.8 })));
  bassBar.position.set(barX, 17, archAt(barX, 17) - 0.3);

  return [soundpost, bassBar];
}

function buildBow(palette) {
  const x = 14;
  const stick = part("stick", tube([[x, -5.5, 0], [x - 0.4, 15, 0], [x - 0.6, 30, 0], [x - 0.4, 45, 0], [x, 62.5, 0]], 0.38, varnish(palette.wood)));

  const hair = part("hair", mesh(new THREE.BoxGeometry(0.06, 66, 1), material(palette.hair, { roughness: 0.9 })));
  hair.position.set(x - 1.6, 29, 0);

  const frog = part("frog", mesh(new THREE.BoxGeometry(1.8, 4, 1.3), material(palette.ebony, { roughness: 0.3 })));
  frog.position.set(x - 0.9, -3.4, 0);

  const screw = part("screw", mesh(new THREE.CylinderGeometry(0.35, 0.35, 2, 16), material(palette.metal, { metalness: 1, roughness: 0.25 })));
  screw.position.set(x, -6.5, 0);

  const tip = part("tip", mesh(new THREE.BoxGeometry(1.8, 1.6, 0.9), material(palette.ivory, { roughness: 0.4 })));
  tip.position.set(x - 0.9, 63.4, 0);

  return [stick, hair, frog, screw, tip];
}

export function buildStandinViolin(palette) {
  const root = new THREE.Group();
  root.name = "violin-root";
  root.add(...buildBody(palette), ...buildNeck(palette), ...buildFittings(palette), ...buildInside(palette), ...buildBow(palette));
  // Centre the instrument and bow around the origin.
  root.position.set(-2.5, -28, 0);
  return root;
}

// Walks up from a clicked mesh to the object that carries the part id.
export function partIdOf(object) {
  let current = object;
  while (current) {
    if (current.userData?.partId) return current.userData.partId;
    current = current.parent;
  }
  return null;
}
