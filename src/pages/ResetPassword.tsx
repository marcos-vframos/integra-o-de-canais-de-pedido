import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { KeyRound, ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Token de recuperação ausente ou inválido.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset(token, password, passwordConfirm)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.message || 'Falha ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="sc-root flex items-center justify-center min-h-screen px-4"
      style={{ background: '#0B0B0C' }}
    >
      <div className="w-full max-w-md bg-[#151516] border border-[#2C2C2F] rounded-2xl p-7 shadow-2xl relative">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-[#9A9CA0] hover:text-[#F5F5F6] mb-5 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para o login
        </Link>

        <h1 className="sc-display text-2xl font-bold uppercase tracking-wider text-[#F5F5F6] mb-1">
          Redefinir Senha
        </h1>
        <p className="text-xs text-[#9A9CA0] mb-5">
          Escolha uma nova senha de no mínimo 8 caracteres para a sua conta.
        </p>

        {success ? (
          <div className="p-4 rounded-xl bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] text-[#22c55e] text-center">
            <p className="text-sm font-semibold">Senha alterada com sucesso!</p>
            <p className="text-xs text-[#9A9CA0] mt-1">Redirecionando para o login em instantes…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-[#FF8079] text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#9A9CA0] mb-1.5">
                Nova senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full bg-[#0B0B0C] border border-[#2C2C2F] focus:border-[#E10600] text-[#F5F5F6] rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9A9CA0] mb-1.5">
                Confirmar nova senha
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="w-full bg-[#0B0B0C] border border-[#2C2C2F] focus:border-[#E10600] text-[#F5F5F6] rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-[#E10600] to-[#9E0400] hover:brightness-110 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[rgba(225,6,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound size={16} />
              {loading ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
