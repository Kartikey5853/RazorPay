import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Mock logout logic
        localStorage.removeItem('auth_token');
        navigate('/login');
    };

    return (
        <div className="w-full pb-32">
            <div className="w-full max-w-2xl mx-auto">
                <header className="mb-8 text-center md:text-left">
                    <h1 className="text-4xl font-bold tracking-tight mb-4 text-primary">Your Profile</h1>
                    <p className="text-xl text-on-surface-variant">Manage your personal account settings.</p>
                </header>

                <div className="glass-panel p-8 rounded-xl shadow-sm mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                        <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center font-bold text-3xl text-primary shadow-inner">
                            A
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-primary mb-1">Admin User</h2>
                            <p className="text-on-surface-variant mb-2">admin@ergon.ai</p>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Workspace Owner</span>
                        </div>
                    </div>

                    <form className="flex flex-col gap-6" onSubmit={e => e.preventDefault()}>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Full Name</label>
                            <input className="input-field border-none bg-slate-50" defaultValue="Admin User" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Email Address</label>
                            <input className="input-field border-none bg-slate-50" defaultValue="admin@ergon.ai" type="email" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">New Password</label>
                            <input className="input-field border-none bg-slate-50" placeholder="••••••••" type="password" />
                        </div>
                        <div className="flex justify-end mt-4">
                            <button className="btn btn-primary px-8">Save Changes</button>
                        </div>
                    </form>
                </div>

                <div className="glass-panel p-8 rounded-xl shadow-sm border-error border-opacity-50" style={{ borderColor: 'rgba(186, 26, 26, 0.2)' }}>
                    <h2 className="text-xl font-bold text-error mb-2">Danger Zone</h2>
                    <p className="text-on-surface-variant mb-6 text-sm">Logging out will clear your current session.</p>
                    <button onClick={handleLogout} className="btn w-full justify-center shadow-sm" style={{ backgroundColor: '#fef2f2', color: 'var(--error)', border: '1px solid var(--error-container)' }}>
                        <span className="material-symbols-outlined text-sm">logout</span> Logout of ERGON
                    </button>
                </div>
            </div>
        </div>
    );
};
