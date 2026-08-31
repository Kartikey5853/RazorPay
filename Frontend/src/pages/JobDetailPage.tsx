import React from 'react';
import { useNavigate } from 'react-router-dom';

export const JobDetailPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="w-full pb-32 pt-12">
            <div className="w-full">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-slate-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider" style={{ color: '#334155' }}>Acme Productions</span>
                            <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#e0e7ff', color: 'var(--secondary)' }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--secondary)' }}></div> Sourcing
                            </span>
                        </div>
                        <h1 className="text-4xl font-bold text-primary tracking-tight">Find Lead Actor</h1>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn btn-outline bg-white shadow-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">edit</span> Edit
                        </button>
                        <button className="btn btn-primary shadow-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">share</span> Share
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-bento">
                    <section className="lg:col-span-12 glass-panel rounded-xl p-8 flex flex-col justify-center">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-2xl">target</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Job Objective</h3>
                                <p className="text-on-surface-variant max-w-4xl leading-relaxed text-lg">
                                    Source, screen, and secure a charismatic lead actor in their late 20s for "Neon Horizon". Background in physical theater required.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="lg:col-span-8 rounded-xl overflow-hidden relative cursor-pointer" style={{ backgroundColor: '#eef2ff', border: '1px solid #e0e7ff', minHeight: '320px' }}>
                        <div className="p-8 relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-secondary">priority_high</span>
                                    <span className="text-xs font-bold text-secondary uppercase tracking-widest">Priority Action Required</span>
                                </div>
                                <h2 className="text-3xl font-bold text-primary mb-4">Review 3 Shortlisted Candidates</h2>
                                <p className="text-on-surface-variant text-lg max-w-2xl">AI screening has identified high-match actors who passed initial checks.</p>
                            </div>
                            <div className="flex items-center gap-4 mt-8">
                                <button className="btn btn-secondary shadow-md flex items-center gap-2 text-base px-6 py-3">
                                    Review Profiles <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="lg:col-span-4 glass-panel rounded-xl p-8 flex flex-col">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><span className="material-symbols-outlined">account_balance_wallet</span> Budget</h3>
                        <div className="mb-8 flex-1">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-4xl font-bold text-primary">$12,450</span>
                                <span className="text-base text-on-surface-variant mb-1 font-medium">/ $25k</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full overflow-hidden" style={{ height: '0.5rem' }}>
                                <div className="bg-secondary h-full rounded-full w-1/2"></div>
                            </div>
                        </div>
                        <div className="space-y-4 text-sm text-on-surface-variant">
                            <div className="flex justify-between border-b pb-3">
                                <span>Agency Fees</span><span className="font-mono font-bold text-primary">$4,500</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Sourcing Tools</span><span className="font-mono font-bold text-primary">$1,250</span>
                            </div>
                        </div>
                    </section>

                    <section onClick={() => navigate('/ai-call')} className="lg:col-span-6 glass-panel rounded-xl p-8 cursor-pointer" style={{ transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--secondary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#4f46e5' }}><span className="material-symbols-outlined">smart_toy</span> Start AI Call Agent</h3>
                        <p className="text-on-surface-variant mb-6">Launch automated voice screening for candidates in the 'Interested' stage.</p>
                        <button className="btn btn-primary w-full py-4 text-base shadow-sm">
                            <span className="material-symbols-outlined">play_arrow</span> Start Dispatching Calls
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};
