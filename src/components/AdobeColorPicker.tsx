import React, { useState, useEffect } from 'react'

interface AdobeColorPickerProps {
  label: string
  color: string
  onChange: (hex: string) => void
}

// Utilitários para conversão HEX <-> RGB <-> HSV
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16,
  )
  if (isNaN(bigint)) return { r: 0, g: 0, b: 0 }
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) }
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  s /= 100
  v /= 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r1 = 0,
    g1 = 0,
    b1 = 0

  if (h >= 0 && h < 60) {
    r1 = c
    g1 = x
  } else if (h >= 60 && h < 120) {
    r1 = x
    g1 = c
  } else if (h >= 120 && h < 180) {
    g1 = c
    b1 = x
  } else if (h >= 180 && h < 240) {
    g1 = x
    b1 = c
  } else if (h >= 240 && h < 300) {
    r1 = x
    b1 = c
  } else {
    r1 = c
    b1 = x
  }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}

export const AdobeColorPicker: React.FC<AdobeColorPickerProps> = ({ label, color, onChange }) => {
  const [hexInput, setHexInput] = useState(color)
  const [rgb, setRgb] = useState(() => hexToRgb(color))
  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(color)
    return rgbToHsv(r, g, b)
  })

  useEffect(() => {
    setHexInput(color)
    const newRgb = hexToRgb(color)
    setRgb(newRgb)
    setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b))
  }, [color])

  const handleHexChange = (val: string) => {
    setHexInput(val)
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      onChange(val)
      const nextRgb = hexToRgb(val)
      setRgb(nextRgb)
      setHsv(rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b))
    }
  }

  const handleHueChange = (newHue: number) => {
    const nextHsv = { ...hsv, h: newHue }
    setHsv(nextHsv)
    const nextRgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v)
    setRgb(nextRgb)
    const newHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b)
    setHexInput(newHex)
    onChange(newHex)
  }

  const handleSatValChange = (newSat: number, newVal: number) => {
    const nextHsv = { ...hsv, s: newSat, v: newVal }
    setHsv(nextHsv)
    const nextRgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v)
    setRgb(nextRgb)
    const newHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b)
    setHexInput(newHex)
    onChange(newHex)
  }

  const handleRgbChange = (part: 'r' | 'g' | 'b', val: number) => {
    const nextRgb = { ...rgb, [part]: Math.max(0, Math.min(255, val)) }
    setRgb(nextRgb)
    const newHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b)
    setHexInput(newHex)
    setHsv(rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b))
    onChange(newHex)
  }

  return (
    <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 flex flex-col gap-3 shadow-lg text-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md border border-white/20 shadow-inner"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-xs text-zinc-300 font-semibold">{color}</span>
        </div>
      </div>

      {/* Adobe style 2D Saturation/Brightness pad */}
      <div
        className="relative w-full h-28 rounded-lg cursor-crosshair overflow-hidden border border-white/10 select-none"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage:
            'linear-gradient(to right, #ffffff, transparent), linear-gradient(to top, #000000, transparent)',
        }}
        onMouseDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const update = (evt: MouseEvent | React.MouseEvent) => {
            const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left))
            const y = Math.max(0, Math.min(rect.height, evt.clientY - rect.top))
            const s = Math.round((x / rect.width) * 100)
            const v = Math.round((1 - y / rect.height) * 100)
            handleSatValChange(s, v)
          }
          update(e)
          const onMove = (evt: MouseEvent) => update(evt)
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      >
        <div
          className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Hue Slider (Barra do Espectro Adobe) */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-zinc-400">
          <span>Matiz (Hue): {hsv.h}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          value={hsv.h}
          onChange={(e) => handleHueChange(Number(e.target.value))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{
            background:
              'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
        />
      </div>

      {/* Valores Numéricos HEX e RGB */}
      <div className="grid grid-cols-4 gap-2 text-xs pt-1">
        <div>
          <label className="text-[10px] text-zinc-400 block mb-0.5">HEX</label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-mono text-xs focus:border-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-400 block mb-0.5">R</label>
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.r}
            onChange={(e) => handleRgbChange('r', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center font-mono text-xs focus:border-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-400 block mb-0.5">G</label>
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.g}
            onChange={(e) => handleRgbChange('g', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center font-mono text-xs focus:border-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-400 block mb-0.5">B</label>
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.b}
            onChange={(e) => handleRgbChange('b', Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center font-mono text-xs focus:border-amber-400 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
