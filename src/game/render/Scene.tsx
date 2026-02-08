"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import Apiary from "./Apiary";
import Bees from "./Bees";
import CameraRig from "./CameraRig";
import Scenery from "./Scenery";
import { createGroundTexture } from "./textures";

type SceneProps = {
  onHiveContextMenu?: (hiveId: string, x: number, y: number) => void;
};

export default function Scene({ onHiveContextMenu }: SceneProps) {
  const [groundMap, setGroundMap] = useState<ReturnType<typeof createGroundTexture> | null>(null);

  useEffect(() => {
    setGroundMap(createGroundTexture());
  }, []);

  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        camera={{ position: [6, 7, 6], fov: 45, near: 0.1, far: 120 }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#eef6dc"]} />
        <fog attach="fog" args={["#eef6dc", 14, 60]} />
        <ambientLight intensity={0.28} />
        <hemisphereLight
          intensity={0.7}
          skyColor="#f7fbff"
          groundColor="#cfe7b4"
        />
        <directionalLight
          castShadow
          position={[10, 14, 8]}
          intensity={1.05}
          shadow-mapSize-width={3072}
          shadow-mapSize-height={3072}
          shadow-bias={-0.0004}
          shadow-normalBias={0.04}
          shadow-camera-near={2}
          shadow-camera-far={50}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
        />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial
            color="#9fb68a"
            roughness={0.95}
            map={groundMap ?? undefined}
          />
        </mesh>
        <Scenery />
        <Apiary onHiveContextMenu={onHiveContextMenu} />
        <Bees />
        <CameraRig />
      </Canvas>
    </div>
  );
}
