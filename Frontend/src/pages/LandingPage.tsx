import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
    return (
        <div className="bg-background min-h-screen">
            <header className="bg-surface border-b sticky top-0" style={{ zIndex: 40 }}>
                <div className="container h-16 flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary">ERGON</span>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-primary font-semibold">Sign In</Link>
                        <Link to="/register" className="btn btn-secondary shadow-sm">Get Started</Link>
                    </div>
                </div>
            </header>
            <main className="pt-12 pb-32 container relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h1 className="text-5xl font-bold text-primary tracking-tight mb-6" style={{ lineHeight: 1.1 }}>
                            Your business, running on <span className="text-secondary">autopilot.</span>
                        </h1>
                        <p className="text-xl text-on-surface-variant mb-8">
                            Manage people and jobs while AI handles repetitive communication and operational work. Precision engineering for modern operations teams.
                        </p>
                        <div className="flex flex-col md:flex-row gap-4">
                            <Link to="/register" className="btn btn-primary shadow-md flex items-center justify-center gap-2">
                                Get Started <span className="material-symbols-outlined">arrow_forward</span>
                            </Link>
                            <button className="btn btn-outline font-bold">See how it works</button>
                        </div>
                    </div>
                    <div className="border bg-white rounded-xl shadow-xl overflow-hidden p-4" style={{ aspectRatio: '4/3' }}>
                        <div className="h-6 flex gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="h-12 bg-slate-50 rounded border flex items-center px-4 justify-between">
                                <span className="font-bold text-sm">Active Jobs</span>
                                <span className="text-secondary font-mono font-bold">142</span>
                            </div>
                            <div className="h-40 bg-slate-50 rounded border p-4">
                                <div className="text-xs font-bold text-on-surface-variant mb-2 tracking-wider uppercase">RECENT ACTIVITY</div>
                                <div className="flex gap-3 items-center mb-3">
                                    <div className="w-8 h-8 rounded bg-slate-200 text-secondary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-sm">robot_2</span>
                                    </div>
                                    <div className="text-sm font-medium">AI handled scheduling conflict</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
