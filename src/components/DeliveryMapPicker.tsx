import React, { useEffect, useRef } from 'react'

interface DeliveryMapPickerProps {
  lat: number
  lng: number
  onChangeCoords: (lat: number, lng: number) => void
  disabled?: boolean
}

export const DeliveryMapPicker: React.FC<DeliveryMapPickerProps> = ({
  lat,
  lng,
  onChangeCoords,
  disabled = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerInstanceRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true

    // Garante que o Leaflet CSS e JS estejam carregados
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link')
          link.id = 'leaflet-css'
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
        }

        await new Promise<void>((resolve, reject) => {
          if (document.getElementById('leaflet-js')) {
            const checkInterval = setInterval(() => {
              if ((window as any).L) {
                clearInterval(checkInterval)
                resolve()
              }
            }, 50)
            return
          }
          const script = document.createElement('script')
          script.id = 'leaflet-js'
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.onload = () => resolve()
          script.onerror = reject
          document.body.appendChild(script)
        })
      }

      if (!isMounted || !mapContainerRef.current) return

      const L = (window as any).L
      if (!L) return

      // Inicializa mapa se ainda não existir
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 15,
          zoomControl: true,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map)

        // Ícone customizado vermelho para entrega Loyola's
        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background-color: #E10600; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 10px; height: 10px; background-color: #FFFFFF; border-radius: 50%;"></div>
                 </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        })

        const marker = L.marker([lat, lng], {
          draggable: !disabled,
          icon: customIcon,
        }).addTo(map)

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onChangeCoords(pos.lat, pos.lng)
        })

        map.on('click', (e: any) => {
          if (disabled) return
          marker.setLatLng(e.latlng)
          onChangeCoords(e.latlng.lat, e.latlng.lng)
        })

        mapInstanceRef.current = map
        markerInstanceRef.current = marker
      } else {
        mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom())
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([lat, lng])
        }
      }
    }

    loadLeaflet().catch(console.error)

    return () => {
      isMounted = false
    }
  }, [lat, lng, disabled, onChangeCoords])

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#27272A] bg-zinc-950 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-48 sm:h-56 z-0" />
      <div className="absolute top-2 left-2 z-10 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-[11px] text-zinc-300 border border-white/10 pointer-events-none">
        Arraste o pino para refinar seu local exato
      </div>
    </div>
  )
}
