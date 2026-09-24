import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { CheckCircle, AlertTriangle } from 'lucide-react'

export default function ConfirmEmailChange() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Token ausente.')
      setLoading(false)
      return
    }

    pb.collection('users')
      .confirmEmailChange(token, '')
      .then(() => {
        setSuccess(true)
        setTimeout(() => navigate('/gestao'), 3000)
      })
      .catch((err) => {
        setError(err?.message || 'Falha ao confirmar troca de email.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token, navigate])

  return (
    <div
      className="sc-root flex items-center justify-center min-h-screen px-4"
      style={{ background: '#0B0B0C' }}
    >
      <div className="w-full max-w-md bg-[#151516] border border-[#2C2C2F] rounded-2xl p-7 shadow-2xl text-center">
        <h1 className="sc-display text-2xl font-bold uppercase tracking-wider text-[#F5F5F6] mb-3">
          Troca de E-mail
        </h1>

        {loading && <p className="text-sm text-[#9A9CA0]">Confirmando alteração de e-mail…</p>}

        {success && (
          <div className="p-4 rounded-xl bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] text-[#22c55e]">
            <CheckCircle className="mx-auto mb-2" size={32} />
            <p className="text-sm font-semibold">E-mail atualizado com sucesso!</p>
            <p className="text-xs text-[#9A9CA0] mt-1">Redirecionando…</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-[#FF8079]">
            <AlertTriangle className="mx-auto mb-2" size={32} />
            <p className="text-sm font-semibold">Erro ao confirmar troca</p>
            <p className="text-xs mt-1">{error}</p>
            <Link
              to="/login"
              className="inline-block mt-4 text-xs font-semibold px-4 py-2 bg-[#1D1D1F] border border-[#2C2C2F] rounded-lg text-[#F5F5F6]"
            >
              Ir para o Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
