"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { FINALE_AT, STATIONS } from "./stations";

// The room: a low-poly corner of someone's media room at night, built
// from Kenney's CC0 furniture and arcade kits (see
// scripts/build-models.mjs). One warm floor lamp is the key light, the
// window gives a cool dim fill, and each station carries a small
// practical light in its shelf hue that brightens while the camera
// visits. Flat toon shading, no shadow maps, no post-processing:
// contact shadows and floor pools are soft textured quads.
//
// The room is lived in: the television plays, the laptop browses, the
// arcade cabinet runs a game, notes rise from the radio, dust drifts in
// the lamplight, a cat idles on the floor, and one resident walks to
// each station as the camera does (Kenney's Mini Characters and Cube
// Pets, CC0). All of it stops with the pause control; the camera still
// follows the scroll, drawing on demand.

const MODEL_URL = "/models/room.glb";
const RESIDENT_URL = "/models/resident.glb";
const CAT_URL = "/models/cat.glb";

// The one animation clock. `t` only advances while the room plays, so
// pausing freezes every loop in place; `dt` is that frame's step. `p`
// is the eased walk position (0..1), set by the camera rig each frame
// and read by the resident.
const anim = { t: 0, dt: 0, p: 0 };

type Vec3 = [number, number, number];

// ---------------------------------------------------------------- palette

// Every Kenney material is replaced by name with a toon material in
// the lamplit palette; pieces can override individual names.
const PALETTE: Record<string, string> = {
  wood: "#8a5636",
  woodDark: "#5a3622",
  _defaultMat: "#d9c3a3",
  metalDark: "#2a2523",
  metal: "#b8ada0",
  metalMedium: "#5d5650",
  carpet: "#8f3b2c",
  carpetDarker: "#5a2219",
  carpetWhite: "#eadfca",
  plant: "#4d7a4f",
  glass: "#9fc0e8",
  lamp: "#ffe2b0",
  colormap: "#ffffff",
};

type Paint = Partial<Record<string, string>>;

