import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point, TelestrationShape, TelestrationTool } from '../../types/tactical';
import {
  drawTelestrationShape,
  renderTelestrationsToContext
} from '../../utils/telestrationRenderer';

interface TelestrationCanvasProps {
  width: number;
  height: number;
  shapes: TelestrationShape[];
  activeTool: TelestrationTool;
  activeColor: string;
  activeWidth: number;
  isDrawingEnabled: boolean;
  onShapesChange: (shapes: TelestrationShape[]) => void;
  onSaveFrame?: () => void;
  onClear?: () => void;
}

export const TelestrationCanvas: React.FC<TelestrationCanvasProps> = ({
  width,
  height,
  shapes,
  activeTool,
  activeColor,
  activeWidth,
  isDrawingEnabled,
  onShapesChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStart, setCurrentStart] = useState<Point | null>(null);
  const [currentEnd, setCurrentEnd] = useState<Point | null>(null);
  const [currentFreehand, setCurrentFreehand] = useState<Point[]>([]);
  const [textInputPrompt, setTextInputPrompt] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');

  // Convert mouse or touch event to normalized 0..1 coordinates relative to canvas
  const getNormalizedPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      let clientX = 0;
      let clientY = 0;
      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return null;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return { x, y };
    },
    []
  );

  // Render shapes + live drawing preview
  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    renderTelestrationsToContext(ctx, shapes, width, height);

    // Live spotlight preview
    if (isDrawing && activeTool === 'spotlight' && currentStart && currentEnd) {
      const radius =
        Math.hypot(
          (currentEnd.x - currentStart.x) * width,
          (currentEnd.y - currentStart.y) * height
        ) / Math.min(width, height);
      const r = Math.max(25, radius * Math.min(width, height));
      const cx = currentStart.x * width;
      const cy = currentStart.y * height;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Live preview for all other shapes
    if (isDrawing && currentStart && currentEnd && activeTool !== 'spotlight' && activeTool !== 'player_pin') {
      const previewShape: TelestrationShape = {
        id: 'preview',
        type: activeTool,
        color: activeColor,
        width: activeWidth,
        start: currentStart,
        end: currentEnd,
        center: currentStart,
        radius:
          Math.hypot(
            (currentEnd.x - currentStart.x) * width,
            (currentEnd.y - currentStart.y) * height
          ) / Math.min(width, height),
        points: currentFreehand
      };
      drawTelestrationShape(ctx, previewShape, width, height, true);
    }
  }, [
    width,
    height,
    shapes,
    isDrawing,
    activeTool,
    activeColor,
    activeWidth,
    currentStart,
    currentEnd,
    currentFreehand
  ]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  // Interaction Handlers
  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingEnabled) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    if (activeTool === 'text') {
      setTextInputPrompt({ x: pt.x, y: pt.y });
      setTextValue('');
      return;
    }

    if (activeTool === 'player_pin') {
      const nextPinIndex = shapes.filter((s) => s.type === 'player_pin').length + 1;
      const pinShape: TelestrationShape = {
        id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'player_pin',
        color: activeColor,
        width: activeWidth,
        point: pt,
        label: String(nextPinIndex)
      };
      onShapesChange([...shapes, pinShape]);
      return;
    }

    setIsDrawing(true);
    setCurrentStart(pt);
    setCurrentEnd(pt);

    if (activeTool === 'freehand' || activeTool === 'ball_trajectory') {
      setCurrentFreehand([pt]);
    }
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingEnabled) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    setCurrentEnd(pt);

    if (activeTool === 'freehand' || activeTool === 'ball_trajectory') {
      setCurrentFreehand((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return [pt];
        const dist = Math.hypot((pt.x - last.x) * width, (pt.y - last.y) * height);
        return dist >= 4 ? [...prev, pt] : prev;
      });
    }
  };

  const handleEnd = () => {
    if (!isDrawing || !isDrawingEnabled || !currentStart || !currentEnd) {
      setIsDrawing(false);
      return;
    }

    const newShapeId = `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let newShape: TelestrationShape | null = null;

    if (activeTool === 'arrow_solid' || activeTool === 'arrow_dashed') {
      const dist = Math.hypot(
        (currentEnd.x - currentStart.x) * width,
        (currentEnd.y - currentStart.y) * height
      );
      if (dist > 8) {
        newShape = {
          id: newShapeId,
          type: activeTool,
          color: activeColor,
          width: activeWidth,
          start: currentStart,
          end: currentEnd
        };
      }
    } else if (activeTool === 'circle' || activeTool === 'spotlight') {
      const radius =
        Math.hypot(
          (currentEnd.x - currentStart.x) * width,
          (currentEnd.y - currentStart.y) * height
        ) / Math.min(width, height);
      if (radius > 0.02) {
        newShape = {
          id: newShapeId,
          type: activeTool,
          color: activeColor,
          width: activeWidth,
          center: currentStart,
          radius
        };
      }
    } else if (activeTool === 'rect') {
      const wDiff = Math.abs(currentEnd.x - currentStart.x);
      const hDiff = Math.abs(currentEnd.y - currentStart.y);
      if (wDiff > 0.02 && hDiff > 0.02) {
        newShape = {
          id: newShapeId,
          type: 'rect',
          color: activeColor,
          width: activeWidth,
          start: currentStart,
          end: currentEnd
        };
      }
    } else if (activeTool === 'freehand' || activeTool === 'ball_trajectory') {
      if (currentFreehand.length >= 2) {
        newShape = {
          id: newShapeId,
          type: activeTool,
          color: activeColor,
          width: activeWidth,
          points: currentFreehand
        };
      }
    }

    if (newShape) {
      onShapesChange([...shapes, newShape]);
    }

    setIsDrawing(false);
    setCurrentStart(null);
    setCurrentEnd(null);
    setCurrentFreehand([]);
  };

  const handleAddText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInputPrompt || !textValue.trim()) {
      setTextInputPrompt(null);
      return;
    }

    const textShape: TelestrationShape = {
      id: `text_${Date.now()}`,
      type: 'text',
      color: activeColor,
      width: 2,
      point: { x: textInputPrompt.x, y: textInputPrompt.y },
      text: textValue.trim(),
      fontSize: 14
    };

    onShapesChange([...shapes, textShape]);
    setTextInputPrompt(null);
    setTextValue('');
  };

  return (
    <div
      className={`absolute inset-0 z-20 select-none overflow-hidden ${
        isDrawingEnabled ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={Math.max(1, width)}
        height={Math.max(1, height)}
        className={`w-full h-full touch-none ${
          isDrawingEnabled
            ? activeTool === 'text'
              ? 'cursor-text'
              : activeTool === 'player_pin'
                ? 'cursor-cell'
                : 'cursor-crosshair'
            : 'pointer-events-none'
        }`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {/* Floating Text Input Box when text tool clicked */}
      {isDrawingEnabled && textInputPrompt && (
        <form
          onSubmit={handleAddText}
          style={{
            position: 'absolute',
            left: `${Math.min(75, Math.max(5, textInputPrompt.x * 100))}%`,
            top: `${Math.min(85, Math.max(10, textInputPrompt.y * 100))}%`,
            transform: 'translate(-10px, -50%)'
          }}
          className="z-30 bg-[#1E293B] border border-[#334155] rounded-xl p-2 shadow-2xl flex items-center gap-1.5"
        >
          <input
            type="text"
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Etiqueta (ej. Z4, Bloqueo)..."
            className="bg-[#0F172A] border border-[#334155] rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:border-[#3B82F6] w-44"
          />
          <button
            type="submit"
            className="bg-[#3B82F6] hover:bg-blue-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Fijar
          </button>
          <button
            type="button"
            onClick={() => setTextInputPrompt(null)}
            className="text-slate-400 hover:text-white text-xs px-1.5 py-1 cursor-pointer"
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
};
