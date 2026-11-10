"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { FINALE_AT, STATIONS } from "./stations";

// The room: a low-poly corner of someone's media room at night, built
// from Kenney's CC0 furniture and arcade kits (see
// scripts/build-models.mjs). One warm floor lamp is the key light, the
// window gives a cool dim fill, and each station carries a small
// practical light in its shelf hue that brightens while the camera
// visits. Toon shading, no shadow maps, no post-processing: contact
// shadows and light pools are soft textured quads.
//
// Rendering is on demand. Nothing draws unless the scroll position or
// the pointer moved, or the camera is still easing toward them.

const MODEL_URL = "/models/room.glb";

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
  const key = `${name}|${color}|${smooth}`;
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
    mat = new THREE.MeshLambertMaterial({ color });
  } else {
    const toon = new THREE.MeshToonMaterial({
      color,
      gradientMap: getToonRamp(),
    });
    const map = (source as THREE.MeshStandardMaterial).map;
    if (map) {
      map.magFilter = THREE.NearestFilter;
      toon.map = map;
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
  halo: THREE.Sprite | null;
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

/** Positions of each station's practical light, halo and floor pool. */
const STATION_LIGHTS: { light: Vec3; halo: Vec3; haloSize: number; pool: Vec3; poolSize: number }[] = [
  // Movies: the television on the back wall.
  { light: [2.6, 0.62, 0.42], halo: [2.6, 0.53, 0.1], haloSize: 1.1, pool: [2.6, 0.003, 0.75], poolSize: 1.6 },
  // Shows: the laptop on the coffee table.
  { light: [2.55, 0.45, 1.25], halo: [2.55, 0.38, 1.18], haloSize: 0.55, pool: [2.55, 0.003, 1.3], poolSize: 1.1 },
  // Music: the radio between the speakers.
  { light: [1.6, 0.6, 0.35], halo: [1.6, 0.5, 0.1], haloSize: 0.7, pool: [1.6, 0.003, 0.45], poolSize: 1.1 },
  // Video Games: the arcade cabinet on the left wall.
  { light: [1.15, 0.85, 2.2], halo: [0.72, 0.62, 2.2], haloSize: 0.75, pool: [0.95, 0.003, 2.2], poolSize: 1.4 },
  // Books: the bookcases in the corner.
  { light: [0.7, 0.75, 0.55], halo: [0.45, 0.6, 0.18], haloSize: 0.9, pool: [0.7, 0.003, 0.7], poolSize: 1.4 },
];

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
      {/* Books — the reading corner. */}
      <group position={[0.08, 0, 0.25]}>
        <Piece name="bookcaseClosedWide" position={[0, 0, 0]} />
        <Spines shelves={WIDE_SHELVES} seed={7} />
      </group>
      <group position={[0.25, 0, 1.3]} rotation-y={PI / 2}>
        <Piece name="bookcaseOpen" position={[0, 0, 0]} />
        <Spines shelves={OPEN_SHELVES} seed={23} />
      </group>
      <Piece name="loungeChair" position={[0.6, 0, 1.0]} rotation={PI * 0.75} paint={{ carpet: "#6d7a5c" }} />
      <Piece name="lampRoundFloor" position={[1.05, 0, 0.35]} />

      {/* Music — radio on a side table, speakers either side. */}
      <Piece name="speaker" position={[1.12, 0, 0.17]} />
      <Piece name="sideTable" position={[1.36, 0, 0.23]} />
      <Piece name="radio" position={[1.46, 0.384, 0.12]} />
      <Piece name="speaker" position={[1.95, 0, 0.17]} />

      {/* Movies — the television on its cabinet. */}
      <Piece name="cabinetTelevision" position={[2.2, 0, 0.25]} />
      <Piece name="televisionModern" position={[2.6, 0.31, 0.12]} />

      {/* Shows — the laptop on the coffee table, the sofa facing the TV. */}
      <Piece name="rugRounded" position={[1.82, 0, 2.05]} smooth />
      <Piece name="tableCoffee" position={[2.75, 0, 1.4]} />
      <Piece name="laptop" position={[2.4, 0.23, 1.38]} />
      <Piece name="loungeSofa" position={[3.1, 0, 2.05]} rotation={PI} paint={{ carpet: "#3e5560" }} />

      {/* Video Games — the arcade cabinet against the left wall. */}
      <Piece name="arcade-machine" position={[0.3, 0, 2.2]} rotation={PI / 2} scale={1.2} paint={{ colormap: "#a99aa4" }} />

      {/* Set dressing. */}
      <Piece name="pottedPlant" position={[3.62, 0, 0.42]} />

      {/* Contact shadows: soft dark footprints instead of shadow maps. */}
      <Shadow position={[0.48, 0.006, 0.14]} size={[0.98, 0.42]} />
      <Shadow position={[0.13, 0.006, 1.1]} size={[0.4, 0.56]} />
      <Shadow position={[0.3, 0.007, 0.97]} size={[0.66, 0.62]} rotation={PI * 0.75} />
      <Shadow position={[1.11, 0.008, 0.29]} size={[0.24, 0.24]} opacity={0.4} />
      <Shadow position={[1.19, 0.006, 0.1]} size={[0.26, 0.24]} />
      <Shadow position={[2.02, 0.006, 0.1]} size={[0.26, 0.24]} />
      <Shadow position={[1.62, 0.006, 0.13]} size={[0.62, 0.32]} opacity={0.4} />
      <Shadow position={[2.6, 0.006, 0.13]} size={[0.92, 0.36]} />
      <Shadow position={[2.62, 0.012, 1.3]} size={[0.8, 0.5]} opacity={0.45} />
      <Shadow position={[2.61, 0.012, 2.25]} size={[1.12, 0.56]} />
      <Shadow position={[0.33, 0.006, 2.2]} size={[0.7, 0.56]} />
      <Shadow position={[3.7, 0.006, 0.33]} size={[0.36, 0.36]} />
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
          <sprite
            ref={(h) => {
              rigs.current[i] = { ...rigs.current[i], halo: h };
            }}
            position={s.halo}
            scale={[s.haloSize, s.haloSize, 1]}
          >
            <spriteMaterial
              map={radial}
              color={hues[i]}
              transparent
              opacity={0.25}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
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
      <pointLight position={[1.12, 0.84, 0.3]} color="#ffb25e" intensity={3.2} distance={7} decay={1.2} />
      <sprite position={[1.12, 0.8, 0.3]} scale={[1.6, 1.6, 1]}>
        <spriteMaterial map={radial} color="#ffb454" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh position={[1.1, 0.004, 0.55]} rotation={[-PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial map={radial} color="#ffb454" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
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
  { pos: [4.2, 1.9, 3.9], look: [2.5, 0.35, 1.35] }, // shows
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
}: {
  progress: MotionValue<number>;
  rigs: React.RefObject<StationRig[]>;
  lite: boolean;
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
    const target = progress.get();
    const k = 1 - Math.exp(-dt * 7);
    s.p += (target - s.p) * k;
    s.px += (s.tx - s.px) * k;
    s.py += (s.ty - s.py) * k;
    const moving =
      Math.abs(target - s.p) > 1e-4 || Math.abs(s.tx - s.px) > 1e-3 || Math.abs(s.ty - s.py) > 1e-3;
    if (moving) invalidate();
    else s.p = target;

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
      if (rig.light && !lite) rig.light.intensity = 0.35 + glow * 2.4;
      if (rig.halo) (rig.halo.material as THREE.SpriteMaterial).opacity = 0.22 + glow * 0.55;
      if (rig.pool) (rig.pool.material as THREE.MeshBasicMaterial).opacity = 0.08 + glow * 0.32;
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

function Scene({ progress, lite, onReady }: { progress: MotionValue<number>; lite: boolean; onReady: () => void }) {
  const rigs = useRef<StationRig[]>([]);
  return (
    <>
      <color attach="background" args={["#0e0c0b"]} />
      <fog attach="fog" args={["#0e0c0b", 12, 24]} />
      <KeyLight />
      <Floor />
      <Walls />
      <Furniture />
      <StationLights rigs={rigs} lite={lite} />
      <CameraRig progress={progress} rigs={rigs} lite={lite} />
      <Ready onReady={onReady} />
    </>
  );
}

export type RoomCanvasProps = {
  progress: MotionValue<number>;
  lite: boolean;
  active: boolean;
  onReady: () => void;
  onLost: () => void;
};

export default function RoomCanvas({ progress, lite, active, onReady, onLost }: RoomCanvasProps) {
  return (
    <Canvas
      frameloop={active ? "demand" : "never"}
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
        <Scene progress={progress} lite={lite} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
