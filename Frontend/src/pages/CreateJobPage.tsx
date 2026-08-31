import React from 'react';
import { useNavigate } from 'react-router-dom';

export const CreateJobPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="w-full pb-32">
            <div className="w-full max-w-2xl mx-auto glass-panel rounded-xl p-8 shadow-xl">
                <div className="mb-8 border-b pb-6">
                    <h1 className="text-3xl font-bold text-primary mb-2">Create New Job</h1>
                    <p className="text-on-surface-variant">Define parameters for your next task.</p>
                </div>
                <form className="flex flex-col gap-6" onSubmit={e => e.preventDefault()}>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">Job Description</label>
                        <textarea className="input-field" style={{ minHeight: '120px', backgroundColor: '#f8fafc' }} placeholder="e.g. Conduct a comprehensive audit..."></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">Who is this for?</label>
                            <select className="input-field" style={{ backgroundColor: '#f8fafc' }}>
                                <option>Select Entity</option>
                                <option>Acme Productions</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">Job Type</label>
                            <select className="input-field" style={{ backgroundColor: '#f8fafc' }}>
                                <option>Select Type</option>
                                <option>Recruitment</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 border-t pt-6 mt-4">
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-outline border-transparent">Cancel</button>
                        <button type="button" onClick={() => navigate('/jobs')} className="btn btn-secondary shadow-md px-8">Create Job</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
