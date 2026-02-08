import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useGameStore } from "@/game/state/store";
import HiveModel from "./HiveModel";
import { CURRENCY_PALETTE } from "@/game/ui/currency";
import { playClickSound } from "@/game/ui/sfx";

type HiveData = {
  id: string;
  position: [number, number, number];
};

type FloatingHoney = {
  id: number;
  value: number;
  position: [number, number, number];
};

function formatFloat(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value < 1) return value.toFixed(2);
  if (value < 10) return value.toFixed(1);
  return value.toFixed(0);
}

type ApiaryProps = {
  onHiveContextMenu?: (hiveId: string, x: number, y: number) => void;
};

export default function Apiary({ onHiveContextMenu }: ApiaryProps) {
  const onHiveClick = useGameStore((state) => state.onHiveClick);
  const gameState = useGameStore((state) => state.gameState);
  const hives = useMemo<HiveData[]>(() => {
    if (!gameState || gameState.hives.length === 0) {
      return [{ id: "hive-1", position: [0, 0, 0] }];
    }
    return gameState.hives.map((hive, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      return {
        id: hive.id,
        position: [col * 3 - 3, 0, row * 3 - 3],
      };
    });
  }, [gameState]);
  const [floaters, setFloaters] = useState<FloatingHoney[]>([]);
  const [pulseKey, setPulseKey] = useState(0);
  const floaterIdRef = useRef(0);
  const floatTimersRef = useRef<Record<string, number>>({});
  const positionMap = useMemo(() => {
    const map: Record<string, [number, number, number]> = {};
    hives.forEach((hive) => {
      map[hive.id] = hive.position;
    });
    return map;
  }, [hives]);

  useFrame((_, delta) => {
    if (!gameState) return;
    const deltaMs = delta * 1000;
    const honeyMultiplier = gameState.upgrades.globalMultipliers.honey ?? 1;

    gameState.hives.forEach((hive) => {
      const id = hive.id;
      floatTimersRef.current[id] =
        (floatTimersRef.current[id] ?? 0) + deltaMs;
      if (floatTimersRef.current[id] >= 3000) {
        floatTimersRef.current[id] -= 3000;
        const perSecond =
          hive.baseCycleMs > 0
            ? (hive.baseYield / (hive.baseCycleMs / 1000)) *
              honeyMultiplier
            : 0;
        const value = perSecond * 3;
        const pos = positionMap[id] ?? [0, 0, 0];
        const floaterId = floaterIdRef.current++;
        setFloaters((items) => [
          ...items,
          { id: floaterId, value, position: pos },
        ]);
        const timeout = window.setTimeout(() => {
          setFloaters((items) => items.filter((item) => item.id !== floaterId));
        }, 1200);
        return () => window.clearTimeout(timeout);
      }
    });
  });

  return (
    <group>
      {hives.map((hive, index) => (
        <HiveModel
          key={hive.id}
          position={hive.position}
          pulseKey={pulseKey}
          evolutionTier={gameState?.hives[index]?.evolutionTier ?? 0}
          onHiveClick={() => {
            setPulseKey((value) => value + 1);
            playClickSound();
            onHiveClick(hive.id);
          }}
          onHiveContextMenu={(event) => {
            onHiveContextMenu?.(hive.id, event.clientX, event.clientY);
          }}
        />
      ))}
      {floaters.map((floater) => (
        <Html
          key={floater.id}
          position={[floater.position[0], floater.position[1] + 1.4, floater.position[2]]}
          center
          distanceFactor={8}
          transform
        >
          <div
            className="float-honey pointer-events-none select-none text-sm font-semibold"
            style={{ color: CURRENCY_PALETTE.honey.color }}
          >
            +{formatFloat(floater.value)}
          </div>
        </Html>
      ))}
    </group>
  );
}
