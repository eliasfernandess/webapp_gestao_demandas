import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import { Sparkles, Wand2, X } from 'lucide-react'

const PRIORIDADES = ['Medium', 'High', 'Highst']
const STATUSES = ['Pendente', 'Aguardando aprovação', 'Aprovado', 'Desenvolvendo', 'Aprovado e entregue']

const emptyForm = {
    numero_glpi: '',
    titulo: '',
    descricao: '',
    prioridade: 'Medium',
    status: 'Pendente',
    prazo: '',
    anotacoes: '',
}

export default function DemandaForm({ demanda, onClose, onSaved }) {
    const { addToast } = useToast()
    const [form, setForm] = useState(demanda ? {
        numero_glpi: demanda.numero_glpi || '',
        titulo: demanda.titulo || '',
        descricao: demanda.descricao || '',
        prioridade: demanda.prioridade || 'Medium',
        status: demanda.status || 'Pendente',
        prazo: demanda.prazo || '',
        anotacoes: demanda.anotacoes || '',
    } : { ...emptyForm })
    const [saving, setSaving] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiLoading, setAiLoading] = useState(false)

    const onChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return
        setAiLoading(true)
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const resp = await fetch(`${supabaseUrl}/functions/v1/generate-ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ prompt: aiPrompt }),
            })
            if (!resp.ok) throw new Error('Erro na resposta da IA')
            const data = await resp.json()
            if (data.titulo) onChange('titulo', data.titulo)
            if (data.descricao) onChange('descricao', data.descricao)
            if (data.prioridade && PRIORIDADES.includes(data.prioridade)) {
                onChange('prioridade', data.prioridade)
            }
            addToast('Conteúdo gerado pela IA com sucesso!', 'success')
        } catch (err) {
            addToast('Erro ao gerar com IA. Verifique a Edge Function.', 'error')
            console.error(err)
        }
        setAiLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.numero_glpi.trim() || !form.titulo.trim() || !form.descricao.trim()) {
            addToast('Preencha todos os campos obrigatórios', 'error')
            return
        }
        setSaving(true)

        const payload = {
            numero_glpi: form.numero_glpi.trim(),
            titulo: form.titulo.trim(),
            descricao: form.descricao.trim(),
            prioridade: form.prioridade,
            status: form.status,
            prazo: form.prazo || null,
            anotacoes: form.anotacoes,
        }

        let error
        if (demanda) {
            const result = await supabase
                .from('demandas')
                .update(payload)
                .eq('id', demanda.id)
            error = result.error
        } else {
            const result = await supabase
                .from('demandas')
                .insert(payload)
            error = result.error
        }

        if (error) {
            addToast('Erro ao salvar demanda', 'error')
            console.error(error)
        } else {
            addToast(demanda ? 'Demanda atualizada!' : 'Demanda criada!', 'success')
            onSaved()
            onClose()
        }
        setSaving(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{demanda ? 'Editar Demanda' : 'Nova Demanda'}</h2>
                    <button className="btn btn-ghost" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* AI Section */}
                        <div className="ai-section">
                            <div className="ai-section-title">
                                <Sparkles size={16} />
                                Gerar com IA
                            </div>
                            <div className="ai-row">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Descreva sua demanda ou palavra-chave"
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleGenerateAI}
                                    disabled={aiLoading || !aiPrompt.trim()}
                                >
                                    {aiLoading ? (
                                        <span className="loading-spinner" />
                                    ) : (
                                        <>
                                            <Wand2 size={16} />
                                            Gerar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Número GLPI *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: GLPI-12345"
                                    value={form.numero_glpi}
                                    onChange={e => onChange('numero_glpi', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Prazo</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={form.prazo}
                                    onChange={e => onChange('prazo', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Título *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Título da demanda"
                                value={form.titulo}
                                onChange={e => onChange('titulo', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Descrição *</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Descreva a demanda em detalhes..."
                                value={form.descricao}
                                onChange={e => onChange('descricao', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Prioridade</label>
                                <select
                                    className="form-select"
                                    value={form.prioridade}
                                    onChange={e => onChange('prioridade', e.target.value)}
                                >
                                    {PRIORIDADES.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    className="form-select"
                                    value={form.status}
                                    onChange={e => onChange('status', e.target.value)}
                                >
                                    {STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Anotações</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Anotações livres sobre esta demanda..."
                                value={form.anotacoes}
                                onChange={e => onChange('anotacoes', e.target.value)}
                                style={{ minHeight: '80px' }}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <span className="loading-spinner" /> : (demanda ? 'Salvar Alterações' : 'Criar Demanda')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
