import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import DemandaForm from '../components/DemandaForm'
import {
    Plus,
    Edit3,
    Trash2,
    Search,
    ClipboardList,
    AlertTriangle,
    GitBranch,
    Check,
    Filter,
    X,
    RefreshCw
} from 'lucide-react'

const STATUSES = [
    'Pendente',
    'Aprovação',
    'Aguardando aprovação',
    'Aprovado',
    'Desenvolvendo',
    'Aprovado e entregue',
    'Em correção'
]

const SITUACOES = [
    'Em andamento',
    'Entregue',
    'Atrasado',
    'Aguardando aprovação'
]

const STATUS_BADGE = {
    'Pendente': 'badge-pendente',
    'Aprovação': 'badge-aprovacao',
    'Aguardando aprovação': 'badge-aguardando',
    'Aprovado': 'badge-aprovado',
    'Desenvolvendo': 'badge-desenvolvendo',
    'Aprovado e entregue': 'badge-entregue',
    'Em correção': 'badge-correcao',
}

const SITUACAO_BADGE = {
    'Em andamento': 'badge-sit-em-andamento',
    'Entregue': 'badge-sit-entregue',
    'Atrasado': 'badge-sit-atrasado',
    'Aguardando aprovação': 'badge-sit-aguardando',
}

const PRIORITY_BADGE = {
    'Medium': 'badge-medium',
    'High': 'badge-high',
    'Highst': 'badge-highst',
}

