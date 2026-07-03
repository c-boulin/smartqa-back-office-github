import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = (clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  ).slice(0, 6).padEnd(6, '0');
  const n = parseInt(full, 16);
  if (isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('');
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return [h * 360, max === 0 ? 0 : d / max, max];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hh = h / 360;
  const i = Math.floor(hh * 6);
  const f = hh * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const rows: [number, number, number][] = [
    [v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q],
  ];
  const [r, g, b] = rows[i % 6];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const SWATCHES: string[] = [
  // pastels
  '#F9A8D4', '#E9D5FF', '#C4B5FD', '#BFDBFE', '#BAE6FD',
  '#A5F3FC', '#99F6E4', '#D9F99D', '#FED7AA', '#FECDD3',
  // vivid
  '#EF4444', '#EC4899', '#A855F7', '#3B82F6', '#0EA5E9',
  '#06B6D4', '#22C55E', '#84CC16', '#F97316', '#F87171',
  // dark
  '#991B1B', '#9D174D', '#6B21A8', '#1E3A8A', '#1D4ED8',
  '#155E75', '#14532D', '#365314', '#9A3412', '#7C2D12',
];

export interface ColorPickerPopupProps {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

export function ColorPickerPopup({
  color,
  onChange,
  onClose,
  anchorRect,
}: ColorPickerPopupProps): React.ReactElement {
  const [hue, setHue] = useState(() => rgbToHsv(...hexToRgb(color))[0]);
  const [sat, setSat] = useState(() => rgbToHsv(...hexToRgb(color))[1]);
  const [val, setVal] = useState(() => rgbToHsv(...hexToRgb(color))[2]);
  const [hexInput, setHexInput] = useState(() => color.replace('#', '').toUpperCase());

  const gradRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const emitHsv = useCallback((h: number, s: number, v: number) => {
    const hex = rgbToHex(...hsvToRgb(h, s, v));
    setHexInput(hex.replace('#', '').toUpperCase());
    onChange(hex);
  }, [onChange]);

  const handleGradDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = gradRef.current!.getBoundingClientRect();
    const s = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    setSat(s); setVal(v); emitHsv(hue, s, v);
  }, [hue, emitHsv]);

  const handleGradMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return;
    const rect = gradRef.current!.getBoundingClientRect();
    const s = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    setSat(s); setVal(v); emitHsv(hue, s, v);
  }, [hue, emitHsv]);

  const handleHueDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = hueRef.current!.getBoundingClientRect();
    const h = clamp(((e.clientX - rect.left) / rect.width) * 360, 0, 360);
    setHue(h); emitHsv(h, sat, val);
  }, [sat, val, emitHsv]);

  const handleHueMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return;
    const rect = hueRef.current!.getBoundingClientRect();
    const h = clamp(((e.clientX - rect.left) / rect.width) * 360, 0, 360);
    setHue(h); emitHsv(h, sat, val);
  }, [sat, val, emitHsv]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSwatchClick = useCallback((hex: string) => {
    const [h, s, v] = rgbToHsv(...hexToRgb(hex));
    setHue(h); setSat(s); setVal(v);
    setHexInput(hex.replace('#', '').toUpperCase());
    onChange(hex);
  }, [onChange]);

  const handleHexInput = useCallback((raw: string) => {
    const clean = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    setHexInput(clean.toUpperCase());
    if (clean.length === 6) {
      const [h, s, v] = rgbToHsv(...hexToRgb('#' + clean));
      setHue(h); setSat(s); setVal(v);
      onChange('#' + clean);
    }
  }, [onChange]);

  const [hr, hg, hb] = hsvToRgb(hue, 1, 1);
  const hueColor = `rgb(${hr},${hg},${hb})`;
  const currentHex = rgbToHex(...hsvToRgb(hue, sat, val));
  const isDark = document.documentElement.classList.contains('dark');

  const popupW = 380;
  const popupH = 650;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = anchorRect.bottom + 10;
  let left = anchorRect.left - 20;
  if (top + popupH > vh - 8) top = Math.max(8, anchorRect.top - popupH - 10);
  if (left + popupW > vw - 8) left = vw - popupW - 8;
  if (left < 8) left = 8;

  return createPortal(
    <div className={isDark ? 'dark' : ''}>
      <div
        ref={popupRef}
        className="fixed z-[9999] rounded-2xl shadow-2xl overflow-hidden border border-white/10 dark:border-white/10 bg-[#1a2437] dark:bg-[#1a2437]"
        style={{ top, left, width: popupW }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">

          {/* Swatches */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
              Pick a swatch:
            </p>
            <div className="grid grid-cols-10 gap-[6px]">
              {SWATCHES.map(sw => {
                const isActive = sw.toLowerCase() === currentHex.toLowerCase();
                return (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => handleSwatchClick(sw)}
                    className="h-[28px] w-[28px] rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: sw,
                      outline: isActive ? '2px solid white' : '2px solid transparent',
                      outlineOffset: '2px',
                    }}
                    data-mipqa="color-picker-swatch"
                  />
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-700/60" />

          {/* Color picker */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
              Select your color:
            </p>

            {/* 2D gradient */}
            <div
              ref={gradRef}
              className="relative w-full rounded-xl overflow-hidden cursor-crosshair select-none touch-none"
              style={{
                height: '230px',
                background: `linear-gradient(to bottom, transparent, #000),linear-gradient(to right, #fff, ${hueColor})`,
              }}
              onPointerDown={handleGradDown}
              onPointerMove={handleGradMove}
            >
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${sat * 100}%`,
                  top: `${(1 - val) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="h-[18px] w-[18px] rounded-full border-[2.5px] border-white shadow-lg"
                  style={{ backgroundColor: currentHex }}
                />
              </div>
            </div>

            {/* Hue slider */}
            <div className="mt-4 flex items-center gap-3">
              <div
                className="h-7 w-7 rounded-full shrink-0 border border-white/15 shadow"
                style={{ backgroundColor: currentHex }}
              />
              <div
                ref={hueRef}
                className="relative flex-1 rounded-full cursor-pointer select-none touch-none"
                style={{
                  height: '16px',
                  background: 'linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)',
                }}
                onPointerDown={handleHueDown}
                onPointerMove={handleHueMove}
              >
                <div
                  className="absolute top-1/2 pointer-events-none"
                  style={{
                    left: `${(hue / 360) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className="h-[22px] w-[22px] rounded-full border-[3px] border-white shadow-md"
                    style={{ backgroundColor: `hsl(${hue},100%,50%)` }}
                  />
                </div>
              </div>
            </div>

            {/* Hex input */}
            <div className="mt-4">
              <div className="rounded-xl bg-slate-800/80 border border-slate-700/70 px-4 py-3">
                <input
                  type="text"
                  value={hexInput}
                  onChange={e => handleHexInput(e.target.value)}
                  className="w-full bg-transparent text-center text-xl font-bold text-white tracking-[0.22em] focus:outline-none uppercase caret-white"
                  maxLength={6}
                  spellCheck={false}
                  data-mipqa="color-picker-hex-input"
                />
              </div>
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mt-2">
                Hex
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
