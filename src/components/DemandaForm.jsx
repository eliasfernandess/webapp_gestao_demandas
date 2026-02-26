import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import { Sparkles, Wand2, X, GitBranch } from 'lucide-react'

const PRIORIDADES = ['Medium', 'High', 'Highst']
const STATUSES = [
    'Pendente',
    'Aprovação',
    'Aguardando aprovação',
    'Aprovado',
    'Desenvolvendo',
    'Aprovado e entregue',
    'Em correção'
]

const emptyForm = {
    numero_glpi: '',
    titulo: '',
    descricao: '',
    prioridade: 'Medium',
    status: 'Pendente',
    prazo: '',
    anotacoes: '',
}

export default function DemandaForm({ demanda, onClose, onSaved, isVariation = false }) {
    const { addToast } = useToast()
    const [form, setForm] = useState(demanda ? {
        numero_glpi: demanda.numero_glpi || '',
        titulo: isVariation ? `${demanda.titulo} (variação)` : (demanda.titulo || ''),
        descricao: demanda.descricao || '',
        prioridade: demanda.prioridade || 'Medium',
        status: isVariation ? 'Em correção' : (demanda.status || 'Pendente'),
        prazo: demanda.prazo || '',
        anotacoes: isVariation ? '' : (demanda.anotacoes || ''),
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
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY
            if (!apiKey) {
                addToast('Chave VITE_GEMINI_API_KEY não configurada no .env', 'error')
                setAiLoading(false)
                return
            }
            const systemPrompt = `Você é um assistente de gestão de demandas de TI. 
Com base na descrição do usuário, gere um JSON com os campos:
- "titulo": título curto e profissional para a demanda (máx 80 caracteres)
- "descricao": descrição detalhada e técnica da demanda (2-4 parágrafos)
- "prioridade": uma de "Medium", "High" ou "Highst" baseada na urgência

Responda APENAS com o JSON válido, sem markdown, sem blocos de código.`

            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: `${systemPrompt}\n\nDescrição do usuário: ${aiPrompt}` }] }
                        ],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1024,
                        }
                    }),
                }
            )
            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}))
                throw new Error(errData?.error?.message || 'Erro na API Gemini')
            }
            const result = await resp.json()
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
            // Clean potential markdown code blocks
            const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
            const data = JSON.parse(cleanText)
            if (data.titulo) onChange('titulo', data.titulo)
            if (data.descricao) onChange('descricao', data.descricao)
            if (data.prioridade && PRIORIDADES.includes(data.prioridade)) {
                onChange('prioridade', data.prioridade)
            }
            addToast('Conteúdo gerado pela IA com sucesso!', 'success')
        } catch (err) {
            addToast('Erro ao gerar com IA: ' + (err.message || 'tente novamente'), 'error')
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

        // If creating a variation, set demanda_pai_id
        if (isVariation && demanda) {
            payload.demanda_pai_id = demanda.id
        }

        let error
        if (demanda && !isVariation) {
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
            const msg = isVariation
                ? 'Variação criada com sucesso!'
                : (demanda ? 'Demanda atualizada!' : 'Demanda criada!')
            addToast(msg, 'success')
            onSaved()
            onClose()
        }
        setSaving(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isVariation && <GitBranch size={18} color="var(--accent)" />}
                        {isVariation ? 'Criar Variação' : (demanda ? 'Editar Demanda' : 'Nova Demanda')}
                    </h2>
                    <button className="btn btn-ghost" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {isVariation && (
                    <div style={{
                        padding: '10px 24px',
                        background: 'var(--accent-light)',
                        fontSize: '0.82rem',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 500
                    }}>
                        <GitBranch size={14} />
                        Variação da demanda: <strong>{demanda?.titulo}</strong>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* AI Section */}
                        {!isVariation && (
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
                        )}

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
                            {saving ? <span className="loading-spinner" /> : (
                                isVariation ? 'Criar Variação' : (demanda ? 'Salvar Alterações' : 'Criar Demanda')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
