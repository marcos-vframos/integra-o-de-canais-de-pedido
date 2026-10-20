import React, { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
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
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setError(''); setSuccess('')
      if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Use JPG, PNG, WebP ou GIF.')
      if (file.size > 15 * 1024 * 1024) throw new Error('A imagem deve ter até 15 MB.')
      setUploading(true)
      await onUpload(file)
      setSuccess('Imagem enviada e salva na Landing.')
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar e salvar esta imagem.')
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
          title={!pb.authStore.isValid ? 'Ativar edição para carregar imagem' : 'Enviar foto para o Supabase'}
          onClick={() => { if(!pb.authStore.isValid){ navigate('/login?returnTo=/adm-landing'); return } fileInputRef.current?.click() }}
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
              <span>{pb.authStore.isValid ? 'Carregar arquivo' : 'Ativar edição'}</span>
            </>
          )}
        </button>
      </div>

      {!pb.authStore.isValid && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-200">
          Upload real protegido pelo Supabase. <Link to="/login?returnTo=/adm-landing" className="underline font-bold">Entrar como administrador</Link>
        </div>
      )}
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/40 p-2 text-xs text-red-200">{error}</p>}
      {success && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2 text-xs text-emerald-200">{success}</p>}
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
