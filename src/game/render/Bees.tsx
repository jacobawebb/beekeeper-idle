"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MathUtils, Object3D, Vector3 } from "three";
import { useGameStore } from "@/game/state/store";
import { getSceneryData } from "./scenery";
import { createBeeTexture } from "./textures";

type BeeState =
  | "IDLE_AT_HIVE"
  | "OUTBOUND"
  | "FORAGING"
  | "RETURNING"
  | "DELIVER";

type BeeAgent = {
  hiveId: string;
  position: Vector3;
  velocity: Vector3;
  target: Vector3;
  flightY: number;
  state: BeeState;
  stateTimer: number;
  phase: number;
  speed: number;
  stuckMs: number;
  lastPos: Vector3;
};

const IDLE_TIME_MS = 400;
const FORAGE_TIME_MS = 1200;
const DELIVER_TIME_MS = 200;
const BEE_SPEED_MIN = 1.6;
const BEE_SPEED_MAX = 3.2;
const PAYLOAD_FACTOR = 0.18;
const DEBUG_INTERVAL_MS = 2000;
const DEBUG_BEE_PATH_INTERVAL_MS = 2000;
const DEBUG_PATH = true;
const DEBUG_MARKERS = true;

function distanceSqXZ(a: Vector3, b: Vector3) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function pickForageTarget(hivePos: Vector3, targets: Vector3[]): Vector3 {
  if (targets.length > 0) {
    for (let i = 0; i < 6; i += 1) {
      const candidate = targets[MathUtils.randInt(0, targets.length - 1)];
      if (candidate.distanceToSquared(hivePos) > 36) {
        return candidate.clone();
      }
    }
  }
  const angle = MathUtils.randFloat(0, Math.PI * 2);
  const radius = MathUtils.randFloat(10, 18);
  return new Vector3(
    hivePos.x + Math.cos(angle) * radius,
    0,
    hivePos.z + Math.sin(angle) * radius,
  );
}

