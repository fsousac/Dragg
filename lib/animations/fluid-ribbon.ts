const CYCLE_MS = 10_000;
const ROCK_AMP = 12 * (Math.PI / 180);
const BASE_TILT = 25 * (Math.PI / 180);

type RGB = readonly [number, number, number];

interface RibbonLayer {
  readonly phaseMs: number;
  readonly opacity: number;
  readonly scale: number;
  readonly cx: number;
  readonly cy: number;
  readonly base: RGB;
  readonly highlight: RGB;
  readonly shadow: RGB;
}

// Midground is drawn first (sits behind the foreground)
const LAYERS: readonly RibbonLayer[] = [
  {
    phaseMs: 4_000,
    opacity: 0.45,
    scale: 0.78,
    cx: 0.68,
    cy: 0.54,
    base: [165, 200, 255],
    highlight: [200, 220, 255],
    shadow: [59, 91, 219],
  },
  {
    phaseMs: 0,
    opacity: 1.0,
    scale: 1.0,
    cx: 0.62,
    cy: 0.50,
    base: [60, 91, 219],
    highlight: [232, 240, 255],
    shadow: [10, 22, 40],
  },
];

function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

export class FluidRibbonAnimation {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private startTime = -1;
  private alive = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  start(): void {
    if (!this.alive) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.alive = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.alive) return;
    if (this.startTime < 0) this.startTime = now;
    this.render(now - this.startTime);
    this.rafId = requestAnimationFrame(this.tick);
  };

  private render(elapsed: number): void {
    const { canvas, ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const layer of LAYERS) {
      this.drawRibbon(canvas.width, canvas.height, elapsed, layer);
    }
  }

  private drawRibbon(
    w: number,
    h: number,
    elapsed: number,
    layer: RibbonLayer,
  ): void {
    const { ctx } = this;

    const phase = ((elapsed + layer.phaseMs) % CYCLE_MS) / CYCLE_MS;
    const a = phase * Math.PI * 2;

    // Sinusoidal morphing: ridge position (-1..1)
    const ridgeT = Math.sin(a);

    // Rock with slightly different period for organic feel
    const rock = Math.sin(a * 0.97) * ROCK_AMP;

    // Ribbon half-extents in physical pixels
    const halfW = w * 0.40 * layer.scale;
    const halfH = h * 0.22 * layer.scale;

    // How far the arch peak shifts along the ribbon's length
    const ridgeShift = ridgeT * halfW * 0.22;
    // Slight arch height variation (makes the shape feel alive)
    const peakVar = ridgeT * halfH * 0.09;

    // Tip endpoints (local space, before rotation)
    const lx = -halfW;
    const rx = +halfW;

    // Top arch: convex lit face
    const tc1x = -halfW * 0.18 + ridgeShift;
    const tc1y = -(halfH + peakVar);
    const tc2x = +halfW * 0.18 + ridgeShift;
    const tc2y = -(halfH - peakVar);

    // Bottom arch: concave shadow face
    const bc1x = +halfW * 0.28;
    const bc1y = +halfH * 0.44;
    const bc2x = -halfW * 0.28;
    const bc2y = +halfH * 0.44;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(w * layer.cx, h * layer.cy);
    ctx.rotate(BASE_TILT + rock);

    // ─── Fill: 3D depth gradient (top = highlight, bottom = shadow) ───
    const topY = -(halfH + Math.abs(peakVar) + halfH * 0.06);
    const botY = +halfH * 0.50;

    const fillGrad = ctx.createLinearGradient(0, topY, 0, botY);
    fillGrad.addColorStop(0.00, rgba(layer.highlight, 0.95));
    fillGrad.addColorStop(0.13, rgba(layer.highlight, 0.65));
    fillGrad.addColorStop(0.30, rgba(layer.base, 1.00));
    fillGrad.addColorStop(0.68, rgba(layer.base, 1.00));
    fillGrad.addColorStop(1.00, rgba(layer.shadow, 1.00));

    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.bezierCurveTo(tc1x, tc1y, tc2x, tc2y, rx, 0);
    ctx.bezierCurveTo(bc1x, bc1y, bc2x, bc2y, lx, 0);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // ─── Specular highlight streak along the ridge ───
    // Gradient centered on the ridge peak so the bright spot sweeps with it
    const ridgePeakX = (tc1x + tc2x) / 2;
    const streakRange = halfW * 0.55;

    const streakGrad = ctx.createLinearGradient(
      ridgePeakX - streakRange, 0,
      ridgePeakX + streakRange, 0,
    );
    streakGrad.addColorStop(0.00, rgba(layer.highlight, 0.00));
    streakGrad.addColorStop(0.30, rgba(layer.highlight, 0.60));
    streakGrad.addColorStop(0.50, rgba(layer.highlight, 0.85));
    streakGrad.addColorStop(0.70, rgba(layer.highlight, 0.60));
    streakGrad.addColorStop(1.00, rgba(layer.highlight, 0.00));

    const streakInset = halfH * 0.16;
    ctx.beginPath();
    ctx.moveTo(lx + halfW * 0.12, -halfH * 0.03);
    ctx.bezierCurveTo(
      tc1x, tc1y + streakInset,
      tc2x, tc2y + streakInset,
      rx - halfW * 0.12, -halfH * 0.03,
    );
    ctx.strokeStyle = streakGrad;
    ctx.lineWidth = halfH * 0.18;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
}
