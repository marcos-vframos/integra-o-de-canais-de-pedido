import { backendConfigured, backendConfigMessage } from '@/lib/pocketbase/client'

/** Fail-closed notice: no customer checkout or admin login should silently use a legacy service. */
export default function BackendStatusNotice() {
  if (backendConfigured) return null
  return (
    <div role="alert" className="relative z-[100] border-b border-amber-500/50 bg-[#261a08] px-4 py-2 text-center text-xs font-semibold text-amber-100">
      Ambiente de demonstração — backend independente ainda não configurado. {backendConfigMessage}
      <span className="ml-2 font-normal">Pedidos, cadastros e administração não serão gravados.</span>
    </div>
  )
}
