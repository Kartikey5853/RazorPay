import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobsService, errorMessage } from '../services/api';

export const CreateJobPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [objective, setObjective] = useState(''); const [requirements, setRequirements] = useState(''); const [jobId,setJobId]=useState(''); const [error,setError]=useState('');

    const handleGeneratePlan = async () => {
        setIsGeneratingPlan(true);
        setError(''); try { const job=await JobsService.create({title: objective.slice(0,80) || 'Untitled job', objective, description:requirements, status:'draft', requirements:{details:requirements}, constraints:{}}); await JobsService.plan(job.id); setJobId(job.id); setStep(2); } catch(e) { setError(errorMessage(e)); } finally { setIsGeneratingPlan(false); }
    };

    return (
        <div className="w-full pb-32 flex justify-center pt-8">
            <div className="w-full max-w-3xl glass-panel rounded-xl p-8 shadow-xl mx-auto">
                <div className="mb-8 border-b pb-6">
                    <h1 className="text-3xl font-bold text-primary mb-2">Create New Job</h1>
                    <p className="text-on-surface-variant">Define the outcome you want to achieve.</p>
                </div>

                {step === 1 && (
                    <div className="flex flex-col gap-8">
                        {/* 1. OBJECTIVE */}
                        <div>
                            <label className="text-sm font-bold uppercase tracking-wider text-primary mb-2 block">1. Objective</label>
                            <p className="text-xs text-on-surface-variant mb-3">What are you trying to get done?</p>
                            <textarea required value={objective} onChange={e=>setObjective(e.target.value)} className="input-field" style={{ minHeight: '100px', backgroundColor: '#f8fafc' }} placeholder="e.g. Find a lead actor for Project X, or Build a website for Acme Technologies..."></textarea>
                        </div>

                        {/* 2. PEOPLE */}
                        <div>
                            <label className="text-sm font-bold uppercase tracking-wider text-primary mb-2 block">2. Associated People</label>
                            <p className="text-xs text-on-surface-variant mb-3">Attach relevant people or organizations to this job.</p>
                            <div className="flex gap-2 mb-3">
                                <div className="bg-slate-100 rounded-full px-4 py-1 flex items-center gap-2 text-sm font-medium">
                                    Project X Production
                                    <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-error">close</span>
                                </div>
                            </div>
                            <button className="btn btn-outline border-dashed text-sm py-2">
                                <span className="material-symbols-outlined text-sm">person_add</span> Add Person
                            </button>
                        </div>

                        {/* 3. SUCCESS / REQUIREMENTS */}
                        <div>
                            <label className="text-sm font-bold uppercase tracking-wider text-primary mb-2 block">3. Success & Requirements (Optional)</label>
                            <p className="text-xs text-on-surface-variant mb-3">Define constraints, deadlines, budget, and specific requirements.</p>
                            <textarea value={requirements} onChange={e=>setRequirements(e.target.value)} className="input-field" style={{ minHeight: '100px', backgroundColor: '#f8fafc' }} placeholder="e.g. Must have 5+ years experience, budget is $5k, deadline is next Friday..."></textarea>
                        </div>

                        {/* 4. ERGON CAPABILITIES */}
                        <div>
                            <label className="text-sm font-bold uppercase tracking-wider text-primary mb-2 block">4. Ergon Capabilities</label>
                            <p className="text-xs text-on-surface-variant mb-3">What is Ergon allowed to do to achieve this outcome?</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {['Contact People', 'Call People', 'Message People', 'Follow up', 'Collect Information', 'Schedule Meetings', 'Request Payments', 'Research/Find People'].map(cap => (
                                    <label key={cap} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                                        <input type="checkbox" defaultChecked className="w-4 h-4 text-secondary rounded border-gray-300 focus:ring-secondary" />
                                        <span className="text-sm font-medium text-primary">{cap}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 border-t pt-6 mt-4">
                            <button type="button" onClick={() => navigate(-1)} className="btn btn-outline border-transparent">Cancel</button>
                            {error && <p className="text-sm text-error self-center">{error}</p>}<button type="button" onClick={handleGeneratePlan} disabled={isGeneratingPlan || !objective.trim()} className="btn btn-primary shadow-md px-8 flex items-center gap-2">
                                {isGeneratingPlan ? (
                                    <><span className="material-symbols-outlined animate-spin">sync</span> Generating Plan...</>
                                ) : (
                                    <><span className="material-symbols-outlined">auto_awesome</span> Propose Plan</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col gap-8 animate-fade-in">
                        {/* 5. AI PLAN */}
                        <div>
                            <label className="text-sm font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-secondary">auto_awesome</span>
                                5. Proposed Ergon Plan
                            </label>
                            <p className="text-xs text-on-surface-variant mb-4">Review and edit the plan before starting the job.</p>
                            
                            <div className="bg-indigo-50 border border-secondary/20 rounded-xl p-6">
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                        <div>
                                            <h4 className="font-bold text-primary text-sm">Research Candidates</h4>
                                            <p className="text-sm text-on-surface-variant mt-1">Search databases for candidates matching the 5+ years experience requirement.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                        <div>
                                            <h4 className="font-bold text-primary text-sm">Initial Screening Calls</h4>
                                            <p className="text-sm text-on-surface-variant mt-1">Call shortlisted candidates to check availability and request reels.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                        <div>
                                            <h4 className="font-bold text-primary text-sm">Follow-up & Collect Information</h4>
                                            <p className="text-sm text-on-surface-variant mt-1">Automatically message candidates who haven't responded within 2 days.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 border-t pt-6 mt-4">
                            <button type="button" onClick={() => setStep(1)} className="btn btn-outline">Back to Edit</button>
                            <button type="button" onClick={() => navigate(`/job-detail/${jobId}`)} className="btn btn-secondary shadow-md px-8">Start Job</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
