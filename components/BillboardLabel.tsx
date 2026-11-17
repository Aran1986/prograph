import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface BillboardLabelProps {
  text: string;
  position?: [number, number, number];
  fontSize?: number;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  scaleFactor?: number;
  opacity?: number;
}

export const BillboardLabel: React.FC<BillboardLabelProps> = ({
  text,
  position = [0, 0, 0],
  fontSize = 34,
  textColor = '#0f172a',
  bgColor = 'rgba(255, 255, 255, 0.9)',
  borderColor = 'rgba(148, 163, 184, 0.7)',
  scaleFactor = 0.0085,
  opacity = 1,
}) => {
  const { texture, width, height } = useMemo(() => {
    const label = (text || '').trim();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx || !label) {
      canvas.width = 4;
      canvas.height = 4;
      const tex = new THREE.CanvasTexture(canvas);
      return { texture: tex, width: 0.01, height: 0.01 };
    }

    const font = `700 ${fontSize}px "Vazirmatn", "Tahoma", sans-serif`;
    ctx.font = font;
    const metrics = ctx.measureText(label);
    const padX = 24;
    const padY = 14;
    const w = Math.min(1024, Math.max(80, Math.ceil(metrics.width + padX * 2)));
    const h = Math.ceil(fontSize * 1.4 + padY * 2);

    canvas.width = w;
    canvas.height = h;

    // Re-set font after canvas resize
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rounded pill background
    const r = Math.min(16, h / 2);
    ctx.beginPath();
    ctx.moveTo(r, 2);
    ctx.lineTo(w - r, 2);
    ctx.quadraticCurveTo(w - 2, 2, w - 2, r);
    ctx.lineTo(w - 2, h - r);
    ctx.quadraticCurveTo(w - 2, h - 2, w - r, h - 2);
    ctx.lineTo(r, h - 2);
    ctx.quadraticCurveTo(2, h - 2, 2, h - r);
    ctx.lineTo(2, r);
    ctx.quadraticCurveTo(2, 2, r, 2);
    ctx.closePath();

    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.fillText(label, w / 2, h / 2 + 1, w - padX);

    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex) {
      (tex as any).colorSpace = 'srgb';
    } else {
      (tex as any).encoding = THREE.sRGBEncoding;
    }
    tex.needsUpdate = true;

    return {
      texture: tex,
      width: w * scaleFactor,
      height: h * scaleFactor,
    };
  }, [text, fontSize, textColor, bgColor, borderColor, scaleFactor]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  if (!text || !text.trim()) return null;

  return (
    <sprite position={position} scale={[width, height, 1]}>
      <spriteMaterial map={texture} transparent opacity={opacity} depthTest={false} />
    </sprite>
  );
};
