import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

const ToastContext = createContext()
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3200)
    }, [])

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        {t.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        {t.message}
                        <div className="toast-progress" />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
