import React, { useState } from 'react'
import {
  User,
  Phone,
  Lock,
  LogOut,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Loader2,
  Clock,
  MapPin,
  Check,
  Tag,
} from 'lucide-react'
import { fmtBRL, padTicket } from '@/lib/seeds'
import { OrderRecord } from '@/types/loyolas'

export interface CustomerProfile {
  id?: string
  name: string
  phone: string
  address?: string
  favoriteItems?: string[]
}

export interface CampaignVoucher {
  id: string
  title: string
  type: 'voucher_10' | 'free_delivery' | 'product_discount'
  description?: string
  discountPercent?: number
  discountAmount?: number
  targetProductId?: string
  targetProductName?: string
}

interface CustomerAuthDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentCustomer: CustomerProfile | null
  orders: OrderRecord[]
  campaigns: CampaignVoucher[]
  onLogin: (phone: string, name: string) => Promise<void>
  onLogout: () => void
  onDeleteAccount?: () => Promise<void>
  onApplyCampaign?: (c: CampaignVoucher) => void
  onRepeatOrder?: (order: OrderRecord) => void
}

export const CustomerAuthDrawer: React.FC<CustomerAuthDrawerProps> = ({
  isOpen,
  onClose,
  currentCustomer,
  orders,
  campaigns,
  onLogin,
  onLogout,
  onDeleteAccount,
  onApplyCampaign,
  onRepeatOrder,
}) => {
  const [phoneInput, setPhoneInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'perfil' | 'pedidos' | 'campanhas'>('perfil')

  if (!isOpen) return null

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneInput.trim() || !nameInput.trim()) return
    setLoading(true)
    try {
      await onLogin(phoneInput.trim(), nameInput.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#121215] border-l border-[#27272A] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E10600]/20 text-[#E10600] flex items-center justify-center font-bold">
              <User size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">
                {currentCustomer ? `Olá, ${currentCustomer.name}` : 'Identificação do Cliente'}
              </h2>
              <p className="text-[11px] text-[#9A9CA0]">
                {currentCustomer ? currentCustomer.phone : 'Acesse seu histórico e promoções'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#17171C] text-[#C0C0C0] hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        {/* Sem login: formulário */}
        {!currentCustomer ? (
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600] flex items-center justify-center mx-auto">
                <ShoppingBag size={24} />
              </div>
              <h3 className="font-bold text-white text-base">Faça seu Cadastro / Login</h3>
              <p className="text-xs text-[#9A9CA0] leading-relaxed">
                Informe seu nome e WhatsApp para acessar seus pedidos anteriores, receber descontos
                exclusivos e recomendações personalizadas do Loyola's Lanches.
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C0C0C0] mb-1">
                  Seu Nome *
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#17171C] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C0C0C0] mb-1">
                  WhatsApp com DDD *
                </label>
                <div className="relative">
                  <Phone
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="(12) 99999-9999"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#17171C] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#E10600] hover:bg-[#9E0400] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Acessando...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Entrar / Cadastrar</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Com login: Abas (Perfil, Pedidos, Vouchers) */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-[#27272A] bg-[#17171C]">
              <button
                type="button"
                onClick={() => setActiveTab('perfil')}
                className={`flex-1 py-3 text-xs font-bold transition-colors ${
                  activeTab === 'perfil'
                    ? 'text-[#E10600] border-b-2 border-[#E10600]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Perfil & Gostos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pedidos')}
                className={`flex-1 py-3 text-xs font-bold transition-colors ${
                  activeTab === 'pedidos'
                    ? 'text-[#E10600] border-b-2 border-[#E10600]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Meus Pedidos ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('campanhas')}
                className={`flex-1 py-3 text-xs font-bold transition-colors ${
                  activeTab === 'campanhas'
                    ? 'text-[#E10600] border-b-2 border-[#E10600]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Vouchers ({campaigns.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'perfil' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#17171C] border border-[#27272A] space-y-2">
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold">
                      Seus Dados
                    </span>
                    <div className="text-sm font-bold text-white">{currentCustomer.name}</div>
                    <div className="text-xs text-zinc-300">{currentCustomer.phone}</div>
                    {currentCustomer.address && (
                      <div className="text-xs text-zinc-400 flex items-center gap-1.5 pt-1">
                        <MapPin size={13} className="text-[#E10600]" />
                        <span>{currentCustomer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Itens favoritos / Recomendações */}
                  {currentCustomer.favoriteItems && currentCustomer.favoriteItems.length > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-[#1b1717] to-[#121215] border border-[#E10600]/30 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                        <Sparkles size={14} />
                        <span>Mais Pedidos por Você (Recomendações)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentCustomer.favoriteItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-[#E10600]/15 text-[#E10600] border border-[#E10600]/30 text-xs font-medium"
                          >
                            ★ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sair desta conta</span>
                  </button>
                  {onDeleteAccount && (
                    <button type="button" onClick={onDeleteAccount} className="w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:border-red-500/50 hover:text-red-400 text-xs font-semibold">
                      Excluir meu cadastro
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'pedidos' && (
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="text-center py-10 text-xs text-zinc-500">
                      Nenhum pedido anterior encontrado para este número.
                    </div>
                  ) : (
                    orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-xl bg-[#17171C] border border-[#27272A] space-y-2 hover:border-[#3f3f46] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-sm">
                            #{padTicket(ord.ticketNumber)}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-300">
                          {(ord.items || []).map((i) => `${i.qty}x ${i.name}`).join(', ')}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-xs">
                          <span className="font-bold text-white font-mono">
                            {fmtBRL(ord.total)}
                          </span>
                          {onRepeatOrder && (
                            <button
                              type="button"
                              onClick={() => onRepeatOrder(ord)}
                              className="text-[11px] text-[#E10600] hover:underline font-semibold"
                            >
                              Repetir itens →
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'campanhas' && (
                <div className="space-y-3">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-10 text-xs text-zinc-500">
                      Nenhum voucher disponível no momento para o seu perfil. Fique atento às
                      campanhas da loja!
                    </div>
                  ) : (
                    campaigns.map((camp) => (
                      <div
                        key={camp.id}
                        className="p-3.5 rounded-xl bg-gradient-to-r from-[#1f1214] to-[#17171C] border border-[#E10600]/40 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                              <Tag size={12} />
                              {camp.type === 'voucher_10'
                                ? 'Desconto Especial'
                                : camp.type === 'free_delivery'
                                  ? 'Entrega Grátis'
                                  : 'Desconto em Item'}
                            </span>
                            <h4 className="text-xs font-bold text-white mt-0.5">{camp.title}</h4>
                          </div>
                          {onApplyCampaign && (
                            <button
                              type="button"
                              onClick={() => onApplyCampaign(camp)}
                              className="px-2.5 py-1 rounded bg-[#E10600] hover:bg-[#9E0400] text-white text-[11px] font-bold shadow-sm"
                            >
                              Aplicar
                            </button>
                          )}
                        </div>
                        <div className="rounded bg-black/30 px-2 py-1 font-mono text-[11px] text-amber-300">Código: LOY-{camp.id.slice(0, 6).toUpperCase()}</div>
                        {camp.description && (
                          <p className="text-[11px] text-zinc-400">{camp.description}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
