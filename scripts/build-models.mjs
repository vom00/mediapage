#!/usr/bin/env node
// Builds the landing room's model pack: public/models/room.glb.
//
//   node scripts/build-models.mjs [path/to/kenney]
//
// Source: Kenney's Furniture Kit and Mini Arcade (both CC0,
// https://kenney.nl). The source folder is treated as data only — we
// copy .glb/.png files out of it and never run anything inside it.
//
// Pipeline (gltf-transform, run through npx so it stays out of the
// app's dependency tree):
//   1. stage the chosen models (arcade pieces get their shared
//      colormap texture placed next to them so it can be embedded),
//   2. merge everything into one file — one request, and every
//      furniture piece shares the same handful of named materials,
//   3. dedup + prune + weld, then meshopt-compress the geometry.
// The scene code looks pieces up by node name and replaces materials
// by name, so nothing here bakes in colour decisions.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GLTF_TRANSFORM = "@gltf-transform/cli@4.2.1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kenney = path.resolve(
  process.argv[2] ??
    process.env.KENNEY_DIR ??
    path.join(
      os.tmpdir(),
      "claude/04d5b2324b6f53a2/74b0c229-427a-4fcf-b10b-2ca0037aa8f8/scratchpad/kenney",
    ),
);
const furnitureDir = path.join(kenney, "furniture-kit/Models/GLTF format");
const arcadeDir = path.join(kenney, "mini-arcade/Models/GLB format");
// Variation A is the cooler of the two arcade palettes; the scene
// re-tints it anyway.
const arcadeTexture = path.join(kenney, "mini-arcade/Models/Textures/variation-a.png");

const FURNITURE = [
  "wall",
  "wallWindow",
  "floorFull",
  "bookcaseOpen",
  "bookcaseClosedWide",
  "books",
  "televisionModern",
  "cabinetTelevision",
  "speaker",
  "speakerSmall",
  "radio",
  "laptop",
  "loungeSofa",
  "loungeChair",
  "rugRounded",
  "lampRoundFloor",
  "pottedPlant",
  "plantSmall1",
  "tableCoffee",
  "sideTable",
  "pillow",
];
const ARCADE = ["arcade-machine"];

const outDir = path.join(root, "public/models");
const outFile = path.join(outDir, "room.glb");

function run(args) {
  const quoted = args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));
  const res = spawnSync("npx", ["-y", GLTF_TRANSFORM, ...quoted], {
    stdio: "inherit",
    shell: true,
  });
  if (res.status !== 0) {
    throw new Error(`gltf-transform ${args[0]} failed (${res.status})`);
  }
}

function main() {
  for (const dir of [furnitureDir, arcadeDir]) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Kenney models not found at ${dir}. Pass the kenney folder as the first argument.`);
    }
  }

  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "room-models-"));
  try {
    const inputs = [];
    for (const name of FURNITURE) {
      const dest = path.join(stage, `${name}.glb`);
      fs.copyFileSync(path.join(furnitureDir, `${name}.glb`), dest);
      inputs.push(dest);
    }
    fs.mkdirSync(path.join(stage, "Textures"));
    fs.copyFileSync(arcadeTexture, path.join(stage, "Textures/colormap.png"));
    for (const name of ARCADE) {
      // The arcade GLBs point at Textures/colormap.png beside them;
      // staging it there lets the merge embed it.
      const dest = path.join(stage, `${name}.glb`);
      fs.copyFileSync(path.join(arcadeDir, `${name}.glb`), dest);
      inputs.push(dest);
    }

    const merged = path.join(stage, "merged.glb");
    run(["merge", ...inputs, merged, "--merge-scenes"]);

    const deduped = path.join(stage, "deduped.glb");
    run(["dedup", merged, deduped]);
    const pruned = path.join(stage, "pruned.glb");
    run(["prune", deduped, pruned]);
    const welded = path.join(stage, "welded.glb");
    run(["weld", pruned, welded]);

    fs.mkdirSync(outDir, { recursive: true });
    run(["meshopt", welded, outFile, "--level", "medium"]);

    const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
    console.log(`\nwrote ${path.relative(root, outFile)} (${kb} KB)`);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

main();
