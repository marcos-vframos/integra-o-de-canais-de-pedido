import React from 'react'
import { AlertTriangle, PauseCircle, Wallet, X } from 'lucide-react'

interface StoreCloseChoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onPauseOperation: () => void
  onCloseRegister: () => void
  openOrdersCount?: number
}

export const StoreCloseChoiceModal: React.FC<StoreCloseChoiceModalProps> = ({
  isOpen,
  onClose,
  onPauseOperation,
  onCloseRegister,
  openOrdersCount = 0,
}) => {
  if (!isOpen) return null

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div
        className="sc-modal max-w-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-close-choice-title"
      >
        <div className="sc-modal-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[rgba(225,6,0,0.12)] border border-[rgba(225,6,0,0.25)] flex items-center justify-center text-[var(--red)]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 id="store-close-choice-title" className="sc-modal-title" style={{ fontSize: 18 }}>
                Fechar operação da loja
              </h3>
              <p className="sc-sub" style={{ margin: 0, fontSize: 12 }}>
                Escolha como deseja encerrar as atividades agora.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="sc-round-btn"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 my-4">
          {/* Opção 1: Fechar Caixa */}
          <button
            type="button"
            onClick={onCloseRegister}
            className="w-full text-left p-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--red)] hover:bg-[var(--surface)] transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[rgba(225,6,0,0.12)] text-[var(--red)] group-hover:scale-105 transition-transform">
                <Wallet size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[var(--silver)] group-hover:text-[var(--red)] transition-colors">
                    Fechar caixa e encerrar
                  </span>
                  {openOrdersCount > 0 && (
                    <span className="sc-badge low text-[10px]">{openOrdersCount} pedido(s)</span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
                  Calcula os totais do turno separados por balcão e online, aplica desconto e gera o
                  fechamento contábil.
                </p>
              </div>
            </div>
          </button>

          {/* Opção 2: Pausar Operação */}
          <button
            type="button"
            onClick={onPauseOperation}
            className="w-full text-left p-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--silver)] hover:bg-[var(--surface)] transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[rgba(154,156,160,0.15)] text-[var(--muted)] group-hover:scale-105 transition-transform">
                <PauseCircle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-[var(--silver)]">
                  Pausar operação (sem fechar caixa)
                </span>
                <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
                  Apenas altera o status da loja para <b>Fechado</b> para interromper novos pedidos
                  online. O caixa continua aberto.
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button type="button" className="sc-btn-ghost text-xs px-4 py-2" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
