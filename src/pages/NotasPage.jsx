import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import {
    Plus,
    Trash2,
    Save,
    StickyNote,
    Cloud,
    CloudOff
} from 'lucide-react'

export default function NotasPage() {
    const { addToast } = useToast()
    const [notas, setNotas] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved
    const debounceRef = useRef(null)

    useEffect(() => {
        fetchNotas()
    }, [])

    async function fetchNotas() {
        setLoading(true)
        const { data, error } = await supabase
            .from('notas')
            .select('*')
            .order('updated_at', { ascending: false })
        if (!error) {
            setNotas(data || [])
            if (data && data.length > 0 && !selectedId) {
                setSelectedId(data[0].id)
                setContent(data[0].conteudo || '')
            }
        }
        setLoading(false)
    }

    const selectNote = (nota) => {
        // Save current note before switching if needed
        if (debounceRef.current) clearTimeout(debounceRef.current)
        setSelectedId(nota.id)
        setContent(nota.conteudo || '')
        setSaveStatus('idle')
    }

    const autoSave = useCallback((id, text) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        setSaveStatus('saving')
        debounceRef.current = setTimeout(async () => {
            const { error } = await supabase
                .from('notas')
                .update({ conteudo: text })
                .eq('id', id)
            if (!error) {
                setSaveStatus('saved')
                // Update local list
                setNotas(prev => prev.map(n => n.id === id ? { ...n, conteudo: text, updated_at: new Date().toISOString() } : n))
                setTimeout(() => setSaveStatus('idle'), 2000)
            } else {
                setSaveStatus('idle')
            }
        }, 1500)
    }, [])

    const handleContentChange = (e) => {
        const text = e.target.value
        setContent(text)
        if (selectedId) autoSave(selectedId, text)
    }

    const createNote = async () => {
        const { data, error } = await supabase
            .from('notas')
            .insert({ conteudo: '' })
            .select()
            .single()
        if (!error && data) {
            setNotas(prev => [data, ...prev])
            setSelectedId(data.id)
            setContent('')
            addToast('Nova anotação criada', 'success')
        }
    }

    const deleteNote = async (id) => {
        const { error } = await supabase.from('notas').delete().eq('id', id)
        if (!error) {
            const updatedNotas = notas.filter(n => n.id !== id)
            setNotas(updatedNotas)
            if (selectedId === id) {
                if (updatedNotas.length > 0) {
                    setSelectedId(updatedNotas[0].id)
                    setContent(updatedNotas[0].conteudo || '')
                } else {
                    setSelectedId(null)
                    setContent('')
                }
            }
            addToast('Anotação excluída', 'success')
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getPreview = (text) => {
        if (!text) return 'Anotação vazia'
        return text.substring(0, 60) + (text.length > 60 ? '...' : '')
    }

    const selectedNota = notas.find(n => n.id === selectedId)

    return (
        <>
            <div className="page-header">
                <h1>Minhas Anotações</h1>
                <p>Bloco de notas com salvamento automático</p>
            </div>

            <div className="page-content">
                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : (
                    <div className="notes-container">
                        {/* Notes List */}
                        <div className="notes-list">
                            <div className="notes-list-header">
                                <h3>Notas</h3>
                                <button className="btn btn-primary btn-sm" onClick={createNote}>
                                    <Plus size={14} />
                                    Nova
                                </button>
                            </div>
                            <div className="notes-list-items">
                                {notas.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '30px 16px' }}>
                                        <StickyNote size={32} />
                                        <p>Nenhuma anotação</p>
                                    </div>
                                ) : (
                                    notas.map(nota => (
                                        <div
                                            key={nota.id}
                                            className={`note-item ${nota.id === selectedId ? 'active' : ''}`}
                                            onClick={() => selectNote(nota)}
                                        >
                                            <div className="note-item-title">{getPreview(nota.conteudo)}</div>
                                            <div className="note-item-date">{formatDate(nota.updated_at)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Note Editor */}
                        <div className="note-editor">
                            {selectedNota ? (
                                <>
                                    <div className="note-editor-header">
                                        <div className={`note-editor-status ${saveStatus}`}>
                                            {saveStatus === 'saving' && <><Cloud size={14} /> Salvando...</>}
                                            {saveStatus === 'saved' && <><Save size={14} /> Salvo</>}
                                            {saveStatus === 'idle' && <><Cloud size={14} /> Salvamento automático</>}
                                        </div>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => deleteNote(selectedNota.id)}
                                        >
                                            <Trash2 size={14} />
                                            Excluir
                                        </button>
                                    </div>
                                    <textarea
                                        value={content}
                                        onChange={handleContentChange}
                                        placeholder="Escreva sua anotação aqui..."
                                        autoFocus
                                    />
                                </>
                            ) : (
                                <div className="empty-state">
                                    <StickyNote size={48} />
                                    <h3>Selecione ou crie uma anotação</h3>
                                    <p>Use o botão "Nova" para começar</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