export default function Bees() {
  const gameState = useGameStore((state) => state.gameState);
  const hiveWorldPositions = useGameStore((state) => state.hiveWorldPositions);
  const debugBees = useGameStore((state) => state.debug.beesStats);
  const hiveCount = gameState?.hives.length ?? 1;
  const beeCount = Math.min(200, Math.max(6, hiveCount * 4));
  const meshRef = useRef<InstancedMesh | null>(null);
  const wingRef = useRef<InstancedMesh | null>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const wingDummy = useMemo(() => new Object3D(), []);

  const scenery = useMemo(() => getSceneryData(), []);
  const treeTargets = useMemo(
    () => scenery.trees.map((node) => new Vector3(node[0], 0, node[2])),
    [scenery],
  );
  const flowerTargets = useMemo(
    () => scenery.flowers.map((node) => new Vector3(node[0], 0, node[2])),
    [scenery],
  );
  const beeTexture = useMemo(() => createBeeTexture(), []);
  const beesRef = useRef<BeeAgent[]>([]);
  const hivesRef = useRef<Array<{ id: string; position: Vector3 }>>([
    { id: "hive-1", position: new Vector3(0, 0, 0) },
  ]);
  const debugTimerRef = useRef(0);
  const debugPathTimerRef = useRef(0);
  const debugMarkerTimerRef = useRef(0);
  const [debugHiveMarker, setDebugHiveMarker] = useState<Vector3 | null>(null);
  const [debugTargetMarker, setDebugTargetMarker] = useState<Vector3 | null>(
    null,
  );

  useEffect(() => {
    const next =
      gameState?.hives.map((hive) => {
        const pos = hiveWorldPositions[hive.id] ?? [0, 0, 0];
        return {
          id: hive.id,
          position: new Vector3(pos[0], pos[1], pos[2]),
        };
      }) ?? [];
    hivesRef.current =
      next.length > 0
        ? next
        : [{ id: "hive-1", position: new Vector3(0, 0, 0) }];
  }, [gameState?.hives, hiveWorldPositions]);

  useEffect(() => {
    const hives = hivesRef.current;
    const agents: BeeAgent[] = [];
    for (let i = 0; i < beeCount; i += 1) {
      const hive = hives[i % hives.length];
      const flightY = hive.position.y + MathUtils.randFloat(0.9, 1.3);
      const start = hive.position.clone();
      start.y = flightY;
      const forageTarget =
        treeTargets.length > 0
          ? treeTargets[i % treeTargets.length].clone()
          : hive.position
              .clone()
              .add(
                new Vector3(
                  MathUtils.randFloat(-6, 6),
                  0,
                  MathUtils.randFloat(-6, 6),
                ),
              );
      agents.push({
        hiveId: hive.id,
        position: start.clone(),
        velocity: new Vector3(),
        target: forageTarget,
        flightY,
        state: "OUTBOUND",
        stateTimer: 0,
        phase: MathUtils.randFloat(0, Math.PI * 2),
        speed: MathUtils.randFloat(BEE_SPEED_MIN, BEE_SPEED_MAX),
        stuckMs: 0,
        lastPos: start.clone(),
      });
    }
    beesRef.current = agents;
  }, [beeCount, treeTargets, gameState?.hives, hiveWorldPositions]);

  useEffect(() => {
    if (!DEBUG_MARKERS) return;
    const hivePositions =
      gameState?.hives.map(
        (hive) => hiveWorldPositions[hive.id] ?? [0, 0, 0],
      ) ?? [];
    const firstHives = hivePositions.slice(0, 3);
    const firstFauna = treeTargets.slice(0, 10).map((pos) => pos.toArray());
    const firstFlowers = flowerTargets.slice(0, 5).map((pos) => pos.toArray());
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    treeTargets.forEach((pos) => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minZ = Math.min(minZ, pos.z);
      maxZ = Math.max(maxZ, pos.z);
    });
    console.info("Bee debug positions", {
      hives: firstHives,
      faunaTargets: firstFauna,
      flowerTargets: firstFlowers,
      faunaBounds: {
        minX: Number.isFinite(minX) ? minX : null,
        maxX: Number.isFinite(maxX) ? maxX : null,
        minZ: Number.isFinite(minZ) ? minZ : null,
        maxZ: Number.isFinite(maxZ) ? maxZ : null,
      },
    });
  }, [treeTargets, flowerTargets, hiveWorldPositions, gameState?.hives]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const bees = beesRef.current;
    const hives = hivesRef.current;
    const delta = clock.getDelta();
    const wingMesh = wingRef.current;
    mesh.count = bees.length;
    if (wingMesh) {
      wingMesh.count = bees.length * 2;
    }
    const deltaMs = delta * 1000;
    let honeyGain = 0;
    let idleCount = 0;
    let outboundCount = 0;
    let foragingCount = 0;
    let returningCount = 0;
    let deliverCount = 0;
    let debugPathLog = false;
    if (DEBUG_PATH) {
      debugTimerRef.current += deltaMs;
      if (debugTimerRef.current >= DEBUG_BEE_PATH_INTERVAL_MS) {
        debugTimerRef.current = 0;
        debugPathLog = true;
      }
    }
    for (let i = 0; i < mesh.count; i += 1) {
      const bee = bees[i];
      if (!bee) continue;
      bee.stateTimer = Math.max(0, bee.stateTimer - deltaMs);
      const moved = bee.position.distanceToSquared(bee.lastPos);
      if (moved < 0.0004) {
        bee.stuckMs += deltaMs;
      } else {
        bee.stuckMs = 0;
        bee.lastPos.copy(bee.position);
      }

      if (bee.state === "IDLE_AT_HIVE" && bee.stateTimer <= 0) {
        bee.state = "OUTBOUND";
        const hive = hives.find((item) => item.id === bee.hiveId) ?? hives[0];
        const target = pickForageTarget(hive.position, treeTargets);
        if (DEBUG_PATH && i === 0) {
          bee.target.copy(hive.position).add(new Vector3(12, 0, 12));
        } else {
          bee.target.copy(target);
        }
      }

      if (bee.state === "OUTBOUND") {
        const toTarget = bee.target.clone().sub(bee.position);
        toTarget.y = 0;
        const desired =
          toTarget.lengthSq() > 0.0001
            ? toTarget.normalize().multiplyScalar(bee.speed)
            : new Vector3();
        bee.velocity.lerp(desired, 0.14);
        bee.position.addScaledVector(bee.velocity, delta);
        if (distanceSqXZ(bee.position, bee.target) < 0.25) {
          bee.state = "FORAGING";
          bee.stateTimer = MathUtils.randFloat(600, FORAGE_TIME_MS);
        }
      }

      if (bee.state === "FORAGING" && bee.stateTimer <= 0) {
        bee.state = "RETURNING";
        const hive = hives.find((item) => item.id === bee.hiveId) ?? hives[0];
        bee.target.copy(hive.position);
      }

      if (bee.state === "RETURNING") {
        const toTarget = bee.target.clone().sub(bee.position);
        toTarget.y = 0;
        const desired =
          toTarget.lengthSq() > 0.0001
            ? toTarget.normalize().multiplyScalar(bee.speed)
            : new Vector3();
        bee.velocity.lerp(desired, 0.16);
        bee.position.addScaledVector(bee.velocity, delta);
        if (distanceSqXZ(bee.position, bee.target) < 0.25) {
          bee.state = "DELIVER";
          bee.stateTimer = DELIVER_TIME_MS;
        }
      }

      if (bee.state === "OUTBOUND" && bee.stuckMs > 2000) {
        const hive = hives.find((item) => item.id === bee.hiveId) ?? hives[0];
        bee.target.copy(pickForageTarget(hive.position, treeTargets));
        bee.state = "OUTBOUND";
        bee.stateTimer = 0;
        bee.velocity.add(
          new Vector3(
            MathUtils.randFloat(-0.6, 0.6),
            0,
            MathUtils.randFloat(-0.6, 0.6),
          ),
        );
        bee.stuckMs = 0;
      }

      if (bee.state === "DELIVER" && bee.stateTimer <= 0) {
        const snapshot = useGameStore.getState().gameState;
        const hive = snapshot?.hives.find((item) => item.id === bee.hiveId);
        if (snapshot && hive) {
          const honeyMultiplier =
            snapshot.upgrades.globalMultipliers.honey ?? 1;
          honeyGain += hive.baseYield * PAYLOAD_FACTOR * honeyMultiplier;
        }
        bee.state = "IDLE_AT_HIVE";
        bee.stateTimer = MathUtils.randFloat(300, IDLE_TIME_MS);
      }

      const wobble = Math.sin(clock.elapsedTime * 3 + i + bee.phase) * 0.02;
      bee.position.y = bee.flightY + wobble;

      dummy.position.copy(bee.position);
      const dir =
        bee.velocity.lengthSq() > 0.0001
          ? bee.velocity
          : bee.target.clone().sub(bee.position);
      dummy.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
      dummy.scale.set(0.18, 0.12, 0.34);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (wingMesh) {
        const flap = Math.sin(clock.elapsedTime * 20 + i) * 0.6;
        const wingOffset = 0.12;
        const wingScale = 0.12;
        for (let w = 0; w < 2; w += 1) {
          const index = i * 2 + w;
          const side = w === 0 ? -1 : 1;
          wingDummy.position.copy(bee.position);
          wingDummy.rotation.set(
            Math.PI / 2,
            dummy.rotation.y,
            side * (Math.PI / 2 + flap),
          );
          wingDummy.translateX(wingOffset * side);
          wingDummy.scale.set(wingScale, wingScale, wingScale);
          wingDummy.updateMatrix();
          wingMesh.setMatrixAt(index, wingDummy.matrix);
        }
      }

      if (debugBees) {
        if (bee.state === "IDLE_AT_HIVE") idleCount += 1;
        if (bee.state === "OUTBOUND") outboundCount += 1;
        if (bee.state === "FORAGING") foragingCount += 1;
        if (bee.state === "RETURNING") returningCount += 1;
        if (bee.state === "DELIVER") deliverCount += 1;
      }

      if (DEBUG_PATH && debugPathLog && i === 0) {
        const pos = bee.position;
        const target = bee.target;
        const round3 = (value: number) => Number(value.toFixed(3));
        const distSq = distanceSqXZ(pos, target);
        console.info("Bee path proof", {
          state: bee.state,
          pos: [round3(pos.x), round3(pos.z)],
          target: [round3(target.x), round3(target.z)],
          distSqXZ: round3(distSq),
        });
      }
    }

    if (DEBUG_MARKERS) {
      debugMarkerTimerRef.current += deltaMs;
      if (debugMarkerTimerRef.current >= 500) {
        debugMarkerTimerRef.current = 0;
        const hivePos = hives[0]?.position;
        setDebugHiveMarker(
          hivePos ? new Vector3(hivePos.x, 0.2, hivePos.z) : null,
        );
        const target = bees[0]?.target;
        setDebugTargetMarker(
          target ? new Vector3(target.x, 0.2, target.z) : null,
        );
      }
    }

    if (debugBees) {
      debugPathTimerRef.current += deltaMs;
      if (debugPathTimerRef.current >= DEBUG_INTERVAL_MS) {
        debugPathTimerRef.current = 0;
        console.info("Bee states", {
          idle: idleCount,
          outbound: outboundCount,
          foraging: foragingCount,
          returning: returningCount,
          deliver: deliverCount,
        });
      }
    }

    if (honeyGain > 0) {
      useGameStore.getState().updateGameState((state) => ({
        ...state,
        currencies: {
          ...state.currencies,
          honey: state.currencies.honey + honeyGain,
        },
      }));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (wingMesh) {
      wingMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, beeCount]}>
        <capsuleGeometry args={[0.14, 0.24, 6, 10]} />
        <meshStandardMaterial
          map={beeTexture}
          roughness={0.45}
          metalness={0.1}
          color="#f6c33c"
        />
      </instancedMesh>
      <instancedMesh ref={wingRef} args={[undefined, undefined, beeCount * 2]}>
        <planeGeometry args={[0.22, 0.14]} />
        <meshStandardMaterial
          color="#f4f2ff"
          transparent
          opacity={0.5}
          roughness={0.2}
        />
      </instancedMesh>
      {DEBUG_MARKERS && debugHiveMarker ? (
        <mesh position={debugHiveMarker}>
          <sphereGeometry args={[0.18, 18, 18]} />
          <meshStandardMaterial color="#1e90ff" />
        </mesh>
      ) : null}
      {DEBUG_MARKERS && debugTargetMarker ? (
        <mesh position={debugTargetMarker}>
          <sphereGeometry args={[0.18, 18, 18]} />
          <meshStandardMaterial color="#ff4040" />
        </mesh>
      ) : null}
    </group>
  );
}
