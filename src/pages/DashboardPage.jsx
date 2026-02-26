import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import DemandaDrawer from '../components/DemandaDrawer'
import DemandaForm from '../components/DemandaForm'
import {
    ClipboardList, Clock, Code2, Hourglass, CheckCircle2,
    Search, TrendingUp, AlertCircle, ShieldCheck, RotateCcw,
    ChevronLeft, ChevronRight, CalendarDays, GitBranch,
    Plus, Trash2, Filter, X, Sparkles, Eye, Flame, ArrowUp, Bell
} from 'lucide-react'

const STATUS_CONFIG = {
    'Pendente': { color: '#94a3b8', badge: 'badge-secondary', icon: Clock },
    'Aprovação': { color: '#8b5cf6', badge: 'badge-info', icon: ShieldCheck },
    'Aguardando aprovação': { color: '#f59e0b', badge: 'badge-warning', icon: Hourglass },
    'Aprovado': { color: '#22c55e', badge: 'badge-success', icon: CheckCircle2 },
    'Desenvolvendo': { color: '#6366f1', badge: 'badge-primary', icon: Code2 },
    'Aprovado e entregue': { color: '#10b981', badge: 'badge-success', icon: CheckCircle2 },
    'Em correção': { color: '#f97316', badge: 'badge-danger', icon: RotateCcw },
}
const PRIORITY_CONFIG = {
    'Medium': { badge: 'badge-warning', color: '#f59e0b' },
    'High': { badge: 'badge-danger', color: '#ef4444' },
    'Highst': { badge: 'badge-danger', color: '#dc2626' },
}
const SITUACAO_CONFIG = {
    'Em andamento': { badge: 'badge-primary', color: '#6366f1' },
    'Atrasado': { badge: 'badge-danger', color: '#ef4444' },
    'Entregue': { badge: 'badge-success', color: '#22c55e' },
    'Aguardando aprovação': { badge: 'badge-warning', color: '#f59e0b' },
}

