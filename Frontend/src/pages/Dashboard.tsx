import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    
    return (
        <div className="w-full pb-32">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-primary">ERGON</h1>
                    <h2 className="text-xl text-on-surface-variant font-medium mt-1">Operations Dashboard</h2>
                    <p className="text-sm text-on-surface-variant mt-2">System status: Normal. 3 alerts require attention.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button className="flex-1 md:flex-none btn btn-outline shadow-sm bg-white" style={{ borderColor: 'var(--glass-border)' }}>
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Add Person</span>
                    </button>
                    <button onClick={() => navigate('/create-job')} className="flex-1 md:flex-none btn btn-primary shadow-sm">
                        <span className="material-symbols-outlined text-sm">add_task</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Create Job</span>
                    </button>
                    <button className="flex-1 md:flex-none btn btn-secondary shadow-sm">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span className="text-xs font-bold uppercase tracking-wider">AI Insights</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-bento">
                <div className="lg:col-span-8 flex flex-col gap-bento">
                    {/* Attention Required */}
                    <section className="glass-panel rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="material-symbols-outlined text-error">warning</span>
                            <h3 className="text-lg font-bold text-primary">Attention Required</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border pulse-border rounded-xl p-4 flex flex-col gap-2 overflow-hidden relative group">
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--error)' }}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="material-symbols-outlined text-error p-1 text-sm rounded-full" style={{ backgroundColor: 'var(--error-container)' }}>payments</span>
                                    <span className="text-xs font-bold text-on-surface-variant uppercase">Overdue</span>
                                </div>
                                <h4 className="text-sm font-bold text-primary">Acme Corp Invoice</h4>
                                <p className="text-3xl font-bold text-error mt-2">$4,500</p>
                                <button className="mt-4 text-xs font-bold text-secondary flex items-center gap-1">Resolve Now <span className="material-symbols-outlined text-xs">arrow_forward</span></button>
                            </div>
                            <div className="bg-white border rounded-xl p-4 flex flex-col gap-2 overflow-hidden relative">
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--secondary)' }}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="material-symbols-outlined text-secondary bg-slate-100 p-1 text-sm rounded-full">hourglass_empty</span>
                                    <span className="text-xs font-bold text-on-surface-variant uppercase">Awaiting</span>
                                </div>
                                <h4 className="text-sm font-bold text-primary">Candidate Response</h4>
                                <p className="text-sm text-on-surface-variant">Sarah Jenkins (Sr. Dev)</p>
                                <button className="mt-auto pt-4 text-xs font-bold text-secondary flex items-center gap-1">Send Nudge <span className="material-symbols-outlined text-xs">notifications_active</span></button>
                            </div>
                            <div className="bg-white border rounded-xl p-4 flex flex-col gap-2 overflow-hidden relative">
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--outline-variant)' }}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="material-symbols-outlined text-primary bg-slate-100 p-1 text-sm rounded-full">assignment_late</span>
                                    <span className="text-xs font-bold text-on-surface-variant uppercase">Missing</span>
                                </div>
                                <h4 className="text-sm font-bold text-primary">Compliance Docs</h4>
                                <p className="text-sm text-on-surface-variant">Q3 Audit Files</p>
                                <button className="mt-auto pt-4 text-xs font-bold text-secondary flex items-center gap-1">Review <span className="material-symbols-outlined text-xs">open_in_new</span></button>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-bento">
                        <section className="glass-panel rounded-xl h-full shadow-sm flex flex-col">
                            <div className="p-4 border-b font-bold flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}>
                                <span className="material-symbols-outlined text-secondary">today</span> Today's Actions
                            </div>
                            <div className="p-4 flex flex-col gap-4">
                                <div className="p-3 bg-slate-50 border rounded-lg">
                                    <p className="text-sm font-bold">AI Screening Call</p>
                                    <p className="text-sm text-on-surface-variant mt-1">Project Titan Candidates</p>
                                    <span className="text-xs font-mono mt-2 block" style={{ color: '#94a3b8' }}>10:00 AM</span>
                                </div>
                                <div className="p-3 bg-white border border-transparent rounded-lg cursor-pointer" style={{ transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}>
                                    <p className="text-sm font-bold">Follow-up Sequence</p>
                                    <p className="text-sm text-on-surface-variant mt-1">Q2 Leads Batch</p>
                                    <span className="text-xs font-mono mt-2 block" style={{ color: '#94a3b8' }}>1:30 PM</span>
                                </div>
                            </div>
                        </section>

                        <section className="glass-panel rounded-xl h-full shadow-sm flex flex-col">
                            <div className="p-4 border-b font-bold flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}>
                                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-secondary">work_history</span> Active Jobs</span>
                                <Link to="/jobs" className="text-xs text-secondary font-bold" style={{ textDecoration: 'none' }}>View All</Link>
                            </div>
                            <div className="p-4 flex-1">
                                <table>
                                    <tbody>
                                        <tr>
                                            <td className="py-2" style={{ paddingLeft: 0 }}>Find Lead Actor</td>
                                            <td className="py-2 text-right" style={{ paddingRight: 0 }}><span className="text-xs font-bold rounded px-2 py-1" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>Sourcing</span></td>
                                        </tr>
                                        <tr>
                                            <td className="py-2" style={{ paddingLeft: 0, borderBottom: 'none' }}>Website Development</td>
                                            <td className="py-2 text-right" style={{ paddingRight: 0, borderBottom: 'none' }}><span className="text-xs font-bold rounded px-2 py-1 bg-slate-100" style={{ color: '#334155' }}>In Progress</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <section className="glass-panel rounded-xl h-full shadow-sm flex flex-col">
                        <div className="p-4 border-b font-bold flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}>
                            <span className="material-symbols-outlined text-secondary">history</span> Recent Activity
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <div style={{ borderLeft: '2px solid var(--outline-variant)', marginLeft: '0.5rem', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {[
                                    { t: "AI Call Completed", d: "Screening with John Doe finished.", s: "10 mins ago", color: "var(--secondary)" },
                                    { t: "Payment Failed", d: "Auto-billing for Client XYZ declined.", s: "1 hour ago", color: "var(--error)" },
                                    { t: "Job Updated", d: "Website Development moved to In Progress.", s: "3 hours ago", color: "var(--outline-variant)" }
                                ].map((item, idx) => (
                                    <div key={idx} style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                                        <div style={{ position: 'absolute', left: '-7px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color, border: '3px solid white', boxSizing: 'content-box' }}></div>
                                        <p className="text-sm font-bold text-primary">{item.t}</p>
                                        <p className="text-sm text-on-surface-variant mt-1">{item.d}</p>
                                        <p className="text-xs font-mono mt-1" style={{ color: '#94a3b8' }}>{item.s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
