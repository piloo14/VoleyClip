import { Point, TelestrationShape } from '../types/tactical';

export function hexToRgba(hex: string, alpha: number): string {
  let cleanHex = (hex || '#F97316').replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleanHex, 16);
  if (Number.isNaN(num)) return `rgba(249, 115, 22, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draws a single TelestrationShape onto a 2D canvas context scaled to w x h.
 */
export function drawTelestrationShape(
  ctx: CanvasRenderingContext2D,
  shape: TelestrationShape,
  w: number,
  h: number,
  isPreview = false
): void {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = Math.max(1.5, shape.width * (w / 854));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isPreview) {
    ctx.setLineDash([6, 4]);
  }

  switch (shape.type) {
    case 'arrow_solid':
    case 'arrow_dashed': {
      if (!shape.start || !shape.end) break;
      const x1 = shape.start.x * w;
      const y1 = shape.start.y * h;
      const x2 = shape.end.x * w;
      const y2 = shape.end.y * h;

      ctx.beginPath();
      if (shape.type === 'arrow_dashed' || isPreview) {
        ctx.setLineDash([8, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = Math.max(10, ctx.lineWidth * 3.4);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'ball_trajectory': {
      const pts = shape.points;
      if (!pts || pts.length < 2) break;

      // Subtle dark halo for readability on bright gym floors/nets
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.lineWidth = ctx.lineWidth + 2.5;
      ctx.setLineDash([]);
      drawSmoothCurve(ctx, pts, w, h);
      ctx.stroke();
      ctx.restore();

      // Main dashed trajectory curve
      ctx.setLineDash([9, 6]);
      drawSmoothCurve(ctx, pts, w, h);
      ctx.stroke();

      // Origin volleyball dot
      const startX = pts[0].x * w;
      const startY = pts[0].y * h;
      const dotR = Math.max(4, ctx.lineWidth * 1.4);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(startX, startY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = shape.color;
      ctx.stroke();

      // Arrowhead at final trajectory segment
      const last = pts[pts.length - 1];
      const prevIdx = Math.max(0, pts.length - 4);
      const prev = pts[prevIdx];
      const x1 = prev.x * w;
      const y1 = prev.y * h;
      const x2 = last.x * w;
      const y2 = last.y * h;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = Math.max(11, ctx.lineWidth * 3.5);

      ctx.fillStyle = shape.color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'player_pin': {
      const pt = shape.point || shape.center;
      if (!pt) break;
      const cx = pt.x * w;
      const cy = pt.y * h;
      const pinRadius = Math.max(11, Math.min(w, h) * 0.032);

      // Outer contrast ring
      ctx.beginPath();
      ctx.arc(cx, cy, pinRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fill();

      // Main colored player circle
      ctx.beginPath();
      ctx.arc(cx, cy, pinRadius, 0, Math.PI * 2);
      ctx.fillStyle = shape.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Player number / label
      const label = shape.label || 'J';
      const fontSize = Math.max(10, Math.round(pinRadius * 0.95));
      ctx.font = `800 ${fontSize}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy + 0.5);
      break;
    }

    case 'circle': {
      if (!shape.center || shape.radius === undefined) break;
      const cx = shape.center.x * w;
      const cy = shape.center.y * h;
      const r = Math.max(10, shape.radius * Math.min(w, h));

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = hexToRgba(shape.color, 0.18);
      ctx.fill();
      break;
    }

    case 'rect': {
      if (!shape.start || !shape.end) break;
      const rx = Math.min(shape.start.x, shape.end.x) * w;
      const ry = Math.min(shape.start.y, shape.end.y) * h;
      const rw = Math.abs(shape.end.x - shape.start.x) * w;
      const rh = Math.abs(shape.end.y - shape.start.y) * h;

      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = hexToRgba(shape.color, 0.15);
      ctx.fillRect(rx, ry, rw, rh);
      break;
    }

    case 'freehand': {
      if (!shape.points || shape.points.length < 2) break;
      ctx.setLineDash([]);
      drawSmoothCurve(ctx, shape.points, w, h);
      ctx.stroke();
      break;
    }

    case 'text': {
      if (!shape.point || !shape.text) break;
      const tx = shape.point.x * w;
      const ty = shape.point.y * h;
      const fontSize = Math.max(10, (shape.fontSize || 14) * (w / 854));

      ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      const textMetrics = ctx.measureText(shape.text);
      const padding = Math.max(4, 6 * (w / 854));
      const bgWidth = textMetrics.width + padding * 2;
      const bgHeight = fontSize + padding * 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tx - padding, ty - fontSize - padding / 2, bgWidth, bgHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = shape.color;
      ctx.fillText(shape.text, tx, ty);
      break;
    }
  }
  ctx.restore();
}

function drawSmoothCurve(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  w: number,
  h: number
): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x * w, points[0].y * h);
  if (points.length === 2) {
    ctx.lineTo(points[1].x * w, points[1].y * h);
    return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const midX = ((points[i].x + points[i + 1].x) / 2) * w;
    const midY = ((points[i].y + points[i + 1].y) / 2) * h;
    ctx.quadraticCurveTo(points[i].x * w, points[i].y * h, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x * w, last.y * h);
}

/**
 * Renders all TelestrationShapes (including spotlights) onto a target 2D canvas context.
 */
export function renderTelestrationsToContext(
  ctx: CanvasRenderingContext2D,
  shapes: TelestrationShape[],
  width: number,
  height: number
): void {
  if (!shapes || shapes.length === 0) return;

  const spotlightShapes = shapes.filter((s) => s.type === 'spotlight');
  if (spotlightShapes.length > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';

    spotlightShapes.forEach((s) => {
      if (!s.center || !s.radius) return;
      const cx = s.center.x * width;
      const cy = s.center.y * height;
      const r = s.radius * Math.min(width, height);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    spotlightShapes.forEach((s) => {
      if (!s.center || !s.radius) return;
      const cx = s.center.x * width;
      const cy = s.center.y * height;
      const r = s.radius * Math.min(width, height);
      ctx.save();
      ctx.strokeStyle = s.color || '#F97316';
      ctx.lineWidth = Math.max(2, 3 * (width / 854));
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  shapes
    .filter((s) => s.type !== 'spotlight')
    .forEach((shape) => {
      drawTelestrationShape(ctx, shape, width, height);
    });
}
