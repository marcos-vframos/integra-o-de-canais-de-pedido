import React, { useState, useEffect } from 'react'

interface AutoCarouselProps {
  images: string[]
  intervalMs?: number
  className?: string
  imageClassName?: string
  alt?: string
  fallbackUrl?: string
  overlay?: React.ReactNode
}

export const AutoCarousel: React.FC<AutoCarouselProps> = ({
  images = [],
  intervalMs = 4500,
  className = '',
  imageClassName = '',
  alt = 'Imagem',
  fallbackUrl,
  overlay,
}) => {
  const validImages = images.filter((img) => typeof img === 'string' && img.trim().length > 0)
  const list = validImages.length > 0 ? validImages : fallbackUrl ? [fallbackUrl] : []
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (list.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [list.length, intervalMs])

  if (list.length === 0) {
    return (
      <div
        className={`relative w-full h-full bg-zinc-900 flex items-center justify-center ${className}`}
      >
        <span className="text-xs text-zinc-500">Sem imagem</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {list.map((src, idx) => {
        const isActive = idx === currentIndex
        return (
          <div
            key={`${src}_${idx}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={src}
              alt={`${alt} ${idx + 1}`}
              className={`w-full h-full object-cover ${imageClassName}`}
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          </div>
        )
      })}

      {overlay}

      {/* Indicadores se houver mais de uma imagem */}
      {list.length > 1 && (
        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10 pointer-events-auto">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ir para foto ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === i ? 'w-4 bg-[#8F0F1B]' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
