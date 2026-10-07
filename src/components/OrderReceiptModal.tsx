import React, { useRef } from 'react'
import { CheckCircle2, Download, Printer, ArrowLeft, Share2, MapPin, QrCode } from 'lucide-react'
import { fmtBRL, padTicket } from '@/lib/seeds'
import { OrderRecord } from '@/types/loyolas'

interface OrderReceiptModalProps {
  order: OrderRecord
  onClose: () => void
  storeName?: string
  pixQrUrl?: string
  pixCode?: string
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  onClose,
  storeName = "Loyola's Lanches",
  pixQrUrl,
  pixCode,
}) => {
  const receiptRef = useRef<HTMLDivElement | null>(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#121215] border border-[#27272A] rounded-2xl p-5 text-left shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">Comprovante do Pedido</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#17171C] text-zinc-400 hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        {/* Cupom térmico estilizado */}
        <div
          ref={receiptRef}
          className="bg-white text-zinc-900 font-mono p-4 rounded-lg shadow-inner text-xs space-y-3 border border-zinc-300"
        >
          <div className="text-center border-b border-dashed border-zinc-400 pb-2.5">
            <h4 className="font-bold text-sm tracking-wide">{storeName.toUpperCase()}</h4>
            <p className="text-[11px] text-zinc-600">Araretama - Pindamonhangaba / SP</p>
            <p className="text-[11px] text-zinc-600">WhatsApp: (12) 99159-1915</p>
            <div className="mt-2 text-base font-black text-black">
              COMANDA #{padTicket(order.ticketNumber)}
            </div>
            <div className="text-[10px] text-zinc-500">
              {order.created
                ? new Date(order.created).toLocaleString('pt-BR')
                : new Date().toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="border-b border-dashed border-zinc-400 pb-2 space-y-1">
            <div className="flex justify-between font-bold text-[11px]">
              <span>CLIENTE:</span>
              <span>{order.customerName || 'Cliente'}</span>
            </div>
            {order.customerPhone && (
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>FONE:</span>
                <span>{order.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span>MODALIDADE:</span>
              <span className="font-bold uppercase">
                {order.deliveryType === 'entrega' ? 'ENTREGA (DELIVERY)' : 'RETIRADA NO BALCÃO'}
              </span>
            </div>
            {order.customerAddress && (
              <div className="text-[10px] text-zinc-700 pt-0.5">
                <span>ENDEREÇO: {order.customerAddress}</span>
              </div>
            )}
          </div>

          {/* Itens */}
          <div className="border-b border-dashed border-zinc-400 pb-2 space-y-1.5">
            <div className="font-bold text-[11px] flex justify-between">
              <span>ITEM</span>
              <span>TOTAL</span>
            </div>
            {(order.items || []).map((it, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between">
                  <span>
                    {it.qty}x {it.name}
                  </span>
                  <span>{fmtBRL(it.price * it.qty)}</span>
                </div>
                {it.gourmetFreeChoice && it.gourmetFreeChoice !== 'none' && (
                  <div className="text-[9px] text-zinc-600 pl-2">
                    ★ Cortesia: {it.gourmetFreeChoice === 'catupiry' ? 'Catupiry' : 'Cheddar'}
                  </div>
                )}
                {it.removed && it.removed.length > 0 && (
                  <div className="text-[9px] text-zinc-500 pl-2">
                    - Sem: {it.removed.join(', ')}
                  </div>
                )}
                {it.added && it.added.length > 0 && (
                  <div className="text-[9px] text-zinc-700 pl-2">
                    + Extras: {it.added.map((a: any) => `${a.name} (x${a.qty})`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totais */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{fmtBRL(order.subtotal || order.total)}</span>
            </div>
            {order.deliveryFee ? (
              <div className="flex justify-between text-zinc-700">
                <span>Taxa de Entrega:</span>
                <span>{fmtBRL(order.deliveryFee)}</span>
              </div>
            ) : null}
            {order.discount ? (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Desconto / Cupom:</span>
                <span>-{fmtBRL(order.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-300">
              <span>TOTAL:</span>
              <span>{fmtBRL(order.total)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600 pt-0.5">
              <span>FORMA DE PAGAMENTO:</span>
              <span className="font-bold">{order.payment}</span>
            </div>
          </div>

          {/* QR Code Pix se aplicável */}
          {order.payment === 'Pix' && pixQrUrl && (
            <div className="pt-2 border-t border-dashed border-zinc-400 text-center space-y-1">
              <span className="text-[10px] font-bold">QR CODE PIX PARA PAGAMENTO</span>
              <img
                src={pixQrUrl}
                alt="QR Code Pix"
                className="w-28 h-28 mx-auto border border-zinc-400 p-1 bg-white"
              />
              {pixCode && (
                <p className="text-[8px] break-all text-zinc-500 font-sans">
                  {pixCode.slice(0, 40)}...
                </p>
              )}
            </div>
          )}

          <div className="text-center pt-2 border-t border-dashed border-zinc-400 text-[10px] text-zinc-500">
            Agradecemos a sua preferência!
            <br />
            Loyola's Lanches - Desde 2006
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir / Salvar</span>
          </button>
          <a
            href={`https://wa.me/5512991591915?text=${encodeURIComponent(
              `Olá! Segue meu pedido #${padTicket(order.ticketNumber)} no Loyola's Lanches (${order.customerName} - ${fmtBRL(order.total)} - ${order.payment}).`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Share2 size={14} />
            <span>Enviar no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  )
}
