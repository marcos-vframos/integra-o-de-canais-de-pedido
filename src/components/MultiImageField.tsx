import React, { useRef, useState } from 'react'
import { Upload, Trash2, ArrowUp, ArrowDown, Plus, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

interface MultiImageFieldProps {
  label: string
  images: string[]
  onChange: (images: string[]) => void
  disabled?: boolean
  description?: string
  aspectRatio?: string
}

export const MultiImageField: React.FC<MultiImageFieldProps> = ({
  label,
  images = [],
  onChange,
  disabled = false,
  description = 'Adicione uma ou mais imagens. Quando houver 2 ou mais, a área se transforma automaticamente em um carrossel contínuo com transição suave.',
  aspectRatio = 'h-36',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlModal, setShowUrlModal] = useState(false)

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      // Upload para landing_content como record auxiliar ou upload genérico
      const formData = new FormData()
      formData.append('section', `media_${Date.now()}`)
      formData.append(
        'data',
        JSON.stringify({ uploadedAt: new Date().toISOString(), originalName: file.name }),
      )
      formData.append('image', file)

      const rec = await pb.collection('landing_content').create(formData)
      const fileUrl = pb.files.getURL(rec, rec.image)
      onChange([...images, fileUrl])
    } catch (err: any) {
      alert('Erro ao enviar imagem: ' + (err?.message || 'Tente novamente.'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddUrl = () => {
    if (!urlInput.trim()) return
    onChange([...images, urlInput.trim()])
    setUrlInput('')
    setShowUrlModal(false)
  }

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= images.length) return
    const updated = [...images]
    const temp = updated[index]
    updated[index] = updated[target]
    updated[target] = temp
    onChange(updated)
  }

  return (
    <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-zinc-200">{label}</span>
          <span className="ml-2 text-xs text-zinc-400">
            ({images.length} imagem{images.length !== 1 ? 'ns' : ''})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadFile}
          />
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
                <span>Upload Imagem</span>
              </>
            )}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowUrlModal(!showUrlModal)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Inserir URL</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>

      {showUrlModal && (
        <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Cole o link da imagem (https://...)"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => setShowUrlModal(false)}
            className="px-2 py-1.5 text-zinc-400 hover:text-white text-xs"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Grid de Imagens */}
      {images.length === 0 ? (
        <div
          className={`w-full ${aspectRatio} rounded-lg border border-dashed border-zinc-700 bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 text-xs gap-1.5`}
        >
          <span>Nenhuma imagem cadastrada para este bloco</span>
          <span className="text-[11px] text-zinc-600">
            Clique em "Upload Imagem" ou "Inserir URL" acima
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          {images.map((src, idx) => (
            <div
              key={idx}
              className="group relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 flex flex-col"
            >
              <div className="relative h-28 w-full overflow-hidden bg-black">
                <img src={src} alt={`${label} ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] text-white font-bold">
                  #{idx + 1}
                </span>
              </div>
              <div className="p-1.5 bg-zinc-900 flex items-center justify-between gap-1 border-t border-zinc-800">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20"
                    title="Mover para frente"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20"
                    title="Mover para trás"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 rounded hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Excluir imagem"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
