import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobsService, type Job } from '../services/api';

export const JobsPage: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]); const [loading, setLoading] = useState(true);
    useEffect(() => { JobsService.getAll().then(setJobs).finally(() => setLoading(false)); }, []);
    return (
        <div className="w-full pb-32">
            <header className="pb-8 border-b border-outline-variant/30 mb-8">
                <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-primary tracking-tight">Jobs</h1>
                        <p className="text-on-surface-variant text-lg mt-2">Work your business is currently trying to get done.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="btn btn-outline bg-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">filter_list</span> Filter
                        </button>
                        <button onClick={() => navigate('/create-job')} className="btn btn-primary shadow-md flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">add</span> Create Job
                        </button>
                    </div>
                </div>
            </header>

            <div className="container pt-8">
                <div className="flex items-center gap-4 mb-6 border-b" style={{ paddingBottom: '0.25rem' }}>
                    {[`Active (${jobs.filter(j=>j.status==='active').length})`, "Completed", "Archived"].map((tab, idx) => (
                        <button key={tab} className="text-sm font-bold px-1" style={{ paddingBottom: '0.5rem', color: idx === 0 ? 'var(--primary)' : 'var(--on-surface-variant)', borderBottom: idx === 0 ? '2px solid var(--secondary)' : 'none' }}>
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job) => (
                        <div key={job.id} onClick={() => navigate(`/job-detail/${job.id}`)} className="bg-white rounded-xl border shadow-sm flex flex-col cursor-pointer" style={{ height: '400px', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'}>
                            <div className="p-6 border-b flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-slate-100 text-sm px-2 py-1 rounded font-mono font-bold" style={{ color: '#334155' }}>{job.id.slice(0,8)}</span>
                                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{job.status}</span>
                                </div>
                                <h3 className="text-xl font-bold text-primary mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{job.title}</h3>
                                <p className="text-sm text-on-surface-variant flex items-center gap-2 mb-6">
                                    <span className="material-symbols-outlined text-sm">corporate_fare</span> {job.objective || job.description || 'No objective provided'}
                                </p>
                                <div className="grid grid-cols-2 gap-4 mt-auto">
                                    <div className="bg-slate-50 p-3 rounded-lg border">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Status</span>
                                        <div className="text-sm font-bold text-primary">{job.status}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border">
                                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Financials</span>
                                        <div className="text-sm font-bold text-primary">{job.budget ? `₹${job.budget}` : '—'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t" style={{ borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: '0.75rem' }}>
                                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">AI Suggestion</span>
                                <button className="w-full flex items-center justify-between bg-secondary text-white p-3 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                        <span className="text-sm font-bold">{job.current_action || 'View job'}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    ))}{!loading && jobs.length===0 && <p className="text-on-surface-variant">No jobs yet. Create your first job.</p>}
                </div>
            </div>
        </div>
    );
};
