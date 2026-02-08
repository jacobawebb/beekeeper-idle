import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";
import { getSceneryData } from "./scenery";

export default function Scenery() {
  const data = useMemo(() => getSceneryData(), []);
  const dummy = useMemo(() => new Object3D(), []);
  const treeRef = useRef<InstancedMesh | null>(null);
  const rockRef = useRef<InstancedMesh | null>(null);
  const flowerRef = useRef<InstancedMesh | null>(null);

  useLayoutEffect(() => {
    if (treeRef.current) {
      data.trees.forEach((pos, index) => {
        dummy.position.set(pos[0], pos[1] + 1.2, pos[2]);
        dummy.rotation.set(0, (index % 6) * 0.3, 0);
        dummy.scale.setScalar(0.9 + (index % 5) * 0.08);
        dummy.updateMatrix();
        treeRef.current?.setMatrixAt(index, dummy.matrix);
      });
      treeRef.current.instanceMatrix.needsUpdate = true;
    }
    if (rockRef.current) {
      data.rocks.forEach((pos, index) => {
        dummy.position.set(pos[0], pos[1] + 0.2, pos[2]);
        dummy.rotation.set(0, (index % 8) * 0.3, 0);
        dummy.scale.setScalar(0.6 + (index % 4) * 0.1);
        dummy.updateMatrix();
        rockRef.current?.setMatrixAt(index, dummy.matrix);
      });
      rockRef.current.instanceMatrix.needsUpdate = true;
    }
    if (flowerRef.current) {
      data.flowers.forEach((pos, index) => {
        dummy.position.set(pos[0], pos[1] + 0.05, pos[2]);
        dummy.rotation.set(0, (index % 6) * 0.2, 0);
        dummy.scale.setScalar(0.7 + (index % 3) * 0.1);
        dummy.updateMatrix();
        flowerRef.current?.setMatrixAt(index, dummy.matrix);
      });
      flowerRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [data, dummy]);

  return (
    <group>
      <instancedMesh ref={treeRef} args={[undefined, undefined, data.trees.length]}>
        <coneGeometry args={[0.7, 2.8, 6]} />
        <meshStandardMaterial color="#6fcf73" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[undefined, undefined, data.rocks.length]}>
        <dodecahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#c7c0b2" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={flowerRef} args={[undefined, undefined, data.flowers.length]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshStandardMaterial color="#ffd6ef" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
