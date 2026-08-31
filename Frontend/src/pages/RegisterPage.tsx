import React from 'react';
import { Link } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-surface flex flex-col md:flex-row">
            <div className="bg-primary p-12 flex-col justify-center flex flex-1" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <div className="flex items-center gap-2 mb-8 text-white">
                        <span className="material-symbols-outlined text-3xl">token</span>
                        <span className="text-2xl font-bold">ERGON</span>
                    </div>
                    <h1 className="text-5xl font-bold mb-6 text-white" style={{ lineHeight: 1.1 }}>Precision Operations.</h1>
                    <p className="text-xl text-white opacity-70 max-w-2xl">
                        Deploy intelligent automation and gain total visibility over your enterprise workflows.
                    </p>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full" style={{ maxWidth: '420px' }}>
                    <h2 className="text-3xl font-bold mb-2">Create your account</h2>
                    <p className="text-on-surface-variant mb-8">Enter your details to configure your workspace.</p>
                    <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>
                        <input className="input-field" placeholder="Full Name" />
                        <input className="input-field" placeholder="Work Email" type="email" />
                        <input className="input-field" placeholder="Business Name" />
                        <input className="input-field" placeholder="Password" type="password" />
                        <Link to="/dashboard" className="btn btn-secondary w-full shadow-md mt-4">
                            Create account <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
};
