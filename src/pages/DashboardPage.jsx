import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import DemandaDrawer from '../components/DemandaDrawer'
import {
    ClipboardList, Clock, Code2, Hourglass, CheckCircle2,
    Search, TrendingUp, AlertCircle, ShieldCheck, RotateCcw,
    ChevronLeft, ChevronRight, CalendarDays, GitBranch
} from 'lucide-react'

const STATUS_CONFIG = {
    'Pendente': { badge: 'badge-pendente', icon: Clock, color: '#94a3b8' },
    'Aprovação': { badge: 'badge-aprovacao', icon: ShieldCheck, color: '#a855f7' },
    'Aguardando aprovação': { badge: 'badge-aguardando', icon: Hourglass, color: '#f59e0b' },
    'Aprovado': { badge: 'badge-aprovado', icon: CheckCircle2, color: '#10b981' },
    'Desenvolvendo': { badge: 'badge-desenvolvendo', icon: Code2, color: '#6366f1' },
    'Aprovado e entregue': { badge: 'badge-entregue', icon: CheckCircle2, color: '#22c55e' },
    'Em correção': { badge: 'badge-correcao', icon: RotateCcw, color: '#f97316' },
}

const SITUACAO_CONFIG = {
    'Em andamento': { badge: 'badge-sit-em-andamento' },
    'Entregue': { badge: 'badge-sit-entregue' },
    'Atrasado': { badge: 'badge-sit-atrasado' },
    'Aguardando aprovação': { badge: 'badge-sit-aguardando' },
}

const PRIORITY_CONFIG = {
    'Medium': { badge: 'badge-medium' },
    'High': { badge: 'badge-high' },
    'Highst': { badge: 'badge-highst' },
}

