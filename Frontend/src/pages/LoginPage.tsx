import React from 'react';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <div className="w-full max-w-2xl glass-panel p-8 rounded-xl shadow-xl" style={{ maxWidth: '440px' }}>
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary mb-4" style={{ margin: '0 auto 1rem' }}>
                        <span className="material-symbols-outlined text-white">hub</span>
                    </div>
                    <h1 className="text-2xl font-bold text-primary">ERGON</h1>
                    <p className="text-on-surface-variant text-sm mt-2">Secure Console Access</p>
                </div>
                <form className="flex flex-col gap-6" onSubmit={e => e.preventDefault()}>
                    <div>
                        <label className="text-xs font-bold uppercase text-on-surface-variant mb-1" style={{ display: 'block' }}>Email Address</label>
                        <input className="input-field" placeholder="admin@ergon.ai" type="email" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-on-surface-variant mb-1" style={{ display: 'block' }}>Password</label>
                        <input className="input-field" placeholder="••••••••" type="password" />
                    </div>
                    <Link to="/dashboard" className="btn btn-primary w-full shadow-md mt-4">
                        Login to Console <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                </form>
                <p className="text-center mt-6 text-sm">
                    Don't have an account? <Link to="/register" className="text-secondary font-bold">Create account</Link>
                </p>
            </div>
        </div>
    );
};
