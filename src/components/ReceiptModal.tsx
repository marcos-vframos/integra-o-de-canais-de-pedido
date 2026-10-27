import React, { useState } from 'react'
import { X, Printer, Receipt, FileText } from 'lucide-react'
import type { OrderRecord } from '@/types/loyolas'
import { fmtBRL, padTicket } from '@/lib/seeds'

export interface StoreInfo {
  name: string
  cnpj?: string
  phone?: string
  address?: string
}

interface ReceiptModalProps {
  ticket: (OrderRecord & { status?: string }) | null
  storeName: string
  storeInfo?: StoreInfo
  onClose: () => void
  onPrint: () => void
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  ticket,
  storeName,
  storeInfo,
  onClose,
  onPrint,
}) => {
  const [mode, setMode] = useState<'kitchen' | 'customer'>('kitchen')

  if (!ticket) return null

  const resolvedStoreName = storeInfo?.name || storeName || "Loyola's Lanches"
  const cnpj = storeInfo?.cnpj || ''
  const phone = storeInfo?.phone || ''
  const address = storeInfo?.address || ''

  return (
    <div className="sc-modal-backdrop receipt-modal-backdrop" onClick={onClose}>
      <div className="sc-modal receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <div>
            <div className="sc-modal-title">
              {mode === 'kitchen' ? 'Comanda da Cozinha' : 'Cupom do Cliente'}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              {mode === 'kitchen'
                ? 'Voltada à produção/cozinha'
                : 'Recibo térmico do consumidor (80mm)'}
            </div>
          </div>
          <button className="sc-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </button>
        </div>

        {/* Abas para alternar entre Comanda e Cupom do Cliente */}
        <div className="grid grid-cols-2 gap-1.5 p-1 mb-3 bg-[var(--surface-2)] rounded-lg border border-[var(--line)]">
          <button
            type="button"
            onClick={() => setMode('kitchen')}
            className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'kitchen'
                ? 'bg-[var(--surface)] text-[var(--silver)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--muted)] hover:text-[var(--silver)]'
            }`}
          >
            <FileText size={13} className={mode === 'kitchen' ? 'text-[var(--red)]' : ''} />
            Comanda Cozinha
          </button>
          <button
            type="button"
            onClick={() => setMode('customer')}
            className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'customer'
                ? 'bg-[var(--surface)] text-[var(--silver)] shadow-sm border border-[var(--line)]'
                : 'text-[var(--muted)] hover:text-[var(--silver)]'
            }`}
          >
            <Receipt size={13} className={mode === 'customer' ? 'text-emerald-400' : ''} />
            Cupom Cliente
          </button>
        </div>

        {/* FORMATO TÉRMICO 80mm */}
        <div className="receipt" style={{ borderRadius: 10, padding: 14 }}>
          {/* Cabeçalho */}
          <div className="receipt-center">
            <div className="receipt-name">{resolvedStoreName}</div>
            {mode === 'customer' && cnpj && (
              <div className="receipt-line" style={{ fontSize: 11, color: '#333' }}>
                CNPJ: {cnpj}
              </div>
            )}
            {mode === 'customer' && address && (
              <div className="receipt-line" style={{ fontSize: 11, color: '#333' }}>
                {address}
              </div>
            )}
            {mode === 'customer' && phone && (
              <div className="receipt-line" style={{ fontSize: 11, color: '#333' }}>
                Tel/WhatsApp: {phone}
              </div>
            )}
            {mode === 'kitchen' && <div className="receipt-tag">Cozinha / Preparo</div>}
          </div>

          <hr className="receipt-hr" />

          {/* Dados do Pedido */}
          <div className="receipt-line" style={{ fontWeight: 700, fontSize: 14 }}>
            {mode === 'kitchen' ? 'COMANDA ' : 'CUPOM / RECIBO '}{padTicket(ticket.ticketNumber)}
            {ticket.origin === 'online' && (
              <span style={{ fontSize: 11, marginLeft: 6, color: '#e10600' }}>(Online)</span>
            )}
          </div>
          {ticket.customerName && (
            <div className="receipt-line" style={{ fontWeight: 600 }}>
              Cliente: {ticket.customerName}{' '}
              {ticket.customerPhone ? `(${ticket.customerPhone})` : ''}
            </div>
          )}
          {ticket.deliveryType && (
            <div className="receipt-line" style={{ fontSize: 11 }}>
              Tipo:{' '}
              <b>
                {ticket.deliveryType === 'entrega' ? 'Entrega (Delivery)' : 'Retirada no Balcão'}
              </b>
            </div>
          )}
          {ticket.deliveryRoute&&<div className="receipt-line" style={{fontSize:10}}>Trajeto: {ticket.deliveryRoute.distanceKm.toFixed(1)} km · {Math.ceil(ticket.deliveryRoute.durationMinutes)} min estimados ({ticket.deliveryRoute.traffic==='live'?'trânsito consultado':'sem trânsito ao vivo'})</div>}
          {ticket.deliveryType === 'entrega' && ticket.customerAddress && (
            <div className="receipt-line" style={{ fontSize: 11, color: '#333' }}>
              Endereço: {ticket.customerAddress}
            </div>
          )}
          <div className="receipt-line">
            Data:{' '}
            {ticket.created
              ? new Date(ticket.created).toLocaleString('pt-BR')
              : new Date().toLocaleString('pt-BR')}
          </div>
          <div className="receipt-line">
            {mode === 'kitchen'
              ? ticket.status || 'Comanda (pedido em preparo)'
              : 'Documento Não Fiscal — Recibo de Venda'}
          </div>

          <hr className="receipt-hr" />

          {/* Itens */}
          {ticket.items.map((i, idx) => (
            <div key={idx} style={{ marginBottom: 4 }}>
              <div className="receipt-row">
                <span>
                  {i.qty}x {i.name}
                </span>
                <span>{fmtBRL(i.price * i.qty)}</span>
              </div>
              {i.notes && <div className="receipt-line" style={{color:"#222",fontSize:11,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>Observações: {i.notes}</div>}
              {i.breadChoice && <div className="receipt-line" style={{ color: '#333', fontSize: 11 }}>&nbsp;&nbsp;Pão: {i.breadChoice === 'frances' ? 'Francês' : 'de Hambúrguer'}{Number(i.breadSurcharge) > 0 ? ` (+ ${fmtBRL(i.breadSurcharge)} por lanche)` : ''}</div>}
              {i.removed && i.removed.length > 0 && (
                <div className="receipt-line" style={{ color: '#555', fontSize: 11 }}>
                  &nbsp;&nbsp;sem: {i.removed.join(', ')}
                </div>
              )}
              {i.added && i.added.length > 0 && (
                <div className="receipt-line" style={{ color: '#555', fontSize: 11 }}>
                  &nbsp;&nbsp;+ {i.added.map((a) => `${a.name} x${a.qty}`).join(', ')}
                </div>
              )}
            </div>
          ))}

          <hr className="receipt-hr" />

          {/* Subtotal, Desconto e Taxa de Entrega */}
          {((ticket.discount && ticket.discount > 0) ||
            (ticket.deliveryFee && ticket.deliveryFee > 0) ||
            ticket.subtotal !== undefined) && (
            <>
              {ticket.subtotal !== undefined && (
                <div className="receipt-row">
                  <span>Subtotal</span>
                  <span>{fmtBRL(ticket.subtotal)}</span>
                </div>
              )}
              {ticket.discount !== undefined && ticket.discount > 0 && (
                <div className="receipt-row">
                  <span>Desconto</span>
                  <span>- {fmtBRL(ticket.discount)}</span>
                </div>
              )}
              {ticket.deliveryFee !== undefined && ticket.deliveryFee > 0 && (
                <div className="receipt-row">
                  <span>Taxa de Entrega</span>
                  <span>+ {fmtBRL(ticket.deliveryFee)}</span>
                </div>
              )}
              <hr className="receipt-hr" />
            </>
          )}

          {/* Total & Pagamento */}
          <div className="receipt-row total">
            <span>TOTAL A PAGAR</span>
            <span>{fmtBRL(ticket.total)}</span>
          </div>
          <div className="receipt-line" style={{ marginTop: 3 }}>
            Forma de pagamento: <b>{ticket.payment}</b>
          </div>

          <hr className="receipt-hr" />

          {/* Rodapé */}
          <div className="receipt-footer">
            {mode === 'customer' ? (
              <>
                <div>Obrigado pela preferência e bom apetite!</div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>
                  Volte sempre · {resolvedStoreName}
                </div>
              </>
            ) : (
              <div>Agilidade e qualidade no preparo!</div>
            )}
          </div>

          {mode === 'kitchen' && ticket.deliveryType === 'entrega' && (
            <section
              aria-label="Via do motoboy"
              style={{
                borderTop: '1px dashed #000',
                marginTop: 14,
                paddingTop: 10,
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                overflowWrap: 'anywhere',
              }}
            >
              <div className="receipt-center" style={{ fontWeight: 700, fontSize: 14 }}>
                VIA DO MOTOBOY
              </div>
              <div className="receipt-line" style={{ fontWeight: 700, fontSize: 14 }}>
                COMANDA {padTicket(ticket.ticketNumber)}
              </div>
              <div className="receipt-line">Cliente: {ticket.customerName || 'Não informado'}</div>
              <div className="receipt-line">Telefone: {ticket.customerPhone || 'Não informado'}</div>
              <div className="receipt-line">Endereço: {ticket.customerAddress || 'Não informado'}</div>
              <div className="receipt-line">Forma de pagamento: <b>{ticket.payment || 'Não informada'}</b></div>
              <div className="receipt-line" style={{ marginTop: 8 }}>Anotações:</div>
              <div aria-label="Duas linhas para anotações à mão">
                <div style={{ height: 24, borderBottom: '1px solid #000' }} />
                <div style={{ height: 24, borderBottom: '1px solid #000' }} />
              </div>
            </section>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="sc-form-actions">
          <button className="sc-btn-primary" onClick={onPrint}>
            <Printer size={14} style={{ marginRight: 6 }} />
            Imprimir {mode === 'kitchen' ? 'comanda' : 'cupom'}
          </button>
          <button className="sc-btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