const STATUSES = Object.keys(STATUS_CONFIG)
const PRIORIDADES = ['Medium', 'High', 'Highst']
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function DashboardPage() {
    const { addToast } = useToast()
    const [demandas, setDemandas] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedDemanda, setSelectedDemanda] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [showOverduePopup, setShowOverduePopup] = useState(false)

    // Filters
    const [searchText, setSearchText] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterPriority, setFilterPriority] = useState('')
    const [filterSituacao, setFilterSituacao] = useState('')
    const [showFilters, setShowFilters] = useState(false)

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

    // Auto-show overdue popup on first load
    useEffect(() => {
        if (!loading && demandas.length > 0) {
            const overdue = demandas.filter(d => !d.demanda_pai_id && computeSituacao(d) === 'Atrasado')
            if (overdue.length > 0) setShowOverduePopup(true)
        }
    }, [loading])

    const computeSituacao = (d) => {
        if (d.situacao) return d.situacao
        if (d.status === 'Aprovado e entregue') return 'Entregue'
        if (d.status === 'Aguardando aprovação' || d.status === 'Aprovação') return 'Aguardando aprovação'
        if (d.prazo && new Date(d.prazo) < new Date() && d.status !== 'Aprovado e entregue') return 'Atrasado'
        return 'Em andamento'
    }

    const stats = useMemo(() => ({
        total: demandas.length,
        pendentes: demandas.filter(d => d.status === 'Pendente').length,
        desenvolvendo: demandas.filter(d => d.status === 'Desenvolvendo').length,
        aguardando: demandas.filter(d => d.status === 'Aguardando aprovação').length,
        entregues: demandas.filter(d => d.status === 'Aprovado e entregue').length,
        atrasados: demandas.filter(d => computeSituacao(d) === 'Atrasado').length,
        correcao: demandas.filter(d => d.status === 'Em correção').length,
    }), [demandas])

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

    const hasActiveFilters = filterStatus || filterPriority || filterSituacao || monthFilterActive || searchText
    const clearAllFilters = () => {
        setFilterStatus(''); setFilterPriority(''); setFilterSituacao('')
        setSearchText(''); setMonthFilterActive(false)
    }

    const filteredDemandas = useMemo(() => {
        let filtered = demandas.filter(d => !d.demanda_pai_id)
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
        if (searchText) {
            const s = searchText.toLowerCase()
            filtered = filtered.filter(d => d.titulo.toLowerCase().includes(s) || d.descricao.toLowerCase().includes(s) || d.numero_glpi.toLowerCase().includes(s))
        }
        return filtered
    }, [demandas, filterStatus, filterPriority, filterSituacao, searchText, filterMonth, filterYear, monthFilterActive])

    const handleCardClick = (statusFilter) => {
        if (filterStatus === statusFilter) setFilterStatus('')
        else setFilterStatus(statusFilter)
    }

    const handleDelete = async (id) => {
        const { error } = await supabase.from('demandas').delete().eq('id', id)
        if (error) addToast('Erro ao excluir demanda', 'error')
        else { addToast('Demanda excluída!', 'success'); fetchDemandas() }
        setDeletingId(null)
    }

    const handleInlineUpdate = async (id, field, value) => {
        const { error } = await supabase.from('demandas').update({ [field]: value }).eq('id', id)
        if (error) addToast('Erro ao atualizar', 'error')
        else { addToast('Atualizado!', 'success'); fetchDemandas() }
    }

    const prevMonth = () => { if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1) } else setFilterMonth(m => m - 1) }
    const nextMonth = () => { if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1) } else setFilterMonth(m => m + 1) }

    const formatDate = (dateStr) => { if (!dateStr) return '—'; return new Date(dateStr).toLocaleDateString('pt-BR') }

    const getDaysRemaining = (prazo) => {
        if (!prazo) return null
        const diff = Math.ceil((new Date(prazo) - new Date()) / (1000 * 60 * 60 * 24))
        return diff
    }

    const statCards = [
        { label: 'Total', value: stats.total, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: ClipboardList, statusFilter: '' },
        { label: 'Pendentes', value: stats.pendentes, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Clock, statusFilter: 'Pendente' },
        { label: 'Desenvolvendo', value: stats.desenvolvendo, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: Code2, statusFilter: 'Desenvolvendo' },
        { label: 'Aguardando', value: stats.aguardando, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Hourglass, statusFilter: 'Aguardando aprovação' },
        { label: 'Entregues', value: stats.entregues, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: CheckCircle2, statusFilter: 'Aprovado e entregue' },
        { label: 'Atrasados', value: stats.atrasados, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertCircle, statusFilter: '' },
        { label: 'Correção', value: stats.correcao, color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: RotateCcw, statusFilter: 'Em correção' },
    ]

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
                            <span>Existem demandas que ultrapassaram o prazo.</span>
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

                {/* Demandas Section */}
                <div className="data-card">
                    <div className="data-card-header">
                        <h2>
                            <TrendingUp size={18} />
                            Demandas
                            <span className="result-count">({filteredDemandas.length} de {demandas.filter(d => !d.demanda_pai_id).length})</span>
                        </h2>
                        <div className="filters-bar">
                            <div className="search-wrapper">
                                <Search size={16} className="search-icon" />
                                <input type="text" className="form-input search-input-fancy" placeholder="Buscar demandas..." value={searchText} onChange={e => setSearchText(e.target.value)} />
                            </div>
                            <button className={`btn-filter-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`} onClick={() => setShowFilters(!showFilters)}>
                                <Filter size={15} />
                                Filtros
                                {hasActiveFilters && <span className="filter-dot" />}
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                                <Plus size={16} /> Nova Demanda
                            </button>
                        </div>
                    </div>

                    {/* Enhanced Filters Panel */}
                    {showFilters && (
                        <div className="filters-panel">
                            <div className="filters-panel-grid">
                                <div className="filter-chip-group">
                                    <span className="filter-chip-label">Status</span>
                                    <div className="filter-chips">
                                        {STATUSES.map(s => (
                                            <button key={s} className={`filter-chip ${filterStatus === s ? 'active' : ''}`}
                                                style={filterStatus === s ? { background: STATUS_CONFIG[s].color, color: '#fff', borderColor: STATUS_CONFIG[s].color } : {}}
                                                onClick={() => setFilterStatus(filterStatus === s ? '' : s)}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="filter-chip-group">
                                    <span className="filter-chip-label">Prioridade</span>
                                    <div className="filter-chips">
                                        {PRIORIDADES.map(p => (
                                            <button key={p} className={`filter-chip ${filterPriority === p ? 'active' : ''}`}
                                                style={filterPriority === p ? { background: PRIORITY_CONFIG[p].color, color: '#fff', borderColor: PRIORITY_CONFIG[p].color } : {}}
                                                onClick={() => setFilterPriority(filterPriority === p ? '' : p)}>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="filter-chip-group">
                                    <span className="filter-chip-label">Situação</span>
                                    <div className="filter-chips">
                                        {Object.keys(SITUACAO_CONFIG).map(s => (
                                            <button key={s} className={`filter-chip ${filterSituacao === s ? 'active' : ''}`}
                                                style={filterSituacao === s ? { background: SITUACAO_CONFIG[s].color, color: '#fff', borderColor: SITUACAO_CONFIG[s].color } : {}}
                                                onClick={() => setFilterSituacao(filterSituacao === s ? '' : s)}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="filter-chip-group">
                                    <span className="filter-chip-label">Mês</span>
                                    <div className="month-filter-fancy">
                                        <button className="month-nav" onClick={prevMonth}><ChevronLeft size={14} /></button>
                                        <span className="month-label">{MONTH_NAMES[filterMonth].substring(0, 3)} {filterYear}</span>
                                        <button className="month-nav" onClick={nextMonth}><ChevronRight size={14} /></button>
                                        <button className={`month-toggle ${monthFilterActive ? 'active' : ''}`} onClick={() => setMonthFilterActive(!monthFilterActive)}>
                                            <CalendarDays size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {hasActiveFilters && (
                                <button className="btn-clear-all" onClick={clearAllFilters}>
                                    <X size={14} /> Limpar todos os filtros
                                </button>
                            )}
                        </div>
                    )}

                    {/* Demand Cards Grid */}
                    {loading ? (
                        <div className="page-loading"><span className="loading-spinner" /></div>
                    ) : filteredDemandas.length === 0 ? (
                        <div className="empty-state">
                            <Search size={48} />
                            <h3>Nenhuma demanda encontrada</h3>
                            <p>Ajuste os filtros ou crie uma nova demanda</p>
                            <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 12 }}>
                                <Plus size={16} /> Criar Demanda
                            </button>
                        </div>
                    ) : (
                        <div className="demand-cards-grid">
                            {filteredDemandas.map(d => {
                                const situacao = computeSituacao(d)
                                const children = childrenMap[d.id] || []
                                const daysRemaining = getDaysRemaining(d.prazo)
                                const statusConf = STATUS_CONFIG[d.status] || {}
                                const StatusIcon = statusConf.icon || Clock

                                return (
                                    <div
                                        className={`demand-card priority-${d.prioridade.toLowerCase()}`}
                                        key={d.id}
                                        onClick={() => setSelectedDemanda(d)}
                                        style={{ borderLeftColor: PRIORITY_CONFIG[d.prioridade]?.color }}
                                    >
                                        <div className="demand-card-top">
                                            <span className="demand-card-glpi">{d.numero_glpi}</span>
                                            <div className="demand-card-actions" onClick={e => e.stopPropagation()}>
                                                <button className="demand-card-action" onClick={() => setSelectedDemanda(d)} title="Ver detalhes"><Eye size={14} /></button>
                                                <button className="demand-card-action danger" onClick={() => setDeletingId(d.id)} title="Excluir"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <h3 className="demand-card-title">{d.titulo}</h3>
                                        <p className="demand-card-desc">{d.descricao}</p>
                                        <div className="demand-card-meta">
                                            <div className="demand-card-badges">
                                                <span className={`badge-sm ${statusConf.badge || ''}`}><StatusIcon size={11} /> {d.status}</span>
                                                <span className={`badge-sm priority-badge-${d.prioridade.toLowerCase()}`}>
                                                    {d.prioridade === 'Highst' ? <Flame size={11} /> : d.prioridade === 'High' ? <ArrowUp size={11} /> : null}
                                                    {d.prioridade}
                                                </span>
                                            </div>
                                            {children.length > 0 && (
                                                <span className="demand-card-variations"><GitBranch size={12} /> {children.length}</span>
                                            )}
                                        </div>
                                        <div className="demand-card-footer">
                                            <span className={`situacao-dot ${situacao === 'Atrasado' ? 'danger' : situacao === 'Entregue' ? 'success' : situacao === 'Aguardando aprovação' ? 'warning' : 'primary'}`}>
                                                {situacao}
                                            </span>
                                            {d.prazo && (
                                                <span className={`days-badge ${daysRemaining !== null && daysRemaining < 0 ? 'overdue' : daysRemaining !== null && daysRemaining <= 3 ? 'urgent' : ''}`}>
                                                    {daysRemaining !== null && daysRemaining < 0 ? `${Math.abs(daysRemaining)}d atrasado` : daysRemaining !== null ? `${daysRemaining}d restantes` : ''}
                                                </span>
                                            )}
                                            {!d.prazo && <span className="days-badge">Sem prazo</span>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            {deletingId && (
                <div className="modal-overlay" onClick={() => setDeletingId(null)}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Confirmar exclusão</h2></div>
                        <div className="modal-body"><p>Tem certeza que deseja excluir esta demanda?</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeletingId(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(deletingId)}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drawer */}
            {selectedDemanda && (
                <DemandaDrawer
                    demanda={selectedDemanda}
                    onClose={() => setSelectedDemanda(null)}
                    onUpdated={() => { fetchDemandas(); setSelectedDemanda(null) }}
                />
            )}

            {/* Create Form */}
            {showForm && (
                <DemandaForm
                    onClose={() => setShowForm(false)}
                    onSaved={fetchDemandas}
                />
            )}

            {/* Overdue Popup */}
            {showOverduePopup && (() => {
                const overdue = demandas.filter(d => !d.demanda_pai_id && computeSituacao(d) === 'Atrasado')
                return (
                    <div className="modal-overlay" onClick={() => setShowOverduePopup(false)}>
                        <div className="modal overdue-popup" onClick={e => e.stopPropagation()}>
                            <div className="overdue-popup-header">
                                <div className="overdue-popup-icon-wrap">
                                    <Bell size={24} />
                                </div>
                                <h2>Demandas Atrasadas</h2>
                                <p>{overdue.length} demanda(s) passaram do prazo</p>
                                <button className="btn btn-ghost overdue-popup-close" onClick={() => setShowOverduePopup(false)}><X size={20} /></button>
                            </div>
                            <div className="overdue-popup-list">
                                {overdue.map(d => {
                                    const days = Math.abs(getDaysRemaining(d.prazo))
                                    return (
                                        <div className="overdue-popup-item" key={d.id} onClick={() => { setShowOverduePopup(false); setSelectedDemanda(d) }}>
                                            <div className="overdue-popup-item-info">
                                                <span className="overdue-popup-glpi">{d.numero_glpi}</span>
                                                <span className="overdue-popup-title">{d.titulo}</span>
                                            </div>
                                            <span className="overdue-popup-days">{days}d atrasado</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-primary" onClick={() => setShowOverduePopup(false)} style={{ width: '100%' }}>Entendido</button>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </>
    )
}