let toonRamp: THREE.DataTexture | null = null;
function getToonRamp() {
  if (toonRamp) return toonRamp;
  // Four bands: shadow, two mid-tones, lit. Nearest filtering keeps
  // the steps crisp, which is what gives the room its illustrated look.
  const tones = [70, 130, 200, 255];
  const data = new Uint8Array(tones.length * 4);
  tones.forEach((t, i) => data.set([t, t, t, 255], i * 4));
  toonRamp = new THREE.DataTexture(data, tones.length, 1, THREE.RGBAFormat);
  toonRamp.minFilter = THREE.NearestFilter;
  toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.generateMipmaps = false;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

const materialCache = new Map<string, THREE.Material>();
function materialFor(source: THREE.Material, paint?: Paint, smooth = false): THREE.Material {
  const name = source.name || "_defaultMat";
  const color = paint?.[name] ?? PALETTE[name] ?? "#888888";
  const sourceMap = (source as THREE.MeshStandardMaterial).map ?? null;
  const key = `${name}|${color}|${smooth}|${sourceMap?.uuid ?? ""}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  let mat: THREE.Material;
  if (name === "lamp") {
    mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  } else if (name === "glass") {
    mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      toneMapped: false,
    });
  } else if (smooth) {
    // Walls and floor take light smoothly, so lamp pools fall off
    // softly instead of in toon rings; the furniture stays banded.
    mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
  } else {
    const toon = new THREE.MeshToonMaterial({
      color,
      gradientMap: getToonRamp(),
    });
    // Every face takes one tone. The kits are modelled with hard edges;
    // shading from face normals keeps a flat panel from breaking into
    // triangles of different bands under the nearby lamp.
    (toon as THREE.MeshToonMaterial & { flatShading: boolean }).flatShading = true;
    if (sourceMap) {
      sourceMap.magFilter = THREE.NearestFilter;
      toon.map = sourceMap;
    }
    mat = toon;
  }
  mat.name = name;
  materialCache.set(key, mat);
  return mat;
}

// ---------------------------------------------------------- soft textures

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type SoftTextures = { radial: THREE.Texture; blob: THREE.Texture; sky: THREE.Texture };
let softTextures: SoftTextures | null = null;

function getSoftTextures(): SoftTextures {
  if (softTextures) return softTextures;
  // A light falloff: Gaussian-ish, reaching true zero at the edge so a
  // halo never shows the rim of its quad.
  const radial = canvasTexture(256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    for (let i = 0; i <= 16; i++) {
      const r = i / 16;
      const a = Math.exp(-r * r * 4.5) * (1 - r * r);
      g.addColorStop(r, `rgba(255,255,255,${a.toFixed(4)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  // A soft-edged rounded rectangle, for contact shadows under
  // furniture with square footprints.
  const blob = canvasTexture(128, (ctx, s) => {
    ctx.filter = `blur(${s * 0.08}px)`;
    ctx.fillStyle = "rgba(0,0,0,1)";
    const p = s * 0.2;
    ctx.beginPath();
    ctx.roundRect(p, p, s - 2 * p, s - 2 * p, s * 0.14);
    ctx.fill();
  });
  // The night outside the window: deep blue sky, a low moon, a few stars.
  const sky = canvasTexture(128, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#0b1530");
    g.addColorStop(0.7, "#1d3260");
    g.addColorStop(1, "#33507f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(220,230,255,0.85)";
    for (const [x, y, r] of [
      [0.2, 0.15, 1.2],
      [0.72, 0.1, 1],
      [0.5, 0.32, 0.9],
      [0.85, 0.42, 1.1],
      [0.14, 0.52, 0.8],
      [0.38, 0.08, 0.8],
    ]) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const moon = ctx.createRadialGradient(s * 0.66, s * 0.26, 0, s * 0.66, s * 0.26, s * 0.2);
    moon.addColorStop(0, "rgba(200,220,255,0.35)");
    moon.addColorStop(1, "rgba(200,220,255,0)");
    ctx.fillStyle = moon;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#eef2ff";
    ctx.beginPath();
    ctx.arc(s * 0.66, s * 0.26, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
  softTextures = { radial, blob, sky };
  return softTextures;
}

// ------------------------------------------------------------------ model

function useRoomNodes() {
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });
  return useMemo(() => {
    const nodes = new Map<string, THREE.Object3D>();
    for (const child of gltf.scene.children) {
      nodes.set(child.name.replace("(Clone)", ""), child);
    }
    return nodes;
  }, [gltf]);
}

type PieceProps = {
  name: string;
  position: Vec3;
  rotation?: number;
  scale?: number | Vec3;
  paint?: Paint;
  smooth?: boolean;
};

function Piece({ name, position, rotation = 0, scale = 1, paint, smooth = false }: PieceProps) {
  const nodes = useRoomNodes();
  const object = useMemo(() => {
    const source = nodes.get(name);
    if (!source) return new THREE.Group();
    const copy = source.clone(true);
    copy.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => materialFor(m, paint, smooth))
          : materialFor(mesh.material, paint, smooth);
      }
    });
    return copy;
    // paint is a literal per call site; its identity is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, name, smooth]);
  return (
    <group position={position} rotation-y={rotation} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

// -------------------------------------------------------- fake lighting

type SoftProps = {
  position: Vec3;
  size: [number, number];
  rotation?: number;
  opacity?: number;
};

/** A contact shadow: a soft dark quad just above the floor. */
function Shadow({ position, size, rotation = 0, opacity = 0.55 }: SoftProps) {
  const { blob } = getSoftTextures();
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotation]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={blob} transparent opacity={opacity} depthWrite={false} color="#000000" />
    </mesh>
  );
}

// ------------------------------------------------------------- stations

const PI = Math.PI;

type StationRig = {
  light: THREE.PointLight | null;
  pool: THREE.Mesh | null;
};

function useHue(cssVar: string, fallback: string) {
  return useMemo(() => {
    if (typeof window === "undefined") return fallback;
    const name = cssVar.replace(/^var\(|\)$/g, "");
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }, [cssVar, fallback]);
}

/** Positions of each station's practical light and its pool on the floor. */
const STATION_LIGHTS: { light: Vec3; pool: Vec3; poolSize: number }[] = [
  // Movies: the television on the back wall.
  { light: [2.6, 0.62, 0.5], pool: [2.6, 0.003, 0.75], poolSize: 1.6 },
  // Shows: the laptop on the coffee table.
  { light: [2.55, 0.45, 1.45], pool: [2.55, 0.003, 1.5], poolSize: 1.1 },
  // Music: the radio between the speakers.
  { light: [1.6, 0.6, 0.4], pool: [1.6, 0.003, 0.5], poolSize: 1.1 },
  // Video Games: the arcade cabinet on the left wall.
  { light: [1.15, 0.85, 2.2], pool: [0.95, 0.003, 2.2], poolSize: 1.4 },
  // Books: the bookcases in the corner.
  { light: [0.7, 0.75, 0.6], pool: [0.7, 0.003, 0.7], poolSize: 1.4 },
];

// How far each practical swells in focus. The pink and coral ones are
// held back: at full strength they repaint the whole wall.
const STATION_GAIN = [0.9, 1.1, 1.1, 0.6, 1.2];

// ------------------------------------------------------------ the room

function Floor() {
  const tiles: Vec3[] = [];
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) tiles.push([x, -0.05, z + 1]);
  return (
    <>
      {tiles.map((p) => (
        <Piece key={p.join()} name="floorFull" position={p} paint={{ wood: "#684331" }} smooth />
      ))}
      {/* The plinth: the room is a diorama standing in the dark. */}
      <mesh position={[2, -0.23, 2]}>
        <boxGeometry args={[4.12, 0.36, 4.12]} />
        <meshToonMaterial color="#2a1d15" gradientMap={getToonRamp()} />
      </mesh>
    </>
  );
}

// Wall tiles overlap by a hair so their seams never open a crack.
const TILE: Vec3 = [1.004, 1, 1];

function Walls() {
  const wallPaint = { _defaultMat: "#7d6453", wood: "#4a2f20", metalDark: "#2a2523" };
  const { sky, radial } = getSoftTextures();
  return (
    <>
      {[0, 1, 2].map((x) => (
        <Piece key={`b${x}`} name="wall" position={[x, 0, 0]} scale={TILE} paint={wallPaint} smooth />
      ))}
      <Piece name="wallWindow" position={[3, 0, 0]} scale={TILE} paint={wallPaint} smooth />
      {/* The night beyond the glass. */}
      <mesh position={[3.5, 0.72, -0.045]}>
        <planeGeometry args={[0.56, 0.8]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3].map((z) => (
        <Piece key={`l${z}`} name="wall" position={[0, 0, z + 1]} rotation={PI / 2} scale={TILE} paint={wallPaint} smooth />
      ))}
      {/* A faint cool spill on the wall around the window. */}
      <mesh position={[3.5, 0.7, 0.01]} renderOrder={2}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshBasicMaterial map={radial} color="#7f9fd9" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </>
  );
}

