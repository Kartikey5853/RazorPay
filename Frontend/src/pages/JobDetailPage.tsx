import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { JobsService, PeopleService, PaymentService, errorMessage, type Job, type Task, type Activity, type Person, type CallAssistantConfig, type PaymentInput } from '../services/api';

export const JobDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [job, setJob] = useState<Job | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    const [isTaskModalOpen, setTaskModalOpen] = useState(false);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const [showTaskForm, setShowTaskForm] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskPersonId, setNewTaskPersonId] = useState('');
    const [newTaskSubtasks, setNewTaskSubtasks] = useState<string[]>([]);
    const [newSubtaskDraft, setNewSubtaskDraft] = useState('');
    const [quickSubtaskParentId, setQuickSubtaskParentId] = useState<string | null>(null);
    const [quickSubtaskTitle, setQuickSubtaskTitle] = useState('');

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');

    const [showSubtaskForm, setShowSubtaskForm] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const [showMilestoneForm, setShowMilestoneForm] = useState(false);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDate, setNewMilestoneDate] = useState('');

    // Person Modal State
    const [isPersonModalOpen, setPersonModalOpen] = useState(false);
    const [availablePeople, setAvailablePeople] = useState<Person[]>([]);
    const [targetTypeForPerson, setTargetTypeForPerson] = useState<'job' | 'task'>('job');

    // Description editing state
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descInput, setDescInput] = useState('');

    // Edit Job Field State
    const [jobEditField, setJobEditField] = useState<'title' | 'objective' | null>(null);
    const [jobEditValue, setJobEditValue] = useState('');
    const [isSavingJob, setIsSavingJob] = useState(false);

    // Call Assistant Config State
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configChatMessages, setConfigChatMessages] = useState<{sender: 'ergon' | 'user', text: string}[]>([]);
    const [configChatInput, setConfigChatInput] = useState('');
    const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);
    const [configError, setConfigError] = useState('');

    // Confirm Modal State
    const [confirmAction, setConfirmAction] = useState<{ message: string, action: () => Promise<void> } | null>(null);

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentData, setPaymentData] = useState<Partial<PaymentInput>>({ amount: 0, currency: 'INR', status: 'requested', title: '' });

    const loadData = () => {
        if (!id) return;
        JobsService.getById(id).then(data => {
            setJob(data);
            // Refresh active task if open
            if (activeTask) {
                const updated = data.tasks?.find(t => t.id === activeTask.id);
                if (updated) setActiveTask(updated);
            }
        }).catch(console.error);

        JobsService.getActivities(id).then(data => {
            setActivities(data);
        }).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const loadPeople = async () => {
        try {
            const people = await PeopleService.getAll();
            setAvailablePeople(people);
        } catch (err) {
            console.error("Could not fetch people", err);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !job) return;
        try {
            await JobsService.createTask(job.id, {
                title: newTaskTitle.trim(),
                status: 'To Do',
                description: newTaskDescription.trim() || undefined,
                due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
                person_ids: newTaskPersonId ? [newTaskPersonId] : [],
                subtasks: newTaskSubtasks.filter(st => st.trim().length > 0)
            } as any);
            setNewTaskTitle('');
            setNewTaskDueDate('');
            setNewTaskDescription('');
            setNewTaskPersonId('');
            setNewTaskSubtasks([]);
            setNewSubtaskDraft('');
            setShowTaskForm(false);
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleQuickAddSubtask = async (e: React.FormEvent, parentTaskId: string) => {
        e.preventDefault();
        if (!quickSubtaskTitle.trim() || !job) return;
        try {
            await JobsService.createTask(job.id, {
                title: quickSubtaskTitle.trim(),
                status: 'To Do',
                parent_task_id: parentTaskId
            });
            setQuickSubtaskTitle('');
            setQuickSubtaskParentId(null);
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleCreateSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim() || !job || !activeTask) return;
        try {
            await JobsService.createTask(job.id, { title: newSubtaskTitle, status: 'To Do', parent_task_id: activeTask.id });
            setNewSubtaskTitle('');
            setShowSubtaskForm(false);
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleUpdateTask = async (task: Task, updates: Partial<Task>) => {
        try {
            await JobsService.updateTask(task.id, updates);
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleDeleteTask = async (taskId: string, isSubtask = false) => {
        try {
            await JobsService.deleteTask(taskId);
            if (!isSubtask) {
                setTaskModalOpen(false);
                setActiveTask(null);
            }
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleCreateMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMilestoneTitle.trim() || !newMilestoneDate || !job) return;
        try {
            await JobsService.createMilestone(job.id, { title: newMilestoneTitle, date: new Date(newMilestoneDate).toISOString() });
            setNewMilestoneTitle('');
            setNewMilestoneDate('');
            setShowMilestoneForm(false);
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleCreatePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!job || !paymentData.title || !paymentData.amount) return;
        try {
            await PaymentService.create({
                ...paymentData as PaymentInput,
                job_id: job.id,
                person_id: job.people && job.people.length > 0 ? job.people[0].id : undefined
            });
            setShowPaymentForm(false);
            setPaymentData({ amount: 0, currency: 'INR', status: 'requested', title: '' });
            loadData();
        } catch (err) { console.error(err); }
    };



    const openPersonModal = (target: 'job' | 'task') => {
        setTargetTypeForPerson(target);
        loadPeople();
        setPersonModalOpen(true);
    };

    const selectPerson = async (person: Person) => {
        if (!job) return;
        try {
            if (targetTypeForPerson === 'job') {
                await JobsService.addPerson(job.id, person.id);
            } else if (targetTypeForPerson === 'task' && activeTask) {
                const currentIds = (activeTask.people || []).map(p => p.id);
                if (!currentIds.includes(person.id)) {
                    await JobsService.updateTask(activeTask.id, { person_ids: [...currentIds, person.id] });
                }
            }
            setPersonModalOpen(false);
            loadData();
        } catch (err) { console.error(err); }
    };

    const removePersonFromTask = async (taskId: string, personId: string, currentPeople: Person[]) => {
        try {
            const newIds = currentPeople.filter(p => p.id !== personId).map(p => p.id);
            await JobsService.updateTask(taskId, { person_ids: newIds });
            loadData();
        } catch (err) { console.error(err); }
    };

    const promptRemovePersonFromJob = (personId: string, name: string) => {
        setConfirmAction({
            message: `Are you sure you want to remove ${name} from this job?`,
            action: async () => {
                if (!job) return;
                await JobsService.removePerson(job.id, personId);
                loadData();
            }
        });
    };

    const openTask = (task: Task) => {
        setActiveTask(task);
        setIsEditingTitle(false);
        setTitleInput(task.title);
        setIsEditingDesc(false);
        setDescInput(task.description || '');
        setTaskModalOpen(true);
    };

    const saveTitle = () => {
        if (activeTask && titleInput.trim()) {
            handleUpdateTask(activeTask, { title: titleInput.trim() });
            setIsEditingTitle(false);
        }
    };

    const saveDescription = () => {
        if (activeTask) {
            handleUpdateTask(activeTask, { description: descInput });
            setIsEditingDesc(false);
        }
    };

    const openJobEdit = (field: 'title' | 'objective') => {
        if (!job) return;
        setJobEditField(field);
        setJobEditValue(job[field] || '');
    };

    const saveJobEdit = async () => {
        if (!job || !jobEditField) return;
        setIsSavingJob(true);
        try {
            await JobsService.update(job.id, { [jobEditField]: jobEditValue });
            setJobEditField(null);
            loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingJob(false);
        }
    };

    const configMessagesForApi = (messages: {sender: 'ergon' | 'user', text: string}[]) => messages.map(message => ({ role: message.sender === 'user' ? 'user' as const : 'assistant' as const, text: message.text }));

    const handleConfigChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!configChatInput.trim()) return;
        const nextMessages = [...configChatMessages, { sender: 'user' as const, text: configChatInput }];
        setConfigChatMessages(nextMessages);
        setConfigChatInput('');
        setConfigError('');
        try {
            const response = await JobsService.callAssistantChat(job!.id, configMessagesForApi(nextMessages));
            setConfigChatMessages(prev => [...prev, { sender: 'ergon', text: response.text }]);
        } catch (err) { setConfigError(errorMessage(err)); }
    };

    const generateAndSaveConfig = async () => {
        if (!job) return;
        setIsGeneratingConfig(true);
        try {
            await JobsService.generateCallAssistantConfig(job.id, configMessagesForApi(configChatMessages));
            
            setIsConfigModalOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingConfig(false);
        }
    };

    const openConfigModal = () => {
        setConfigChatMessages([
            { sender: 'ergon', text: `Hi! Let's configure the Call Assistant for "${job?.title}". What is the primary goal when I call people for this job?` }
        ]);
        setConfigChatInput('');
        setConfigError('');
        setIsConfigModalOpen(true);
    };

    if (loading) {
        return <div className="p-8 text-center text-on-surface-variant font-medium">Loading workspace...</div>;
    }

    if (!job) {
        return <div className="p-8 text-center text-error font-medium">Job not found.</div>;
    }

    const tasks = job.tasks || [];
    const topLevelTasks = tasks.filter(t => !t.parent_task_id);
    const milestones = job.milestones || [];
    const people = job.people || [];
    const payments = job.payments || [];
    const calendar_events = job.calendar_events || [];
    const callConfig = (job.ai_plan as { call_assistant_config?: CallAssistantConfig } | undefined)?.call_assistant_config;

    const completedTasks = topLevelTasks.filter(t => t.status === 'Done').length;
    const progressPercent = topLevelTasks.length > 0 ? Math.round((completedTasks / topLevelTasks.length) * 100) : 0;

    return (
        <div className="w-full pb-32 pt-8 flex justify-center bg-[#fafafa] min-h-screen">
            <div className="w-full px-4 md:px-8" style={{ maxWidth: '1300px' }}>

                {/* 1. JOB HEADER */}
                <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-white border text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase shadow-sm">{job.status}</span>
                            <span className="text-on-surface-variant font-mono text-xs tracking-wider">{job.id.slice(0, 8).toUpperCase()}</span>
                            {job.deadline && (
                                <span className="text-on-surface-variant text-xs flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                    {new Date(job.deadline).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 group">
                            <h1 className="text-2xl font-bold text-primary tracking-tight">{job.title}</h1>
                            <button onClick={() => openJobEdit('title')} className="text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                        </div>
                        {people.length > 0 ? (
                            <p className="text-sm text-on-surface-variant mt-1">Primary Client: {people[0].name}</p>
                        ) : (
                            <p className="text-sm text-on-surface-variant mt-1 italic">No client assigned</p>
                        )}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN (70%) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* 2. OBJECTIVE */}
                        <section className="bg-white border border-slate-200 rounded-lg p-5">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Objective</h2>
                                <button onClick={() => openJobEdit('objective')} className="text-secondary text-xs font-bold hover:underline">Edit</button>
                            </div>
                            <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
                                {job.objective || job.description || <span className="italic text-on-surface-variant">No objective defined.</span>}
                            </p>
                        </section>

                        {/* 4. TASKS - FLUID LIST */}
                        <section className="flex flex-col flex-1">
                            <div className="flex justify-between items-center mb-4 mt-2">
                                <h2 className="text-lg font-bold text-primary tracking-tight">Tasks</h2>
                                <button
                                    onClick={() => setShowTaskForm(!showTaskForm)}
                                    className="btn btn-primary text-xs py-1.5 px-4 rounded shadow-sm font-medium flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Add task
                                </button>
                            </div>

                            {showTaskForm && (
                                <form onSubmit={handleCreateTask} className="mb-5 bg-white border border-slate-200 rounded-xl p-4 shadow-md flex flex-col gap-3">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">New Task</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowTaskForm(false)}
                                            className="text-slate-400 hover:text-slate-600 text-sm"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                                        placeholder="Task title (e.g. Build homepage)"
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        required
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Due Date</label>
                                            <input
                                                type="date"
                                                className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-secondary bg-slate-50 text-slate-700"
                                                value={newTaskDueDate}
                                                onChange={e => setNewTaskDueDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Assignee (Optional)</label>
                                            <select
                                                className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-secondary bg-slate-50 text-slate-700"
                                                value={newTaskPersonId}
                                                onChange={e => setNewTaskPersonId(e.target.value)}
                                            >
                                                <option value="">No assignee</option>
                                                {availablePeople.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} {p.company ? `(${p.company})` : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-secondary resize-none"
                                        rows={2}
                                        placeholder="Notes or description (optional)..."
                                        value={newTaskDescription}
                                        onChange={e => setNewTaskDescription(e.target.value)}
                                    />
                                    {/* Initial subtasks builder */}
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Subtasks</label>
                                        {newTaskSubtasks.length > 0 && (
                                            <div className="space-y-1 mb-2">
                                                {newTaskSubtasks.map((st, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs bg-white px-2.5 py-1 rounded border">
                                                        <span className="text-slate-700">├─ {st}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewTaskSubtasks(prev => prev.filter((_, i) => i !== idx))}
                                                            className="text-slate-400 hover:text-red-600 text-xs"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 border rounded px-2.5 py-1 text-xs outline-none focus:border-secondary bg-white"
                                                placeholder="Add a subtask (e.g. Get logo)"
                                                value={newSubtaskDraft}
                                                onChange={e => setNewSubtaskDraft(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (newSubtaskDraft.trim()) {
                                                            setNewTaskSubtasks(prev => [...prev, newSubtaskDraft.trim()]);
                                                            setNewSubtaskDraft('');
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newSubtaskDraft.trim()) {
                                                        setNewTaskSubtasks(prev => [...prev, newSubtaskDraft.trim()]);
                                                        setNewSubtaskDraft('');
                                                    }
                                                }}
                                                className="btn btn-outline text-xs py-1 px-3 rounded"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowTaskForm(false)}
                                            className="btn btn-outline text-xs py-1.5 px-4 rounded"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary text-xs py-1.5 px-4 rounded shadow-sm font-semibold"
                                        >
                                            Create Task
                                        </button>
                                    </div>
                                </form>
                            )}

                            {topLevelTasks.length === 0 ? (
                                <div className="bg-white border border-slate-200 border-dashed rounded-lg p-10 text-center text-sm text-on-surface-variant">
                                    No tasks added yet. Create one to get started.
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
                                    {topLevelTasks.map(task => {
                                        const subtasks = tasks.filter(t => t.parent_task_id === task.id);
                                        const isTaskDone = task.status === 'Done' || task.status === 'completed';
                                        return (
                                            <div key={task.id} className="border-b last:border-b-0 border-slate-100 flex flex-col">
                                                {/* Parent Task Row */}
                                                <div
                                                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors group flex gap-3 items-start"
                                                    onClick={() => openTask(task)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 mt-1 accent-secondary rounded-sm cursor-pointer"
                                                        checked={isTaskDone}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => handleUpdateTask(task, { status: e.target.checked ? 'Done' : 'To Do' })}
                                                    />
                                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className={`text-sm font-medium text-primary truncate ${isTaskDone ? 'line-through opacity-60' : ''}`}>
                                                                {task.title}
                                                            </span>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {task.status !== 'Done' && task.status !== 'To Do' && (
                                                                    <span className="text-[10px] text-secondary bg-indigo-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        {task.status}
                                                                    </span>
                                                                )}
                                                                {task.due_date && (
                                                                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[14px]">event</span>
                                                                        {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setQuickSubtaskParentId(quickSubtaskParentId === task.id ? null : task.id);
                                                                        setQuickSubtaskTitle('');
                                                                    }}
                                                                    className="text-slate-400 hover:text-secondary p-1 rounded hover:bg-slate-200/50 transition-colors"
                                                                    title="Add subtask"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">add_task</span>
                                                                </button>
                                                                <div className="flex -space-x-1.5 min-w-[30px] justify-end">
                                                                    {task.people && task.people.map(p => (
                                                                        <div key={p.id} className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-bold text-primary z-10" title={p.name}>
                                                                            {p.name.substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTask(task.id);
                                                                    }}
                                                                    className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                                                    title="Delete task"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {task.description && (
                                                            <span className="text-xs text-on-surface-variant truncate opacity-80">{task.description}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Subtasks Tree Hierarchy */}
                                                {(subtasks.length > 0 || quickSubtaskParentId === task.id) && (
                                                    <div className="ml-7 border-l-2 border-indigo-100 pl-3 py-1 space-y-1 mb-2 bg-slate-50/40 rounded-r">
                                                        {subtasks.map((sub, sIdx) => {
                                                            const isLast = sIdx === subtasks.length - 1 && quickSubtaskParentId !== task.id;
                                                            const isSubDone = sub.status === 'Done' || sub.status === 'completed';
                                                            return (
                                                                <div
                                                                    key={sub.id}
                                                                    className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-100 cursor-pointer group/sub transition-colors"
                                                                    onClick={() => openTask(sub)}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="text-slate-400 font-mono text-xs select-none">
                                                                            {isLast ? '└─' : '├─'}
                                                                        </span>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-3.5 h-3.5 accent-secondary rounded-sm cursor-pointer"
                                                                            checked={isSubDone}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onChange={(e) => handleUpdateTask(sub, { status: e.target.checked ? 'Done' : 'To Do' })}
                                                                        />
                                                                        <span className={`text-xs text-primary font-medium truncate ${isSubDone ? 'line-through opacity-60' : ''}`}>
                                                                            {sub.title}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        {sub.due_date && (
                                                                            <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
                                                                                <span className="material-symbols-outlined text-[12px]">event</span>
                                                                                {new Date(sub.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteTask(sub.id, true);
                                                                            }}
                                                                            className="text-slate-300 hover:text-red-600 opacity-0 group-hover/sub:opacity-100 transition-opacity p-0.5"
                                                                            title="Delete subtask"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Quick Inline Subtask Form */}
                                                        {quickSubtaskParentId === task.id && (
                                                            <form
                                                                onSubmit={(e) => handleQuickAddSubtask(e, task.id)}
                                                                className="flex items-center gap-2 p-1.5"
                                                            >
                                                                <span className="text-slate-400 font-mono text-xs select-none">└─</span>
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    className="flex-1 border rounded px-2.5 py-1 text-xs outline-none focus:border-secondary bg-white text-primary"
                                                                    placeholder="Subtask title (e.g. Get logo)"
                                                                    value={quickSubtaskTitle}
                                                                    onChange={e => setQuickSubtaskTitle(e.target.value)}
                                                                />
                                                                <button
                                                                    type="submit"
                                                                    className="btn btn-primary text-xs py-1 px-3 rounded shadow-sm"
                                                                >
                                                                    Add
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setQuickSubtaskParentId(null);
                                                                        setQuickSubtaskTitle('');
                                                                    }}
                                                                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </form>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN (30%) */}
                    <div className="lg:col-span-4 flex flex-col gap-5">

                        {/* PROGRESS TILE */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Progress</h2>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-bold text-primary">{completedTasks} / {topLevelTasks.length} tasks completed</span>
                                <span className="text-sm font-bold text-secondary">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div className="bg-secondary h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>

                        {/* CALL ASSISTANT CONFIGURATION */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Call Assistant Config</h2>
                                <button onClick={openConfigModal} className="text-secondary text-[10px] font-bold hover:underline">
                                    {callConfig ? 'Edit Config' : 'Configure'}
                                </button>
                            </div>
                            
                            {callConfig ? (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Target Profile</h3>
                                        <p className="text-xs text-primary">{callConfig.target_person}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Objective</h3>
                                        <p className="text-xs text-primary">{callConfig.objective}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Information to collect</h3>
                                        <ul className="text-xs text-primary list-disc pl-4 space-y-1">
                                            {callConfig.required_information.map((q, i) => (
                                                <li key={i}>{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="pt-2">
                                        <button onClick={() => openConfigModal()} className="btn btn-outline w-full text-xs py-1.5 flex justify-center items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">tune</span>
                                            View Full Configuration
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-center">
                                    <span className="material-symbols-outlined text-yellow-600 mb-2">warning</span>
                                    <p className="text-xs text-yellow-800 font-medium mb-1">Not Configured</p>
                                    <p className="text-[10px] text-yellow-700 mb-3">Ergon requires a brief before it can make calls for this job.</p>
                                    <button onClick={openConfigModal} className="btn bg-yellow-600 text-white text-xs py-1.5 px-4 rounded shadow-sm hover:bg-yellow-700">
                                        Start Configuration
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* PEOPLE */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">People</h2>
                                <button onClick={() => openPersonModal('job')} className="text-secondary hover:bg-indigo-50 rounded px-1 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                            </div>
                            {people.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">No people associated.</p>
                            ) : (
                                <div className="space-y-2">
                                    {people.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-1.5 -mx-1.5 rounded hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/person/${p.id}`)}>
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-primary">
                                                    {p.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-xs text-primary font-medium block">{p.name}</span>
                                                    <span className="text-[10px] text-on-surface-variant uppercase">{p.type || 'Contact'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); navigate(`/ai-call?person_id=${p.id}&job_id=${job.id}`); }} className="text-secondary hover:bg-indigo-50 p-1 rounded transition-colors" title="Call">
                                                    <span className="material-symbols-outlined text-[16px]">phone_in_talk</span>
                                                </button>
                                                <button onClick={() => promptRemovePersonFromJob(p.id, p.name)} className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Remove">
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* MILESTONES */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Milestones</h2>
                                <button onClick={() => setShowMilestoneForm(!showMilestoneForm)} className="text-secondary hover:bg-indigo-50 rounded px-1 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                            </div>

                            {showMilestoneForm && (
                                <form onSubmit={handleCreateMilestone} className="mb-3 bg-slate-50 border rounded p-2 text-xs flex flex-col gap-2">
                                    <input type="text" placeholder="Title" value={newMilestoneTitle} onChange={e => setNewMilestoneTitle(e.target.value)} className="border p-1 rounded" required />
                                    <input type="date" value={newMilestoneDate} onChange={e => setNewMilestoneDate(e.target.value)} className="border p-1 rounded" required />
                                    <div className="flex gap-2">
                                        <button type="submit" className="bg-primary text-white px-2 py-1 rounded text-[10px]">Save</button>
                                        <button type="button" onClick={() => setShowMilestoneForm(false)} className="bg-white border px-2 py-1 rounded text-[10px]">Cancel</button>
                                    </div>
                                </form>
                            )}

                            {milestones.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">No milestones added.</p>
                            ) : (
                                <div className="space-y-3">
                                    {milestones.map(ms => (
                                        <div key={ms.id}>
                                            <p className="text-xs font-bold text-primary">{ms.title}</p>
                                            <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1 mt-0.5">
                                                <span className="material-symbols-outlined text-[10px]">event</span> {new Date(ms.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* UPCOMING */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Upcoming</h2>
                            {calendar_events.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">No upcoming events.</p>
                            ) : (
                                <div className="space-y-3">
                                    {calendar_events.filter(e => e.status !== 'cancelled').map(ce => (
                                        <div key={ce.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50" onClick={() => navigate('/calendar')}>
                                            <div>
                                                <p className={`text-xs font-bold ${ce.status === 'completed' ? 'text-on-surface-variant line-through' : 'text-primary'}`}>{ce.title}</p>
                                                <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                                                    <span className="material-symbols-outlined text-[10px]">event</span>
                                                    {new Date(ce.start_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className="text-[9px] uppercase tracking-wider font-bold text-secondary bg-indigo-50 px-1.5 py-0.5 rounded">{ce.event_type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PAYMENTS */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Payments</h2>
                                <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="text-secondary hover:bg-indigo-50 rounded px-1 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                            </div>

                            {showPaymentForm && (
                                <form onSubmit={handleCreatePayment} className="mb-3 bg-slate-50 border rounded p-2 text-xs flex flex-col gap-2">
                                    <input type="text" placeholder="Title (e.g. Initial Payment)" value={paymentData.title || ''} onChange={e => setPaymentData({...paymentData, title: e.target.value})} className="border p-1 rounded" required />
                                    <textarea placeholder="Description (e.g. Website Development Advance)" value={paymentData.description || ''} onChange={e => setPaymentData({...paymentData, description: e.target.value})} className="border p-1 rounded" rows={2}></textarea>
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="Amount" value={paymentData.amount || ''} onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})} className="border p-1 rounded flex-1" required />
                                        <select value={paymentData.currency} onChange={e => setPaymentData({...paymentData, currency: e.target.value})} className="border p-1 rounded bg-white">
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                    <input type="date" value={paymentData.due_at ? paymentData.due_at.slice(0,10) : ''} onChange={e => setPaymentData({...paymentData, due_at: new Date(e.target.value).toISOString()})} className="border p-1 rounded" required />
                                    <div className="flex gap-2">
                                        <button type="submit" className="bg-primary text-white px-2 py-1 rounded text-[10px]">Create Payment Link</button>
                                        <button type="button" onClick={() => setShowPaymentForm(false)} className="bg-white border px-2 py-1 rounded text-[10px]">Cancel</button>
                                    </div>
                                </form>
                            )}

                            {payments.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">No payments yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {payments.map(p => (
                                        <div key={p.id} className="flex flex-col border-b pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-xs font-bold text-primary">{p.title || 'Payment'}</p>
                                                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{p.currency} {p.amount.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${p.status === 'paid' ? 'text-green-600' : p.status === 'overdue' ? 'text-error' : 'text-slate-500'}`}>{p.status}</p>
                                                    {p.status === 'paid' && p.paid_at && <p className="text-[9px] text-on-surface-variant mt-0.5">Paid {new Date(p.paid_at).toLocaleDateString()}</p>}
                                                    {p.status !== 'paid' && p.due_at && <p className="text-[9px] text-on-surface-variant mt-0.5">Due {new Date(p.due_at).toLocaleDateString()}</p>}
                                                </div>
                                            </div>
                                            {(p.status === 'requested' || p.status === 'pending' || p.status === 'overdue') && p.metadata?.payment_link_url && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => window.open(p.metadata.payment_link_url, '_blank')} className="btn btn-outline text-[10px] py-1 px-2 border-secondary text-secondary">Open Payment</button>
                                                    <button onClick={() => { navigator.clipboard.writeText(p.metadata.payment_link_url); alert('Payment link copied.'); }} className="btn btn-outline text-[10px] py-1 px-2 text-slate-500 border-slate-300">Copy Link</button>
                                                    <button onClick={async () => {
                                                        if (window.confirm('Cancel this payment request?')) {
                                                            await PaymentService.update(p.id, { status: 'cancelled' });
                                                            loadData();
                                                        }
                                                    }} className="btn btn-outline text-[10px] py-1 px-2 text-error border-error">Cancel</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* AI CALLS */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm max-h-[300px] overflow-y-auto">
                            <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">AI Calls</h2>
                            {(!job.calls || job.calls.length === 0) ? (
                                <p className="text-xs text-on-surface-variant italic">No AI calls recorded yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {job.calls.map(call => (
                                        <div key={call.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-bold text-primary">Call</p>
                                                <span className="text-[9px] text-on-surface-variant font-mono">{new Date(call.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] text-on-surface-variant mb-2">Duration: {call.duration_seconds}s</p>
                                            <p className="text-xs text-primary leading-relaxed">{call.summary}</p>
                                            {call.extracted_data && call.extracted_data.call_outcome && (
                                                <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 text-secondary font-bold text-[9px] rounded uppercase tracking-widest">
                                                    {call.extracted_data.call_outcome}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ACTIVITY */}
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm max-h-[300px] overflow-y-auto">
                            <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Activity</h2>
                            {activities.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">No activity recorded yet.</p>
                            ) : (
                                <div className="space-y-4 pl-2 border-l border-slate-200 ml-1">
                                    {activities.map(act => (
                                        <div key={act.id} className="relative">
                                            <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                                            <p className="text-xs font-bold text-primary leading-tight">{act.title}</p>
                                            <p className="text-[9px] text-on-surface-variant mt-0.5">{new Date(act.created_at).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* 5. TASK DETAIL POPUP */}
            {isTaskModalOpen && activeTask && (
                <div className="fixed inset-0 bg-slate-900/30 z-50 flex justify-end">
                    <div className="bg-white shadow-2xl w-full max-w-xl h-full flex flex-col animate-slide-in-right">
                        <div className="p-4 border-b flex justify-between items-start bg-slate-50">
                            <div className="flex gap-3 pt-1 flex-1 min-w-0 pr-4">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 mt-1 accent-secondary rounded-sm cursor-pointer shrink-0"
                                    checked={activeTask.status === 'Done' || activeTask.status === 'completed'}
                                    onChange={(e) => handleUpdateTask(activeTask, { status: e.target.checked ? 'Done' : 'To Do' })}
                                />
                                <div className="flex-1 min-w-0">
                                    {isEditingTitle ? (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full text-sm font-bold border rounded px-2 py-1 outline-none focus:border-secondary text-primary"
                                                value={titleInput}
                                                onChange={e => setTitleInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
                                            />
                                            <button onClick={saveTitle} className="btn btn-primary text-xs px-2.5 py-1 rounded">Save</button>
                                            <button onClick={() => setIsEditingTitle(false)} className="btn btn-outline text-xs px-2 py-1 rounded">✕</button>
                                        </div>
                                    ) : (
                                        <div className="group/title flex items-center gap-1.5 cursor-pointer" onClick={() => { setIsEditingTitle(true); setTitleInput(activeTask.title); }}>
                                            <h3 className="text-lg font-bold text-primary leading-tight hover:text-secondary transition-colors truncate">{activeTask.title}</h3>
                                            <span className="material-symbols-outlined text-xs text-slate-400 group-hover/title:text-secondary opacity-0 group-hover/title:opacity-100 transition-opacity">edit</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">
                                            {activeTask.parent_task_id ? 'Subtask Details' : 'Task Details'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => handleDeleteTask(activeTask.id, !!activeTask.parent_task_id)} className="text-on-surface-variant hover:text-error p-1.5 rounded transition-colors" title="Delete">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                                <button onClick={() => setTaskModalOpen(false)} className="text-on-surface-variant hover:text-primary p-1.5 rounded transition-colors" title="Close">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Status</label>
                                    <select
                                        className="w-full bg-white text-secondary text-xs font-bold px-2 py-1.5 border rounded outline-none cursor-pointer"
                                        value={activeTask.status}
                                        onChange={(e) => handleUpdateTask(activeTask, { status: e.target.value })}
                                    >
                                        <option value="To Do">To Do</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Priority</label>
                                    <select
                                        className="w-full bg-white text-primary text-xs font-medium px-2 py-1.5 border rounded outline-none cursor-pointer"
                                        value={activeTask.priority || ''}
                                        onChange={(e) => handleUpdateTask(activeTask, { priority: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white text-primary text-xs font-medium px-2 py-1.5 border rounded outline-none cursor-pointer"
                                        value={activeTask.due_date ? activeTask.due_date.slice(0, 10) : ''}
                                        onChange={(e) => handleUpdateTask(activeTask, { due_date: e.target.value ? new Date(e.target.value).toISOString() : (null as any) })}
                                    />
                                </div>
                            </div>

                            {/* Description / Notes */}
                            <div>
                                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Description / Notes</label>
                                {isEditingDesc ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            className="w-full text-sm p-3 border rounded-lg outline-none focus:border-secondary min-h-[100px]"
                                            value={descInput}
                                            onChange={e => setDescInput(e.target.value)}
                                            placeholder="Add notes or description..."
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={saveDescription} className="btn btn-primary text-xs py-1.5 px-3 rounded">Save</button>
                                            <button onClick={() => setIsEditingDesc(false)} className="btn btn-outline text-xs py-1.5 px-3 rounded">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`text-sm p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${!activeTask.description ? 'text-on-surface-variant italic' : 'text-primary'}`}
                                        onClick={() => {
                                            setDescInput(activeTask.description || '');
                                            setIsEditingDesc(true);
                                        }}
                                    >
                                        {activeTask.description || "Click to add notes or a description."}
                                    </div>
                                )}
                            </div>

                            {/* Subtasks (only for top-level tasks) */}
                            {!activeTask.parent_task_id && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Subtasks</label>
                                        <button onClick={() => setShowSubtaskForm(!showSubtaskForm)} className="text-secondary text-[10px] font-bold hover:underline">+ Add subtask</button>
                                    </div>

                                    {showSubtaskForm && (
                                        <form onSubmit={handleCreateSubtask} className="mb-3 flex gap-2">
                                            <input
                                                autoFocus type="text"
                                                className="flex-1 border rounded px-2.5 py-1 text-xs outline-none focus:border-secondary"
                                                placeholder="Subtask title (e.g. Get logo)"
                                                value={newSubtaskTitle}
                                                onChange={e => setNewSubtaskTitle(e.target.value)}
                                            />
                                            <button type="submit" className="bg-primary text-white text-xs px-3 rounded font-medium">Add</button>
                                            <button type="button" onClick={() => setShowSubtaskForm(false)} className="btn btn-outline text-xs px-2 rounded">Cancel</button>
                                        </form>
                                    )}

                                    <div className="space-y-1">
                                        {tasks.filter(t => t.parent_task_id === activeTask.id).map(sub => {
                                            const isSubDone = sub.status === 'Done' || sub.status === 'completed';
                                            return (
                                                <div key={sub.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50 group">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="accent-secondary rounded-sm cursor-pointer"
                                                            checked={isSubDone}
                                                            onChange={(e) => handleUpdateTask(sub, { status: e.target.checked ? 'Done' : 'To Do' })}
                                                        />
                                                        <span className={`text-xs font-medium text-primary ${isSubDone ? 'line-through opacity-60' : ''}`}>
                                                            {sub.title}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => handleDeleteTask(sub.id, true)} className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 p-0.5" title="Delete subtask">
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {tasks.filter(t => t.parent_task_id === activeTask.id).length === 0 && (
                                            <p className="text-xs text-on-surface-variant italic">No subtasks yet. Add subtasks to break down this task.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* People */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Assignees</label>
                                    <button onClick={() => openPersonModal('task')} className="text-secondary text-[10px] font-bold hover:underline flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">person_add</span> Add
                                    </button>
                                </div>
                                {(!activeTask.people || activeTask.people.length === 0) ? (
                                    <p className="text-xs text-on-surface-variant italic border border-dashed p-3 rounded-lg text-center bg-slate-50/50">No people assigned.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {activeTask.people.map(p => (
                                            <div key={p.id} className="flex items-center gap-1.5 bg-white border px-2 py-1.5 rounded shadow-sm group">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-primary">
                                                    {p.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-xs font-medium text-primary mr-1">{p.name}</span>
                                                <button onClick={() => removePersonFromTask(activeTask.id, p.id, activeTask.people || [])} className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PERSON SELECTOR MODAL */}
            {isPersonModalOpen && (
                <div className="fixed inset-0 bg-slate-900/30 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg border shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-base font-bold text-primary">Select Person</h3>
                            <button onClick={() => setPersonModalOpen(false)} className="text-on-surface-variant hover:text-primary">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {availablePeople.length === 0 ? (
                                <p className="text-sm text-center text-on-surface-variant italic">No people found. Please create someone in the directory first.</p>
                            ) : (
                                availablePeople.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-secondary cursor-pointer transition-colors" onClick={() => selectPerson(p)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-primary">
                                                {p.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-primary">{p.name}</p>
                                                <p className="text-[10px] text-on-surface-variant uppercase">{p.type}</p>
                                            </div>
                                        </div>
                                        <button className="text-secondary text-xs font-bold">Add</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT JOB MODAL */}
            {jobEditField && (
                <div className="fixed inset-0 bg-slate-900/30 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-base font-bold text-primary capitalize">Edit {jobEditField}</h3>
                            <button onClick={() => setJobEditField(null)} className="text-on-surface-variant hover:text-primary">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="p-5">
                            {jobEditField === 'title' ? (
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full border rounded p-3 text-sm outline-none focus:border-secondary"
                                    value={jobEditValue}
                                    onChange={e => setJobEditValue(e.target.value)}
                                />
                            ) : (
                                <textarea
                                    autoFocus
                                    className="w-full border rounded p-3 text-sm outline-none focus:border-secondary min-h-[200px] font-mono"
                                    value={jobEditValue}
                                    onChange={e => setJobEditValue(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => setJobEditField(null)} className="btn btn-outline text-sm py-1.5 px-4 rounded">Cancel</button>
                            <button onClick={saveJobEdit} disabled={isSavingJob} className="btn btn-primary text-sm py-1.5 px-4 rounded">
                                {isSavingJob ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL */}
            {confirmAction && (
                <div className="fixed inset-0 bg-slate-900/30 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-5 text-center">
                            <span className="material-symbols-outlined text-4xl text-error mb-3">warning</span>
                            <h3 className="text-lg font-bold text-primary mb-2">Confirm Action</h3>
                            <p className="text-sm text-on-surface-variant">{confirmAction.message}</p>
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-center gap-3">
                            <button onClick={() => setConfirmAction(null)} className="btn btn-outline text-sm py-1.5 px-4 rounded">Cancel</button>
                            <button onClick={async () => {
                                await confirmAction.action();
                                setConfirmAction(null);
                            }} className="bg-error text-white font-medium text-sm py-1.5 px-4 rounded hover:bg-red-600 transition-colors">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CALL ASSISTANT CONFIG MODAL */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 bg-slate-900/30 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-primary">Configure Call Assistant</h3>
                                <p className="text-xs text-on-surface-variant">Clarifying requirements for {job?.title}</p>
                            </div>
                            <button onClick={() => setIsConfigModalOpen(false)} className="text-on-surface-variant hover:text-primary">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-slate-50/50">
                            {callConfig && configChatMessages.length <= 1 ? (
                                <div className="bg-white border rounded-lg p-5 shadow-sm text-xs text-primary space-y-4">
                                    <h4 className="font-bold text-sm border-b pb-2">Current Configuration</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="font-bold text-on-surface-variant block mb-1">Objective</span>{callConfig.objective}</div>
                                        <div><span className="font-bold text-on-surface-variant block mb-1">Target Person</span>{callConfig.target_person}</div>
                                        <div><span className="font-bold text-on-surface-variant block mb-1">Qualification Criteria</span>{callConfig.qualification_criteria.join(', ')}</div>
                                        <div><span className="font-bold text-on-surface-variant block mb-1">Follow-up</span>{callConfig.follow_up.join(', ')}</div>
                                    </div>
                                    <div>
                                        <span className="font-bold text-on-surface-variant block mb-1">Information to Collect</span>
                                        <ul className="list-disc pl-4 space-y-1">{callConfig.required_information.map((q, i) => <li key={i}>{q}</li>)}</ul>
                                    </div>
                                    <div>
                                        <span className="font-bold text-on-surface-variant block mb-1">Disqualification & Call End Conditions</span>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {callConfig.disqualification_conditions.map((c, i) => <li key={i}>{c}</li>)}
                                            {callConfig.call_end_conditions.map((c, i) => <li key={`end-${i}`}>{c}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            ) : null}

                            {configChatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'ergon' ? 'bg-secondary text-white' : 'bg-slate-200 text-primary font-bold text-xs'}`}>
                                        {msg.sender === 'ergon' ? <span className="material-symbols-outlined text-[16px]">smart_toy</span> : 'U'}
                                    </div>
                                    <div className={`p-3 rounded-lg text-sm ${msg.sender === 'ergon' ? 'bg-white border border-slate-200 text-primary rounded-tl-none' : 'bg-primary text-white rounded-tr-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {configError && <p className="text-sm text-error bg-red-50 border border-red-100 rounded-lg p-3">{configError}</p>}
                        </div>

                        <div className="p-4 border-t bg-white shrink-0">
                            <form onSubmit={handleConfigChatSubmit} className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-secondary"
                                    placeholder="Type your answer or instructions..."
                                    value={configChatInput}
                                    onChange={e => setConfigChatInput(e.target.value)}
                                />
                                <button type="submit" className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-slate-800 shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                </button>
                            </form>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                                <span className="text-[10px] text-on-surface-variant">Chat with Ergon until requirements are clear.</span>
                                <button 
                                    onClick={generateAndSaveConfig}
                                    disabled={isGeneratingConfig || configChatMessages.length < 2}
                                    className="btn btn-secondary text-xs py-1.5 px-4 rounded font-medium disabled:opacity-50"
                                >
                                    {isGeneratingConfig ? 'Generating...' : 'Generate & Save Config'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
