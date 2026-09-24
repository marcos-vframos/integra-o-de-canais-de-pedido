import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import pb from '@/lib/pocketbase/client'
import {
  Settings,
  Store,
  Power,
  Building2,
  Phone,
  MapPin,
  Sun,
  Moon,
  UtensilsCrossed,
  PlusCircle,
  Tag,
  Check,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Save,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { StoreCloseChoiceModal } from '@/components/StoreCloseChoiceModal'

function maskCNPJ(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  let size = digits.length - 2
  let numbers = digits.substring(0, size)
  const digitsCheck = digits.substring(size)
  let sum = 0
  let pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number(digitsCheck.charAt(0))) return false

  size = size + 1
  numbers = digits.substring(0, size)
  sum = 0
  pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === Number(digitsCheck.charAt(1))
}

function maskPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

export default function Config() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const [storeName, setStoreName] = useState("Loyola's Lanches")
  const [cnpj, setCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [isOpen, setIsOpen] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [cnpjError, setCnpjError] = useState('')

  const [closeChoiceModalOpen, setCloseChoiceModalOpen] = useState(false)
  const [openOrdersCount, setOpenOrdersCount] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [settingsList, ordersList, closuresList] = await Promise.all([
          pb
            .collection('settings')
            .getFullList<{ id: string; key: string; value: string }>()
            .catch(() => []),
          pb
            .collection('orders')
            .getFullList<{ id: string; created: string }>()
            .catch(() => []),
          pb
            .collection('closures')
            .getFullList<{ id: string; closedAt: string }>({ sort: 'closedAt' })
            .catch(() => []),
        ])

        if (!mounted) return

        const getVal = (key: string) => settingsList.find((s) => s.key === key)?.value

        const sName = getVal('store_name')
        const sOpen = getVal('is_open')
        const sCnpj = getVal('store_cnpj')
        const sPhone = getVal('store_phone')
        const sAddress = getVal('store_address')

        if (sName) setStoreName(sName)
        if (sOpen !== undefined) setIsOpen(sOpen === 'true')
        if (sCnpj) setCnpj(maskCNPJ(sCnpj))
        if (sPhone) setPhone(maskPhone(sPhone))
        if (sAddress) setAddress(sAddress)

        const lastClosure = closuresList.length
          ? closuresList[closuresList.length - 1].closedAt
          : null
        const openOrders = ordersList.filter((o) => !lastClosure || o.created > lastClosure)
        setOpenOrdersCount(openOrders.length)
      } catch (e) {
        console.error('Erro ao carregar settings', e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const masked = maskCNPJ(raw)
    setCnpj(masked)
    if (cnpjError) {
      setCnpjError('')
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value))
  }

  const handleStatusClick = (targetOpen: boolean) => {
    if (targetOpen) {
      setIsOpen(true)
      saveSingleSetting('is_open', 'true')
      toast({
        title: 'Loja reaberta',
        description: 'O status foi atualizado para aberto para atendimento.',
      })
    } else {
      if (isOpen) {
        setCloseChoiceModalOpen(true)
      }
    }
  }

  const handlePauseOperation = async () => {
    setCloseChoiceModalOpen(false)
    setIsOpen(false)
    await saveSingleSetting('is_open', 'false')
    toast({
      title: 'Operação pausada',
      description: 'A lanchonete foi marcada como fechada. O caixa atual permanece ativo.',
    })
  }

  const handleCloseRegister = async () => {
    setCloseChoiceModalOpen(false)
    setIsOpen(false)
    await saveSingleSetting('is_open', 'false')
    toast({
      title: 'Encerrando expediente',
      description: 'Redirecionando para a conferência e fechamento do caixa...',
    })
    navigate('/gestao?tab=caixa&triggerClose=true')
  }

  const saveSingleSetting = async (key: string, value: string) => {
    try {
      const rec = await pb
        .collection('settings')
        .getFirstListItem(`key="${key}"`)
        .catch(() => null)
      if (rec) {
        await pb.collection('settings').update(rec.id, { value })
      } else {
        await pb.collection('settings').create({ key, value })
      }
    } catch (err) {
      console.error(`Erro ao salvar setting ${key}:`, err)
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const trimmedName = storeName.trim()
    if (!trimmedName) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da lanchonete.',
        variant: 'destructive',
      })
      return
    }

    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (cleanCnpj.length > 0) {
      if (cleanCnpj.length !== 14 || !isValidCNPJ(cleanCnpj)) {
        setCnpjError('CNPJ inválido. Confira os 14 dígitos informados.')
        toast({
          title: 'CNPJ inválido',
          description: 'Por favor verifique os dígitos do CNPJ informado.',
          variant: 'destructive',
        })
        return
      }
    }
    setCnpjError('')

    setSaving(true)
    setSaveSuccess(false)

    try {
      const pairs: Array<{ key: string; value: string }> = [
        { key: 'store_name', value: trimmedName },
        { key: 'is_open', value: isOpen ? 'true' : 'false' },
        { key: 'store_cnpj', value: cleanCnpj },
        { key: 'store_phone', value: phone.trim() },
        { key: 'store_address', value: address.trim() },
        { key: 'theme', value: theme },
      ]

      for (const pair of pairs) {
        const rec = await pb
          .collection('settings')
          .getFirstListItem(`key="${pair.key}"`)
          .catch(() => null)
        if (rec) {
          await pb.collection('settings').update(rec.id, { value: pair.value })
        } else {
          await pb.collection('settings').create(pair)
        }
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2600)

      toast({
        title: 'Alterações salvas',
        description: 'Dados da lanchonete sincronizados com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sc-root min-h-screen">
      <div className="max-w-2xl mx-auto py-4 px-2">
        {/* Top Header / Navegação */}
        <div className="flex items-center justify-between mb-5">
          <Link
            to="/gestao"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1 px-2 -ml-2 rounded-lg"
          >
            <ArrowLeft size={14} /> Voltar ao Painel de Gestão
          </Link>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 animate-in fade-in duration-200">
                <Check size={13} /> Salvo
              </span>
            )}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || loading}
              className="sc-btn-small text-xs py-1.5 px-3 h-8 text-[var(--silver)] border-[var(--line)] hover:border-[var(--red)] transition-all"
              title="Salvar alterações"
            >
              <Save size={13} />
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Card Principal: Configurações da Lanchonete e Status */}
        <div className="sc-card">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={20} className="text-[var(--red)]" />
            <h2 className="sc-title" style={{ marginBottom: 0, paddingBottom: 0 }}>
              Configurações da lanchonete
            </h2>
          </div>
          <p className="sc-sub">
            Ajuste as informações operacionais visíveis no topo do sistema, na loja e nas comandas
            impressas.
          </p>

          {loading ? (
            <p className="sc-empty">Carregando configurações…</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Status Operacional */}
              <div className="sc-field">
                <label className="sc-label flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Power size={14} /> Status da operação
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-normal">
                    {isOpen ? 'Recebendo novos pedidos online' : 'Operação encerrada / pausada'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusClick(true)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isOpen
                        ? 'bg-[rgba(34,197,94,0.15)] border-[#22c55e] text-[#22c55e]'
                        : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--silver-dim)]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Aberto para atendimento
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusClick(false)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      !isOpen
                        ? 'bg-[rgba(225,6,0,0.15)] border-[var(--red)] text-[var(--red)]'
                        : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--silver-dim)]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
                    Fechado
                  </button>
                </div>
              </div>

              {/* SEÇÃO 1: Minha Conta / Dados do Estabelecimento */}
              <div className="pt-3 border-t border-[var(--line)]">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} className="text-[var(--red)]" />
                  <h3
                    className="sc-title"
                    style={{ fontSize: 16, marginBottom: 0, paddingBottom: 0 }}
                  >
                    Minha conta & Estabelecimento
                  </h3>
                </div>
                <p className="sc-sub" style={{ marginBottom: 12 }}>
                  Identificação e dados de contato para emissão de comandas térmicas e recibos do
                  cliente.
                </p>

                <div className="space-y-3">
                  <div className="sc-field">
                    <label className="sc-label flex items-center gap-1.5">
                      <Store size={13} /> Nome da lanchonete (exibição, loja e impressão)
                    </label>
                    <input
                      className="sc-input"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ex.: Loyola's Lanches"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sc-field">
                      <label className="sc-label flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={13} className="shrink-0" />
                          <span>CNPJ da lanchonete</span>
                        </span>
                        {cnpj && !cnpjError && cnpj.replace(/\D/g, '').length === 14 && (
                          <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                            <Check size={11} /> Válido
                          </span>
                        )}
                      </label>
                      <input
                        className={`sc-input ${cnpjError ? 'border-[var(--red)]' : ''}`}
                        value={cnpj}
                        onChange={handleCnpjChange}
                        placeholder="00.000.000/0001-00"
                        maxLength={18}
                        inputMode="numeric"
                      />
                      {cnpjError && (
                        <span className="text-[11px] text-[var(--red)] mt-1 block">
                          {cnpjError}
                        </span>
                      )}
                    </div>

                    <div className="sc-field">
                      <label className="sc-label flex items-center">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={13} className="shrink-0" />
                          <span>Telefone / WhatsApp do balcão</span>
                        </span>
                      </label>
                      <input
                        className="sc-input"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        inputMode="tel"
                      />
                    </div>
                  </div>

                  <div className="sc-field">
                    <label className="sc-label flex items-center gap-1.5">
                      <MapPin size={13} /> Endereço do estabelecimento
                    </label>
                    <input
                      className="sc-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex.: Av. Nicanor Ramos Nogueira, Araretama, Pindamonhangaba - SP"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: Tema da Interface */}
              <div className="pt-3 border-t border-[var(--line)]">
                <label className="sc-label flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--silver)]">
                    Tema da interface
                  </span>
                  <span className="text-[11px] text-[var(--muted)] font-normal">
                    {theme === 'dark' ? 'Tema Escuro ativo' : 'Tema Claro ativo'}
                  </span>
                </label>
                <p className="sc-sub" style={{ marginBottom: 10 }}>
                  Alterne entre tema escuro e tema claro para melhor visibilidade no balcão sob luz
                  forte.
                </p>

                <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--surface-2)] rounded-xl border border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-[var(--surface)] text-[var(--silver)] shadow-sm border border-[var(--line)]'
                        : 'text-[var(--muted)] hover:text-[var(--silver)]'
                    }`}
                  >
                    <Moon size={14} className={theme === 'dark' ? 'text-[var(--red)]' : ''} />
                    <span>Modo Escuro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      theme === 'light'
                        ? 'bg-[var(--surface)] text-[var(--silver)] shadow-sm border border-[var(--line)]'
                        : 'text-[var(--muted)] hover:text-[var(--silver)]'
                    }`}
                  >
                    <Sun size={14} className={theme === 'light' ? 'text-[var(--red)]' : ''} />
                    <span>Modo Claro</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[var(--line)]">
                <span className="text-xs text-[var(--muted)]">
                  {saveSuccess && (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <Check size={13} /> Sincronizado com o terminal
                    </span>
                  )}
                </span>

                <button
                  type="submit"
                  disabled={saving}
                  className="sc-btn-secondary w-auto px-5 py-2 mt-0 text-xs font-semibold inline-flex items-center gap-2 hover:border-[var(--red)]"
                >
                  <Save size={14} />
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* SEÇÃO 3: Atalhos de Gestão de Cardápio */}
        <div className="sc-card">
          <div className="flex items-center gap-2 mb-2">
            <UtensilsCrossed size={18} className="text-[var(--red)]" />
            <h3 className="sc-title" style={{ fontSize: 17, marginBottom: 0, paddingBottom: 0 }}>
              Atalhos de Gestão de Cardápio
            </h3>
          </div>
          <p className="sc-sub">
            Acesso rápido para alterar preços, cadastrar novos lanches ou pausar itens no painel.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/gestao?tab=cardapio&action=edit')}
              className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--red)] hover:bg-[var(--surface)] transition-all group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[rgba(225,6,0,0.12)] text-[var(--red)] group-hover:scale-105 transition-transform">
                  <Tag size={16} />
                </div>
                <div>
                  <span className="block font-semibold text-xs text-[var(--silver)] group-hover:text-[var(--red)] transition-colors">
                    Editar itens e preços
                  </span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    Ajustar valores e receitas
                  </span>
                </div>
              </div>
              <ChevronRight
                size={14}
                className="text-[var(--muted)] group-hover:text-[var(--silver)]"
              />
            </button>

            <button
              type="button"
              onClick={() => navigate('/gestao?tab=cardapio&action=new')}
              className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--red)] hover:bg-[var(--surface)] transition-all group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[rgba(34,197,94,0.12)] text-[#22c55e] group-hover:scale-105 transition-transform">
                  <PlusCircle size={16} />
                </div>
                <div>
                  <span className="block font-semibold text-xs text-[var(--silver)] group-hover:text-[#22c55e] transition-colors">
                    Adicionar novo produto
                  </span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    Cadastrar novo lanche ou bebida
                  </span>
                </div>
              </div>
              <ChevronRight
                size={14}
                className="text-[var(--muted)] group-hover:text-[var(--silver)]"
              />
            </button>
          </div>
        </div>

        {/* Bloco: Terminal e Acesso */}
        <div className="sc-card">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-[var(--muted)]" />
            <h3 className="sc-title" style={{ fontSize: 17, marginBottom: 0, paddingBottom: 0 }}>
              Terminal e Acesso
            </h3>
          </div>
          <p className="sc-sub" style={{ margin: 0 }}>
            {user?.email
              ? `Operador autenticado: ${user.email}`
              : 'Terminal operando em modo de acesso direto (sem login obrigatório).'}
          </p>
        </div>

        <StoreCloseChoiceModal
          isOpen={closeChoiceModalOpen}
          onClose={() => setCloseChoiceModalOpen(false)}
          onPauseOperation={handlePauseOperation}
          onCloseRegister={handleCloseRegister}
          openOrdersCount={openOrdersCount}
        />
      </div>
    </div>
  )
}
