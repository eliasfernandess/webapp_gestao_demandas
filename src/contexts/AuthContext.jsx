import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('gestao_auth') === 'true'
    })

    const login = useCallback((password) => {
        if (password === import.meta.env.VITE_APP_PASSWORD) {
            sessionStorage.setItem('gestao_auth', 'true')
            setIsAuthenticated(true)
            return true
        }
        return false
    }, [])

    const logout = useCallback(() => {
        sessionStorage.removeItem('gestao_auth')
        setIsAuthenticated(false)
    }, [])

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
