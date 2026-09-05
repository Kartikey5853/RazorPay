import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoGrid, BentoCard } from '../components/ui/bento-grid';
import { ActionCenterDrawer } from '../components/ActionCenterDrawer';
import { 
  CalendarService, 
  PaymentService, 
  ActionCenterService,
  type CalendarEvent, 
  type Payment, 
  type PendingAction,
  type ActionSummary 
} from '../services/api';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
    const [overduePayments, setOverduePayments] = useState<Payment[]>([]);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [actionSummary, setActionSummary] = useState<ActionSummary | null>(null);
    const [isActionCenterOpen, setIsActionCenterOpen] = useState(false);

    const loadData = () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        CalendarService.getAll().then(events => {
            setTodayEvents(events.filter(e => e.start_at.startsWith(todayStr)));
        }).catch(console.error);

        PaymentService.getAll({ status: 'overdue' }).then(setOverduePayments).catch(console.error);

        ActionCenterService.getPending().then(setPendingActions).catch(console.error);
        ActionCenterService.getSummary().then(setActionSummary).catch(console.error);
    };

    useEffect(() => {
        loadData();
    }, []);

    const emailActions = pendingActions.filter(a => a.type === 'email');
    const followupActions = pendingActions.filter(a => a.type === 'follow_up' || a.type === 'reminder' || a.type === 'payment_reminder');
    
    return (
        <div className="w-full pb-32">
            {/* TOP HEADER & ACTIONS */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-primary tracking-tight">Executive Dashboard</h1>
                    <p className="text-xs text-on-surface-variant mt-0.5">Overview of active jobs, call insights, and confirmed schedule.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsActionCenterOpen(true)}
                        className="btn bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm relative flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-base">inbox</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Action Center</span>
                        {pendingActions.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center -mr-1 shadow-xs animate-pulse">
                                {pendingActions.length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => navigate('/add-person')} className="btn btn-outline shadow-sm bg-white" style={{ borderColor: 'var(--glass-border)' }}>
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Add Person</span>
                    </button>
                    <button onClick={() => navigate('/create-job')} className="btn btn-primary shadow-sm">
                        <span className="material-symbols-outlined text-sm">add_task</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Create Job</span>
                    </button>
                </div>
            </header>

            {/* NOTIFICATION BANNER */}
            {pendingActions.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-primary text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                            <span className="material-symbols-outlined text-xl">auto_awesome</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold">
                                Marcus has {pendingActions.length} suggestion{pendingActions.length > 1 ? 's' : ''} for you from recent calls
                            </p>
                            <p className="text-xs text-indigo-200 mt-0.5">
                                {[
                                    actionSummary?.emails_count ? `${actionSummary.emails_count} Email${actionSummary.emails_count > 1 ? 's' : ''} ready` : null,
                                    actionSummary?.reminders_count ? `${actionSummary.reminders_count} Reminder${actionSummary.reminders_count > 1 ? 's' : ''}` : null,
                                    actionSummary?.tasks_count ? `${actionSummary.tasks_count} Task${actionSummary.tasks_count > 1 ? 's' : ''}` : null,
                                    actionSummary?.followups_count ? `${actionSummary.followups_count} Follow-up${actionSummary.followups_count > 1 ? 's' : ''}` : null
                                ].filter(Boolean).join(' • ')}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsActionCenterOpen(true)}
                        className="btn bg-white text-indigo-950 hover:bg-slate-100 text-xs font-bold px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
                    >
                        Review Suggestions
                    </button>
                </div>
            )}

            {/* SECTION LABEL: ACTION CENTER */}
            <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Marcus Action Center</h2>
            </div>

            {/* ACTION CENTER BENTO GRID */}
            <BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[17rem] mb-8">
                {/* 1. PENDING ACTIONS BENTO */}
                <BentoCard
                    name={`🔴 ${pendingActions.length} Pending Actions`}
                    Icon="pending_actions"
                    className="lg:col-span-1 overflow-y-auto custom-scrollbar cursor-pointer border-l-4 border-l-red-500"
                    background={<div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />}
                    onClick={() => setIsActionCenterOpen(true)}
                    description={
                        <div className="flex flex-col gap-2 mt-2 w-full pr-2">
                            {pendingActions.length > 0 ? (
                                pendingActions.slice(0, 4).map(action => (
                                    <div 
                                        key={action.id} 
                                        className="bg-white/90 p-2 rounded-lg border border-slate-200 text-slate-800 text-xs shadow-xs hover:border-secondary transition-colors"
                                    >
                                        <div className="flex justify-between items-start font-bold">
                                            <span className="truncate text-primary">{action.title}</span>
                                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-mono">
                                                {action.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        {action.person_name && (
                                            <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">Contact: {action.person_name}</p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 italic py-4 text-center">No pending items. All post-call actions confirmed.</p>
                            )}
                        </div>
                    }
                    cta="Open Action Center"
                    href="#"
                />

                {/* 2. UPCOMING FOLLOW-UPS BENTO */}
                <BentoCard
                    name={`🟡 Upcoming Follow-ups`}
                    Icon="notifications_active"
                    className="lg:col-span-1 overflow-y-auto custom-scrollbar cursor-pointer border-l-4 border-l-amber-400"
                    background={<div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none" />}
                    onClick={() => setIsActionCenterOpen(true)}
                    description={
                        <div className="flex flex-col gap-2 mt-2 w-full pr-2">
                            {followupActions.length > 0 ? (
                                followupActions.slice(0, 3).map(action => {
                                    const p = action.payload || {};
                                    return (
                                        <div key={action.id} className="bg-white/90 p-2.5 rounded-lg border border-amber-200/70 text-slate-800 text-xs shadow-xs">
                                            <div className="flex justify-between items-start font-bold">
                                                <span className="truncate text-primary">{action.title}</span>
                                                <span className="text-[10px] text-amber-700 font-semibold shrink-0">
                                                    {p.date || p.due_date || 'Soon'}
                                                </span>
                                            </div>
                                            {action.description && (
                                                <p className="text-[10px] text-slate-600 line-clamp-1 mt-1">"{action.description}"</p>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-slate-500 italic py-4 text-center">No upcoming follow-ups queued from calls.</p>
                            )}
                        </div>
                    }
                    cta="Review Follow-ups"
                    href="#"
                />

                {/* 3. SUGGESTED EMAILS BENTO */}
                <BentoCard
                    name={`📧 Suggested Emails`}
                    Icon="mail"
                    className="lg:col-span-1 overflow-y-auto custom-scrollbar cursor-pointer border-l-4 border-l-indigo-500"
                    background={<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />}
                    onClick={() => setIsActionCenterOpen(true)}
                    description={
                        <div className="flex flex-col gap-2 mt-2 w-full pr-2">
                            {emailActions.length > 0 ? (
                                emailActions.slice(0, 3).map(action => {
                                    const p = action.payload || {};
                                    return (
                                        <div key={action.id} className="bg-white/90 p-2.5 rounded-lg border border-indigo-200/70 text-slate-800 text-xs shadow-xs">
                                            <div className="flex justify-between items-start font-bold">
                                                <span className="truncate text-primary">{action.person_name || 'Contact'}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold shrink-0">
                                                    Waiting for review
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-700 truncate mt-0.5">{p.subject || action.title}</p>
                                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 italic">"{p.body || action.description}"</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-slate-500 italic py-4 text-center">No drafted follow-up emails waiting to send.</p>
                            )}
                        </div>
                    }
                    cta="Review Emails"
                    href="#"
                />
            </BentoGrid>

            {/* SECTION LABEL: WORKSPACE & SCHEDULE */}
            <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Workspace & Schedule</h2>
            </div>

            {/* REGULAR BENTO GRID (SCHEDULE & JOBS) */}
            <BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[16rem]">
                {/* 4. TODAY'S CONFIRMED SCHEDULE BENTO */}
                <BentoCard
                    name="🟢 Today's Confirmed Schedule"
                    Icon="today"
                    className="lg:col-span-1 overflow-y-auto custom-scrollbar border-l-4 border-l-emerald-500"
                    background={<div className="absolute inset-0 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none" />}
                    description={
                        <div className="flex flex-col gap-2 mt-2 w-full pr-2">
                            {todayEvents.length > 0 ? todayEvents.map(evt => (
                                <div key={evt.id} onClick={(e) => { e.preventDefault(); navigate('/calendar'); }} className="bg-white/80 p-2 rounded border border-slate-200 text-slate-800 text-xs shadow-xs cursor-pointer hover:bg-white transition-colors">
                                    <div className="flex justify-between items-start font-bold mb-1">
                                        <span className="truncate">{evt.title}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(evt.start_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 text-[10px] text-slate-600">
                                        {evt.event_type.toLowerCase().includes('payment') && evt.amount ? (
                                            <span className="text-green-700 font-medium">Due: {evt.currency === 'INR' ? '₹' : evt.currency}{evt.amount.toLocaleString()}</span>
                                        ) : null}
                                        {evt.person_name && <span>— {evt.person_name}</span>}
                                        {evt.job_title && <span>{evt.job_title}</span>}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-500 italic py-4 text-center">No events scheduled for today.</p>
                            )}
                        </div>
                    }
                    cta="View Schedule"
                    href="/calendar"
                />

                {/* 5. ACTIVE JOBS */}
                <BentoCard
                    name="Active Jobs"
                    Icon="work_history"
                    className="lg:col-span-1"
                    background={<div className="absolute top-4 right-4"><span className="material-symbols-outlined text-outline-variant opacity-20" style={{ fontSize: '120px' }}>work</span></div>}
                    description="Track and manage ongoing processes, view AI progress, and check recommended next actions."
                    cta="View Jobs"
                    href="/jobs"
                />

                {/* 6. NEEDS ATTENTION / OVERDUE PAYMENTS */}
                <BentoCard
                    name="Needs Attention"
                    Icon="warning"
                    className="lg:col-span-1 overflow-y-auto custom-scrollbar"
                    background={<div className="absolute inset-0 bg-gradient-to-br from-error/5 to-transparent pointer-events-none" />}
                    description={
                        <div className="flex flex-col gap-2 mt-2 w-full pr-2">
                            {overduePayments.length > 0 ? overduePayments.map(p => (
                                <div key={p.id} onClick={(e) => { e.preventDefault(); if(p.job_id) navigate(`/job-detail/${p.job_id}`); else if(p.person_id) navigate(`/person/${p.person_id}`); }} className="bg-white/80 p-2 rounded border border-red-200 text-slate-800 text-xs shadow-xs cursor-pointer hover:bg-white transition-colors">
                                    <div className="flex justify-between items-start font-bold mb-1">
                                        <span className="truncate text-error">Overdue Payment</span>
                                        <span className="text-[10px] text-slate-500">{p.due_at ? new Date(p.due_at).toLocaleDateString() : ''}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 text-[10px] text-slate-600">
                                        <span className="font-medium">{p.currency} {p.amount.toLocaleString()} for {p.title}</span>
                                        {p.person_name && <span>Client: {p.person_name}</span>}
                                        {p.job_title && <span>Job: {p.job_title}</span>}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-500 italic py-4 text-center">No pending issues requiring human intervention at this time.</p>
                            )}
                        </div>
                    }
                    cta="View Details"
                    href="#"
                />
            </BentoGrid>

            {/* ACTION CENTER DRAWER */}
            <ActionCenterDrawer
                isOpen={isActionCenterOpen}
                onClose={() => setIsActionCenterOpen(false)}
                actions={pendingActions}
                onActionHandled={loadData}
            />
        </div>
    );
};
