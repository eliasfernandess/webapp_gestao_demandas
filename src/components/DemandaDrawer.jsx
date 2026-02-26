import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import {
    X, Calendar, Clock, AlertCircle, Edit3, Trash2,
    CheckCircle2, ShieldCheck, Code2, Hourglass, RotateCcw, Save
} from 'lucide-react'

const STATUSES = [
    'Pendente', 'Aprovação', 'Aguardando aprovação', 'Aprovado',
    'Desenvolvendo', 'Aprovado e entregue', 'Em correção'
]
const PRIORIDADES = ['Medium', 'High', 'Highst']

const STATUS_BADGE = {
    'Pendente': 'badge-pendente', 'Aprovação': 'badge-aprovacao',
    'Aguardando aprovação': 'badge-aguardando', 'Aprovado': 'badge-aprovado',
    'Desenvolvendo': 'badge-desenvolvendo', 'Aprovado e entregue': 'badge-entregue',
    'Em correção': 'badge-correcao',
}
const PRIORITY_BADGE = {
    'Medium': 'badge-medium', 'High': 'badge-high', 'Highst': 'badge-highst',
}

export default function DemandaDrawer({ demanda, onClose, onUpdated }) {
    const { addToast } = useToast()
    const [notes, setNotes] = useState(demanda?.anotacoes || '')
    const [saving, setSaving] = useState(false)

    if (!demanda) return null

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        })
    }

    const getDaysRemaining = () => {
        if (!demanda.prazo) return null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const deadline = new Date(demanda.prazo + 'T00:00:00')
        const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
        if (diff < 0) return { text: `${Math.abs(diff)} dia(s) atrasado`, class: 'overdue' }
        if (diff === 0) return { text: 'Vence hoje', class: 'warning' }
        if (diff <= 3) return { text: `${diff} dia(s) restante(s)`, class: 'warning' }
        return { text: `${diff} dia(s) restante(s)`, class: 'ok' }
    }

    const handleInlineUpdate = async (field, value) => {
        const { error } = await supabase.from('demandas').update({ [field]: value }).eq('id', demanda.id)
        if (error) {
            addToast('Erro ao atualizar', 'error')
        } else {
            addToast('Atualizado com sucesso!', 'success')
            onUpdated()
        }
    }

    const handleSaveNotes = async () => {
        setSaving(true)
        const { error } = await supabase.from('demandas').update({ anotacoes: notes }).eq('id', demanda.id)
        if (error) addToast('Erro ao salvar anotações', 'error')
        else { addToast('Anotações salvas!', 'success'); onUpdated() }
        setSaving(false)
    }

    const days = getDaysRemaining()
    const computeSituacao = () => {
        if (demanda.situacao) return demanda.situacao
        if (demanda.status === 'Aprovado e entregue') return 'Entregue'
        if (demanda.status === 'Aguardando aprovação' || demanda.status === 'Aprovação') return 'Aguardando aprovação'
        if (demanda.prazo && new Date(demanda.prazo) < new Date() && demanda.status !== 'Aprovado e entregue') return 'Atrasado'
        return 'Em andamento'
    }

    return (
        <>
            <div className="drawer-overlay" onClick={onClose} />
            <div className="drawer">
                <div className="drawer-header">
                    <h2>{demanda.titulo}</h2>
                    <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="drawer-body">
                    {/* Info Section */}
                    <div className="drawer-section">
                        <div className="drawer-section-title">Informações</div>
                        <div className="drawer-field">
                            <span className="drawer-field-label">Nº GLPI</span>
                            <span className="drawer-field-value" style={{ color: 'var(--accent)', fontFamily: 'Courier New, monospace' }}>{demanda.numero_glpi}</span>
                        </div>
                        <div className="drawer-field">
                            <span className="drawer-field-label">Status</span>
                            <select
                                className={`inline-select ${STATUS_BADGE[demanda.status] || ''}`}
                                style={{ background: `var(--status-${demanda.status === 'Pendente' ? 'pendente' : demanda.status === 'Aprovação' ? 'aprovacao' : demanda.status === 'Aguardando aprovação' ? 'aguardando' : demanda.status === 'Aprovado' ? 'aprovado' : demanda.status === 'Desenvolvendo' ? 'desenvolvendo' : demanda.status === 'Aprovado e entregue' ? 'entregue' : 'correcao'}-bg)` }}
                                defaultValue={demanda.status}
                                onChange={e => handleInlineUpdate('status', e.target.value)}
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="drawer-field">
                            <span className="drawer-field-label">Prioridade</span>
                            <select
                                className={`inline-select ${PRIORITY_BADGE[demanda.prioridade] || ''}`}
                                style={{ background: `var(--priority-${demanda.prioridade === 'Medium' ? 'medium' : demanda.prioridade === 'High' ? 'high' : 'highst'}-bg)` }}
                                defaultValue={demanda.prioridade}
                                onChange={e => handleInlineUpdate('prioridade', e.target.value)}
                            >
                                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="drawer-field">
                            <span className="drawer-field-label">Situação</span>
                            <span className="drawer-field-value">{computeSituacao()}</span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="drawer-section">
                        <div className="drawer-section-title">Cronologia</div>
                        <div className="drawer-timeline">
                            <div className="timeline-item">
                                <div className="timeline-dot" />
                                <span className="timeline-label">Criado em</span>
                                <span className="timeline-value">{formatDate(demanda.created_at)}</span>
                            </div>
                            <div className="timeline-item">
                                <div className="timeline-dot" style={{ background: 'var(--warning)' }} />
                                <span className="timeline-label">Prazo</span>
                                <span className="timeline-value">
                                    {formatDate(demanda.prazo)}
                                    {days && (
                                        <span className={`days-remaining ${days.class}`} style={{ marginLeft: 8 }}>
                                            {days.text}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="drawer-section">
                        <div className="drawer-section-title">Descrição</div>
                        <div className="drawer-desc">{demanda.descricao || 'Sem descrição'}</div>
                    </div>

                    {/* Notes */}
                    <div className="drawer-section">
                        <div className="drawer-section-title">Anotações</div>
                        <textarea
                            className="drawer-notes-textarea"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Adicionar anotações..."
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleSaveNotes} disabled={saving} style={{ alignSelf: 'flex-end' }}>
                            {saving ? <span className="loading-spinner" /> : <><Save size={14} /> Salvar Anotações</>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
