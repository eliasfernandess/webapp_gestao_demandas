import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
    ClipboardList,
    Clock,
    Code2,
    Hourglass,
    CheckCircle2,
    Search,
    TrendingUp
} from 'lucide-react'

const STATUS_CONFIG = {
    'Pendente': { badge: 'badge-pendente', icon: Clock },
    'Aguardando aprovação': { badge: 'badge-aguardando', icon: Hourglass },
    'Aprovado': { badge: 'badge-aprovado', icon: CheckCircle2 },
    'Desenvolvendo': { badge: 'badge-desenvolvendo', icon: Code2 },
    'Aprovado e entregue': { badge: 'badge-entregue', icon: CheckCircle2 },
}

const PRIORITY_CONFIG = {
    'Medium': { badge: 'badge-medium' },
    'High': { badge: 'badge-high' },
    'Highst': { badge: 'badge-highst' },
}

export default function DashboardPage() {
    const [demandas, setDemandas] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('')
    const [filterPriority, setFilterPriority] = useState('')
    const [filterGlpi, setFilterGlpi] = useState('')
    const [searchText, setSearchText] = useState('')

    useEffect(() => {
        fetchDemandas()
    }, [])

    async function fetchDemandas() {
        setLoading(true)
        const { data, error } = await supabase
            .from('demandas')
            .select('*')
            .order('created_at', { ascending: false })
        if (!error) setDemandas(data || [])
        setLoading(false)
    }

    const stats = useMemo(() => {
        return {
            total: demandas.length,
            pendentes: demandas.filter(d => d.status === 'Pendente').length,
            desenvolvendo: demandas.filter(d => d.status === 'Desenvolvendo').length,
            aguardando: demandas.filter(d => d.status === 'Aguardando aprovação').length,
            entregues: demandas.filter(d => d.status === 'Aprovado e entregue').length,
        }
    }, [demandas])

    const filteredDemandas = useMemo(() => {
        let filtered = demandas

        if (filterStatus) {
            filtered = filtered.filter(d => d.status === filterStatus)
        }
        if (filterPriority) {
            filtered = filtered.filter(d => d.prioridade === filterPriority)
        }
        if (filterGlpi) {
            filtered = filtered.filter(d =>
                d.numero_glpi.toLowerCase().includes(filterGlpi.toLowerCase())
            )
        }
        if (searchText) {
            const search = searchText.toLowerCase()
            filtered = filtered.filter(d =>
                d.titulo.toLowerCase().includes(search) ||
                d.descricao.toLowerCase().includes(search) ||
                d.numero_glpi.toLowerCase().includes(search)
            )
        }

        return filtered
    }, [demandas, filterStatus, filterPriority, filterGlpi, searchText])

    const statCards = [
        { label: 'Total', value: stats.total, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: ClipboardList },
        { label: 'Pendentes', value: stats.pendentes, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Clock },
        { label: 'Desenvolvendo', value: stats.desenvolvendo, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: Code2 },
        { label: 'Aguardando', value: stats.aguardando, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Hourglass },
        { label: 'Entregues', value: stats.entregues, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: CheckCircle2 },
    ]

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('pt-BR')
    }

    return (
        <>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Visão geral das suas demandas</p>
            </div>

            <div className="page-content">
                {/* Stat Cards */}
                <div className="stats-grid">
                    {statCards.map(card => (
                        <div className="stat-card" key={card.label}>
                            <div className="stat-card-header">
                                <span className="stat-card-label">{card.label}</span>
                                <div
                                    className="stat-card-icon"
                                    style={{ background: card.bg, color: card.color }}
                                >
                                    <card.icon size={20} />
                                </div>
                            </div>
                            <div className="stat-card-value">{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Table Card */}
                <div className="data-card">
                    <div className="data-card-header">
                        <h2><TrendingUp size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Demandas</h2>
                        <div className="filters-bar">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <input
                                    type="text"
                                    className="form-input search-input"
                                    placeholder="Buscar..."
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                />
                            </div>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nº GLPI"
                                value={filterGlpi}
                                onChange={e => setFilterGlpi(e.target.value)}
                                style={{ minWidth: '100px' }}
                            />
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">Todos Status</option>
                                {Object.keys(STATUS_CONFIG).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <select
                                className="form-select"
                                value={filterPriority}
                                onChange={e => setFilterPriority(e.target.value)}
                            >
                                <option value="">Todas Prioridades</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Highst">Highst</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="page-loading"><span className="loading-spinner" /></div>
                    ) : filteredDemandas.length === 0 ? (
                        <div className="empty-state">
                            <Search size={48} />
                            <h3>Nenhuma demanda encontrada</h3>
                            <p>Ajuste os filtros ou crie uma nova demanda</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>GLPI</th>
                                        <th>Título</th>
                                        <th>Prioridade</th>
                                        <th>Status</th>
                                        <th>Prazo</th>
                                        <th>Criado em</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDemandas.map(d => (
                                        <tr key={d.id}>
                                            <td className="td-glpi">{d.numero_glpi}</td>
                                            <td className="td-title">{d.titulo}</td>
                                            <td>
                                                <span className={`badge ${PRIORITY_CONFIG[d.prioridade]?.badge || ''}`}>
                                                    {d.prioridade}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${STATUS_CONFIG[d.status]?.badge || ''}`}>
                                                    {d.status}
                                                </span>
                                            </td>
                                            <td>{formatDate(d.prazo)}</td>
                                            <td>{formatDate(d.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
