import type { Bloom } from "@/lib/validation/types";
import { resolveTokens } from "@/lib/tokens/token-engine";

export async function exportBloomPng(bloom: Bloom, row: Record<string, string> = {}) {
  const image = await loadImage(bloom.templateImageDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = bloom.canvasWidth;
  canvas.height = bloom.canvasHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas export is not available in this browser.");

  context.drawImage(image, 0, 0, bloom.canvasWidth, bloom.canvasHeight);

  for (const layer of bloom.layers.filter((item) => item.visible)) {
    context.save();
    context.globalAlpha = layer.opacity;
    context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    context.rotate((layer.rotation * Math.PI) / 180);
    context.textAlign = layer.align;
    context.textBaseline = "top";
    context.fillStyle = layer.color;
    context.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;

    const x = layer.align === "center" ? 0 : layer.align === "right" ? layer.width / 2 : -layer.width / 2;
    const y = -layer.height / 2;
    const lines = wrapText(context, resolveTokens(layer.content, row), layer.width, layer.letterSpacing);
    lines.forEach((line, index) => {
      drawTextWithSpacing(context, line, x, y + index * layer.fontSize * layer.lineHeight, layer.letterSpacing);
    });
    context.restore();
  }

  const link = document.createElement("a");
  link.download = `${slugify(bloom.title)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load certificate template."));
    image.src = src;
  });
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, letterSpacing: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const measured = context.measureText(test).width + Math.max(0, test.length - 1) * letterSpacing;
      if (measured > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawTextWithSpacing(context: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  if (!spacing) {
    context.fillText(text, x, y);
    return;
  }

  let cursor = x;
  for (const char of text) {
    context.fillText(char, cursor, y);
    cursor += context.measureText(char).width + spacing;
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "certificate";
}
