import { CanvasTexture, RepeatWrapping } from "three";

function createCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, ctx: null };
  ctx.imageSmoothingEnabled = true;
  return { canvas, ctx };
}

export function createHoneycombTexture(size = 256) {
  const { canvas, ctx } = createCanvas(size);
  if (!ctx) return new CanvasTexture(canvas);

  ctx.fillStyle = "#d9a755";
  ctx.fillRect(0, 0, size, size);

  const hexSize = size / 8;
  const hexHeight = Math.sin(Math.PI / 3) * hexSize;
  ctx.strokeStyle = "rgba(120, 80, 20, 0.35)";
  ctx.lineWidth = 2;

  for (let y = 0; y < size + hexHeight; y += hexHeight) {
    for (let x = 0; x < size + hexSize; x += hexSize * 1.5) {
      const offsetX = (Math.floor(y / hexHeight) % 2) * (hexSize * 0.75);
      const cx = x + offsetX;
      const cy = y;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = Math.PI / 3 * i;
        const px = cx + Math.cos(angle) * hexSize;
        const py = cy + Math.sin(angle) * hexSize;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export function createGroundTexture(size = 256) {
  const { canvas, ctx } = createCanvas(size);
  if (!ctx) return new CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#cfe7b4");
  gradient.addColorStop(1, "#a8d08a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 400; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 2 + 0.5;
    ctx.fillStyle = `rgba(90, 140, 80, ${Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

export function createBeeTexture(size = 256) {
  const { canvas, ctx } = createCanvas(size);
  if (!ctx) return new CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, "#f9d74f");
  gradient.addColorStop(0.5, "#f1b72f");
  gradient.addColorStop(1, "#f7cf4a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const stripeCount = 5;
  const stripeWidth = size / (stripeCount * 2);
  ctx.fillStyle = "rgba(35, 23, 14, 0.85)";
  for (let i = 0; i < stripeCount; i += 1) {
    const x = (i * 2 + 1) * stripeWidth;
    ctx.fillRect(x, 0, stripeWidth, size);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.ellipse(size * 0.35, size * 0.5, size * 0.12, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}