// ------------------------------------------------------------- the books

const SPINES = ["#7b2d26", "#2e4057", "#b5832f", "#3d5a40", "#d8c8a8", "#5b3a4f", "#a24f2a", "#2b2a2e", "#8a6f4e", "#4a6a78", "#c9b48a"];

type Shelf = { x0: number; x1: number; y: number; fill?: number };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rows of book spines on a bookcase's shelves (in the bookcase's own space). */
function Spines({ shelves, seed }: { shelves: Shelf[]; seed: number }) {
  const mesh = useMemo(() => {
    const rand = mulberry32(seed);
    const books: { p: Vec3; s: Vec3; r: number; c: string }[] = [];
    for (const shelf of shelves) {
      const end = shelf.x0 + (shelf.x1 - shelf.x0) * (shelf.fill ?? 1);
      let x = shelf.x0 + 0.004;
      while (x < end - 0.02) {
        const roll = rand();
        if (roll < 0.07 && end - x > 0.16) {
          // A short stack lying flat.
          const w = 0.11 + rand() * 0.04;
          let y = shelf.y;
          const n = 2 + Math.floor(rand() * 2);
          for (let k = 0; k < n; k++) {
            const h = 0.022 + rand() * 0.012;
            books.push({ p: [x + w / 2, y + h / 2, -0.11], s: [w, h, 0.15 + rand() * 0.03], r: 0, c: SPINES[Math.floor(rand() * SPINES.length)] });
            y += h;
          }
          x += w + 0.01;
        } else if (roll < 0.12) {
          x += 0.03 + rand() * 0.04; // a gap someone left
        } else {
          const w = 0.018 + rand() * 0.016;
          const h = 0.13 + rand() * 0.065;
          const d = 0.13 + rand() * 0.04;
          books.push({ p: [x + w / 2, shelf.y + h / 2, -0.02 - d / 2], s: [w, h, d], r: 0, c: SPINES[Math.floor(rand() * SPINES.length)] });
          x += w + 0.002;
        }
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: getToonRamp() });
    const inst = new THREE.InstancedMesh(geo, mat, books.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    books.forEach((b, i) => {
      m.compose(new THREE.Vector3(...b.p), q, new THREE.Vector3(...b.s));
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, c.set(b.c));
    });
    return inst;
  }, [shelves, seed]);
  return <primitive object={mesh} />;
}

const WIDE_SHELVES: Shelf[] = [
  { x0: 0.04, x1: 0.76, y: 0.07 },
  { x0: 0.04, x1: 0.76, y: 0.31 },
  // The top shelf is only half full: the next one is yours.
  { x0: 0.04, x1: 0.76, y: 0.55, fill: 0.55 },
];
const OPEN_SHELVES: Shelf[] = [
  { x0: 0.035, x1: 0.365, y: 0.13 },
  { x0: 0.035, x1: 0.365, y: 0.37 },
  { x0: 0.035, x1: 0.365, y: 0.61, fill: 0.7 },
];

function Furniture() {
  return (
    <>
      {/* Books — two bookcases in the corner under the lamp. */}
      <group position={[0.08, 0, 0.25]}>
        <Piece name="bookcaseClosedWide" position={[0, 0, 0]} />
        <Spines shelves={WIDE_SHELVES} seed={7} />
      </group>
      <group position={[0.25, 0, 1.3]} rotation-y={PI / 2}>
        <Piece name="bookcaseOpen" position={[0, 0, 0]} />
        <Spines shelves={OPEN_SHELVES} seed={23} />
      </group>
      <Piece name="lampRoundFloor" position={[0.9, 0, 0.36]} />

      {/* Music — radio on a side table, speakers either side. */}
      <Speaker position={[1.12, 0, 0.17]} />
      <Piece name="sideTable" position={[1.36, 0, 0.23]} />
      <Piece name="radio" position={[1.46, 0.384, 0.12]} />
      <Speaker position={[1.95, 0, 0.17]} phase={0.5} />
      <Notes />

      {/* Movies — the television on its cabinet. */}
      <Piece name="cabinetTelevision" position={[2.2, 0, 0.25]} />
      <Piece name="televisionModern" position={[2.6, 0.31, 0.12]} />
      <Screen position={[2.6, 0.572, 0.143]} size={[0.664, 0.364]} pixels={[64, 36]} fps={12} draw={drawFilm} />

      {/* Shows — the laptop on the coffee table, the sofa facing the TV. */}
      <Piece name="rugRounded" position={[1.82, 0, 2.2]} smooth />
      <Piece name="tableCoffee" position={[2.75, 0, 1.55]} />
      <Piece name="laptop" position={[2.4, 0.23, 1.53]} />
      <Screen
        position={[2.532, 0.3185, 1.3365]}
        tilt={-0.42}
        size={[0.224, 0.123]}
        pixels={[48, 27]}
        fps={12}
        draw={drawBrowse}
      />
      <Piece name="loungeSofa" position={[3.1, 0, 2.2]} rotation={PI} paint={{ carpet: "#3e5560" }} />

      {/* Video Games — the arcade cabinet against the left wall. */}
      <group position={[0.3, 0, 2.2]} rotation-y={PI / 2} scale={1.2}>
        <Piece name="arcade-machine" position={[0, 0, 0]} paint={{ colormap: "#c9a482" }} />
        <Screen position={[0, 0.4205, 0.0905]} tilt={-0.322} size={[0.29, 0.18]} pixels={[32, 20]} fps={15} draw={drawGame} />
      </group>

      {/* The reading chair under the window, and a plant by the near wall. */}
      <Piece name="loungeChair" position={[3.18, 0, 0.72]} rotation={-PI / 4} paint={{ carpet: "#6d7a5c" }} />
      <Piece name="pottedPlant" position={[0.1, 0, 3.55]} />

      {/* Contact shadows: soft dark footprints instead of shadow maps. */}
      <Shadow position={[0.48, 0.006, 0.14]} size={[0.98, 0.42]} />
      <Shadow position={[0.13, 0.006, 1.1]} size={[0.4, 0.56]} />
      <Shadow position={[0.96, 0.008, 0.29]} size={[0.24, 0.24]} opacity={0.4} />
      <Shadow position={[1.19, 0.006, 0.1]} size={[0.26, 0.24]} />
      <Shadow position={[2.02, 0.006, 0.1]} size={[0.26, 0.24]} />
      <Shadow position={[1.62, 0.006, 0.13]} size={[0.62, 0.32]} opacity={0.4} />
      <Shadow position={[2.6, 0.006, 0.13]} size={[0.92, 0.36]} />
      <Shadow position={[2.62, 0.012, 1.45]} size={[0.8, 0.5]} opacity={0.45} />
      <Shadow position={[2.61, 0.012, 2.4]} size={[1.12, 0.56]} />
      <Shadow position={[0.33, 0.006, 2.2]} size={[0.7, 0.56]} />
      <Shadow position={[3.5, 0.006, 0.75]} size={[0.66, 0.62]} rotation={-PI / 4} />
      <Shadow position={[0.18, 0.006, 3.45]} size={[0.36, 0.36]} />
    </>
  );
}

