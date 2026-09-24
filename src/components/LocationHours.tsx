import { useState, useEffect } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { BUSINESS_INFO, checkIsOpenNow } from '@/data/loyolasData'

export default function LocationHours() {
  const [openStatus, setOpenStatus] = useState(() => checkIsOpenNow())
  const [currentDayIndex, setCurrentDayIndex] = useState(() => new Date().getDay())

  useEffect(() => {
    const interval = setInterval(() => {
      setOpenStatus(checkIsOpenNow())
      setCurrentDayIndex(new Date().getDay())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const mapsEmbedUrl =
    'https://maps.google.com/maps?q=Av.%20Nicanor%20Ramos%20Nogueira%2C%20Araretama%2C%20Pindamonhangaba%20SP&t=&z=15&ie=UTF8&iwloc=&output=embed'

  return (
    <section
      id="localizacao"
      className="py-24 lg:py-32 bg-[#0A150D] text-white relative overflow-hidden"
      aria-labelledby="localizacao-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <span className="editorial-tag block mb-3">06 / Ponto & Atendimento</span>
          <h2
            id="localizacao-heading"
            className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white mb-4"
          >
            Localização e Horários.
          </h2>
          <p className="text-base text-[#C4C4C4] leading-relaxed">
            Ponto físico no Araretama e atendimento delivery em Pindamonhangaba via aplicativo e
            WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <div className="rounded-md overflow-hidden border border-white/[0.08] bg-[#0D1A11] h-[360px] sm:h-[420px]">
              <iframe
                title="Mapa de localização Loyolas Lanches"
                src={mapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full filter contrast-[1.02]"
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#C4C4C4]">
              <span>{BUSINESS_INFO.address}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  BUSINESS_INFO.address,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white hover:text-[#C4C4C4] font-medium uppercase tracking-wide"
              >
                <span>Abrir Maps</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-md bg-[#0D1A11] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    openStatus.isOpen ? 'bg-[#34D399]' : 'bg-[#8F0F1B]'
                  }`}
                />
                <div>
                  <span className="font-heading font-semibold text-sm text-white block">
                    {openStatus.statusText}
                  </span>
                  <span className="text-xs text-[#C4C4C4]">{openStatus.nextInfo}</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-md bg-[#0D1A11] border border-white/[0.08]">
              <span className="editorial-tag block mb-4">Horário Semanal</span>
              <div className="space-y-2.5 text-xs">
                {BUSINESS_INFO.hoursSchedule.map((schedule) => {
                  const isToday = schedule.dayIndex === currentDayIndex
                  return (
                    <div
                      key={schedule.dayName}
                      className={`flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0 ${
                        isToday ? 'text-white font-semibold' : 'text-[#C4C4C4]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {schedule.dayName}
                        {isToday && (
                          <span className="text-[9px] uppercase tracking-wider text-[#8F0F1B] font-bold">
                            Hoje
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums font-mono">{schedule.hours}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 rounded-md bg-[#0D1A11] border border-white/[0.08] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#C4C4C4]">WhatsApp / Pedidos:</span>
                <a
                  href={BUSINESS_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-heading font-semibold text-white hover:text-[#C4C4C4] transition-colors"
                >
                  {BUSINESS_INFO.phoneDisplay}
                </a>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.04]">
                <span className="text-[#C4C4C4]">Região de entrega:</span>
                <span className="text-white">Araretama e bairros de Pinda</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
