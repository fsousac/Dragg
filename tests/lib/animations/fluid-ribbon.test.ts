import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FluidRibbonAnimation } from "@/lib/animations/fluid-ribbon";

function makeCtx() {
  const gradient = { addColorStop: vi.fn() };

  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillStyle: undefined as unknown,
    strokeStyle: undefined as unknown,
    lineWidth: 0,
    lineCap: "",
    globalAlpha: 1,
  };
}

function makeCanvas(ctx: unknown) {
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ctx),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as HTMLCanvasElement;
}

describe("FluidRibbonAnimation", () => {
  let rafCallback: FrameRequestCallback | undefined;
  let rafSpy: ReturnType<typeof vi.fn>;
  let cancelSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rafCallback = undefined;
    rafSpy = vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    });
    cancelSpy = vi.fn();
    vi.stubGlobal("requestAnimationFrame", rafSpy);
    vi.stubGlobal("cancelAnimationFrame", cancelSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when the canvas has no 2D context", () => {
    const canvas = makeCanvas(null);

    expect(() => new FluidRibbonAnimation(canvas)).toThrow(
      "Canvas 2D context unavailable",
    );
  });

  it("drives the render loop, drawing both layers on each frame", () => {
    const ctx = makeCtx();
    const canvas = makeCanvas(ctx);
    const anim = new FluidRibbonAnimation(canvas);

    anim.start();
    expect(rafSpy).toHaveBeenCalledTimes(1);

    // First tick: startTime is unset (< 0 branch).
    rafCallback?.(1000);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(ctx.save).toHaveBeenCalledTimes(2); // one per LAYERS entry
    expect(rafSpy).toHaveBeenCalledTimes(2);

    // Second tick: startTime already set, elapsed computed from it.
    rafCallback?.(1500);
    expect(ctx.save).toHaveBeenCalledTimes(4);
    expect(rafSpy).toHaveBeenCalledTimes(3);

    anim.destroy();
    expect(cancelSpy).toHaveBeenCalledWith(1);

    // A stray frame arriving after destroy should be a no-op.
    rafCallback?.(9999);
    expect(ctx.clearRect).toHaveBeenCalledTimes(2);
    expect(rafSpy).toHaveBeenCalledTimes(3);

    // start() after destroy should also be a no-op.
    anim.start();
    expect(rafSpy).toHaveBeenCalledTimes(3);
  });
});