// ------------------------------------------------------- things that move

type Draw = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void;

/** A lit screen: a small canvas redrawn a few times a second. */
function Screen({
  position,
  size,
  pixels,
  draw,
  fps,
  tilt = 0,
}: {
  position: Vec3;
  size: [number, number];
  pixels: [number, number];
  draw: Draw;
  fps: number;
  tilt?: number;
}) {
  // The pixel size and painter are constants per call site, so the
  // texture is made once, already showing its first frame.
  const [texture] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = pixels[0];
    canvas.height = pixels[1];
    draw(canvas.getContext("2d")!, 0, pixels[0], pixels[1]);
    const made = new THREE.CanvasTexture(canvas);
    made.colorSpace = THREE.SRGBColorSpace;
    made.minFilter = THREE.NearestFilter;
    made.magFilter = THREE.NearestFilter;
    made.generateMipmaps = false;
    return made;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const last = useRef(0);
  useFrame(() => {
    const map = material.current?.map as THREE.CanvasTexture | null | undefined;
    if (!map || anim.t - last.current < 1 / fps) return;
    last.current = anim.t;
    draw((map.image as HTMLCanvasElement).getContext("2d")!, anim.t, pixels[0], pixels[1]);
    map.needsUpdate = true;
  });
  return (
    <mesh position={position} rotation-x={tilt}>
      <planeGeometry args={size} />
      <meshBasicMaterial ref={material} map={texture} toneMapped={false} />
    </mesh>
  );
}

