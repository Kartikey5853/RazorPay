import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PeopleService, JobsService, type Person, type Job, type Task, type Activity } from '../services/api';

export const PersonProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    
    const [person, setPerson] = useState<Person | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Assignment Modal State
    const [isAssignModalOpen, setAssignModalOpen] = useState(false);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>('');
    const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Editing Notes
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesInput, setNotesInput] = useState('');

    const loadData = async () => {
        if (!id) {
            setLoading(false);
            return;
        }
        try {
            const data = await PeopleService.getById(id);
            setPerson(data);
            const acts = await PeopleService.activities(id);
            setActivities(acts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleCall = () => {
        if (person) {
            navigate(`/ai-call?person_id=${person.id}`);
        }
    };

    const handleSaveNotes = async () => {
        if (!person) return;
        try {
            await PeopleService.update(person.id, { notes: notesInput });
            setIsEditingNotes(false);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const openAssignModal = async () => {
        try {
            const jobs = await JobsService.getAll();
            setAvailableJobs(jobs);
            setAssignModalOpen(true);
            setSelectedJobId('');
            setSelectedTaskId('');
            setAvailableTasks([]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleJobSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const jid = e.target.value;
        setSelectedJobId(jid);
        setSelectedTaskId('');
        if (jid) {
            try {
                const tasks = await JobsService.getTasks(jid);
                setAvailableTasks(tasks);
            } catch (err) {
                console.error(err);
                setAvailableTasks([]);
            }
        } else {
            setAvailableTasks([]);
        }
    };

    const handleSaveAssignment = async () => {
        if (!person || !selectedJobId) return;
        setIsAssigning(true);
        try {
            // If they selected a task, assign to task (which also means they should be on the job if not already, but our backend might just do the task-person link)
            if (selectedTaskId) {
                // Find existing task to get current people
                const task = availableTasks.find(t => t.id === selectedTaskId);
                if (task) {
                    const currentIds = (task.people || []).map(p => p.id);
                    if (!currentIds.includes(person.id)) {
                        await JobsService.updateTask(selectedTaskId, { person_ids: [...currentIds, person.id] });
                    }
                }
            } else {
                // Just assign to job
                await JobsService.addPerson(selectedJobId, person.id);
            }
            setAssignModalOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsAssigning(false);
        }
    };

    const removeAssignment = async (type: 'job' | 'task', targetId: string, currentPeople: any[]) => {
        if (!person) return;
        try {
            if (type === 'job') {
                await JobsService.removePerson(targetId, person.id);
            } else if (type === 'task') {
                const newIds = currentPeople.filter((p: any) => p.id !== person.id).map((p: any) => p.id);
                await JobsService.updateTask(targetId, { person_ids: newIds });
            }
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-on-surface-variant font-medium">Loading person profile...</div>;
    }

    if (!person) {
        return <div className="p-8 text-center text-error font-medium">Person not found.</div>;
    }

    const initials = person.name ? person.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    // Combine jobs and tasks into one assigned work list
    const assignedJobs = person.jobs || [];
    const assignedTasks = person.tasks || [];
    const commHistory = [...(person.calls || []), ...(person.messages || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const payments = person.payments || [];

    return (
        <div className="w-full pb-24">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-200 border-4 border-white shadow-sm flex items-center justify-center text-primary font-bold text-2xl md:text-3xl shrink-0">
                        {initials}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="bg-slate-100 text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{person.type || 'Contact'}</span>
                            {person.tags?.map((tag: string) => (
                                <span key={tag} className="bg-indigo-50 text-secondary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{tag}</span>
                            ))}
                        </div>
                        <h1 className="text-3xl font-bold text-primary tracking-tight">{person.name}</h1>
                        {(person.company || person.location) && (
                            <p className="text-sm text-on-surface-variant mt-1">
                                {person.company}{person.company && person.location ? ' • ' : ''}{person.location}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 shrink-0">
                    <button onClick={handleCall} className="btn btn-primary shadow-sm flex items-center gap-2 px-6 py-2.5">
                        <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
                        Call
                    </button>
                    <button onClick={openAssignModal} className="btn btn-outline bg-white shadow-sm flex items-center gap-2 px-6 py-2.5">
                        <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
                        Add Assignment
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-8 px-4 md:px-0">
                
                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-8">
                    
                    {/* ASSIGNED WORK */}
                    <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-sm font-bold text-primary tracking-tight">Assigned Work</h2>
                            <button onClick={openAssignModal} className="text-secondary text-[10px] font-bold uppercase tracking-widest hover:underline">+ Add</button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            {assignedJobs.length === 0 && assignedTasks.length === 0 ? (
                                <p className="text-sm text-on-surface-variant italic text-center py-4">No jobs or tasks assigned.</p>
                            ) : (
                                <>
                                    {assignedJobs.map((job: any) => (
                                        <div key={`job-${job.id}`} className="flex items-center justify-between p-3 border border-slate-200 rounded-md hover:bg-slate-50 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-secondary">
                                                    <span className="material-symbols-outlined text-[16px]">work</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-primary cursor-pointer hover:underline" onClick={() => navigate(`/job-detail/${job.id}`)}>{job.title}</p>
                                                    <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-widest mt-0.5">Job • {job.status}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeAssignment('job', job.id, [])} className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 p-1">
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    {assignedTasks.map((task: any) => (
                                        <div key={`task-${task.id}`} className="flex items-center justify-between p-3 border border-slate-200 rounded-md hover:bg-slate-50 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-[16px]">check_box</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-primary">{task.title}</p>
                                                    <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-widest mt-0.5">Task in {task.job_title || 'Job'} • {task.status}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeAssignment('task', task.id, task.people || [])} className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 p-1">
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </section>

                    {/* COMMUNICATION HISTORY */}
                    <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-sm font-bold text-primary tracking-tight">Communication History</h2>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            {commHistory.length === 0 ? (
                                <p className="text-sm text-on-surface-variant italic text-center py-4">No calls or messages yet.</p>
                            ) : (
                                commHistory.map((item: any, i) => {
                                    const isCall = item.duration_seconds !== undefined;
                                    return (
                                        <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-md bg-slate-50/50">
                                            <div className="w-8 h-8 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-secondary">
                                                <span className="material-symbols-outlined text-[16px]">{isCall ? 'phone_in_talk' : 'chat'}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-sm font-bold text-primary">{isCall ? 'Voice Call' : 'Message'}</p>
                                                    <p className="text-[10px] text-on-surface-variant">{new Date(item.created_at).toLocaleString()}</p>
                                                </div>
                                                {isCall ? (
                                                    <div className="text-xs text-primary space-y-2 mt-2">
                                                        <p><span className="font-semibold text-on-surface-variant">Duration:</span> {item.duration_seconds}s</p>
                                                        {item.summary && <p><span className="font-semibold text-on-surface-variant">Summary:</span> {item.summary}</p>}
                                                        {item.transcript && (
                                                            <div className="mt-2 p-2 bg-white border rounded text-on-surface-variant max-h-[100px] overflow-y-auto italic">
                                                                "{item.transcript}"
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-primary mt-1">{item.content}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* PAYMENTS */}
                    <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-sm font-bold text-primary tracking-tight">Payments</h2>
                        </div>
                        <div className="p-5">
                            {payments.length === 0 ? (
                                <p className="text-sm text-on-surface-variant italic text-center py-4">No payment records found.</p>
                            ) : (
                                <div className="space-y-3">
                                    {payments.map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-md hover:bg-slate-50">
                                            <div>
                                                <p className="text-sm font-bold text-primary">{p.currency} {p.amount.toLocaleString()}</p>
                                                <p className="text-xs text-on-surface-variant">{p.description || 'Payment'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${p.status === 'completed' || p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {p.status}
                                                </span>
                                                <p className="text-[10px] text-on-surface-variant mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-8">
                    
                    {/* CONTACT INFO */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
                        <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Contact Information</h3>
                        <div className="flex flex-col gap-3">
                            {person.email && (
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">mail</span>
                                    <span className="text-sm font-medium text-primary">{person.email}</span>
                                </div>
                            )}
                            {person.phone && (
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">call</span>
                                    <span className="text-sm font-medium text-primary">{person.phone}</span>
                                </div>
                            )}
                            {!person.email && !person.phone && (
                                <span className="text-xs text-on-surface-variant italic">No contact info provided.</span>
                            )}
                        </div>
                    </div>

                    {/* NOTES */}
                    <div className="bg-yellow-50/50 border border-yellow-200/60 rounded-lg shadow-sm p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest">Persistent Notes</h3>
                            {!isEditingNotes && (
                                <button onClick={() => { setNotesInput(person.notes || ''); setIsEditingNotes(true); }} className="text-yellow-700 text-[10px] font-bold uppercase tracking-widest hover:underline">Edit</button>
                            )}
                        </div>
                        {isEditingNotes ? (
                            <div className="flex flex-col gap-2">
                                <textarea
                                    className="w-full text-sm p-3 border border-yellow-300 rounded bg-white outline-none min-h-[100px]"
                                    value={notesInput}
                                    onChange={e => setNotesInput(e.target.value)}
                                    placeholder="Add notes about this person..."
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveNotes} className="bg-yellow-600 text-white text-xs font-medium py-1.5 px-3 rounded shadow-sm">Save</button>
                                    <button onClick={() => setIsEditingNotes(false)} className="bg-white border border-yellow-300 text-yellow-800 text-xs font-medium py-1.5 px-3 rounded shadow-sm">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap">
                                {person.notes || <span className="italic opacity-60">No notes added. Click edit to add notes.</span>}
                            </p>
                        )}
                    </div>

                    {/* ACTIVITY TIMELINE */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 max-h-[500px] overflow-y-auto">
                        <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-5">Activity Timeline</h3>
                        {activities.length === 0 ? (
                            <p className="text-xs text-on-surface-variant italic">No activity recorded yet.</p>
                        ) : (
                            <div className="space-y-4 pl-2 border-l border-slate-200 ml-1">
                                {activities.map(act => (
                                    <div key={act.id} className="relative">
                                        <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                                        <p className="text-xs font-bold text-primary leading-tight">{act.title}</p>
                                        {act.description && <p className="text-[10px] text-on-surface-variant mt-0.5">{act.description}</p>}
                                        <p className="text-[9px] text-on-surface-variant mt-1 font-mono">{new Date(act.created_at).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* ADD ASSIGNMENT MODAL */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-slate-900/30 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-base font-bold text-primary">Add Assignment</h3>
                            <button onClick={() => setAssignModalOpen(false)} className="text-on-surface-variant hover:text-primary">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Select Job</label>
                                <select 
                                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-secondary font-medium"
                                    value={selectedJobId}
                                    onChange={handleJobSelect}
                                >
                                    <option value="" disabled>-- Select a Job --</option>
                                    {availableJobs.map(job => (
                                        <option key={job.id} value={job.id}>{job.title}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {selectedJobId && (
                                <div>
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Select Task (Optional)</label>
                                    <select 
                                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-secondary font-medium"
                                        value={selectedTaskId}
                                        onChange={e => setSelectedTaskId(e.target.value)}
                                    >
                                        <option value="">Assign to entire Job only</option>
                                        {availableTasks.map(task => (
                                            <option key={task.id} value={task.id}>{task.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => setAssignModalOpen(false)} className="btn btn-outline text-xs py-1.5 px-4 rounded font-medium">Cancel</button>
                            <button onClick={handleSaveAssignment} disabled={isAssigning || !selectedJobId} className="btn btn-primary text-xs py-1.5 px-4 rounded font-medium disabled:opacity-50">
                                {isAssigning ? 'Saving...' : 'Save Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
