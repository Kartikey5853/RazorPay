import React, { useState, useEffect } from 'react';
import { CalendarService, PeopleService, JobsService, type CalendarEvent, type Person, type Job, type CalendarEventInput } from '../services/api';

const EVENT_TYPES = [
    'Payment Due',
    'Follow-up',
    'Meeting',
    'Deadline',
    'Task',
    'Reminder'
];

export const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week'>('month');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const [people, setPeople] = useState<Person[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);

    useEffect(() => {
        PeopleService.getAll().then(setPeople);
        JobsService.getAll().then(setJobs);
    }, []);

    const fetchEvents = () => {
        setLoading(true);
        // In a real app we'd filter by date range, but here we'll just fetch all for simplicity and filter client-side or pass broad params
        CalendarService.getAll().then(data => {
            setEvents(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchEvents();
    }, [currentDate, view]);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setDate(newDate.getDate() - 7);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        const today = new Date();
        setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    // --- CALENDAR GRID GENERATION ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/50 border border-slate-100 rounded-lg p-2" />);
        }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.start_at.startsWith(dateStr));
            
            const isToday = new Date().toISOString().startsWith(dateStr);
            
            days.push(
                <div key={d} className={`min-h-[120px] border rounded-lg p-2 flex flex-col gap-1 transition-colors hover:border-slate-300 ${isToday ? 'border-secondary bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold ${isToday ? 'bg-secondary text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>{d}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                        {dayEvents.map(evt => (
                            <div 
                                key={evt.id} 
                                onClick={() => { setSelectedEvent(evt); setIsEventModalOpen(true); }}
                                className={`text-xs p-1 px-2 rounded cursor-pointer truncate font-medium ${evt.status === 'completed' ? 'bg-slate-100 text-slate-500 line-through' : evt.event_type.toLowerCase().includes('payment') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                            >
                                {evt.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        
        return (
            <div className="grid grid-cols-7 gap-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{day}</div>
                ))}
                {days}
            </div>
        );
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="w-full pb-32">
            <header className="pb-8 border-b border-outline-variant/30 mb-8">
                <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-primary tracking-tight">Calendar</h1>
                        <p className="text-on-surface-variant text-lg mt-2">Track everything Ergon needs to remember.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary shadow-md flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">add</span> Add Event
                        </button>
                    </div>
                </div>
            </header>

            <div className="container pt-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-primary">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button onClick={handlePrev} className="p-2 hover:bg-white rounded-md transition-colors text-slate-600"><span className="material-symbols-outlined text-sm block">chevron_left</span></button>
                            <button onClick={handleToday} className="px-4 py-1 text-sm font-bold text-slate-700 hover:bg-white rounded-md transition-colors">Today</button>
                            <button onClick={handleNext} className="p-2 hover:bg-white rounded-md transition-colors text-slate-600"><span className="material-symbols-outlined text-sm block">chevron_right</span></button>
                        </div>
                    </div>
                    
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setView('month')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${view === 'month' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Month</button>
                        <button onClick={() => setView('week')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${view === 'week' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Week</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm p-6">
                    {loading ? (
                        <div className="min-h-[400px] flex items-center justify-center text-slate-400">Loading events...</div>
                    ) : (
                        view === 'month' ? renderMonthView() : <div className="text-center p-12 text-slate-500">Week view coming soon. Switch to Month view.</div>
                    )}
                </div>
            </div>

            {isAddModalOpen && (
                <AddEventModal 
                    onClose={() => setIsAddModalOpen(false)} 
                    onSaved={() => { setIsAddModalOpen(false); fetchEvents(); }} 
                    people={people} 
                    jobs={jobs} 
                />
            )}

            {isEventModalOpen && selectedEvent && (
                <EventDetailsModal
                    event={selectedEvent}
                    onClose={() => { setIsEventModalOpen(false); setSelectedEvent(null); }}
                    onUpdated={() => { setIsEventModalOpen(false); fetchEvents(); }}
                />
            )}
        </div>
    );
};

const AddEventModal: React.FC<{onClose: ()=>void, onSaved: ()=>void, people: Person[], jobs: Job[]}> = ({onClose, onSaved, people, jobs}) => {
    const [data, setData] = useState<Partial<CalendarEventInput>>({
        title: '',
        event_type: 'Meeting',
        start_at: new Date().toISOString().slice(0,10) + 'T10:00:00',
        currency: 'INR'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await CalendarService.create(data as CalendarEventInput);
            onSaved();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-primary">Add Event</h2>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><span className="material-symbols-outlined text-sm block">close</span></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Title *</label>
                        <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-secondary" value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="e.g. Kickoff meeting" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Event Type *</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-secondary" value={data.event_type} onChange={e => setData({...data, event_type: e.target.value})}>
                                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Date & Time *</label>
                            <input required type="datetime-local" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-secondary" value={data.start_at} onChange={e => setData({...data, start_at: e.target.value})} />
                        </div>
                    </div>
                    
                    {data.event_type === 'Payment Due' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Amount (₹) *</label>
                            <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-secondary" value={data.amount || ''} onChange={e => setData({...data, amount: parseFloat(e.target.value)})} placeholder="25000" />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Person (Optional)</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-secondary" value={data.person_id || ''} onChange={e => setData({...data, person_id: e.target.value || undefined})}>
                                <option value="">Select Person...</option>
                                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Job (Optional)</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-secondary" value={data.job_id || ''} onChange={e => setData({...data, job_id: e.target.value || undefined})}>
                                <option value="">Select Job...</option>
                                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Description / Notes</label>
                        <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-secondary min-h-[80px]" value={data.description || ''} onChange={e => setData({...data, description: e.target.value})} placeholder="Any additional context..." />
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t mt-2">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg font-bold text-white bg-primary hover:bg-primary/90 shadow-sm">{loading ? 'Saving...' : 'Save Event'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EventDetailsModal: React.FC<{event: CalendarEvent, onClose: ()=>void, onUpdated: ()=>void}> = ({event, onClose, onUpdated}) => {
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        setLoading(true);
        try {
            await CalendarService.update(event.id, { status: 'completed' });
            onUpdated();
        } finally { setLoading(false); }
    };
    
    const handleCancel = async () => {
        setLoading(true);
        try {
            await CalendarService.update(event.id, { status: 'cancelled' });
            onUpdated();
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${event.status === 'completed' ? 'bg-green-500' : event.status === 'cancelled' ? 'bg-slate-400' : 'bg-secondary'}`}></div>
                <div className="flex justify-between items-start mb-6 pt-2">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{event.event_type}</span>
                            {event.status === 'completed' && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">check</span> Completed</span>}
                            {event.status === 'cancelled' && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-bold">Cancelled</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-primary">{event.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><span className="material-symbols-outlined text-sm block">close</span></button>
                </div>
                
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center gap-3 text-slate-700">
                        <span className="material-symbols-outlined text-slate-400">schedule</span>
                        <div>
                            <div className="font-bold">{new Date(event.start_at).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                    
                    {event.amount && (
                        <div className="flex items-center gap-3 text-slate-700">
                            <span className="material-symbols-outlined text-slate-400">payments</span>
                            <div className="font-bold text-green-700">{event.currency === 'INR' ? '₹' : event.currency}{event.amount.toLocaleString()}</div>
                        </div>
                    )}

                    {event.person_name && (
                        <div className="flex items-center gap-3 text-slate-700">
                            <span className="material-symbols-outlined text-slate-400">person</span>
                            <div className="font-medium bg-slate-100 px-3 py-1 rounded-lg">{event.person_name}</div>
                        </div>
                    )}
                    
                    {event.job_title && (
                        <div className="flex items-center gap-3 text-slate-700">
                            <span className="material-symbols-outlined text-slate-400">work</span>
                            <div className="font-medium bg-slate-100 px-3 py-1 rounded-lg truncate">{event.job_title}</div>
                        </div>
                    )}
                    
                    {event.description && (
                        <div className="bg-slate-50 p-4 rounded-xl mt-2 text-sm text-slate-600 border">
                            {event.description}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    {event.status === 'scheduled' && (
                        <>
                            <button onClick={handleCancel} disabled={loading} className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel Event</button>
                            <button onClick={handleComplete} disabled={loading} className="px-6 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm flex items-center gap-2 transition-colors">
                                <span className="material-symbols-outlined text-sm block">check</span> Mark Complete
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
