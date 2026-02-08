export type SceneryData = {
  trees: Array<[number, number, number]>;
  rocks: Array<[number, number, number]>;
  flowers: Array<[number, number, number]>;
};

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

export function generateScenery(seed = 1337): SceneryData {
  const rand = seededRandom(seed);
  const trees: Array<[number, number, number]> = [];
  const rocks: Array<[number, number, number]> = [];
  const flowers: Array<[number, number, number]> = [];

  const scatter = (
    count: number,
    radius: number,
    y: number,
    list: Array<[number, number, number]>
  ) => {
    for (let i = 0; i < count; i += 1) {
      const angle = rand() * Math.PI * 2;
      const r = radius * (0.4 + rand() * 0.6);
      const x = Math.cos(angle) * r + (rand() - 0.5) * 1.5;
      const z = Math.sin(angle) * r + (rand() - 0.5) * 1.5;
      list.push([x, y, z]);
    }
  };

  scatter(18, 18, 0, trees);
  scatter(24, 16, 0, rocks);
  scatter(60, 14, 0.02, flowers);

  return { trees, rocks, flowers };
}

let cachedScenery: SceneryData | null = null;

export function getSceneryData() {
  if (!cachedScenery) {
    cachedScenery = generateScenery();
  }
  return cachedScenery;
}