/** The television: three slow shots, cut every few seconds. */
const drawFilm: Draw = (ctx, t, w, h) => {
  const SHOT = 4.5;
  const shot = Math.floor(t / SHOT) % 3;
  const u = (t % SHOT) / SHOT;
  if (shot === 0) {
    // A night drive: moon, two ranges of hills sliding past.
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#0f1a3c");
    sky.addColorStop(1, "#33487c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#eef2ff";
    ctx.beginPath();
    ctx.arc(46 - u * 5, 10, 4, 0, PI * 2);
    ctx.fill();
    for (const [speed, base, amp, color] of [
      [10, 23, 4, "#1c2850"],
      [26, 28, 3, "#0d1430"],
    ] as const) {
      ctx.fillStyle = color;
      for (let x = 0; x < w; x++) {
        const y = base + Math.sin((x + t * speed) * 0.19) * amp + Math.sin((x + t * speed) * 0.07) * amp;
        ctx.fillRect(x, y, 1, h - y);
      }
    }
  } else if (shot === 1) {
    // A sunset over water.
    const sky = ctx.createLinearGradient(0, 0, 0, 22);
    sky.addColorStop(0, "#c4473a");
    sky.addColorStop(1, "#f6a04d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, 22);
    ctx.fillStyle = "#ffe2a6";
    ctx.beginPath();
    ctx.arc(32, 12 + u * 9, 6, 0, PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2640";
    ctx.fillRect(0, 22, w, h - 22);
    ctx.fillStyle = "#f6a04d";
    for (let i = 0; i < 5; i++) {
      const y = 24 + i * 2;
      const half = 9 - i * 1.5 + Math.sin(t * 3 + i * 1.7) * 1.5;
      ctx.fillRect(32 - half, y, half * 2, 1);
    }
  } else {
    // Two people at a table, one leaning in.
    ctx.fillStyle = "#1f2f2c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#35504a";
    ctx.fillRect(0, 24, w, h - 24);
    const lean = Math.sin(u * PI) * 3;
    for (const [x, body, head] of [
      [18 + lean, "#c4473a", "#e9c9a8"],
      [46, "#d9c79a", "#b98d6b"],
    ] as const) {
      ctx.fillStyle = body;
      ctx.fillRect(x - 5, 17, 10, 12);
      ctx.fillStyle = head;
      ctx.fillRect(x - 3, 10, 6, 6);
    }
  }
  // Letterbox.
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, 3);
  ctx.fillRect(0, h - 3, w, 3);
};

/** The laptop: rows of a catalogue sliding past, as if someone is browsing. */
const drawBrowse: Draw = (ctx, t, w, h) => {
  ctx.fillStyle = "#101418";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#5a9fe0";
  ctx.fillRect(2, 2, 8, 2);
  const tones = ["#5a9fe0", "#e0624f", "#d9c79a", "#58b98c", "#e06aa5", "#8fa3b8"];
  for (let row = 0; row < 3; row++) {
    const travel = t * (row % 2 === 0 ? 1 : -1) * (2.2 + row * 0.8);
    const offset = ((travel % 9) + 9) % 9;
    const first = Math.floor(travel / 9);
    for (let i = -1; i < 7; i++) {
      ctx.fillStyle = tones[(((i - first + row * 2) % 6) + 6) % 6];
      ctx.fillRect(Math.round(i * 9 + offset) + 1, 6 + row * 7, 7, 5);
    }
  }
};

/** The arcade cabinet: a brick game that plays itself. */
const game = {
  x: 16,
  y: 14,
  vx: 0.7,
  vy: -0.6,
  paddle: 16,
  bricks: Array.from({ length: 24 }, () => true),
  left: 24,
};
const BRICK_TONES = ["#e06aa5", "#e0624f", "#d9c79a"];
const drawGame: Draw = (ctx, _t, w, h) => {
  const g = game;
  if (anim.dt > 0) {
    g.x += g.vx;
    g.y += g.vy;
    if (g.x < 1 || g.x > w - 2) g.vx *= -1;
    if (g.y < 1) g.vy *= -1;
    // Eight bricks a row, three rows, starting two pixels down.
    const col = Math.floor(g.x / 4);
    const row = Math.floor((g.y - 2) / 2);
    const hit = row >= 0 && row < 3 && col >= 0 && col < 8 ? row * 8 + col : -1;
    if (hit >= 0 && g.bricks[hit]) {
      g.bricks[hit] = false;
      g.left -= 1;
      g.vy *= -1;
    }
    g.paddle += Math.max(-0.9, Math.min(0.9, g.x - g.paddle));
    if (g.y > h - 4 && g.vy > 0) g.vy *= -1;
    if (g.left === 0) {
      g.bricks.fill(true);
      g.left = 24;
    }
  }
  ctx.fillStyle = "#0b0a12";
  ctx.fillRect(0, 0, w, h);
  g.bricks.forEach((alive, i) => {
    if (!alive) return;
    ctx.fillStyle = BRICK_TONES[Math.floor(i / 8)];
    ctx.fillRect((i % 8) * 4, 2 + Math.floor(i / 8) * 2, 3, 1);
  });
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(Math.round(g.x), Math.round(g.y), 1, 1);
  ctx.fillRect(Math.round(g.paddle) - 3, h - 3, 6, 1);
};

/** A speaker that thumps on the beat. */
function Speaker({ position, phase = 0 }: { position: Vec3; phase?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    // 96 beats a minute; a short push on each one.
    const beat = Math.pow(Math.max(0, Math.sin((anim.t * 1.6 + phase) * PI * 2)), 6);
    ref.current.scale.set(1 + beat * 0.012, 1 + beat * 0.02, 1 + beat * 0.012);
  });
  return (
    <group position={position}>
      <group ref={ref}>
        <Piece name="speaker" position={[0, 0, 0]} />
      </group>
    </group>
  );
}

let noteTexture: THREE.Texture | null = null;
function getNoteTexture() {
  if (noteTexture) return noteTexture;
  noteTexture = canvasTexture(64, (ctx, s) => {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.ellipse(s * 0.36, s * 0.72, s * 0.14, s * 0.1, -0.4, 0, PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.48, s * 0.7);
    ctx.lineTo(s * 0.48, s * 0.2);
    ctx.lineTo(s * 0.72, s * 0.3);
    ctx.stroke();
  });
  return noteTexture;
}

const NOTE_COUNT = 3;
const NOTE_LIFE = 3.2;

/** Notes rising from the radio, one after another. */
function Notes() {
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const hue = useHue(STATIONS[2].hueVar, STATIONS[2].hue);
  useFrame(() => {
    for (let i = 0; i < NOTE_COUNT; i++) {
      const sprite = refs.current[i];
      if (!sprite) continue;
      const u = (anim.t / NOTE_LIFE + i / NOTE_COUNT) % 1;
      sprite.position.set(1.56 + i * 0.07 + Math.sin(u * PI * 2 + i) * 0.035, 0.66 + u * 0.42, 0.12);
      (sprite.material as THREE.SpriteMaterial).opacity = Math.sin(u * PI) * 0.9;
    }
  });
  return (
    <>
      {Array.from({ length: NOTE_COUNT }, (_, i) => (
        <sprite
          key={i}
          ref={(n) => {
            refs.current[i] = n;
          }}
          scale={[0.085, 0.085, 1]}
        >
          <spriteMaterial map={getNoteTexture()} color={hue} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  );
}

const DUST_COUNT = 46;

/** Dust drifting through the lamplight. */
function Dust() {
  const { geometry, seeds } = useMemo(() => {
    const rand = mulberry32(11);
    const positions = new Float32Array(DUST_COUNT * 3);
    const seeds: number[] = [];
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = 0.45 + rand() * 1.2;
      positions[i * 3 + 1] = 0.15 + rand() * 1.0;
      positions[i * 3 + 2] = 0.2 + rand() * 1.0;
      seeds.push(rand() * PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry, seeds };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (anim.dt === 0) return;
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < DUST_COUNT; i++) {
      let y = attr.getY(i) + anim.dt * 0.018;
      if (y > 1.15) y = 0.15;
      attr.setY(i, y);
      attr.setX(i, attr.getX(i) + Math.sin(anim.t * 0.4 + seeds[i]) * anim.dt * 0.012);
    }
    attr.needsUpdate = true;
  });
  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ffd9a0"
        size={0.014}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function useCreature(url: string, paint?: Paint) {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });
  return useMemo(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // An animated mesh outgrows its rest-pose bounds.
      mesh.frustumCulled = false;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => materialFor(m, paint))
        : materialFor(mesh.material, paint);
    });
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
    return { scene: gltf.scene, mixer, actions };
    // paint is a literal per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf]);
}

