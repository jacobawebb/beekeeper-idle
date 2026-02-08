"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, MathUtils, Object3D, Vector3 } from "three";
import { useGameStore } from "@/game/state/store";
import { getSceneryData } from "./scenery";
import { createBeeTexture } from "./textures";

type BeeState = "IDLE_AT_HIVE" | "OUTBOUND" | "FORAGING" | "RETURNING" | "DELIVER";

type BeeAgent = {
  hiveId: string;
  position: Vector3;
  velocity: Vector3;
  target: Vector3;
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

function pickForageTarget(
  hivePos: Vector3,
  faunaTargets: Vector3[]
): Vector3 {
  if (faunaTargets.length > 0) {
    for (let i = 0; i < 6; i += 1) {
      const candidate =
        faunaTargets[MathUtils.randInt(0, faunaTargets.length - 1)];
      if (candidate.distanceToSquared(hivePos) > 9) {
        return candidate.clone();
      }
    }
  }
  const angle = MathUtils.randFloat(0, Math.PI * 2);
  const radius = MathUtils.randFloat(3.5, 7.5);
  return new Vector3(
    hivePos.x + Math.cos(angle) * radius,
    hivePos.y + 1.3,
    hivePos.z + Math.sin(angle) * radius
  );
}

export default function Bees() {
  const gameState = useGameStore((state) => state.gameState);
  const hiveCount = gameState?.hives.length ?? 1;
  const beeCount = Math.min(200, Math.max(6, hiveCount * 4));
  const meshRef = useRef<InstancedMesh | null>(null);
  const wingRef = useRef<InstancedMesh | null>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const wingDummy = useMemo(() => new Object3D(), []);

  const scenery = useMemo(() => getSceneryData(), []);
  const faunaTargets = useMemo(
    () =>
      [...scenery.flowers, ...scenery.trees].map(
        (node) => new Vector3(node[0], node[1] + 1.4, node[2])
      ),
    [scenery]
  );
  const beeTexture = useMemo(() => createBeeTexture(), []);
  const beesRef = useRef<BeeAgent[]>([]);
  const hivesRef = useRef<Array<{ id: string; position: Vector3 }>>([
    { id: "hive-1", position: new Vector3(0, 0, 0) },
  ]);

  useEffect(() => {
    const count = gameState?.hives.length ?? 0;
    if (count <= 0) {
      hivesRef.current = [{ id: "hive-1", position: new Vector3(0, 0, 0) }];
      return;
    }
    hivesRef.current =
      gameState?.hives.map((hive, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        return {
          id: hive.id,
          position: new Vector3(col * 3 - 3, 0, row * 3 - 3),
        };
      }) ?? [{ id: "hive-1", position: new Vector3(0, 0, 0) }];
  }, [gameState?.hives.length]);

  useEffect(() => {
    const hives = hivesRef.current;
    const agents: BeeAgent[] = [];
    for (let i = 0; i < beeCount; i += 1) {
      const hive = hives[i % hives.length];
      const start = hive.position.clone().add(new Vector3(0, 1.2, 0));
      const forageTarget =
        faunaTargets.length > 0
          ? faunaTargets[i % faunaTargets.length].clone()
          : start.clone().add(new Vector3(MathUtils.randFloat(-6, 6), 0, MathUtils.randFloat(-6, 6)));
      agents.push({
        hiveId: hive.id,
        position: start.clone(),
        velocity: new Vector3(),
        target: forageTarget,
        state: "OUTBOUND",
        stateTimer: 0,
        phase: MathUtils.randFloat(0, Math.PI * 2),
        speed: MathUtils.randFloat(BEE_SPEED_MIN, BEE_SPEED_MAX),
        stuckMs: 0,
        lastPos: start.clone(),
      });
    }
    beesRef.current = agents;
  }, [beeCount, faunaTargets.length]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const bees = beesRef.current;
    const hives = hivesRef.current;
    const delta = clock.getDelta();
    const wingMesh = wingRef.current;
    const deltaMs = delta * 1000;
    let honeyGain = 0;

    for (let i = 0; i < bees.length; i += 1) {
      const bee = bees[i];
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
        const target = pickForageTarget(hive.position, faunaTargets);
        bee.target.copy(target);
      }

      if (bee.state === "OUTBOUND") {
        const toTarget = bee.target.clone().sub(bee.position);
        if (toTarget.lengthSq() < 0.05) {
          const hive = hives.find((item) => item.id === bee.hiveId) ?? hives[0];
          bee.target.copy(pickForageTarget(hive.position, faunaTargets));
        }
        const desired = toTarget.normalize().multiplyScalar(bee.speed);
        bee.velocity.lerp(desired, 0.14);
        bee.position.addScaledVector(bee.velocity, delta);
        if (bee.position.distanceToSquared(bee.target) < 1.1) {
          bee.state = "FORAGING";
          bee.stateTimer = MathUtils.randFloat(600, FORAGE_TIME_MS);
        }
      }

      if (bee.state === "FORAGING" && bee.stateTimer <= 0) {
        bee.state = "RETURNING";
        const hive = hives.find((item) => item.id === bee.hiveId) ?? hives[0];
        bee.target.copy(hive.position).add(new Vector3(0, 1.0, 0));
      }

      if (bee.state === "RETURNING") {
        const desired = bee.target
          .clone()
          .sub(bee.position)
          .normalize()
          .multiplyScalar(bee.speed);
        bee.velocity.lerp(desired, 0.16);
        bee.position.addScaledVector(bee.velocity, delta);
        if (bee.position.distanceToSquared(bee.target) < 1.1) {
          bee.state = "DELIVER";
          bee.stateTimer = DELIVER_TIME_MS;
        }
      }

      if (bee.stuckMs > 1200) {
        const hive = hives.find((item) => item.id === bee.hiveId) ?? hives[0];
        bee.target.copy(pickForageTarget(hive.position, faunaTargets));
        bee.state = "OUTBOUND";
        bee.stateTimer = 0;
        bee.velocity.add(
          new Vector3(
            MathUtils.randFloat(-0.6, 0.6),
            0,
            MathUtils.randFloat(-0.6, 0.6)
          )
        );
        bee.stuckMs = 0;
      }

      if (bee.state === "DELIVER" && bee.stateTimer <= 0) {
        const snapshot = useGameStore.getState().gameState;
        const hive = snapshot?.hives.find((item) => item.id === bee.hiveId);
        if (snapshot && hive) {
          const honeyMultiplier = snapshot.upgrades.globalMultipliers.honey ?? 1;
          honeyGain += hive.baseYield * PAYLOAD_FACTOR * honeyMultiplier;
        }
        bee.state = "IDLE_AT_HIVE";
        bee.stateTimer = MathUtils.randFloat(300, IDLE_TIME_MS);
      }

      const wobble = Math.sin(clock.elapsedTime * 3 + i + bee.phase) * 0.02;
      bee.position.y = MathUtils.lerp(bee.position.y, bee.target.y, 0.08) + wobble;

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
            side * (Math.PI / 2 + flap)
          );
          wingDummy.translateX(wingOffset * side);
          wingDummy.scale.set(wingScale, wingScale, wingScale);
          wingDummy.updateMatrix();
          wingMesh.setMatrixAt(index, wingDummy.matrix);
        }
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
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, beesRef.current.length || beeCount]}
      >
        <capsuleGeometry args={[0.14, 0.24, 6, 10]} />
        <meshStandardMaterial
          map={beeTexture}
          roughness={0.45}
          metalness={0.1}
          color="#f6c33c"
        />
      </instancedMesh>
      <instancedMesh
        ref={wingRef}
        args={[undefined, undefined, (beesRef.current.length || beeCount) * 2]}
      >
        <planeGeometry args={[0.22, 0.14]} />
        <meshStandardMaterial
          color="#f4f2ff"
          transparent
          opacity={0.5}
          roughness={0.2}
        />
      </instancedMesh>
    </group>
  );
}
