import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../contexts/ToastContext'
import {
    Plus,
    Trash2,
    Check,
    CheckSquare,
    ListTodo
} from 'lucide-react'

export default function ChecklistPage() {
    const { addToast } = useToast()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [newTask, setNewTask] = useState('')

    useEffect(() => {
        fetchItems()
    }, [])

    async function fetchItems() {
        setLoading(true)
        const { data, error } = await supabase
            .from('checklist')
            .select('*')
            .order('data', { ascending: false })
            .order('created_at', { ascending: true })
        if (!error) setItems(data || [])
        setLoading(false)
    }

    const grouped = useMemo(() => {
        const groups = {}
        items.forEach(item => {
            const date = item.data
            if (!groups[date]) groups[date] = []
            groups[date].push(item)
        })
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    }, [items])

    const addTask = async (e) => {
        e.preventDefault()
        if (!newTask.trim()) return

        const today = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
            .from('checklist')
            .insert({ titulo: newTask.trim(), data: today })
            .select()
            .single()

        if (!error && data) {
            setItems(prev => [...prev, data])
            setNewTask('')
            addToast('Tarefa adicionada', 'success')
        }
    }

    const toggleItem = async (item) => {
        const { error } = await supabase
            .from('checklist')
            .update({ concluido: !item.concluido })
            .eq('id', item.id)

        if (!error) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, concluido: !i.concluido } : i))
        }
    }

    const deleteItem = async (id) => {
        const { error } = await supabase.from('checklist').delete().eq('id', id)
        if (!error) {
            setItems(prev => prev.filter(i => i.id !== id))
        }
    }

    const formatDateHeader = (dateStr) => {
        const date = new Date(dateStr + 'T12:00:00')
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

        if (dateStr === today) return '📅 Hoje'
        if (dateStr === yesterday) return '📅 Ontem'

        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    return (
        <>
            <div className="page-header">
                <h1>Checklist Diário</h1>
                <p>Organize suas tarefas do dia</p>
            </div>

            <div className="page-content">
                {/* Add Task */}
                <form className="checklist-input-bar" onSubmit={addTask}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Adicionar nova tarefa..."
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!newTask.trim()}>
                        <Plus size={16} />
                        Adicionar
                    </button>
                </form>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : grouped.length === 0 ? (
                    <div className="empty-state">
                        <ListTodo size={48} />
                        <h3>Nenhuma tarefa criada</h3>
                        <p>Adicione uma tarefa acima para começar</p>
                    </div>
                ) : (
                    grouped.map(([date, dayItems]) => {
                        const total = dayItems.length
                        const completed = dayItems.filter(i => i.concluido).length
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0

                        return (
                            <div className="checklist-day-group" key={date}>
                                <div className="checklist-day-header">
                                    <span className="checklist-day-date">{formatDateHeader(date)}</span>
                                    <div className="checklist-day-progress">
                                        <span>{completed}/{total}</span>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <span>{percent}%</span>
                                    </div>
                                </div>
                                <div className="checklist-items">
                                    {dayItems.map(item => (
                                        <div className="checklist-item" key={item.id}>
                                            <button
                                                className={`checklist-checkbox ${item.concluido ? 'checked' : ''}`}
                                                onClick={() => toggleItem(item)}
                                            >
                                                {item.concluido && <Check size={12} />}
                                            </button>
                                            <span className={`checklist-item-text ${item.concluido ? 'completed' : ''}`}>
                                                {item.titulo}
                                            </span>
                                            <button
                                                className="btn btn-ghost btn-sm checklist-item-delete"
                                                onClick={() => deleteItem(item.id)}
                                                style={{ color: 'var(--error)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </>
    )
}
