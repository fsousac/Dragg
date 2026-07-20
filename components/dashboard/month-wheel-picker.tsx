"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { X, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

const YEAR_RANGE = 5;

function buildYears(selectedYear: number) {
  const start = selectedYear - YEAR_RANGE;
  return Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => start + i);
}

const DISTANCE_OPACITY = [1, 0.5, 0.25] as const;

function opacityForDistance(distance: number) {
  return DISTANCE_OPACITY[distance] ?? 0.1;
}

function monthNames(locale: string) {
  return Array.from({ length: 12 }, (_, i) => {
    const name = new Date(2020, i, 1).toLocaleDateString(locale, {
      month: "long",
    });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

interface DragState {
  startY: number;
  startTop: number;
  lastY: number;
  lastT: number;
  v: number;
  moved: boolean;
}

interface WheelProps {
  items: (string | number)[];
  index: number;
  align: "left" | "right";
  onCommit: (i: number) => void;
}

function Wheel({ items, index, align, onCommit }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [center, setCenter] = useState(index);

  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));

  const snap = useCallback(() => {
    if (!ref.current) return;
    const idx = clamp(Math.round(ref.current.scrollTop / ITEM_H));
    ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    onCommit(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, onCommit]);

  // Init scroll position once
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = index * ITEM_H;
      setCenter(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when index changes externally
  useEffect(() => {
    if (!ref.current) return;
    const current = Math.round(ref.current.scrollTop / ITEM_H);
    if (current !== index) {
      ref.current.scrollTo({ top: index * ITEM_H, behavior: "smooth" });
      setCenter(index);
    }
  }, [index]);

  function handleScroll() {
    if (!ref.current) return;
    const idx = clamp(Math.round(ref.current.scrollTop / ITEM_H));
    setCenter(idx);
    if (dragRef.current) return;
    if (toRef.current) clearTimeout(toRef.current);
    toRef.current = setTimeout(snap, 160);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!ref.current) return;
    if (toRef.current) clearTimeout(toRef.current);
    dragRef.current = {
      startY: e.clientY,
      startTop: ref.current.scrollTop,
      lastY: e.clientY,
      lastT: performance.now(),
      v: 0,
      moved: false,
    };
    ref.current.style.scrollSnapType = "none";
    ref.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || !ref.current) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 2) d.moved = true;
    ref.current.scrollTop = d.startTop - dy;
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = now;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || !ref.current) return;
    const el = ref.current;

    // A tap: no drag happened, so resolve it to whichever item is under the
    // pointer instead of relying on a native "click" event, which some
    // browsers don't dispatch to the original target once the container has
    // pointer capture.
    if (!d.moved) {
      const contentY = e.clientY - el.getBoundingClientRect().top + el.scrollTop;
      const idx = clamp(Math.floor((contentY - PAD) / ITEM_H));
      dragRef.current = null;
      el.style.scrollSnapType = "y mandatory";
      handleClick(idx);
      return;
    }

    let velocity = -d.v * 14;
    const max = (items.length - 1) * ITEM_H;

    function frame() {
      if (!el) return;
      if (Math.abs(velocity) < 0.6) {
        dragRef.current = null;
        el.style.scrollSnapType = "y mandatory";
        snap();
        return;
      }
      let top = el.scrollTop + velocity;
      top = Math.max(0, Math.min(max, top));
      el.scrollTop = top;
      setCenter(clamp(Math.round(top / ITEM_H)));
      velocity *= 0.92;
      requestAnimationFrame(frame);
    }

    if (Math.abs(velocity) < 0.6) {
      dragRef.current = null;
      el.style.scrollSnapType = "y mandatory";
      snap();
    } else {
      requestAnimationFrame(frame);
    }
  }

  function handleClick(i: number) {
    ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
    setCenter(i);
    onCommit(i);
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative flex-1 overflow-y-auto touch-none cursor-grab select-none"
      style={{
        height: VISIBLE * ITEM_H,
        scrollSnapType: "y mandatory",
        WebkitMaskImage:
          "linear-gradient(180deg, transparent, #000 28%, #000 72%, transparent)",
        maskImage:
          "linear-gradient(180deg, transparent, #000 28%, #000 72%, transparent)",
      }}
    >
      <div style={{ height: PAD }} />
      {items.map((item, i) => {
        const dist = Math.abs(i - center);
        const opacity = opacityForDistance(dist);
        return (
          <div
            key={i}
            onClick={() => handleClick(i)}
            className="flex items-center cursor-pointer whitespace-nowrap"
            style={{
              height: ITEM_H,
              scrollSnapAlign: "center",
              justifyContent: align === "right" ? "flex-end" : "flex-start",
              paddingLeft: align === "right" ? 0 : 20,
              paddingRight: align === "right" ? 20 : 0,
              fontSize: dist === 0 ? 18 : 16,
              fontWeight: dist === 0 ? 700 : 500,
              opacity,
              transition: "opacity 0.12s, font-size 0.12s",
            }}
          >
            {item}
          </div>
        );
      })}
      <div style={{ height: PAD }} />
    </div>
  );
}

interface MonthWheelPickerProps {
  month: number; // 0-based
  year: number;
  onChange: (month: number, year: number) => void;
  onClose: () => void;
}

export function MonthWheelPicker({
  month,
  year,
  onChange,
  onClose,
}: MonthWheelPickerProps) {
  const { locale, t } = useI18n();
  const months = monthNames(locale);
  const years = buildYears(year);
  const yearIdx = years.indexOf(year);

  const [localMonth, setLocalMonth] = useState(month);
  const [localYear, setLocalYear] = useState(year);
  const [localYearIdx, setLocalYearIdx] = useState(Math.max(0, yearIdx));

  function handleConfirm() {
    onChange(localMonth, localYear);
    onClose();
  }

  return (
    <>
      {/* Picker panel */}
      <div
        className="absolute right-0 top-[calc(100%+10px)] z-50 w-75 rounded-2xl border border-border bg-card shadow-lg p-4"
        style={{ animation: "month-picker-in 0.22s cubic-bezier(.22,1,.36,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("common.selectMonth")}
          </span>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Wheels */}
        <div className="relative flex gap-1">
          {/* Selection band */}
          <div
            className="pointer-events-none absolute left-0 right-0 rounded-xl border border-border bg-muted/60"
            style={{ top: PAD, height: ITEM_H }}
          />
          <Wheel
            items={months}
            index={localMonth}
            align="left"
            onCommit={(i) => setLocalMonth(i)}
          />
          <Wheel
            items={years}
            index={localYearIdx}
            align="right"
            onCommit={(i) => {
              setLocalYearIdx(i);
              setLocalYear(years[i]);
            }}
          />
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Check className="size-4" />
          {t("common.selectMonth")}
        </button>
      </div>

      <style>{`
        @keyframes month-picker-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>
    </>
  );
}
