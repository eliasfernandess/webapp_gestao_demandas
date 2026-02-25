import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    LayoutDashboard,
    ClipboardList,
    StickyNote,
    CheckSquare,
    LogOut,
    Sun,
    Moon,
    Menu,
    X,
    Zap
} from 'lucide-react'

export default function Layout() {
    const { logout } = useAuth()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark'
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
        localStorage.setItem('theme', darkMode ? 'dark' : 'light')
    }, [darkMode])

    useEffect(() => {
        setSidebarOpen(false)
    }, [location])

    const navLinks = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/demandas', icon: ClipboardList, label: 'Demandas' },
        { to: '/notas', icon: StickyNote, label: 'Anotações' },
        { to: '/checklist', icon: CheckSquare, label: 'Checklist' },
    ]

    return (
        <div className="app-layout">
            <button
                className="mobile-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Menu"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-icon">
                            <Zap size={20} />
                        </div>
                        <div className="sidebar-brand-text">
                            GDemandas
                            <span>Sistema de Gestão</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navLinks.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/'}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <link.icon size={20} />
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button
                        className="sidebar-link"
                        onClick={() => setDarkMode(!darkMode)}
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                    </button>
                    <button
                        className="sidebar-link"
                        onClick={logout}
                    >
                        <LogOut size={20} />
                        Sair
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    )
}
