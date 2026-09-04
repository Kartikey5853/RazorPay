import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoGrid, BentoCard } from '../components/ui/bento-grid';
import { CalendarService, type CalendarEvent } from '../services/api';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        CalendarService.getAll().then(events => {
            setTodayEvents(events.filter(e => e.start_at.startsWith(todayStr)));
        });
    }, []);
    
    return (
        <div className="w-full pb-32">
            <header className="flex justify-end gap-4 mb-8">
                <button onClick={() => navigate('/add-person')} className="btn btn-outline shadow-sm bg-white" style={{ borderColor: 'var(--glass-border)' }}>
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Add Person</span>
                </button>
                <button onClick={() => navigate('/create-job')} className="btn btn-primary shadow-sm">
                    <span className="material-symbols-outlined text-sm">add_task</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Create Job</span>
                </button>
                <button className="btn btn-secondary shadow-sm">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Ask AI</span>
                </button>
            </header>

            <BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[16rem]">
                {/* 1. NEEDS ATTENTION */}
                <BentoCard
                    name="Needs Attention"
                    Icon="warning"
                    className="lg:col-span-2"
                    background={<div className="absolute inset-0 bg-gradient-to-br from-error/5 to-transparent pointer-events-none" />}
                    description="Review and resolve 4 pending issues requiring human intervention, including overdue payments and awaiting responses."
                    cta="View Alerts"
                    href="/dashboard"
                />

                {/* 2. ACTIVE JOBS */}
                <BentoCard
                    name="Active Jobs"
                    Icon="work_history"
                    className="lg:col-span-1"
                    background={<div className="absolute top-4 right-4"><span className="material-symbols-outlined text-outline-variant opacity-20" style={{ fontSize: '120px' }}>work</span></div>}
                    description="Track and manage ongoing processes, view AI progress, and check recommended next actions."
                    cta="View Jobs"
                    href="/jobs"
                />

                {/* 3. TODAY */}
                <BentoCard
                    name="Today"
                    Icon="today"
                    className="lg:col-span-1 overflow-y-auto custom-scrollbar"
                    background={<div className="absolute inset-0 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none" />}
                    description={
                        <div className="flex flex-col gap-2 mt-2 w-full pr-2">
                            {todayEvents.length > 0 ? todayEvents.map(evt => (
                                <div key={evt.id} onClick={(e) => { e.preventDefault(); navigate('/calendar'); }} className="bg-white/80 p-2 rounded border border-slate-200 text-slate-800 text-xs shadow-sm cursor-pointer hover:bg-white transition-colors">
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
                                "No events scheduled for today."
                            )}
                        </div>
                    }
                    cta="View Schedule"
                    href="/calendar"
                />

                {/* 4. ERGON ACTIVITY */}
                <BentoCard
                    name="Ergon Activity"
                    Icon="history"
                    className="lg:col-span-2"
                    background={<div className="absolute -bottom-10 -right-10"><span className="material-symbols-outlined text-secondary opacity-10" style={{ fontSize: '150px' }}>history</span></div>}
                    description="Review the chronological log of actions already performed by Ergon, including calls completed and messages sent."
                    cta="View Activity"
                    href="/dashboard"
                />
            </BentoGrid>
        </div>
    );
};
