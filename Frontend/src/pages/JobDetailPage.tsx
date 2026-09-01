import React from 'react';
import { useNavigate } from 'react-router-dom';

export const JobDetailPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="w-full pb-32 pt-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-secondary text-white text-xs font-bold px-2 py-1 rounded">IN PROGRESS</span>
                        <span className="text-on-surface-variant font-mono text-sm">JOB-4091</span>
                    </div>
                    <h1 className="text-4xl font-bold text-primary tracking-tight">Find Lead Actor</h1>
                    <p className="text-xl text-on-surface-variant mt-2 max-w-3xl">Identify, screen, and shortlist potential lead actors for Project X Production.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button className="flex-1 md:flex-none btn btn-outline bg-white flex flex-col items-center gap-1 h-auto py-2">
                        <span className="material-symbols-outlined text-sm">phone_in_talk</span>
                        <span className="text-[10px]">Call</span>
                    </button>
                    <button className="flex-1 md:flex-none btn btn-outline bg-white flex flex-col items-center gap-1 h-auto py-2">
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span className="text-[10px]">Message</span>
                    </button>
                    <button className="flex-1 md:flex-none btn btn-outline bg-white flex flex-col items-center gap-1 h-auto py-2">
                        <span className="material-symbols-outlined text-sm">payments</span>
                        <span className="text-[10px]">Payment</span>
                    </button>
                    <button className="flex-1 md:flex-none btn btn-outline bg-white flex flex-col items-center gap-1 h-auto py-2">
                        <span className="material-symbols-outlined text-sm">edit_calendar</span>
                        <span className="text-[10px]">Follow-up</span>
                    </button>
                    <button className="flex-1 md:flex-none btn btn-primary flex flex-col items-center gap-1 h-auto py-2 px-4 shadow-sm">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span className="text-[10px]">Ask Ergon</span>
                    </button>
                </div>
            </header>

            {/* AI Recommendation Banner */}
            <div className="bg-indigo-50 border border-secondary/20 rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-2xl">auto_awesome</span>
                    <div>
                        <p className="font-bold text-primary">Recommended Next Action</p>
                        <p className="text-sm text-secondary">Review 3 shortlisted candidates provided by recent screening call.</p>
                    </div>
                </div>
                <button className="btn btn-secondary text-sm">Review Now</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    
                    {/* Associated People & Progress */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass-panel rounded-xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">Associated People</h3>
                            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-lg transition-colors" onClick={() => navigate('/person-profile')}>
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-primary font-bold">
                                    PX
                                </div>
                                <div>
                                    <p className="font-bold text-primary">Project X Production</p>
                                    <p className="text-xs text-on-surface-variant">Production Company</p>
                                </div>
                                <span className="material-symbols-outlined ms-auto text-on-surface-variant">chevron_right</span>
                            </div>
                            <button className="w-full mt-4 btn btn-outline border-dashed py-2 text-sm text-on-surface-variant">
                                <span className="material-symbols-outlined text-sm">person_add</span> Add Person
                            </button>
                        </div>

                        <div className="glass-panel rounded-xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">Progress</h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-3xl font-bold text-primary">14 <span className="text-lg text-on-surface-variant font-normal">/ 20</span></span>
                                <span className="text-sm font-bold text-secondary">70%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                                <div className="bg-secondary h-2 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                            <p className="text-xs text-on-surface-variant">Candidates Screened</p>
                            <button className="w-full mt-4 btn btn-outline py-2 text-sm text-on-surface-variant">Update Status</button>
                        </div>
                    </div>

                    {/* Ergon Plan */}
                    <div className="glass-panel rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span> Ergon Plan
                            </h3>
                            <button className="btn btn-outline text-xs py-1 px-2">Edit Plan</button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-5">
                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent hidden"></div>
                            
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                                <div className="pb-4">
                                    <h4 className="font-bold text-primary text-sm flex items-center gap-2">
                                        Research Candidates
                                        <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">Done</span>
                                    </h4>
                                    <p className="text-sm text-on-surface-variant mt-1">Search databases for candidates matching the 5+ years experience requirement.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 flex-none relative">
                                    <span className="absolute inset-0 rounded-full bg-secondary animate-ping opacity-25"></span>
                                    2
                                </div>
                                <div className="pb-4">
                                    <h4 className="font-bold text-primary text-sm flex items-center gap-2">
                                        Initial Screening Calls
                                        <span className="bg-secondary/10 text-secondary text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">In Progress</span>
                                    </h4>
                                    <p className="text-sm text-on-surface-variant mt-1">Call shortlisted candidates to check availability and request reels.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                                <div>
                                    <h4 className="font-bold text-slate-500 text-sm">Follow-up & Collect Information</h4>
                                    <p className="text-sm text-slate-400 mt-1">Automatically message candidates who haven't responded within 2 days.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extracted Information / Files */}
                    <div className="glass-panel rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">Files & Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="border rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                <span className="material-symbols-outlined text-secondary bg-indigo-50 p-2 rounded">description</span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">Requirements_Doc.pdf</p>
                                    <p className="text-xs text-on-surface-variant">Uploaded 2 days ago</p>
                                </div>
                            </div>
                            <div className="border rounded-lg p-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                <span className="material-symbols-outlined text-secondary bg-indigo-50 p-2 rounded">link</span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">Reference Material</p>
                                    <p className="text-xs text-on-surface-variant">External Link</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Context / Actions log */}
                    <div className="glass-panel rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">Context</h3>
                        <div className="flex flex-col gap-3">
                            <div className="p-3 bg-slate-50 rounded-lg border">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold bg-indigo-50 text-secondary px-2 py-0.5 rounded uppercase">AI Call</span>
                                    <span className="text-xs text-on-surface-variant">Today, 10:00 AM</span>
                                </div>
                                <p className="text-sm font-bold">Screening with John Doe</p>
                                <p className="text-sm mt-1 text-on-surface-variant">Candidate fits requirements. Info extracted successfully.</p>
                                <button className="mt-2 text-xs font-bold text-secondary">View Transcript</button>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold bg-slate-100 text-on-surface-variant px-2 py-0.5 rounded uppercase">Message</span>
                                    <span className="text-xs text-on-surface-variant">Yesterday</span>
                                </div>
                                <p className="text-sm font-bold">Follow-up sent to 5 people</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded uppercase">Payment Requested</span>
                                    <span className="text-xs text-on-surface-variant">Oct 1</span>
                                </div>
                                <p className="text-sm font-bold">Invoice #1024</p>
                                <p className="text-sm mt-1 text-on-surface-variant">$500 for initial consultation.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Timeline */}
                <div className="lg:col-span-4">
                    <div className="glass-panel rounded-xl p-6 shadow-sm h-full max-h-[800px] overflow-y-auto">
                        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-6">Activity Timeline</h3>
                        
                        <div style={{ borderLeft: '2px solid var(--outline-variant)', display: 'flex', flexDirection: 'column', gap: '2rem', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                            {[
                                { title: "Job Created", desc: "Added by Admin User", time: "Oct 1, 2023", icon: "add_task", color: "var(--outline-variant)" },
                                { title: "Requirements Added", desc: "Added budget and constraints", time: "Oct 2, 2023", icon: "edit", color: "var(--outline-variant)" },
                                { title: "Ergon Plan Approved", desc: "Capabilities selected", time: "Oct 2, 2023", icon: "done_all", color: "var(--outline-variant)" },
                                { title: "Action Executed", desc: "Ergon contacted 20 people", time: "Oct 3, 2023", icon: "smart_toy", color: "var(--secondary)" },
                                { title: "Information Collected", desc: "Data extracted from call", time: "Today", icon: "fact_check", color: "var(--secondary)" },
                                { title: "Action Required", desc: "Review 3 items", time: "Just now", icon: "warning", color: "var(--error)" }
                            ].map((event, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[1.65rem] top-0 w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[16px]" style={{ color: event.color }}>{event.icon}</span>
                                    </div>
                                    <div className="pl-4">
                                        <p className="text-sm font-bold text-primary">{event.title}</p>
                                        <p className="text-sm text-on-surface-variant mt-1">{event.desc}</p>
                                        <p className="text-xs font-mono text-slate-400 mt-1">{event.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
