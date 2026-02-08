"use client";

import { useCursor } from "@react-three/drei";
import { GroupProps, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Texture } from "three";
import * as THREE from "three";

type HiveModelProps = GroupProps & {
  onHiveClick?: () => void;
  onHiveContextMenu?: (event: { clientX: number; clientY: number }) => void;
  pulseKey?: number;
  evolutionTier?: number;
};

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tierColor(hex: string, tier: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.s = Math.max(0, hsl.s - tier * 0.06);
  hsl.l = Math.max(0, hsl.l - tier * 0.05);
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${c.getHexString()}`;
}

function makeCanvasTex(
  canvas: HTMLCanvasElement,
  repeat: [number, number],
  isSRGB: boolean,
) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  // three r152+ uses colorSpace; older uses encoding. This is safe in modern builds.
  if (isSRGB) (tex as any).colorSpace = THREE.SRGBColorSpace;
  else (tex as any).colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Wood: color + roughness + bump
 */
function createWoodMaps(seed = 1) {
  const size = 256;
  const rnd = mulberry32(seed);

  // COLOR
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#c89a52";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const wobble = Math.sin((y / size) * Math.PI * 4 + rnd() * 2) * 8;
    ctx.fillStyle = `rgba(85,55,20,${0.08 + rnd() * 0.08})`;
    ctx.fillRect(wobble + (rnd() * 6 - 3), y, size, 1);
    ctx.fillStyle = `rgba(255,210,120,${rnd() * 0.05})`;
    ctx.fillRect(0, y, size, 1);
  }

  for (let i = 0; i < 7; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 10 + rnd() * 18;
    const grd = ctx.createRadialGradient(x, y, 2, x, y, r);
    grd.addColorStop(0, "rgba(70,40,10,0.30)");
    grd.addColorStop(1, "rgba(70,40,10,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.1, r * 0.7, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // ROUGHNESS (grayscale)
  const rCan = document.createElement("canvas");
  rCan.width = size;
  rCan.height = size;
  const rctx = rCan.getContext("2d")!;
  const img = rctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rnd();
    // higher values = rougher. Keep wood generally rough with subtle variance.
    const v = Math.floor(190 + n * 55); // 190-245
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  rctx.putImageData(img, 0, 0);
  // add slightly darker grain = slightly smoother “polished” stripes
  rctx.globalCompositeOperation = "multiply";
  rctx.fillStyle = "rgba(200,200,200,0.65)";
  for (let y = 0; y < size; y += 6) rctx.fillRect(0, y, size, 1);

  // BUMP (grayscale, a bit stronger than roughness)
  const bCan = document.createElement("canvas");
  bCan.width = size;
  bCan.height = size;
  const bctx = bCan.getContext("2d")!;
  bctx.fillStyle = "rgb(128,128,128)";
  bctx.fillRect(0, 0, size, size);
  const bimg = bctx.createImageData(size, size);
  for (let i = 0; i < bimg.data.length; i += 4) {
    const n = rnd();
    const v = Math.floor(110 + n * 60); // subtle height noise
    bimg.data[i] = v;
    bimg.data[i + 1] = v;
    bimg.data[i + 2] = v;
    bimg.data[i + 3] = 255;
  }
  bctx.putImageData(bimg, 0, 0);
  // add “plank” banding
  bctx.globalAlpha = 0.35;
  bctx.fillStyle = "rgba(160,160,160,1)";
  for (let y = 0; y < size; y += 18) bctx.fillRect(0, y, size, 2);
  bctx.globalAlpha = 1;

  return {
    map: makeCanvasTex(c, [1.8, 1.3], true),
    roughnessMap: makeCanvasTex(rCan, [1.8, 1.3], false),
    bumpMap: makeCanvasTex(bCan, [1.8, 1.3], false),
  };
}

/**
 * Paint: subtle mottling + roughness + bump (less bumpy than wood)
 */
function createPaintMaps(seed = 1) {
  const size = 256;
  const rnd = mulberry32(seed);

  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // mottling
  for (let i = 0; i < 1200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const a = 0.03 + rnd() * 0.04;
    const r = 1 + rnd() * 3;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ROUGHNESS
  const rCan = document.createElement("canvas");
  rCan.width = size;
  rCan.height = size;
  const rctx = rCan.getContext("2d")!;
  const img = rctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rnd();
    const v = Math.floor(150 + n * 70); // 150-220 (paint a bit smoother than wood)
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  rctx.putImageData(img, 0, 0);

  // BUMP
  const bCan = document.createElement("canvas");
  bCan.width = size;
  bCan.height = size;
  const bctx = bCan.getContext("2d")!;
  bctx.fillStyle = "rgb(128,128,128)";
  bctx.fillRect(0, 0, size, size);
  const bimg = bctx.createImageData(size, size);
  for (let i = 0; i < bimg.data.length; i += 4) {
    const n = rnd();
    const v = Math.floor(122 + n * 18); // very subtle
    bimg.data[i] = v;
    bimg.data[i + 1] = v;
    bimg.data[i + 2] = v;
    bimg.data[i + 3] = 255;
  }
  bctx.putImageData(bimg, 0, 0);

  return {
    // note: color map is white; we multiply via material.color, still useful for subtle variation
    map: makeCanvasTex(c, [2.2, 1.6], true),
    roughnessMap: makeCanvasTex(rCan, [2.2, 1.6], false),
    bumpMap: makeCanvasTex(bCan, [2.2, 1.6], false),
  };
}

export default function HiveModel({
  onHiveClick,
  onHiveContextMenu,
  pulseKey = 0,
  evolutionTier = 0,
  ...props
}: HiveModelProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group | null>(null);
  const pulseStartRef = useRef<number | null>(null);
  useCursor(hovered);

  const tier = Math.min(3, Math.max(0, Math.floor(evolutionTier)));
  const superCount = [0, 1, 2, 3][tier];

  const woodBase = ["#d0a35a", "#c7924f", "#b9803f", "#a97133"][tier];
  const painted = ["#d7a54b", "#d28f3f", "#bf7e32", "#a86a30"][tier];
  const lid = ["#4a4a4a", "#3f3f3f", "#363636", "#2e2e2e"][tier];
  const metal = ["#5a5a5a", "#5a5a5a", "#5a5a5a", "#6a6a6a"][tier];

  const baseWood = useMemo(() => tierColor(woodBase, tier), [woodBase, tier]);
  const basePaint = useMemo(() => tierColor(painted, tier), [painted, tier]);

  const [woodMaps, setWoodMaps] = useState<ReturnType<
    typeof createWoodMaps
  > | null>(null);
  const [paintMaps, setPaintMaps] = useState<ReturnType<
    typeof createPaintMaps
  > | null>(null);

  useEffect(() => {
    setWoodMaps(createWoodMaps(200 + tier));
    setPaintMaps(createPaintMaps(500 + tier));
  }, [tier]);

  useEffect(() => {
    pulseStartRef.current = performance.now();
  }, [pulseKey]);

  useFrame(() => {
    if (!groupRef.current || pulseStartRef.current === null) return;
    const elapsed = performance.now() - pulseStartRef.current;
    if (elapsed > 220) {
      groupRef.current.scale.setScalar(1);
      return;
    }
    const phase = elapsed / 220;
    const scale = 1 + 0.08 * Math.sin(phase * Math.PI);
    groupRef.current.scale.setScalar(scale);
  });

  const boxW = 1.25;
  const boxD = 1.0;
  const broodH = 0.55;
  const superH = 0.32;

  const baseY = 0.18;
  const broodY = baseY + broodH / 2;
  const lidY = baseY + broodH + superCount * superH + 0.14;

  const hoverBoost = hovered ? 0.12 : 0;
  const emissive = hovered
    ? new THREE.Color("#ffe2a6")
    : new THREE.Color("#000000");

  const paintMat = useMemo(
    () => ({
      color: basePaint,
      roughness: 0.78,
      metalness: 0.03,
      map: paintMaps?.map ?? undefined,
      roughnessMap: paintMaps?.roughnessMap ?? undefined,
      bumpMap: paintMaps?.bumpMap ?? undefined,
      bumpScale: 0.018,
      emissive,
      emissiveIntensity: hoverBoost,
    }),
    [basePaint, paintMaps, emissive, hoverBoost],
  );

  const woodMat = useMemo(
    () => ({
      color: baseWood,
      roughness: 0.88,
      metalness: 0.02,
      map: woodMaps?.map ?? undefined,
      roughnessMap: woodMaps?.roughnessMap ?? undefined,
      bumpMap: woodMaps?.bumpMap ?? undefined,
      bumpScale: 0.045,
      emissive,
      emissiveIntensity: hoverBoost * 0.6,
    }),
    [baseWood, woodMaps, emissive, hoverBoost],
  );

  return (
    <group
      {...props}
      ref={groupRef}
      castShadow
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(event) => {
        event.stopPropagation();
        onHiveClick?.();
      }}
      onContextMenu={(event) => {
        event.stopPropagation();
        event.nativeEvent?.preventDefault?.();
        if (onHiveContextMenu) {
          onHiveContextMenu({
            clientX: event.nativeEvent.clientX,
            clientY: event.nativeEvent.clientY,
          });
        }
      }}
    >
      {/* Base board / stand */}
      <mesh castShadow position={[0, baseY * 0.5, 0]}>
        <boxGeometry args={[boxW + 0.18, 0.14, boxD + 0.18]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>

      {/* Landing board */}
      <mesh castShadow position={[0, baseY + 0.06, boxD / 2 + 0.16]}>
        <boxGeometry args={[0.9, 0.06, 0.38]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>

      {/* Brood box */}
      <mesh castShadow position={[0, broodY, 0]}>
        <boxGeometry args={[boxW, broodH, boxD]} />
        <meshStandardMaterial {...paintMat} />
      </mesh>

      {/* Corner bevel illusion */}
      {[
        [boxW / 2 - 0.02, broodY, boxD / 2 - 0.02],
        [-boxW / 2 + 0.02, broodY, boxD / 2 - 0.02],
        [boxW / 2 - 0.02, broodY, -boxD / 2 + 0.02],
        [-boxW / 2 + 0.02, broodY, -boxD / 2 + 0.02],
      ].map((p, i) => (
        <mesh
          key={`bevel-${i}`}
          castShadow
          position={p as any}
          rotation={[0, Math.PI / 4, 0]}
        >
          <boxGeometry args={[0.06, broodH * 0.96, 0.06]} />
          <meshStandardMaterial {...woodMat} />
        </mesh>
      ))}

      {/* Entrance slot */}
      <mesh castShadow position={[0, baseY + 0.14, boxD / 2 + 0.001]}>
        <boxGeometry args={[0.42, 0.1, 0.03]} />
        <meshStandardMaterial color={"#1d130a"} roughness={0.95} />
      </mesh>

      {/* Supers */}
      {Array.from({ length: superCount }).map((_, idx) => {
        const y = baseY + broodH + superH * idx + superH / 2;
        return (
          <group key={`super-${idx}`}>
            <mesh castShadow position={[0, y, 0]}>
              <boxGeometry args={[boxW * 0.98, superH, boxD * 0.98]} />
              <meshStandardMaterial {...paintMat} />
            </mesh>

            <mesh castShadow position={[boxW / 2 + 0.04, y, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.34]} />
              <meshStandardMaterial {...woodMat} />
            </mesh>
            <mesh castShadow position={[-boxW / 2 - 0.04, y, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.34]} />
              <meshStandardMaterial {...woodMat} />
            </mesh>
          </group>
        );
      })}

      {/* Rim */}
      <mesh
        castShadow
        position={[0, baseY + broodH + superCount * superH + 0.03, 0]}
      >
        <boxGeometry args={[boxW * 1.01, 0.06, boxD * 1.01]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>

      {/* Lid */}
      <mesh castShadow position={[0, lidY, 0]}>
        <boxGeometry args={[boxW * 1.06, 0.16, boxD * 1.06]} />
        <meshStandardMaterial
          color={lid}
          roughness={0.55}
          metalness={0.1}
          emissive={emissive}
          emissiveIntensity={hoverBoost * 0.35}
        />
      </mesh>

      {/* Lid lip */}
      <mesh castShadow position={[0, lidY - 0.09, 0]}>
        <boxGeometry args={[boxW * 1.02, 0.06, boxD * 1.02]} />
        <meshStandardMaterial
          color={tierColor("#7a7a7a", tier)}
          roughness={0.6}
          metalness={0.12}
        />
      </mesh>

      {/* Straps */}
      {tier >= 2 && (
        <group>
          <mesh
            castShadow
            position={[
              0,
              baseY + broodH / 2 + (superCount * superH) / 2,
              boxD / 2 + 0.002,
            ]}
          >
            <boxGeometry
              args={[0.1, broodH + superCount * superH + 0.06, 0.02]}
            />
            <meshStandardMaterial
              color={metal}
              roughness={0.35}
              metalness={0.55}
            />
          </mesh>
          <mesh
            castShadow
            position={[
              0,
              baseY + broodH / 2 + (superCount * superH) / 2,
              -boxD / 2 - 0.002,
            ]}
          >
            <boxGeometry
              args={[0.1, broodH + superCount * superH + 0.06, 0.02]}
            />
            <meshStandardMaterial
              color={metal}
              roughness={0.35}
              metalness={0.55}
            />
          </mesh>
          <mesh
            castShadow
            position={[
              0.14,
              baseY + broodH / 2 + (superCount * superH) / 2,
              boxD / 2 + 0.02,
            ]}
          >
            <boxGeometry args={[0.12, 0.08, 0.05]} />
            <meshStandardMaterial
              color={metal}
              roughness={0.3}
              metalness={0.65}
            />
          </mesh>
        </group>
      )}

      {/* Propolis drip */}
      {tier >= 1 && (
        <mesh
          castShadow
          position={[-0.35, baseY + 0.42, boxD / 2 + 0.004]}
          rotation={[0, 0, Math.PI / 10]}
        >
          <boxGeometry args={[0.08, 0.18, 0.02]} />
          <meshStandardMaterial color={"#6b3b12"} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}
