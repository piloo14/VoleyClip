import { TelestrationShape } from '../types/tactical';
import { renderTelestrationsToContext } from './telestrationRenderer';

/**
 * Generates a base64 JPEG thumbnail from the current video element frame,
 * optionally compositing tactical drawing annotations on top.
 */
export function captureVideoThumbnail(
  videoElement: HTMLVideoElement,
  width = 320,
  height = 180,
  shapes?: TelestrationShape[]
): string | undefined {
  try {
    if (!videoElement || videoElement.readyState < 2) {
      return undefined;
    }

    const vw = videoElement.videoWidth || width;
    const vh = videoElement.videoHeight || height;
    const outW = width;
    const outH = Math.round((width / vw) * vh) || height;

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.drawImage(videoElement, 0, 0, outW, outH);

    if (shapes && shapes.length > 0) {
      renderTelestrationsToContext(ctx, shapes, outW, outH);
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('Failed to capture video thumbnail (likely CORS or unready video):', err);
    return undefined;
  }
}
