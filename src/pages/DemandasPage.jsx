import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import DemandaForm from '../components/DemandaForm'
import {
    Plus,
    Edit3,
    Trash2,
    Search,
    ClipboardList,
    AlertTriangle
} from 'lucide-react'

const STATUS_BADGE = {
    'Pendente': 'badge-pendente',
    'Aguardando aprovação': 'badge-aguardando',
    'Aprovado': 'badge-aprovado',
    'Desenvolvendo': 'badge-desenvolvendo',
    'Aprovado e entregue': 'badge-entregue',
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
    const [deletingId, setDeletingId] = useState(null)
    const [search, setSearch] = useState('')

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

    const filtered = demandas.filter(d => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            d.titulo.toLowerCase().includes(s) ||
            d.descricao.toLowerCase().includes(s) ||
            d.numero_glpi.toLowerCase().includes(s)
        )
    })

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

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('pt-BR')
    }

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
                            <button className="btn btn-primary" onClick={() => { setEditingDemanda(null); setShowForm(true) }}>
                                <Plus size={16} />
                                Nova Demanda
                            </button>
                        </div>
                    </div>

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
                                        <th>GLPI</th>
                                        <th>Título</th>
                                        <th>Prioridade</th>
                                        <th>Status</th>
                                        <th>Prazo</th>
                                        <th>Criado em</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(d => (
                                        <tr key={d.id}>
                                            <td className="td-glpi">{d.numero_glpi}</td>
                                            <td className="td-title">{d.titulo}</td>
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
                                            <td>{formatDate(d.prazo)}</td>
                                            <td>{formatDate(d.created_at)}</td>
                                            <td>
                                                <div className="td-actions">
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => { setEditingDemanda(d); setShowForm(true) }}
                                                        title="Editar"
                                                    >
                                                        <Edit3 size={15} />
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <DemandaForm
                    demanda={editingDemanda}
                    onClose={() => { setShowForm(false); setEditingDemanda(null) }}
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
