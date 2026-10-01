import React, { useRef } from 'react'
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

interface ImageUploadFieldProps {
  label: string
  currentUrl?: string
  aspectRatio?: string // e.g. 'aspect-video', 'aspect-square', 'h-40'
  onUpload: (file: File) => Promise<void>
  disabled?: boolean
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  currentUrl,
  aspectRatio = 'h-44',
  onUpload,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = React.useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      await onUpload(file)
    } catch (err: any) {
      alert('Erro ao carregar imagem: ' + (err?.message || 'Tente novamente.'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="bg-[#18181b] border border-white/10 rounded-xl p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">{label}</span>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8F0F1B] hover:bg-[#A31220] text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Carregar arquivo</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={`relative w-full ${aspectRatio} rounded-lg overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center`}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-zinc-500 text-xs">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span>Nenhuma imagem definida</span>
          </div>
        )}
      </div>
    </div>
  )
}
