import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar e-mail de recuperação.')
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
          Recuperar Senha
        </h1>
        <p className="text-xs text-[#9A9CA0] mb-5">
          Digite seu e-mail cadastrado para receber instruções de redefinição de senha.
        </p>

        {sent ? (
          <div className="p-4 rounded-xl bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] text-[#22c55e] text-center">
            <CheckCircle className="mx-auto mb-2" size={28} />
            <p className="text-sm font-semibold">Instruções enviadas!</p>
            <p className="text-xs text-[#9A9CA0] mt-1">
              Enviamos um link de recuperação para seu email. Verifique sua caixa de entrada e spam.
            </p>
            <Link
              to="/login"
              className="inline-block mt-4 text-xs font-semibold px-4 py-2 bg-[#1D1D1F] border border-[#2C2C2F] rounded-lg text-[#F5F5F6] hover:border-[#E10600] transition-colors"
            >
              Ir para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-[#FF8079] text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#9A9CA0] mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-[#0B0B0C] border border-[#2C2C2F] focus:border-[#E10600] text-[#F5F5F6] rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-[#E10600] to-[#9E0400] hover:brightness-110 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[rgba(225,6,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail size={16} />
              {loading ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
