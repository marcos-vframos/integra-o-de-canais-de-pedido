import React, { useState } from 'react'
import { Download, Share, PlusSquare, Check, X, Smartphone } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'card'
  className?: string
}

export const PWAInstallBanner: React.FC<PWAInstallButtonProps> = ({ variant = 'banner' }) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // Não exibe se já instalado como PWA ou fechado pelo operador
  if (isInstalled || dismissed) {
    return null
  }

  // Se for o botão discreto para o header:
  if (variant === 'header') {
    // No iOS, se não estiver instalado, exibe botão para abrir instruções
    // No Android/Desktop, se disparou beforeinstallprompt, exibe botão
    return (
      <>
        {(isInstallable || isIOS) && (
          <button
            onClick={() => {
              if (isInstallable) {
                promptInstall()
              } else if (isIOS) {
                setShowIOSInstructions(true)
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#151516] border border-[#E10600]/40 text-[#f5f5f6] hover:bg-[#E10600]/15 hover:border-[#E10600] transition-colors"
            title="Instalar app de Gestão no seu celular ou computador"
            aria-label="Instalar app de Gestão"
          >
            <Download size={13} className="text-[#E10600]" />
            <span className="hidden sm:inline">Instalar Gestão</span>
            <span className="sm:hidden">Instalar</span>
          </button>
        )}

        {/* Modal de instruções para iOS */}
        {showIOSInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#151516] border border-[#27272A] rounded-xl max-w-sm w-full p-5 text-[#F5F5F6] shadow-2xl relative">
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="absolute top-3 right-3 text-[#9A9CA0] hover:text-[#F5F5F6]"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#0B0B0C] border border-[#E10600] p-1 flex items-center justify-center overflow-hidden">
                  <img
                    src="/pwa-icon.svg"
                    alt="Loyola's Gestão"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-[#F5F5F6]">
                    Instalar no iPhone / iPad
                  </h3>
                  <p className="text-[11px] text-[#9A9CA0]">Loyola's Gestão</p>
                </div>
              </div>

              <p className="text-xs text-[#9A9CA0] mb-4">
                Para ter o painel de gestão com ícone próprio e tela cheia no seu iOS:
              </p>

              <ol className="space-y-2.5 text-xs text-[#DCDFE4]">
                <li className="flex items-start gap-2.5 bg-[#0B0B0C] p-2.5 rounded-lg border border-[#27272A]">
                  <Share size={16} className="text-[#3b82f6] shrink-0 mt-0.5" />
                  <span>
                    Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 bg-[#0B0B0C] p-2.5 rounded-lg border border-[#27272A]">
                  <PlusSquare size={16} className="text-[#22c55e] shrink-0 mt-0.5" />
                  <span>
                    Role e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 bg-[#0B0B0C] p-2.5 rounded-lg border border-[#27272A]">
                  <Check size={16} className="text-[#E10600] shrink-0 mt-0.5" />
                  <span>
                    Toque em <strong>Adicionar</strong> no canto superior direito.
                  </span>
                </li>
              </ol>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="mt-5 w-full py-2 text-xs font-semibold rounded-lg bg-[#E10600] text-white hover:bg-[#9E0400] transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Render padrão como Banner discreto no topo de /gestao
  // Mostra quando é instalável (Chrome/Android/PC) ou quando estiver no iOS Safari
  if (!isInstallable && !isIOS) {
    return null
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true)
      await promptInstall()
      setIsInstalling(false)
    } else if (isIOS) {
      setShowIOSInstructions(true)
    }
  }

  return (
    <>
      <div className="mb-4 bg-gradient-to-r from-[#151516] via-[#1D1D1F] to-[#151516] border border-[#27272A] border-l-4 border-l-[#E10600] rounded-xl p-3 sm:p-4 text-[#F5F5F6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0B0B0C] border border-[#27272A] p-1 flex items-center justify-center shrink-0 shadow-inner">
            <img
              src="/pwa-icon.svg"
              alt="Loyola's Gestão"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F6]">
                Loyola's Gestão App
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E10600]/20 text-[#E10600] border border-[#E10600]/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-[#9A9CA0] mt-0.5">
              Instale na tela de início do seu aparelho para abrir em tela cheia e acesso rápido de
              PDV.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#E10600] text-white hover:bg-[#9E0400] transition-colors shadow-sm disabled:opacity-50"
          >
            {isIOS ? (
              <>
                <Smartphone size={14} /> Como Instalar no Celular
              </>
            ) : (
              <>
                <Download size={14} /> Instalar Gestão no aparelho
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-[#9A9CA0] hover:text-[#F5F5F6] rounded-lg hover:bg-[#27272A] transition-colors"
            title="Dispensar aviso"
            aria-label="Dispensar aviso"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Modal de instruções para iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#151516] border border-[#27272A] rounded-xl max-w-sm w-full p-5 text-[#F5F5F6] shadow-2xl relative">
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-3 right-3 text-[#9A9CA0] hover:text-[#F5F5F6]"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B0B0C] border border-[#E10600] p-1 flex items-center justify-center overflow-hidden">
                <img
                  src="/pwa-icon.svg"
                  alt="Loyola's Gestão"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-[#F5F5F6]">
                  Instalar no iPhone / iPad
                </h3>
                <p className="text-[11px] text-[#9A9CA0]">Loyola's Gestão</p>
              </div>
            </div>

            <p className="text-xs text-[#9A9CA0] mb-4">
              Para ter o painel de gestão com ícone próprio e tela cheia no seu iOS:
            </p>

            <ol className="space-y-2.5 text-xs text-[#DCDFE4]">
              <li className="flex items-start gap-2.5 bg-[#0B0B0C] p-2.5 rounded-lg border border-[#27272A]">
                <Share size={16} className="text-[#3b82f6] shrink-0 mt-0.5" />
                <span>
                  Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5 bg-[#0B0B0C] p-2.5 rounded-lg border border-[#27272A]">
                <PlusSquare size={16} className="text-[#22c55e] shrink-0 mt-0.5" />
                <span>
                  Role e toque em <strong>"Adicionar à Tela de Início"</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5 bg-[#0B0B0C] p-2.5 rounded-lg border border-[#27272A]">
                <Check size={16} className="text-[#E10600] shrink-0 mt-0.5" />
                <span>
                  Toque em <strong>Adicionar</strong> no canto superior direito.
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full py-2 text-xs font-semibold rounded-lg bg-[#E10600] text-white hover:bg-[#9E0400] transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
