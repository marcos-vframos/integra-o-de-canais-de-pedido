import { useEffect, useState, useRef } from 'react'
import { Bike, Plus, Trash2, Clock, Pencil } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import type { OrderRecord } from '@/types/loyolas'
import { fmtBRL, padTicket } from '@/lib/seeds'
import DeliveryFeeZones from '@/components/DeliveryFeeZones'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  businessDay,
  belongsToCourier,
  deliveryFee,
  deliveryTimestamp,
  filterDeliveryHistory,
  monthlyDeliveryTotals,
  periodBounds,
  totalDeliveryFees,
  type DeliveryPeriod,
} from '@/lib/motoboyHistory'

export interface MotoboyItem {
  id: string
  name: string
  phone: string
  plate?: string
  active: boolean
  dailyRate?: number
  feePerDelivery?: number
}
const fieldClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white'
const localTime = (value: string) =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Data não registrada'
const money = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}
export function TabMotoboys({ orders }: { orders: OrderRecord[] }) {
  const [motoboys, setMotoboys] = useState<MotoboyItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [formOpen, setFormOpen] = useState(false),
    [editing, setEditing] = useState<MotoboyItem | null>(null)
  const [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [plate, setPlate] = useState(''),
    [daily, setDaily] = useState('0'),
    [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false),
    [courierId, setCourierId] = useState(''),
    [period, setPeriod] = useState<DeliveryPeriod>('day'),
    [anchor, setAnchor] = useState(() => businessDay()),
    [graphYear, setGraphYear] = useState(() => Number(businessDay().slice(0, 4)))
  const historyRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(50)
  useEffect(() => setVisibleCount(50), [courierId, period, anchor])
  const load = async () => {
    try {
      setMotoboys(await pb.collection('motoboys').getFullList<MotoboyItem>({ sort: 'name' }))
      setError('')
    } catch (e: any) {
      setError(e.message || 'Não foi possível carregar os motoboys.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  useRealtime('motoboys', () => {
    void load()
  })
  const edit = (mb: MotoboyItem | null) => {
    setEditing(mb)
    setName(mb?.name || '')
    setPhone(mb?.phone || '')
    setPlate(mb?.plate || '')
    setDaily(String(money(mb?.dailyRate)))
    setError('')
    setFormOpen(true)
  }
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(daily.replace(',', '.'))
    if (!name.trim() || !daily.trim() || !Number.isFinite(value) || value < 0) {
      setError('Informe nome e uma diária válida, inclusive zero quando combinado.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        plate: plate.trim(),
        dailyRate: Math.round(value * 100) / 100,
      }
      if (editing) await pb.collection('motoboys').update(editing.id, payload)
      else await pb.collection('motoboys').create({ ...payload, active: true })
      setFormOpen(false)
      setMessage('Cadastro salvo. A diária é fixa e separada das taxas de cada entrega.')
      await load()
    } catch (e: any) {
      setError(e.message || 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }
  const toggle = async (mb: MotoboyItem) => {
    try {
      await pb.collection('motoboys').update(mb.id, { active: !mb.active })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }
  const remove = async (mb: MotoboyItem) => {
    const hasHistory = orders.some((o) => belongsToCourier(o, mb))
    if (
      !confirm(
        hasHistory
          ? 'Este motoboy tem entregas registradas. Deseja inativá-lo e preservar o histórico?'
          : 'Deseja excluir este motoboy sem entregas registradas?',
      )
    )
      return
    try {
      if (hasHistory) {
        await pb.collection('motoboys').update(mb.id, { active: false })
        setMessage('Motoboy inativado. O histórico foi preservado.')
      } else await pb.collection('motoboys').delete(mb.id)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }
  const today = businessDay(),
    todayOrders = filterDeliveryHistory(orders, 'day', today)
  const openHistory = (mb: MotoboyItem | null, nextPeriod: DeliveryPeriod = 'day') => {
    setCourierId(mb?.id || '')
    setPeriod(nextPeriod)
    setAnchor(today)
    setGraphYear(Number(today.slice(0, 4)))
    setHistoryOpen(true)
  }
  const courier = motoboys.find((m) => m.id === courierId) || null
  const history = filterDeliveryHistory(orders, period, anchor, courier),
    months = monthlyDeliveryTotals(orders, graphYear, courier)
  const highest = Math.max(1, ...months.map((m) => m.fees)),
    missing = history.filter((o) => deliveryFee(o) === null).length
  const bounds = periodBounds(period, anchor)
  const selectMonth = (key: string) => {
    setPeriod('month')
    setAnchor(key)
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-[#121215] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Bike size={18} className="text-red-600" />
            Gestão de Entregas & Motoboys
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Diária fixa por motoboy e taxas das comandas, contabilizadas separadamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => edit(null)}
          className="sc-btn-primary inline-flex items-center gap-2"
        >
          <Plus size={14} />
          Cadastrar Novo Motoboy
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-800 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-300">
          {message}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sc-card p-4">
          <p className="text-xs text-zinc-400">Entregas de hoje</p>
          <strong className="mt-1 block text-2xl">{todayOrders.length}</strong>
        </div>
        <button
          type="button"
          onClick={() => openHistory(null)}
          className="sc-card p-4 text-left hover:border-red-600 focus-visible:outline focus-visible:outline-red-500"
        >
          <p className="text-xs text-zinc-400">Taxas de hoje</p>
          <strong className="mt-1 block text-2xl text-emerald-400">
            {fmtBRL(totalDeliveryFees(todayOrders))}
          </strong>
          <span className="text-xs text-zinc-500">Clique para abrir o histórico e filtrar.</span>
        </button>
        <div className="sc-card p-4">
          <p className="text-xs text-zinc-400">Entregas sem motoboy definido hoje</p>
          <strong className="mt-1 block text-2xl text-amber-400">
            {todayOrders.filter((o) => !o.motoboyId && !o.motoboyName).length}
          </strong>
        </div>
      </div>
      <DeliveryFeeZones />
      {loading && <p role="status">Carregando motoboys…</p>}
      {!loading && !motoboys.length && (
        <p className="sc-card p-5 text-sm text-zinc-400">
          Nenhum motoboy disponível nesta sessão. Entre como operador para consultar ou cadastrar.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {motoboys.map((mb) => {
          const list = todayOrders.filter((o) => belongsToCourier(o, mb))
          return (
            <article key={mb.id} className="sc-card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 font-bold">
                    <Bike size={16} className="text-red-600" />
                    {mb.name}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    {[mb.phone, mb.plate].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="sc-icon-btn"
                    title={'Editar ' + mb.name}
                    aria-label={'Editar cadastro de ' + mb.name}
                    onClick={() => edit(mb)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="sc-icon-btn"
                    title="Excluir ou inativar preservando histórico"
                    aria-label={'Excluir ou inativar ' + mb.name}
                    onClick={() => void remove(mb)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center text-xs">
                <div>
                  <span className="block text-[10px] uppercase text-zinc-500">Entregas hoje</span>
                  <strong className="mt-1 block">{list.length}</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-zinc-500">Diária</span>
                  <strong className="mt-1 block">{fmtBRL(money(mb.dailyRate))}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => openHistory(mb)}
                  className="rounded text-emerald-400 hover:underline focus-visible:outline focus-visible:outline-red-500"
                  aria-label={'Abrir taxas de ' + mb.name}
                >
                  <span className="block text-[10px] uppercase">Taxas</span>
                  <strong className="mt-1 block">{fmtBRL(totalDeliveryFees(list))}</strong>
                </button>
              </div>
              <p className="text-[10px] text-zinc-500">
                Diária fixa por dia de trabalho. Taxas somadas pelo valor de frete de cada comanda.
              </p>
              {list.length > 0 && (
                <div className="max-h-36 space-y-2 overflow-y-auto">
                  {list.map((o) => (
                    <div
                      key={o.id}
                      className="flex justify-between gap-2 rounded bg-zinc-900 p-2 text-xs"
                    >
                      <span>
                        #{padTicket(o.ticketNumber)} · {o.customerName || 'Cliente'}
                      </span>
                      <span className="shrink-0 text-emerald-400">
                        {deliveryFee(o) === null ? 'Taxa não registrada' : fmtBRL(deliveryFee(o)!)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => void toggle(mb)}
                  className={
                    'rounded border px-2 py-1 text-xs ' +
                    (mb.active
                      ? 'border-emerald-800 text-emerald-300'
                      : 'border-zinc-700 text-zinc-400')
                  }
                >
                  {mb.active ? 'Ativo' : 'Inativo'}
                </button>
                <button
                  type="button"
                  onClick={() => openHistory(mb, 'all')}
                  className="inline-flex items-center gap-1 text-xs text-red-500"
                >
                  <Clock size={13} />
                  Histórico completo
                </button>
              </div>
            </article>
          )
        })}
      </div>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto border-zinc-800 bg-[#121215] text-white">
          <DialogTitle>Histórico de taxas{courier ? ' — ' + courier.name : ''}</DialogTitle>
          <DialogDescription>
            Entregas discriminadas em horário de São Paulo. A diária fica separada do frete das
            comandas.
          </DialogDescription>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-300">
              Motoboy
              <select
                aria-label="Filtrar histórico por motoboy"
                className={fieldClass + ' mt-1'}
                value={courierId}
                onChange={(e) => setCourierId(e.target.value)}
              >
                <option value="">Todos os motoboys / sem vínculo</option>
                {motoboys.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.active ? '' : ' (inativo)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-300">
              Período
              <select
                aria-label="Período do histórico de taxas"
                className={fieldClass + ' mt-1'}
                value={period}
                onChange={(e) => setPeriod(e.target.value as DeliveryPeriod)}
              >
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
                <option value="year">Ano</option>
                <option value="all">Todo o histórico</option>
              </select>
            </label>
            {period !== 'all' && (
              <label className="text-xs text-zinc-300">
                {period === 'day'
                  ? 'Dia'
                  : period === 'week'
                    ? 'Uma data da semana'
                    : period === 'month'
                      ? 'Mês'
                      : 'Ano'}
                <input
                  aria-label="Referência do período"
                  className={fieldClass + ' mt-1'}
                  type={period === 'year' ? 'number' : period === 'month' ? 'month' : 'date'}
                  min={period === 'year' ? '2000' : undefined}
                  max={period === 'year' ? '2100' : undefined}
                  value={
                    period === 'year'
                      ? anchor.slice(0, 4)
                      : period === 'month'
                        ? anchor.slice(0, 7)
                        : anchor
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    if (period === 'year') {
                      if (/^\d{4}$/.test(v) && Number(v) >= 2000 && Number(v) <= 2100)
                        setAnchor(v + '-01-01')
                    } else if (v) setAnchor(period === 'month' ? v + '-01' : v)
                  }}
                />
              </label>
            )}
          </div>
          {period === 'week' && bounds && (
            <p className="text-xs text-zinc-400">
              Semana de segunda a domingo, iniciada em {bounds.start.split('-').reverse().join('/')}
              .
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center text-xs">
            <div>
              <span className="text-zinc-500">Entregas</span>
              <strong className="mt-1 block text-base">{history.length}</strong>
            </div>
            <div>
              <span className="text-zinc-500">Diária fixa atual</span>
              <strong className="mt-1 block">
                {courier ? fmtBRL(money(courier.dailyRate)) : 'Por motoboy'}
              </strong>
            </div>
            <button
              type="button"
              onClick={() =>
                historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="rounded text-emerald-400 hover:underline"
            >
              <span>Taxas</span>
              <strong className="mt-1 block text-base">{fmtBRL(totalDeliveryFees(history))}</strong>
            </button>
          </div>
          {missing > 0 && (
            <p role="status" className="text-xs text-amber-300">
              {missing} entrega(s) sem taxa registrada. O total inclui somente os valores
              conhecidos.
            </p>
          )}
          <p className="text-[11px] text-zinc-500">
            A diária exibida é a do cadastro atual; este histórico não é um comprovante de diárias
            pagas.
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-xs text-zinc-300">Taxas por mês — clique em uma barra</strong>
              <label className="flex items-center gap-2 text-xs">
                Ano do gráfico
                <input
                  aria-label="Ano do gráfico de taxas"
                  className="w-24 rounded border border-zinc-700 bg-zinc-900 p-1"
                  type="number"
                  min="2000"
                  max="2100"
                  value={graphYear}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isInteger(n) && n >= 2000 && n <= 2100) setGraphYear(n)
                  }}
                />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
              {months.map((m) => (
                <button
                  type="button"
                  key={m.anchor}
                  onClick={() => selectMonth(m.anchor)}
                  aria-label={`Abrir taxas de ${String(m.month).padStart(2, '0')}/${graphYear}: ${fmtBRL(m.fees)}, ${m.count} entregas`}
                  title={`${fmtBRL(m.fees)} · ${m.count} entregas`}
                  className="flex min-w-0 flex-col items-center rounded p-1 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-red-500"
                >
                  <span className="flex h-20 w-full items-end justify-center">
                    <span
                      className="block w-full max-w-8 rounded-t bg-red-600"
                      style={{ height: Math.max(3, (m.fees / highest) * 80) }}
                    />
                  </span>
                  <span className="mt-1 text-[10px] text-zinc-400">
                    {new Date(Date.UTC(graphYear, m.month - 1, 15)).toLocaleDateString('pt-BR', {
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div ref={historyRef} className="space-y-2 scroll-mt-4">
            <h4 className="text-xs font-bold uppercase text-zinc-400">
              Entregas do período · {history.length}
            </h4>
            {!history.length && (
              <p className="py-6 text-center text-sm text-zinc-400">
                Nenhuma entrega neste período.
              </p>
            )}
            {history.slice(0, visibleCount).map((o) => (
              <article
                key={o.id}
                className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>
                    #{padTicket(o.ticketNumber)} · {o.customerName || 'Cliente'}
                  </strong>
                  <strong className="text-emerald-400">
                    Taxa: {deliveryFee(o) === null ? 'não registrada' : fmtBRL(deliveryFee(o)!)}
                  </strong>
                </div>
                <p className="break-words text-zinc-300">
                  Endereço: {o.customerAddress || 'Não informado na comanda'}
                </p>
                <p className="text-zinc-400">
                  {o.motoboyAssignedAt
                    ? 'Horário do despacho'
                    : 'Horário do pedido (registro antigo)'}
                  : {localTime(deliveryTimestamp(o))}
                </p>
                <div className="flex flex-wrap justify-between gap-2 text-zinc-400">
                  <span>Motoboy: {o.motoboyName || 'Sem motoboy'}</span>
                  <span>Status: {o.status || 'Não informado'}</span>
                  <span>Total do pedido: {fmtBRL(o.total)}</span>
                </div>
              </article>
            ))}
            {history.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + 50)}
                className="sc-btn-ghost"
              >
                Mostrar mais entregas ({Math.min(visibleCount, history.length)} de {history.length})
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!saving) setFormOpen(open)
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto border-zinc-800 bg-[#121215] text-white">
          <DialogTitle>{editing ? 'Editar motoboy' : 'Novo Entregador / Motoboy'}</DialogTitle>
          <DialogDescription>
            Informe a diária fixa. As taxas serão somadas a partir das comandas.
          </DialogDescription>
          <form onSubmit={save} className="space-y-3">
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <label className="block text-xs">
              Nome completo
              <input
                className={fieldClass + ' mt-1'}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-xs">
              WhatsApp / Fone
              <input
                className={fieldClass + ' mt-1'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block text-xs">
              Placa da moto
              <input
                className={fieldClass + ' mt-1'}
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
              />
            </label>
            <label className="block text-xs">
              Diária fixa (R$)
              <input
                className={fieldClass + ' mt-1'}
                type="number"
                min="0"
                step="0.01"
                required
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setFormOpen(false)}
                className="sc-btn-ghost"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="sc-btn-primary">
                {saving ? 'Salvando…' : 'Salvar motoboy'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default TabMotoboys