// The pack's cat is lilac; a warm tint makes it a tabby.
const CAT_PAINT: Paint = { colormap: "#e2b98c" };

/** The cat in the lamplight by the bookcase: it only ever idles. */
function Cat() {
  const { scene, mixer, actions } = useCreature(CAT_URL, CAT_PAINT);
  useEffect(() => {
    actions.get("idle")?.play();
    mixer.update(0);
  }, [mixer, actions]);
  useFrame(() => {
    if (anim.dt > 0) mixer.update(anim.dt);
  });
  return (
    <>
      <group position={[1.2, 0.05, 1.1]} rotation-y={PI * 0.2} scale={0.15}>
        <primitive object={scene} />
      </group>
      <Shadow position={[1.2, 0.007, 1.1]} size={[0.34, 0.34]} opacity={0.45} />
    </>
  );
}

// Where the resident stands for the hero, each station and the finale,
// which way they face there, and what they do while they wait.
const SPOTS: { at: [number, number]; face: number; doing: string }[] = [
  { at: [1.7, 1.75], face: PI / 4, doing: "idle" },
  { at: [2.5, 0.85], face: PI, doing: "idle" }, // watching the television
  { at: [2.02, 1.5], face: PI / 2, doing: "idle" }, // at the laptop
  { at: [1.62, 0.8], face: PI, doing: "emote-yes" }, // nodding along
  { at: [1.0, 2.2], face: -PI / 2, doing: "interact-right" }, // playing
  { at: [0.5, 0.66], face: PI, doing: "idle" }, // reading the spines
  { at: [1.7, 1.75], face: PI / 4, doing: "idle" },
];
const RESIDENT_CLIPS = ["walk", ...new Set(SPOTS.map((s) => s.doing))];
const WALK_SPEED = 0.5;

/** Shortest signed turn from angle a to angle b. */
function turn(a: number, b: number) {
  return ((((b - a) % (PI * 2)) + PI * 3) % (PI * 2)) - PI;
}

/** The resident: walks to each station as the camera travels there. */
function Resident() {
  const { scene, mixer, actions } = useCreature(RESIDENT_URL);
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Group>(null);
  const state = useRef({ x: SPOTS[0].at[0], z: SPOTS[0].at[1], yaw: SPOTS[0].face, walking: 0, started: false });

  useEffect(() => {
    for (const name of RESIDENT_CLIPS) {
      const action = actions.get(name);
      if (!action) continue;
      action.setEffectiveWeight(name === "idle" ? 1 : 0);
      action.play();
    }
    mixer.update(0);
  }, [mixer, actions]);

  useFrame((_, delta) => {
    const s = state.current;
    const dt = Math.min(delta, 1 / 30);
    // The same dwell-and-travel timing as the camera, between the spots.
    const u = curveParam(anim.p) * (SPOTS.length - 1);
    const k = Math.min(SPOTS.length - 2, Math.floor(u));
    const f = u - k;
    const a = SPOTS[k];
    const b = SPOTS[k + 1];
    const x = a.at[0] + (b.at[0] - a.at[0]) * f;
    const z = a.at[1] + (b.at[1] - a.at[1]) * f;
    const dx = s.started ? x - s.x : 0;
    const dz = s.started ? z - s.z : 0;
    s.started = true;
    s.x = x;
    s.z = z;
    const speed = Math.hypot(dx, dz) / dt;
    const moving = speed > 0.04;
    const rest = f < 0.5 ? a : b;

    s.walking += ((moving ? 1 : 0) - s.walking) * (1 - Math.exp(-dt * 9));
    const heading = moving ? Math.atan2(dx, dz) : rest.face;
    s.yaw += turn(s.yaw, heading) * (1 - Math.exp(-dt * (moving ? 12 : 6)));

    for (const name of RESIDENT_CLIPS) {
      const action = actions.get(name);
      if (!action) continue;
      if (name === "walk") {
        action.setEffectiveWeight(s.walking);
        // Feet keep pace with the ground: scrolling fast walks fast.
        action.setEffectiveTimeScale(Math.min(2.6, Math.max(0.6, speed / WALK_SPEED)));
      } else {
        action.setEffectiveWeight(name === rest.doing ? 1 - s.walking : 0);
      }
    }

    // Walking follows the scroll even when the room is paused; the
    // standing loops only run while it plays.
    const step = s.walking > 0.02 ? dt : anim.dt;
    if (step > 0) mixer.update(step);

    if (group.current) {
      group.current.position.set(x, 0, z);
      group.current.rotation.y = s.yaw;
    }
    if (shadow.current) shadow.current.position.set(x, 0, z);
  });

  return (
    <>
      <group ref={group} position={[SPOTS[0].at[0], 0, SPOTS[0].at[1]]} rotation-y={SPOTS[0].face} scale={0.62}>
        <primitive object={scene} />
      </group>
      <group ref={shadow} position={[SPOTS[0].at[0], 0, SPOTS[0].at[1]]}>
        <Shadow position={[0, 0.014, 0]} size={[0.36, 0.36]} opacity={0.5} />
      </group>
    </>
  );
}