const STATUSES = ['Pendente', 'Aprovação', 'Aguardando aprovação', 'Aprovado', 'Desenvolvendo', 'Aprovado e entregue', 'Em correção']
const PRIORIDADES = ['Medium', 'High', 'Highst']

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function DashboardPage() {
    const { addToast } = useToast()
    const [demandas, setDemandas] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('')
    const [filterPriority, setFilterPriority] = useState('')
    const [filterSituacao, setFilterSituacao] = useState('')
    const [filterGlpi, setFilterGlpi] = useState('')
    const [searchText, setSearchText] = useState('')
    const [selectedDemanda, setSelectedDemanda] = useState(null)
    const [expandedParents, setExpandedParents] = useState(new Set())

    // Month filter
    const now = new Date()
    const [filterMonth, setFilterMonth] = useState(now.getMonth())
    const [filterYear, setFilterYear] = useState(now.getFullYear())
    const [monthFilterActive, setMonthFilterActive] = useState(false)

    useEffect(() => { fetchDemandas() }, [])

    async function fetchDemandas() {
        setLoading(true)
        const { data, error } = await supabase.from('demandas').select('*').order('created_at', { ascending: false })
        if (!error) setDemandas(data || [])
        setLoading(false)
    }

    const computeSituacao = (d) => {
        if (d.situacao) return d.situacao
        if (d.status === 'Aprovado e entregue') return 'Entregue'
        if (d.status === 'Aguardando aprovação' || d.status === 'Aprovação') return 'Aguardando aprovação'
        if (d.prazo && new Date(d.prazo) < new Date() && d.status !== 'Aprovado e entregue') return 'Atrasado'
        return 'Em andamento'
    }

    const handleInlineUpdate = async (id, field, value) => {
        const { error } = await supabase.from('demandas').update({ [field]: value }).eq('id', id)
        if (error) { addToast('Erro ao atualizar', 'error') }
        else { addToast('Atualizado!', 'success'); fetchDemandas() }
    }

    const stats = useMemo(() => ({
        total: demandas.length,
        pendentes: demandas.filter(d => d.status === 'Pendente').length,
        desenvolvendo: demandas.filter(d => d.status === 'Desenvolvendo').length,
        aguardando: demandas.filter(d => d.status === 'Aguardando aprovação' || d.status === 'Aprovação').length,
        entregues: demandas.filter(d => d.status === 'Aprovado e entregue').length,
        atrasados: demandas.filter(d => computeSituacao(d) === 'Atrasado').length,
        correcao: demandas.filter(d => d.status === 'Em correção').length,
    }), [demandas])

    const statusDistribution = useMemo(() => {
        if (demandas.length === 0) return []
        return Object.entries(STATUS_CONFIG).map(([status, conf]) => {
            const count = demandas.filter(d => d.status === status).length
            return { status, color: conf.color, count, pct: (count / demandas.length) * 100 }
        }).filter(s => s.count > 0)
    }, [demandas])

    // Build children map
    const childrenMap = useMemo(() => {
        const map = {}
        demandas.forEach(d => {
            if (d.demanda_pai_id) {
                if (!map[d.demanda_pai_id]) map[d.demanda_pai_id] = []
                map[d.demanda_pai_id].push(d)
            }
        })
        return map
    }, [demandas])

    const filteredDemandas = useMemo(() => {
        let filtered = demandas.filter(d => !d.demanda_pai_id) // only parents
        if (monthFilterActive) {
            filtered = filtered.filter(d => {
                if (!d.created_at) return false
                const date = new Date(d.created_at)
                return date.getMonth() === filterMonth && date.getFullYear() === filterYear
            })
        }
        if (filterStatus) filtered = filtered.filter(d => d.status === filterStatus)
        if (filterPriority) filtered = filtered.filter(d => d.prioridade === filterPriority)
        if (filterSituacao) filtered = filtered.filter(d => computeSituacao(d) === filterSituacao)
        if (filterGlpi) filtered = filtered.filter(d => d.numero_glpi.toLowerCase().includes(filterGlpi.toLowerCase()))
        if (searchText) {
            const s = searchText.toLowerCase()
            filtered = filtered.filter(d => d.titulo.toLowerCase().includes(s) || d.descricao.toLowerCase().includes(s) || d.numero_glpi.toLowerCase().includes(s))
        }
        return filtered
    }, [demandas, filterStatus, filterPriority, filterSituacao, filterGlpi, searchText, filterMonth, filterYear, monthFilterActive])

    const toggleExpand = (id) => {
        setExpandedParents(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
    }

    const handleCardClick = (statusFilter) => {
        if (filterStatus === statusFilter) { setFilterStatus('') }
        else { setFilterStatus(statusFilter) }
    }

    const prevMonth = () => {
        if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1) }
        else setFilterMonth(m => m - 1)
    }
    const nextMonth = () => {
        if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1) }
        else setFilterMonth(m => m + 1)
    }

    const statCards = [
        { label: 'Total', value: stats.total, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: ClipboardList, statusFilter: '' },
        { label: 'Pendentes', value: stats.pendentes, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Clock, statusFilter: 'Pendente' },
        { label: 'Desenvolvendo', value: stats.desenvolvendo, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: Code2, statusFilter: 'Desenvolvendo' },
        { label: 'Aguardando', value: stats.aguardando, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Hourglass, statusFilter: 'Aguardando aprovação' },
        { label: 'Entregues', value: stats.entregues, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: CheckCircle2, statusFilter: 'Aprovado e entregue' },
        { label: 'Atrasados', value: stats.atrasados, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertCircle, statusFilter: '' },
        { label: 'Em Correção', value: stats.correcao, color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: RotateCcw, statusFilter: 'Em correção' },
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
                {/* Overdue Alert */}
                {stats.atrasados > 0 && (
                    <div className="overdue-alert">
                        <div className="overdue-alert-icon"><AlertCircle size={22} /></div>
                        <div className="overdue-alert-text">
                            <strong>{stats.atrasados} demanda(s) atrasada(s)</strong>
                            <span>Existem demandas que ultrapassaram o prazo. Verifique abaixo.</span>
                        </div>
                    </div>
                )}

                {/* Stat Cards */}
                <div className="stats-grid">
                    {statCards.map(card => (
                        <div
                            className={`stat-card ${filterStatus === card.statusFilter && card.statusFilter ? 'active-filter' : ''}`}
                            key={card.label}
                            onClick={() => card.statusFilter !== undefined && handleCardClick(card.statusFilter)}
                        >
                            <div className="stat-card-header">
                                <span className="stat-card-label">{card.label}</span>
                                <div className="stat-card-icon" style={{ background: card.bg, color: card.color }}>
                                    <card.icon size={20} />
                                </div>
                            </div>
                            <div className="stat-card-value">{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Status Distribution */}
                {statusDistribution.length > 0 && (
                    <div className="status-distribution">
                        <div className="status-distribution-title">Distribuição por Status</div>
                        <div className="status-bar">
                            {statusDistribution.map(s => (
                                <div key={s.status} className="status-bar-segment" style={{ width: `${s.pct}%`, background: s.color }} title={`${s.status}: ${s.count}`} />
                            ))}
                        </div>
                        <div className="status-distribution-legend">
                            {statusDistribution.map(s => (
                                <div key={s.status} className="legend-item">
                                    <div className="legend-dot" style={{ background: s.color }} />
                                    {s.status} ({s.count})
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Table Card */}
                <div className="data-card">
                    <div className="data-card-header">
                        <h2>
                            <TrendingUp size={18} />
                            Demandas
                            <span className="result-count">({filteredDemandas.length} de {demandas.length})</span>
                        </h2>
                        <div className="filters-bar">
                            <div className="month-filter">
                                <button onClick={prevMonth} title="Mês anterior"><ChevronLeft size={16} /></button>
                                <span>{MONTH_NAMES[filterMonth]} {filterYear}</span>
                                <button onClick={nextMonth} title="Próximo mês"><ChevronRight size={16} /></button>
                                <button
                                    onClick={() => setMonthFilterActive(!monthFilterActive)}
                                    title={monthFilterActive ? 'Desativar filtro de mês' : 'Ativar filtro de mês'}
                                    style={{ color: monthFilterActive ? 'var(--accent)' : undefined, background: monthFilterActive ? 'var(--accent-light)' : undefined }}
                                >
                                    <CalendarDays size={16} />
                                </button>
                            </div>
                            <input type="text" className="form-input search-input" placeholder="Buscar..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ marginBottom: 0 }} />
                            <input type="text" className="form-input" placeholder="Nº GLPI" value={filterGlpi} onChange={e => setFilterGlpi(e.target.value)} style={{ minWidth: '100px' }} />
                            <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                                <option value="">Todas Prioridades</option>
                                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select className="form-select" value={filterSituacao} onChange={e => setFilterSituacao(e.target.value)}>
                                <option value="">Todas Situações</option>
                                {Object.keys(SITUACAO_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
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
                                        <th>Situação</th>
                                        <th>Prazo</th>
                                        <th>Criado em</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDemandas.map(d => {
                                        const situacao = computeSituacao(d)
                                        const children = childrenMap[d.id] || []
                                        const isExpanded = expandedParents.has(d.id)
                                        const renderRow = (item, isChild = false) => {
                                            const sit = computeSituacao(item)
                                            return (
                                                <tr key={item.id} className={`clickable-row ${isChild ? 'variation-subrow' : ''}`} onClick={() => setSelectedDemanda(item)}>
                                                    <td className="td-glpi">{item.numero_glpi}</td>
                                                    <td className="td-title">
                                                        {!isChild && children.length > 0 && (
                                                            <button className={`variation-toggle ${isExpanded ? 'expanded' : ''}`} onClick={e => { e.stopPropagation(); toggleExpand(d.id) }}>
                                                                <ChevronRight size={14} />
                                                            </button>
                                                        )}
                                                        {isChild && <GitBranch size={12} style={{ marginRight: 4, opacity: 0.5 }} />}
                                                        {item.titulo}
                                                        {!isChild && children.length > 0 && (
                                                            <span className="variation-count" onClick={e => { e.stopPropagation(); toggleExpand(d.id) }}>
                                                                <GitBranch size={10} /> {children.length}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td onClick={e => e.stopPropagation()}>
                                                        <select className={`inline-select ${PRIORITY_CONFIG[item.prioridade]?.badge || ''}`} value={item.prioridade} onChange={e => handleInlineUpdate(item.id, 'prioridade', e.target.value)} style={{ background: `var(--priority-${item.prioridade === 'Medium' ? 'medium' : item.prioridade === 'High' ? 'high' : 'highst'}-bg)` }}>
                                                            {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                    </td>
                                                    <td onClick={e => e.stopPropagation()}>
                                                        <select className={`inline-select ${STATUS_CONFIG[item.status]?.badge || ''}`} value={item.status} onChange={e => handleInlineUpdate(item.id, 'status', e.target.value)} style={{ background: `var(--status-${item.status === 'Pendente' ? 'pendente' : item.status === 'Aprovação' ? 'aprovacao' : item.status === 'Aguardando aprovação' ? 'aguardando' : item.status === 'Aprovado' ? 'aprovado' : item.status === 'Desenvolvendo' ? 'desenvolvendo' : item.status === 'Aprovado e entregue' ? 'entregue' : 'correcao'}-bg)` }}>
                                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </td>
                                                    <td><span className={`badge ${SITUACAO_CONFIG[sit]?.badge || ''}`}>{sit}</span></td>
                                                    <td>{formatDate(item.prazo)}</td>
                                                    <td>{formatDate(item.created_at)}</td>
                                                </tr>
                                            )
                                        }
                                        return [
                                            renderRow(d),
                                            ...(isExpanded ? children.map(c => renderRow(c, true)) : [])
                                        ]
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Drawer */}
            {selectedDemanda && (
                <DemandaDrawer
                    demanda={selectedDemanda}
                    onClose={() => setSelectedDemanda(null)}
                    onUpdated={() => { fetchDemandas(); setSelectedDemanda(null) }}
                />
            )}
        </>
    )
}
