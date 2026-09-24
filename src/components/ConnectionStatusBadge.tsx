import React from 'react'
import { Wifi, WifiOff, CloudUpload, RefreshCw } from 'lucide-react'

interface ConnectionStatusBadgeProps {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  failedCount: number
  onClick: () => void
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  failedCount,
  onClick,
}) => {
  const hasQueue = pendingCount > 0 || failedCount > 0

  return (
    <button
      type="button"
      className={`sc-status offline-indicator-btn ${
        !isOnline ? 'is-offline-warn' : hasQueue ? 'is-sync-pending' : 'is-open'
      }`}
      onClick={onClick}
      title={
        !isOnline
          ? `Modo offline (${pendingCount} pedidos na fila). Clique para ver a fila.`
          : hasQueue
            ? `${pendingCount} pedidos aguardando sincronização. Clique para sincronizar.`
            : 'Conectado à internet. Clique para detalhes.'
      }
      aria-label="Status da conexão e fila de pedidos"
    >
      {!isOnline ? (
        <WifiOff size={13} className="text-amber-400 shrink-0" />
      ) : isSyncing ? (
        <RefreshCw size={13} className="animate-spin text-sky-400 shrink-0" />
      ) : hasQueue ? (
        <CloudUpload size={13} className="text-amber-400 shrink-0" />
      ) : (
        <span className="sc-status-dot is-open" />
      )}

      <span className="sc-status-text">
        {!isOnline
          ? hasQueue
            ? `Offline (${pendingCount})`
            : 'Offline'
          : isSyncing
            ? 'Sincronizando...'
            : hasQueue
              ? `${pendingCount} na fila`
              : 'Online'}
      </span>
    </button>
  )
}
