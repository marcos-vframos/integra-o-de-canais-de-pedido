import React, { useRef, useState } from 'react'
import { Upload, Trash2, ArrowUp, ArrowDown, Plus, Loader2 } from 'lucide-react'
import { uploadLandingGalleryImage } from '@/lib/supabase/compat'
import { Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

interface MultiImageFieldProps {
  label: string
  images: string[]
  onChange: (images: string[]) => void | Promise<void>
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
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [pendingImages, setPendingImages] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [showUrlModal, setShowUrlModal] = useState(false)

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    setPendingImages(null)
    if (!pb.authStore.isValid) {
      setError('Para publicar fotos, é preciso entrar com uma conta de operador vinculada ao Loyola’s Lanches. A navegação sem login permite somente visualizar.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (files.length > 30) {
      setError('Envie até 30 fotos de cada vez (9 imagens são aceitas normalmente).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const pending = [...images]
    const failures: string[] = []
    let complete = 0
    setUploading(true)
    try {
      // Upload to secure Storage first. Save the gallery JSON ONE time at the end,
      // not once per photo; concurrent effects otherwise overwrite earlier images.
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        setProgress(`Enviando ${index + 1} de ${files.length}: ${file.name}`)
        if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
          failures.push(`${file.name}: use JPG, PNG, WebP ou GIF`)
          continue
        }
        if (file.size > 15 * 1024 * 1024) {
          failures.push(`${file.name}: excede 15 MB`)
          continue
        }
        try {
          const url = await uploadLandingGalleryImage(file)
          pending.push(url)
          complete += 1
        } catch (err: unknown) {
          failures.push(`${file.name}: ${err instanceof Error ? err.message : 'Falha no envio'}`)
        }
      }
      if (complete > 0) {
        setProgress(`Salvando galeria com ${pending.length} imagens…`)
        try {
          await onChange(pending)
          setProgress(`${complete} imagem(ns) publicada(s); galeria salva no Supabase.`)
        } catch (err: unknown) {
          setPendingImages(pending)
          failures.push(`Fotos chegaram ao Storage, mas a galeria não foi salva: ${err instanceof Error ? err.message : 'erro desconhecido'}. Use “Tentar salvar galeria” para concluir sem reenviar as imagens.`)
        }
      } else {
        setProgress('Nenhuma imagem foi enviada.')
      }
      if (failures.length) setError(`${failures.length} problema(s): ${failures.join('; ')}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const retryGallerySave = async () => {
    if (!pendingImages || uploading) return
    setUploading(true)
    setError('')
    try {
      await onChange(pendingImages)
      setProgress(`Galeria confirmada: ${pendingImages.length} imagem(ns) no Supabase.`)
      setPendingImages(null)
    } catch (err: unknown) {
      setError('Não foi possível concluir o salvamento: ' + (err instanceof Error ? err.message : 'erro desconhecido'))
    } finally { setUploading(false) }
  }

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return
    try {
      setError('')
      await onChange([...images, urlInput.trim()])
      setUrlInput('')
      setShowUrlModal(false)
    } catch (err: any) { setError(err?.message || 'Não foi possível salvar a URL.') }
  }

  const handleRemove = async (index: number) => {
    try { setError(''); await onChange(images.filter((_, i) => i !== index)) }
    catch(err: any) { setError(err?.message || 'Não foi possível excluir a imagem.') }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= images.length) return
    const updated = [...images]
    const temp = updated[index]
    updated[index] = updated[target]
    updated[target] = temp
    try { setError(''); await onChange(updated) }
    catch(err: any) { setError(err?.message || 'Não foi possível reordenar as imagens.') }
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
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleUploadFile}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            title={!pb.authStore.isValid ? 'Ativar edição segura para enviar até 30 imagens de uma vez' : 'Adicionar uma ou várias imagens'}
            onClick={() => { if (!pb.authStore.isValid) { navigate('/login?returnTo=/adm-landing'); return } fileInputRef.current?.click() }}
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
                <span>{pb.authStore.isValid ? 'Enviar imagens' : 'Ativar edição e enviar'}</span>
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

      <p className="text-xs text-zinc-400 leading-relaxed">{description} Você pode selecionar 9 imagens ou mais na mesma operação; cada foto aceita até 15 MB.</p>
      {!pb.authStore.isValid && (
        <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          A visualização é livre, mas para publicar as nove imagens você precisa ativar o acesso de edição no Supabase uma única vez neste dispositivo.
          <Link to="/login?returnTo=/adm-landing" className="ml-2 font-bold underline">Entrar para editar</Link>
        </div>
      )}
      {progress && <p aria-live="polite" className="text-xs text-emerald-300">{progress}</p>}
      {pendingImages && <button type="button" disabled={uploading} onClick={retryGallerySave} className="self-start rounded-lg border border-amber-500/50 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50">Tentar salvar galeria (sem reenviar fotos)</button>}
      {error && <p role="alert" className="rounded-lg bg-red-950/50 border border-red-500/30 p-2 text-xs text-red-200">{error}</p>}

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
