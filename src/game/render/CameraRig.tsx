import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MOUSE, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const TARGET_BOUNDS = {
  minX: -10,
  maxX: 10,
  minZ: -10,
  maxZ: 10,
};

const INITIAL_TARGET = new Vector3(0, 0, 0);
const INITIAL_POSITION = new Vector3(6, 7, 6);

export default function CameraRig() {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.copy(INITIAL_POSITION);
  }, [camera]);

  useFrame(() => {
    if (!controls.current) return;
    const target = controls.current.target;
    const clampedX = Math.min(TARGET_BOUNDS.maxX, Math.max(TARGET_BOUNDS.minX, target.x));
    const clampedZ = Math.min(TARGET_BOUNDS.maxZ, Math.max(TARGET_BOUNDS.minZ, target.z));
    if (clampedX !== target.x || clampedZ !== target.z) {
      target.set(clampedX, target.y, clampedZ);
      controls.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={INITIAL_TARGET}
      enableRotate={false}
      enablePan
      enableZoom
      mouseButtons={{
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      zoomSpeed={0.9}
      panSpeed={0.8}
      minDistance={6}
      maxDistance={16}
    />
  );
}