function StationLights({ rigs, lite }: { rigs: React.RefObject<StationRig[]>; lite: boolean }) {
  const { radial } = getSoftTextures();
  const hues = [
    useHue(STATIONS[0].hueVar, STATIONS[0].hue),
    useHue(STATIONS[1].hueVar, STATIONS[1].hue),
    useHue(STATIONS[2].hueVar, STATIONS[2].hue),
    useHue(STATIONS[3].hueVar, STATIONS[3].hue),
    useHue(STATIONS[4].hueVar, STATIONS[4].hue),
  ];
  return (
    <>
      {STATION_LIGHTS.map((s, i) => (
        <group key={i}>
          {!lite && (
            <pointLight
              ref={(l) => {
                rigs.current[i] = { ...rigs.current[i], light: l };
              }}
              position={s.light}
              color={hues[i]}
              intensity={0.4}
              distance={2.6}
              decay={1.6}
            />
          )}
          <mesh
            ref={(m) => {
              rigs.current[i] = { ...rigs.current[i], pool: m };
            }}
            position={s.pool}
            rotation={[-PI / 2, 0, 0]}
            renderOrder={2}
          >
            <planeGeometry args={[s.poolSize, s.poolSize]} />
            <meshBasicMaterial
              map={radial}
              color={hues[i]}
              transparent
              opacity={0.1}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function KeyLight() {
  const { radial } = getSoftTextures();
  return (
    <>
      {/* The lamp: the one warm key light in the room. */}
      <pointLight position={[0.97, 0.9, 0.55]} color="#ffb876" intensity={1.9} distance={7} decay={1.35} />
      <mesh position={[0.97, 0.004, 0.6]} rotation={[-PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial map={radial} color="#ffb876" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* Moonlight: a cool, dim fill through the window. */}
      <directionalLight position={[5, 4, -3]} color="#7f9fd9" intensity={0.55} />
      <hemisphereLight args={["#3a4766", "#21150d", 0.85]} />
    </>
  );
}

// ------------------------------------------------------------ the camera

type Pose = { pos: Vec3; look: Vec3 };

// Hero, five stations, finale. Chosen by eye from the screenshots.
const POSES: Pose[] = [
  { pos: [9.0, 6.0, 9.0], look: [1.7, 0.35, 1.7] }, // hero
  { pos: [4.6, 1.9, 3.4], look: [2.6, 0.55, 0.3] }, // movies
  { pos: [4.2, 1.9, 4.05], look: [2.5, 0.35, 1.5] }, // shows
  { pos: [3.0, 1.7, 3.1], look: [1.55, 0.45, 0.25] }, // music
  { pos: [3.3, 1.7, 3.6], look: [0.35, 0.55, 2.2] }, // games
  { pos: [3.3, 1.8, 2.9], look: [0.45, 0.5, 0.5] }, // books
  { pos: [9.4, 6.6, 9.4], look: [1.8, 0.3, 1.8] }, // finale
];
const KEYS = [0, ...STATIONS.map((s) => s.at), 1];

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Scratch vectors for the per-frame camera maths.
const tmpPos = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const side = new THREE.Vector3();

const posCurve = new THREE.CatmullRomCurve3(POSES.map((p) => new THREE.Vector3(...p.pos)), false, "centripetal");
const lookCurve = new THREE.CatmullRomCurve3(POSES.map((p) => new THREE.Vector3(...p.look)), false, "centripetal");

/** Maps walk progress to curve parameter, dwelling at every key. */
function curveParam(p: number) {
  if (p <= KEYS[0]) return 0;
  for (let k = 0; k < KEYS.length - 1; k++) {
    const a = KEYS[k];
    const b = KEYS[k + 1];
    if (p <= b) {
      // Hold still around each key, travel in between.
      const hold = k === KEYS.length - 2 ? 0.1 : 0.22;
      const t = clamp01(((p - a) / (b - a) - hold) / (1 - 2 * hold));
      return (k + ease(t)) / (KEYS.length - 1);
    }
  }
  return 1;
}

/** 0..1 — how much each station is "in focus" at progress p. */
function focusAt(p: number, at: number) {
  return ease(clamp01(1 - Math.abs(p - at) / 0.085));
}

function CameraRig({
  progress,
  rigs,
  lite,
  playing,
}: {
  progress: MotionValue<number>;
  rigs: React.RefObject<StationRig[]>;
  lite: boolean;
  playing: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const state = useRef({ p: progress.get(), px: 0, py: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const unsub = progress.on("change", () => invalidate());
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      state.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      unsub();
      window.removeEventListener("pointermove", onPointer);
    };
  }, [progress, invalidate]);

  useFrame(({ camera: cam, size }, delta) => {
    const camera = cam as THREE.PerspectiveCamera;
    const s = state.current;
    const dt = Math.min(delta, 1 / 30);
    anim.dt = playing ? dt : 0;
    anim.t += anim.dt;
    const target = progress.get();
    const k = 1 - Math.exp(-dt * 7);
    s.p += (target - s.p) * k;
    s.px += (s.tx - s.px) * k;
    s.py += (s.ty - s.py) * k;
    const moving =
      Math.abs(target - s.p) > 1e-4 || Math.abs(s.tx - s.px) > 1e-3 || Math.abs(s.ty - s.py) > 1e-3;
    if (moving) invalidate();
    else s.p = target;
    anim.p = s.p;

    const u = curveParam(s.p);
    posCurve.getPoint(u, tmpPos);
    lookCurve.getPoint(u, tmpLook);

    // Composition. Wide screens: the subject sits right of centre, the
    // copy owns the left. Tall screens: the subject sits above the
    // caption, and at the hero and finale (where the copy is long) the
    // whole room steps back into the top of the frame.
    const { width: w, height: h } = size;
    const aspect = w / h;
    const tall = aspect < 0.8;
    const edge = Math.max(clamp01(1 - u * 6), clamp01((u - 5 / 6) * 6));
    camera.fov = tall ? 40 : 30;
    if (aspect >= 1.1) camera.setViewOffset(w, h, -w * 0.15, 0, w, h);
    else if (tall) camera.setViewOffset(w, h, 0, h * (0.12 + 0.1 * edge), w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();

    // Pointer parallax: a few degrees of orbit around the look point.
    side.subVectors(tmpPos, tmpLook);
    if (tall) side.multiplyScalar(1 + 0.42 * edge);
    const dist = side.length();
    const yaw = -s.px * 0.05;
    const pitch = s.py * 0.03;
    side.applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    side.y += pitch * dist;
    camera.position.copy(tmpLook).add(side);
    camera.lookAt(tmpLook);

    // Station practicals swell as the camera arrives.
    const finale = clamp01((s.p - FINALE_AT) / 0.1);
    STATIONS.forEach((st, i) => {
      const f = focusAt(s.p, st.at);
      const rig = rigs.current[i];
      if (!rig) return;
      // At the finale every station glows together.
      const glow = Math.max(f, finale * 0.6);
      if (rig.light && !lite) rig.light.intensity = 0.25 + glow * STATION_GAIN[i];
      if (rig.pool) (rig.pool.material as THREE.MeshBasicMaterial).opacity = 0.05 + glow * 0.2;
    });
  });

  return null;
}

// ------------------------------------------------------------- the canvas

function Ready({ onReady }: { onReady: () => void }) {
  // Mounted inside Suspense, so this runs once the model is in; wait one
  // more painted frame so the cross-fade never reveals an empty canvas.
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(onReady);
    });
    return () => cancelAnimationFrame(raf);
  }, [onReady]);
  return null;
}

function Scene({
  progress,
  lite,
  playing,
  onReady,
}: {
  progress: MotionValue<number>;
  lite: boolean;
  playing: boolean;
  onReady: () => void;
}) {
  const rigs = useRef<StationRig[]>([]);
  return (
    <>
      <color attach="background" args={["#0e0c0b"]} />
      <fog attach="fog" args={["#0e0c0b", 12, 24]} />
      {/* First, so the clock and the walk position are set before the
          things that read them this frame. */}
      <CameraRig progress={progress} rigs={rigs} lite={lite} playing={playing} />
      <KeyLight />
      <Floor />
      <Walls />
      <Furniture />
      <StationLights rigs={rigs} lite={lite} />
      <Dust />
      <Cat />
      <Resident />
      <Ready onReady={onReady} />
    </>
  );
}

export type RoomCanvasProps = {
  progress: MotionValue<number>;
  lite: boolean;
  active: boolean;
  /** False once the visitor pauses the room: loops stop, the camera still follows the scroll. */
  playing: boolean;
  onReady: () => void;
  onLost: () => void;
};

export default function RoomCanvas({ progress, lite, active, playing, onReady, onLost }: RoomCanvasProps) {
  return (
    <Canvas
      frameloop={!active ? "never" : playing ? "always" : "demand"}
      dpr={lite ? [1, 1.25] : [1, 1.75]}
      flat
      camera={{ fov: 30, near: 0.1, far: 60, position: POSES[0].pos }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      onCreated={({ gl, scene, camera }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
        if (process.env.NODE_ENV !== "production") {
          // Dev-only hook used to capture the static poster.
          (window as unknown as { __roomCapture?: (q?: number, ratio?: number) => string }).__roomCapture = (
            q = 0.82,
            ratio,
          ) => {
            const before = gl.getPixelRatio();
            if (ratio) gl.setPixelRatio(ratio);
            gl.render(scene, camera);
            const url = gl.domElement.toDataURL("image/webp", q);
            if (ratio) gl.setPixelRatio(before);
            return url;
          };
        }
      }}
    >
      <Suspense fallback={null}>
        <Scene progress={progress} lite={lite} playing={playing} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
