import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const { isAuthenticated, login } = useAuth()
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    if (isAuthenticated) return <Navigate to="/" replace />

    const handleSubmit = (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        setTimeout(() => {
            const success = login(password)
            if (!success) {
                setError('Senha incorreta')
                setPassword('')
            }
            setLoading(false)
        }, 400)
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="logo">
                    <div className="logo-icon">
                        <Lock size={28} />
                    </div>
                    <h1>Gestão de Demandas</h1>
                    <p className="subtitle">Insira a senha para acessar o sistema</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="login-error">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="Digite a senha de acesso"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full"
                        disabled={loading || !password}
                    >
                        {loading ? (
                            <span className="loading-spinner" />
                        ) : (
                            <>
                                <LogIn size={18} />
                                Entrar
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
