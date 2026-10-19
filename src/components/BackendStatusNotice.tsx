import { backendConfigured, backendConfigMessage } from '@/lib/pocketbase/client'

/** Fail-closed notice: no customer checkout or admin login should silently use a legacy service. */
export default function BackendStatusNotice() {
  if (backendConfigured && import.meta.env.VITE_SUPABASE_DRAFT_MODE !== 'true') return null
  if (backendConfigured) return (
    <div role="status" className="relative z-[100] border-b border-amber-500/40 bg-[#261a08] px-4 py-2 text-center text-xs font-semibold text-amber-100">
      Versão de homologação Supabase: a empresa continua em DRAFT. Cadastros e pedidos reais não estão liberados.
    </div>
  )
  return (
    <div role="alert" className="relative z-[100] border-b border-amber-500/50 bg-[#261a08] px-4 py-2 text-center text-xs font-semibold text-amber-100">
      Ambiente de demonstração — backend independente ainda não configurado. {backendConfigMessage}
      <span className="ml-2 font-normal">Pedidos, cadastros e administração não serão gravados.</span>
    </div>
  )
}
