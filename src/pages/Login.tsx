import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LogIn } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('marcos.vframos@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Por favor, preencha o e-mail e a senha.')
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/gestao')
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="sc-root flex items-center justify-center min-h-screen px-4"
      style={{ background: '#0B0B0C' }}
    >
      <div className="w-full max-w-md bg-[#151516] border border-[#2C2C2F] rounded-2xl p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(225,6,0,0.18),transparent_70%)] pointer-events-none" />

        <div className="text-center mb-6">
          <h1 className="sc-display text-3xl font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#f4f5f6] to-[#9aa0a6]">
            Loyola's Lanches
          </h1>
          <p className="sc-tagline text-[#E10600] text-base mt-0.5">Gestão de Pedidos</p>
          <p className="text-xs text-[#9A9CA0] mt-1.5">Painel operacional e de controle</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-[#FF8079] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-[#9A9CA0]">Senha</label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#7D8085] hover:text-[#C9CDD3] transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#0B0B0C] border border-[#2C2C2F] focus:border-[#E10600] text-[#F5F5F6] rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-b from-[#E10600] to-[#9E0400] hover:brightness-110 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[rgba(225,6,0,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn size={16} />
            {loading ? 'Entrando…' : 'Entrar no sistema'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#2C2C2F] text-center">
          <p className="text-[11px] text-[#7D8085]">
            Acesso administrativo e operacional de Loyola's Lanches.
          </p>
        </div>
      </div>
    </div>
  )
}
