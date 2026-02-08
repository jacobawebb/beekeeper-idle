"use client";

import { useCursor } from "@react-three/drei";
import { GroupProps, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { createHoneycombTexture } from "./textures";

type HiveModelProps = GroupProps & {
  onHiveClick?: () => void;
  onHiveContextMenu?: (event: { clientX: number; clientY: number }) => void;
  pulseKey?: number;
  evolutionTier?: number;
};

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

  const tierShift = Math.min(3, Math.max(0, Math.floor(evolutionTier)));
  const baseBody = ["#d7a54b", "#d28f3f", "#bf7e32", "#a86a30"][tierShift];
  const baseTop = ["#c79035", "#b87b2b", "#a66a25", "#915e21"][tierShift];
  const baseDoor = ["#8a5a28", "#7b4c23", "#6d421f", "#603a1b"][tierShift];
  const [honeycombMap, setHoneycombMap] = useState<ReturnType<typeof createHoneycombTexture> | null>(null);

  useEffect(() => {
    setHoneycombMap(createHoneycombTexture());
  }, []);

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
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.6, 0.75, 0.7, 16]} />
        <meshStandardMaterial
          color={hovered ? "#f0c76a" : baseBody}
          map={honeycombMap ?? undefined}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>
      <mesh castShadow position={[0, 0.85, 0]}>
        <coneGeometry args={[0.55, 0.4, 16]} />
        <meshStandardMaterial
          color={hovered ? "#e3b652" : baseTop}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      <mesh castShadow position={[0.25, 0.35, 0.55]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial
          color={hovered ? "#a86a30" : baseDoor}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}
