import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { PeopleService, JobsService, type Person, type Job } from '../services/api';

export const AICallPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const personId = searchParams.get('person_id');
    const jobId = searchParams.get('job_id');
    
    const [person, setPerson] = useState<Person | null>(null);
    const [job, setJob] = useState<Job | null>(null);
    const [duration, setDuration] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    // Fake live transcript to simulate the call
    const transcript = "Hello. I'm calling from Ergon to discuss the upcoming schedule.\\nHi there. Yes, I reviewed the data. Which specific pipelines are showing anomalies?\\nSpecifically, the European region data synchronization tasks have experienced latency. I recommend...";

    useEffect(() => {
        if (personId) {
            PeopleService.getById(personId).then(p => setPerson(p)).catch(console.error);
        }
        if (jobId) {
            JobsService.getById(jobId).then(j => setJob(j)).catch(console.error);
        }
    }, [personId, jobId]);

    useEffect(() => {
        const interval = setInterval(() => {
            setDuration(d => d + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleEndCall = async () => {
        if (!personId) {
            navigate(-1);
            return;
        }
        setIsSaving(true);
        try {
            await api.post('/calls', {
                person_id: personId,
                job_id: jobId || undefined,
                duration_seconds: duration,
                transcript: transcript,
                summary: "Discussed European data synchronization latency.",
                extracted_data: { key_points: ["European region latency"], action_items: ["Investigate synchronization pipelines"] }
            });
            navigate(`/person/${personId}`);
        } catch (err) {
            console.error(err);
            navigate(`/person/${personId}`);
        }
    };

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!person) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading interface...</div>;
    }

    const hasConfig = job?.requirements && Object.keys(job.requirements).length > 0;

    if (jobId && job && !hasConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
                    <span className="material-symbols-outlined text-4xl text-error mb-4">warning</span>
                    <h2 className="text-xl font-bold text-primary mb-2">Configuration Missing</h2>
                    <p className="text-sm text-on-surface-variant mb-6">
                        Ergon requires a Call Assistant Configuration to be generated for the job "{job.title}" before initiating calls.
                    </p>
                    <button onClick={() => navigate(`/job-detail/${job.id}`)} className="btn btn-primary w-full justify-center">
                        Configure Job
                    </button>
                </div>
            </div>
        );
    }

    const initials = person.name ? person.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 py-12">
            <div className="container w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: ORB & STATUS */}
                <div className="md:col-span-4 flex flex-col gap-6">
                    <div className="glass-panel p-8 rounded-xl flex flex-col items-center text-center shadow-sm bg-white border border-slate-200">
                        <div className="w-24 h-24 rounded-full mb-4 border-4 border-slate-100 bg-slate-200 flex items-center justify-center text-primary font-bold text-3xl shadow-inner">
                            {initials}
                        </div>
                        <h2 className="text-xl font-bold mb-1 text-primary tracking-tight">{person.name}</h2>
                        <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">{person.type || 'Contact'}</p>
                    </div>
                    
                    <div className="glass-panel p-6 rounded-xl shadow-sm bg-white border border-slate-200 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</span>
                            <span className="text-secondary text-xs font-bold flex items-center gap-2 px-2 py-1 bg-indigo-50 rounded">
                                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div> Speaking
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Duration</span>
                            <span className="font-mono font-bold text-lg text-primary">{formatDuration(duration)}</span>
                        </div>
                    </div>

                    {job && hasConfig && (
                        <div className="glass-panel p-6 rounded-xl shadow-sm bg-indigo-50 border border-indigo-100 flex flex-col gap-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary">Active Configuration</h3>
                            <p className="text-xs font-bold text-primary">{job.title}</p>
                            <p className="text-[10px] text-primary mt-1"><span className="font-bold">Objective:</span> {job.requirements.objective}</p>
                            <p className="text-[10px] text-primary"><span className="font-bold">Tone:</span> {job.requirements.tone}</p>
                        </div>
                    )}
                    
                    <button onClick={handleEndCall} disabled={isSaving} className="btn bg-error text-white shadow-sm py-4 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50 mt-auto">
                        <span className="material-symbols-outlined text-[20px]">{isSaving ? 'hourglass_empty' : 'call_end'}</span> 
                        {isSaving ? 'Saving Call...' : 'End Call'}
                    </button>
                </div>
                
                {/* RIGHT COLUMN: TRANSCRIPT */}
                <div className="md:col-span-8 glass-panel rounded-xl flex flex-col shadow-sm bg-white border border-slate-200 overflow-hidden" style={{ height: '600px' }}>
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <span className="flex items-center gap-2 text-primary font-bold text-sm">
                            <span className="material-symbols-outlined text-[18px]">subtitles</span> Live Transcript
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant">Real-time Connection</span>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                        <div className="flex gap-4 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
                            </div>
                            <div className="p-3 rounded-lg text-sm bg-slate-50 text-primary border border-slate-200 rounded-tl-none">
                                Hello {person.name.split(' ')[0]}. I'm calling from Ergon to discuss the upcoming schedule.
                            </div>
                        </div>
                        
                        <div className="flex gap-4 max-w-[85%] self-end flex-row-reverse">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-primary shrink-0 text-xs">
                                {initials[0]}
                            </div>
                            <div className="p-3 rounded-lg text-sm bg-primary text-white rounded-tr-none">
                                Hi there. Yes, I reviewed the data. Which specific pipelines are showing anomalies?
                            </div>
                        </div>
                        
                        <div className="flex gap-4 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
                            </div>
                            <div className="p-3 rounded-lg text-sm bg-slate-50 text-primary border border-slate-200 rounded-tl-none relative">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-lg"></div>
                                Specifically, the European region data synchronization tasks have experienced latency. I recommend... 
                                <span className="inline-flex items-center gap-1 ml-2">
                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};
