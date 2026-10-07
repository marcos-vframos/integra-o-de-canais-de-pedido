import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Tag,
  AlertTriangle,
  Gift,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Sparkles,
  Phone,
  Plus,
  Loader2,
  Trash2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { MenuItem, OrderRecord } from '@/types/loyolas'
import { fmtBRL } from '@/lib/seeds'

interface CustomerItem {
  id: string
  name: string
  phone: string
  address?: string
  lastOrderAt?: string
  totalOrders: number
  totalSpent: number
  favoriteItems?: string[]
}

interface CampaignItem {
  id: string
  customerId?: string
  customerPhone: string
  customerName: string
  type: 'voucher_10' | 'free_delivery' | 'product_discount'
  title: string
  description?: string
  discountPercent?: number
  discountAmount?: number
  targetProductId?: string
  targetProductName?: string
  active: boolean
  used: boolean
  created?: string
}

interface TabClientesProps {
  menu: MenuItem[]
}

export const TabClientes: React.FC<TabClientesProps> = ({ menu }) => {
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [daysThreshold, setDaysThreshold] = useState<number>(7) // Lembrete: sem pedir há X dias

  // Modal de criação de campanha
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null)
  const [campaignType, setCampaignType] = useState<
    'voucher_10' | 'free_delivery' | 'product_discount'
  >('voucher_10')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [productDiscountVal, setProductDiscountVal] = useState<number>(5)
  const [creating, setCreating] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [detailCustomer, setDetailCustomer] = useState<CustomerItem | null>(null)
  const [detailOrders, setDetailOrders] = useState<OrderRecord[]>([])

  const loadData = async () => {
    try {
      const [custList, campList] = await Promise.all([
        pb
          .collection('customers')
          .getFullList<CustomerItem>({ sort: '-lastOrderAt' })
          .catch(() => []),
        pb
          .collection('campaigns')
          .getFullList<CampaignItem>({ sort: '-created' })
          .catch(() => []),
      ])
      setCustomers(custList)
      setCampaigns(campList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', loadData)
  useRealtime('campaigns', loadData)

  const openCustomerDetail = async (cust: CustomerItem) => {
    setDetailCustomer(cust)
    const list = await pb.collection('orders').getFullList<OrderRecord>({ filter: `customerPhone="${cust.phone}"`, sort: '-created' }).catch(() => [])
    setDetailOrders(list)
  }

  const handleOpenCampaignModal = (cust: CustomerItem) => {
    setSelectedCustomer(cust)
    setCampaignType('voucher_10')
    setSelectedProductId(menu[0]?.id || '')
    setProductDiscountVal(5)
  }

  const handleCreateCampaign = async () => {
    if (!selectedCustomer) return
    setCreating(true)
    try {
      let title = ''
      let desc = ''
      let discountPercent = 0
      let discountAmount = 0
      let targetProductId = ''
      let targetProductName = ''

      if (campaignType === 'voucher_10') {
        title = `Voucher Exclusivo de 10% OFF`
        desc = `Desconto especial de 10% no valor dos lanches para celebrar sua volta!`
        discountPercent = 10
      } else if (campaignType === 'free_delivery') {
        title = `Cupom de Taxa de Entrega Grátis`
        desc = `Taxa de entrega totalmente por nossa conta no seu próximo pedido!`
      } else if (campaignType === 'product_discount') {
        const prod = menu.find((m) => m.id === selectedProductId)
        targetProductId = selectedProductId
        targetProductName = prod?.name || 'Item Selecionado'
        discountAmount = productDiscountVal
        title = `Desconto de ${fmtBRL(productDiscountVal)} no ${targetProductName}`
        desc = `Aproveite ${fmtBRL(productDiscountVal)} de desconto exclusivo no saboroso ${targetProductName}!`
      }

      await pb.collection('campaigns').create({
        customerId: selectedCustomer.id,
        customerPhone: selectedCustomer.phone,
        customerName: selectedCustomer.name,
        type: campaignType,
        title,
        description: desc,
        discountPercent,
        discountAmount,
        targetProductId,
        targetProductName,
        active: true,
        used: false,
      })

      setSuccessMsg(
        `Campanha criada para ${selectedCustomer.name}! O voucher já está ativo para ele na /loja.`,
      )
      setTimeout(() => setSuccessMsg(''), 4000)
      setSelectedCustomer(null)
      loadData()
    } catch (err: any) {
      alert('Erro ao criar campanha: ' + (err?.message || 'Tente novamente.'))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Deseja excluir esta campanha?')) return
    await pb.collection('campaigns').delete(id)
    loadData()
  }

  // Filtragem e detecção de inatividade
  const now = new Date().getTime()
  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Barra de Topo do CRM */}
      <div className="bg-[#121215] border border-[#27272A] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="text-[#E10600]" size={18} />
            <span>CRM & Inteligência de Clientes</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Acompanhe o consumo, frequência e dispare campanhas exclusivas (10% OFF, taxa grátis ou
            desconto em item)
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
            <Clock size={14} className="text-amber-400" />
            <span>Alerta inativo há:</span>
            <select
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-white font-bold"
            >
              <option value={3}>3 dias</option>
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </div>

          <div className="relative flex-1 md:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar cliente ou fone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500 text-xs bg-[#121215] border border-dashed border-[#27272A] rounded-xl">
            Nenhum cliente cadastrado ainda. Conforme os clientes fizerem pedidos na /loja ou se
            cadastrarem, eles aparecerão aqui.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const lastDate = cust.lastOrderAt ? new Date(cust.lastOrderAt) : null
            const daysSinceLast = lastDate
              ? Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24))
              : 999
            const isInactive = daysSinceLast >= daysThreshold

            return (
              <div
                key={cust.id}
                className={`bg-[#121215] border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all ${
                  isInactive
                    ? 'border-amber-500/40 bg-amber-500/[0.03]'
                    : 'border-[#27272A] hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button type="button" onClick={() => openCustomerDetail(cust)} className="font-bold text-sm text-white hover:text-[#E10600] text-left">{cust.name}</button>
                      <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Phone size={12} className="text-[#E10600]" />
                        <span>{cust.phone}</span>
                      </div>
                    </div>

                    {isInactive && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Sem pedir há {daysSinceLast}d
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-zinc-800 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Total Pedidos</span>
                      <span className="font-bold text-white font-mono">
                        {cust.totalOrders || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Gasto Acumulado</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {fmtBRL(cust.totalSpent || 0)}
                      </span>
                    </div>
                  </div>

                  {cust.favoriteItems && cust.favoriteItems.length > 0 && (
                    <div className="mt-2 text-[11px] text-zinc-400">
                      <span className="text-zinc-500 font-semibold">Preferidos: </span>
                      {cust.favoriteItems.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">
                    {lastDate ? `Último: ${lastDate.toLocaleDateString('pt-BR')}` : 'Sem data'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenCampaignModal(cust)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Gift size={13} />
                    <span>Gerar Voucher</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {detailCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setDetailCustomer(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#121215] border border-[#27272A] rounded-2xl p-6 space-y-5" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between gap-4"><div><h3 className="text-lg font-bold text-white">{detailCustomer.name}</h3><p className="text-xs text-zinc-400">{detailCustomer.phone} {detailCustomer.address ? ' • '+detailCustomer.address : ''}</p></div><button onClick={()=>setDetailCustomer(null)} className="text-zinc-400">✕</button></div>
            {(() => {
              const now=new Date(), month=detailOrders.filter(o=>{const d=new Date(o.created||'');return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()})
              const valid=detailOrders.filter(o=>o.status!=='recusado'), cancelled=detailOrders.filter(o=>o.status==='recusado')
              const monthSpent=month.reduce((s,o)=>s+(o.total||0),0), total=valid.reduce((s,o)=>s+(o.total||0),0)
              const byMonth=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);const val=valid.filter(o=>{const x=new Date(o.created||'');return x.getMonth()===d.getMonth()&&x.getFullYear()===d.getFullYear()}).reduce((s,o)=>s+(o.total||0),0);return{label:d.toLocaleDateString('pt-BR',{month:'short'}),val}})
              const max=Math.max(1,...byMonth.map(x=>x.val))
              return <><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[['Pedidos no mês',month.length],['Consumo no mês',fmtBRL(monthSpent)],['Consumo total',fmtBRL(total)],['Desistências/recusas',cancelled.length]].map(([a,b])=><div key={String(a)} className="rounded-xl bg-zinc-950 border border-zinc-800 p-3"><span className="block text-[10px] uppercase text-zinc-500">{a}</span><strong className="text-white">{b}</strong></div>)}</div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4"><span className="text-xs font-bold text-zinc-300">Consumo — últimos 6 meses</span><div className="mt-4 flex h-32 items-end gap-3">{byMonth.map(x=><div key={x.label} className="flex-1 text-center"><div className="mx-auto w-full max-w-12 rounded-t bg-[#E10600]" style={{height:`${Math.max(4,(x.val/max)*100)}px`}} title={fmtBRL(x.val)}/><span className="mt-1 block text-[9px] text-zinc-500">{x.label}</span></div>)}</div></div>
              <div className="text-xs text-zinc-400">Atividade: {valid.length} pedidos válidos • Ticket médio {fmtBRL(valid.length?total/valid.length:0)} • Última atividade {detailCustomer.lastOrderAt?new Date(detailCustomer.lastOrderAt).toLocaleString('pt-BR'):'sem registro'}.</div></>
            })()}
            <button onClick={()=>{setDetailCustomer(null);handleOpenCampaignModal(detailCustomer)}} className="rounded-lg bg-[#E10600] px-4 py-2 text-xs font-bold text-white">Gerar voucher para este cliente</button>
          </div>
        </div>
      )}

      {/* Campanhas Ativas / Histórico de Vouchers */}
      <div className="bg-[#121215] border border-[#27272A] rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Tag size={15} className="text-[#E10600]" />
          <span>Vouchers e Campanhas Geradas ({campaigns.length})</span>
        </h3>

        {campaigns.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhum voucher emitido no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-white">{camp.title}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="text-zinc-500 hover:text-red-400 p-0.5"
                      title="Excluir voucher"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{camp.description}</p>
                  <div className="mt-2 rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-amber-300">Código: LOY-{camp.id.slice(0,6).toUpperCase()}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Para: <b>{camp.customerName}</b> ({camp.customerPhone})
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px]">
                  <span
                    className={`font-semibold ${
                      camp.used
                        ? 'text-zinc-500'
                        : camp.active
                          ? 'text-emerald-400'
                          : 'text-zinc-500'
                    }`}
                  >
                    {camp.used ? '✓ Já Utilizado' : camp.active ? '• Ativo na Loja' : 'Inativo'}
                  </span>
                  <span className="text-zinc-600 font-mono">
                    {camp.created ? new Date(camp.created).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Aprovação de Campanha Conforme Especificação do Cliente */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121215] border border-[#27272A] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                Lembrete de Inatividade / Reativação
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Cliente {selectedCustomer.name} não consome há algum tempo. Gerar campanha?
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Ao aprovar, o voucher ficará disponível na /loja para este cliente usar no carrinho.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 block">
                Escolha a vantagem:
              </label>

              {/* Opção 1: Voucher de 10% */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  campaignType === 'voucher_10'
                    ? 'bg-[#E10600]/10 border-[#E10600]'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="campType"
                  checked={campaignType === 'voucher_10'}
                  onChange={() => setCampaignType('voucher_10')}
                  className="mt-0.5 accent-[#E10600]"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Gerar voucher de 10%</span>
                  <span className="text-[11px] text-zinc-400">
                    Aplica 10% de desconto sobre o subtotal do próximo pedido
                  </span>
                </div>
              </label>

              {/* Opção 2: Oferecer taxa grátis */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  campaignType === 'free_delivery'
                    ? 'bg-[#E10600]/10 border-[#E10600]'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="campType"
                  checked={campaignType === 'free_delivery'}
                  onChange={() => setCampaignType('free_delivery')}
                  className="mt-0.5 accent-[#E10600]"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Oferecer taxa grátis</span>
                  <span className="text-[11px] text-zinc-400">
                    Isenta a taxa de entrega no delivery do cliente
                  </span>
                </div>
              </label>

              {/* Opção 3: Oferecer desconto de Z produto (com lista completa de produtos) */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  campaignType === 'product_discount'
                    ? 'bg-[#E10600]/10 border-[#E10600]'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="campType"
                  checked={campaignType === 'product_discount'}
                  onChange={() => setCampaignType('product_discount')}
                  className="mt-0.5 accent-[#E10600]"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-white block">
                    Oferecer desconto de Z produto
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Escolha qualquer produto do cardápio e defina o valor do desconto
                  </span>

                  {campaignType === 'product_discount' && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-zinc-800">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Lista completa de produtos:
                        </label>
                        <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          {menu.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.category}) — {fmtBRL(m.price)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Valor do Desconto (R$):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={productDiscountVal}
                          onChange={(e) => setProductDiscountVal(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreateCampaign}
                className="px-5 py-2 rounded-lg bg-[#E10600] hover:bg-[#9E0400] text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>Aprovar e Criar Campanha</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
