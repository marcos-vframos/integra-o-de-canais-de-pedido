import { useRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

/** Presentation only: customization state and checkout remain in the existing store. */
export function OrderSheet({ title, price, image, preview, children, footer, onClose }: {
  title: string
  price: string
  image: ReactNode
  preview?: ReactNode
  children: ReactNode
  footer: ReactNode
  onClose: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="order-sheet-overlay" />
        <Dialog.Content className="order-sheet" onOpenAutoFocus={(event) => {
          event.preventDefault()
          previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          heading.current?.focus()
        }} onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true })
        }}>
          <div className="order-sheet-handle" aria-hidden="true"><span /></div>
          <header className="order-sheet-header">
            <div className="order-sheet-image">{image}</div>
            <div className="order-sheet-heading">
              <Dialog.Title ref={heading} tabIndex={-1} className="order-sheet-title">{title}</Dialog.Title>
              <p className="order-sheet-price sc-tabular">{price}</p>
              <Dialog.Description className="order-sheet-description">Personalize do seu jeito.</Dialog.Description>
            </div>
            {preview}
            <Dialog.Close className="order-sheet-close" aria-label="Fechar personalização"><X size={18} /></Dialog.Close>
          </header>
          <div className="order-sheet-body">{children}</div>
          <footer className="order-sheet-footer">{footer}</footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