export default function DemandasPage() {
    const { addToast } = useToast()
    const [demandas, setDemandas] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingDemanda, setEditingDemanda] = useState(null)
    const [isVariation, setIsVariation] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    // Filters
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterPriority, setFilterPriority] = useState('')
    const [filterSituacao, setFilterSituacao] = useState('')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [bulkStatus, setBulkStatus] = useState('')

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

    // Compute situacao frontend-side as fallback
    const computeSituacao = (d) => {
        if (d.situacao) return d.situacao
        if (d.status === 'Aprovado e entregue') return 'Entregue'
        if (d.status === 'Aguardando aprovação' || d.status === 'Aprovação') return 'Aguardando aprovação'
        if (d.prazo && new Date(d.prazo) < new Date() && d.status !== 'Aprovado e entregue') return 'Atrasado'
        return 'Em andamento'
    }

    const hasActiveFilters = filterStatus || filterPriority || filterSituacao || filterDateFrom || filterDateTo

    const clearAllFilters = () => {
        setFilterStatus('')
        setFilterPriority('')
        setFilterSituacao('')
        setFilterDateFrom('')
        setFilterDateTo('')
        setSearch('')
    }

    const filtered = useMemo(() => {
        let result = demandas

        if (search) {
            const s = search.toLowerCase()
            result = result.filter(d =>
                d.titulo.toLowerCase().includes(s) ||
                d.descricao.toLowerCase().includes(s) ||
                d.numero_glpi.toLowerCase().includes(s)
            )
        }

        if (filterStatus) {
            result = result.filter(d => d.status === filterStatus)
        }

        if (filterPriority) {
            result = result.filter(d => d.prioridade === filterPriority)
        }

        if (filterSituacao) {
            result = result.filter(d => computeSituacao(d) === filterSituacao)
        }

        if (filterDateFrom) {
            result = result.filter(d => d.created_at && d.created_at >= filterDateFrom)
        }

        if (filterDateTo) {
            const toDate = filterDateTo + 'T23:59:59'
            result = result.filter(d => d.created_at && d.created_at <= toDate)
        }

        return result
    }, [demandas, search, filterStatus, filterPriority, filterSituacao, filterDateFrom, filterDateTo])

    const handleDelete = async (id) => {
        const { error } = await supabase.from('demandas').delete().eq('id', id)
        if (error) {
            addToast('Erro ao excluir demanda', 'error')
        } else {
            addToast('Demanda excluída', 'success')
            fetchDemandas()
        }
        setDeletingId(null)
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filtered.map(d => d.id)))
        }
    }

    const handleBulkUpdate = async () => {
        if (!bulkStatus || selectedIds.size === 0) return

        const ids = Array.from(selectedIds)
        const { error } = await supabase
            .from('demandas')
            .update({ status: bulkStatus })
            .in('id', ids)

        if (error) {
            addToast('Erro ao atualizar demandas', 'error')
            console.error(error)
        } else {
            addToast(`${ids.length} demanda(s) atualizada(s)!`, 'success')
            setSelectedIds(new Set())
            setBulkStatus('')
            fetchDemandas()
        }
    }

    const handleCreateVariation = (demanda) => {
        setEditingDemanda(demanda)
        setIsVariation(true)
        setShowForm(true)
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('pt-BR')
    }

    // Count variations for each parent
    const variationCounts = useMemo(() => {
        const counts = {}
        demandas.forEach(d => {
            if (d.demanda_pai_id) {
                counts[d.demanda_pai_id] = (counts[d.demanda_pai_id] || 0) + 1
            }
        })
        return counts
    }, [demandas])

    return (
        <>
            <div className="page-header">
                <h1>Demandas</h1>
                <p>Gerencie todas as suas demandas</p>
            </div>

            <div className="page-content">
                <div className="data-card">
                    <div className="data-card-header">
                        <h2>
                            <ClipboardList size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Todas as Demandas
                        </h2>
                        <div className="filters-bar">
                            <input
                                type="text"
                                className="form-input search-input"
                                placeholder="Buscar demandas..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <button
                                className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setShowFilters(!showFilters)}
                                title="Filtros avançados"
                            >
                                <Filter size={16} />
                                Filtros
                                {hasActiveFilters && (
                                    <span style={{
                                        width: 8, height: 8,
                                        borderRadius: '50%',
                                        background: 'var(--error)',
                                        display: 'inline-block',
                                        marginLeft: 4
                                    }} />
                                )}
                            </button>
                            <button className="btn btn-primary" onClick={() => { setEditingDemanda(null); setIsVariation(false); setShowForm(true) }}>
                                <Plus size={16} />
                                Nova Demanda
                            </button>
                        </div>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="filters-expanded">
                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    className="form-select"
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Prioridade</label>
                                <select
                                    className="form-select"
                                    value={filterPriority}
                                    onChange={e => setFilterPriority(e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Highst">Highst</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Situação</label>
                                <select
                                    className="form-select"
                                    value={filterSituacao}
                                    onChange={e => setFilterSituacao(e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    {SITUACOES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>De</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={filterDateFrom}
                                    onChange={e => setFilterDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="filter-group">
                                <label>Até</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={filterDateTo}
                                    onChange={e => setFilterDateTo(e.target.value)}
                                />
                            </div>
                            {hasActiveFilters && (
                                <button className="btn-clear-filters" onClick={clearAllFilters}>
                                    <X size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    Limpar filtros
                                </button>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="page-loading"><span className="loading-spinner" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <Search size={48} />
                            <h3>Nenhuma demanda encontrada</h3>
                            <p>Clique em "Nova Demanda" para criar</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="td-checkbox">
                                            <button
                                                className={`row-checkbox ${selectedIds.size === filtered.length && filtered.length > 0 ? 'checked' : ''}`}
                                                onClick={toggleSelectAll}
                                                title="Selecionar todos"
                                            >
                                                {selectedIds.size === filtered.length && filtered.length > 0 && <Check size={12} />}
                                            </button>
                                        </th>
                                        <th>GLPI</th>
                                        <th>Título</th>
                                        <th>Prioridade</th>
                                        <th>Status</th>
                                        <th>Situação</th>
                                        <th>Prazo</th>
                                        <th>Criado em</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(d => {
                                        const situacao = computeSituacao(d)
                                        const isSelected = selectedIds.has(d.id)
                                        return (
                                            <tr key={d.id} className={isSelected ? 'row-selected' : ''}>
                                                <td className="td-checkbox">
                                                    <button
                                                        className={`row-checkbox ${isSelected ? 'checked' : ''}`}
                                                        onClick={() => toggleSelect(d.id)}
                                                    >
                                                        {isSelected && <Check size={12} />}
                                                    </button>
                                                </td>
                                                <td className="td-glpi">{d.numero_glpi}</td>
                                                <td className="td-title">
                                                    {d.titulo}
                                                    {d.demanda_pai_id && (
                                                        <span className="variation-indicator" title="Variação de outra demanda">
                                                            <GitBranch size={10} />
                                                            variação
                                                        </span>
                                                    )}
                                                    {variationCounts[d.id] && (
                                                        <span className="variation-indicator" title={`${variationCounts[d.id]} variação(ões)`}>
                                                            <GitBranch size={10} />
                                                            {variationCounts[d.id]}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${PRIORITY_BADGE[d.prioridade] || ''}`}>
                                                        {d.prioridade}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${STATUS_BADGE[d.status] || ''}`}>
                                                        {d.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${SITUACAO_BADGE[situacao] || ''}`}>
                                                        {situacao}
                                                    </span>
                                                </td>
                                                <td>{formatDate(d.prazo)}</td>
                                                <td>{formatDate(d.created_at)}</td>
                                                <td>
                                                    <div className="td-actions">
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => { setEditingDemanda(d); setIsVariation(false); setShowForm(true) }}
                                                            title="Editar"
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleCreateVariation(d)}
                                                            title="Criar Variação"
                                                            style={{ color: 'var(--accent)' }}
                                                        >
                                                            <GitBranch size={15} />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => setDeletingId(d.id)}
                                                            title="Excluir"
                                                            style={{ color: 'var(--error)' }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="bulk-actions-bar">
                    <span className="bulk-count">
                        {selectedIds.size} selecionada(s)
                    </span>
                    <span className="bulk-divider" />
                    <select
                        className="form-select"
                        value={bulkStatus}
                        onChange={e => setBulkStatus(e.target.value)}
                    >
                        <option value="">Alterar status para...</option>
                        {STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <button
                        className="btn btn-bulk-apply"
                        onClick={handleBulkUpdate}
                        disabled={!bulkStatus}
                    >
                        <RefreshCw size={14} />
                        Aplicar
                    </button>
                    <button
                        className="btn btn-bulk-cancel"
                        onClick={() => { setSelectedIds(new Set()); setBulkStatus('') }}
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <DemandaForm
                    demanda={editingDemanda}
                    isVariation={isVariation}
                    onClose={() => { setShowForm(false); setEditingDemanda(null); setIsVariation(false) }}
                    onSaved={fetchDemandas}
                />
            )}

            {/* Delete Confirmation */}
            {deletingId && (
                <div className="modal-overlay confirm-modal" onClick={() => setDeletingId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={20} color="var(--error)" />
                                Confirmar Exclusão
                            </h2>
                        </div>
                        <div className="modal-body">
                            <p>Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeletingId(null)}>
                                Cancelar
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDelete(deletingId)}>
                                <Trash2 size={15} />
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
