import React from 'react';

export const PersonProfilePage: React.FC = () => {
    return (
        <div className="w-full pb-32">
            <main className="w-full pb-12">
                <div className="glass-panel p-8 rounded-xl shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8">
                    <img className="w-32 h-32 rounded-full border shadow-md" style={{ borderWidth: '4px', borderColor: 'white' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd7OgtOsgV-7fT-PMAtRkZQwiy26IRY1cplWwENE5X55QdnILLHM9zFqQkADS1ou8-DipYMPul9aRMnvjk_aCr8_kJcYZhiKmBpnTrVKMGVgVlKq6Lyi5y85unkuFWVcIBGP_P9zxVk6lsP2bFGvbb04uSgMEDXt5n0AhQ5NWF9dqtitb2pTbIFv8JU7yES5ZPGfZtHDvqbll0Q-taRwPIkKycs6ZaG4UjxE-CJhNYBBSxRyS8mm_eqg" alt="Profile" />
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
                            <h1 className="text-4xl font-bold text-primary">Rahul Sharma</h1>
                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#e0e7ff', color: 'var(--secondary)', border: '1px solid #c7d2fe' }}>Candidate</span>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 text-on-surface-variant text-sm font-medium">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">call</span> +91 98765 43210</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">mail</span> rahul.sharma@example.com</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span> Bengaluru, India</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn btn-outline bg-white p-3 shadow-sm" style={{ padding: '0.75rem' }}><span className="material-symbols-outlined">call</span></button>
                        <button className="btn btn-outline bg-white p-3 shadow-sm" style={{ padding: '0.75rem' }}><span className="material-symbols-outlined">chat</span></button>
                        <button className="btn btn-secondary shadow-md px-6">Request Payment</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-bento">
                    <section className="lg:col-span-5 glass-panel rounded-xl p-8" style={{ background: 'linear-gradient(to bottom right, #eef2ff, transparent)' }}>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-secondary">auto_awesome</span> AI Insight</h3>
                        <p className="text-lg text-on-surface-variant mb-6 leading-relaxed">"Strong candidate, 4 years experience in Python/FastAPI, ready for technical interview."</p>
                        <div className="text-xs font-mono flex items-center gap-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                            <span className="material-symbols-outlined text-sm">history</span> Generated 2 hours ago
                        </div>
                    </section>
                    
                    <section className="lg:col-span-7 glass-panel rounded-xl p-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-secondary">business_center</span> Current Jobs</h3>
                        <div className="border rounded-lg p-4 flex items-center justify-between cursor-pointer transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--secondary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--outline-variant)'}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-lg">code</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-base text-primary">Backend Developer Search</h4>
                                    <p className="text-sm font-medium mt-1" style={{ color: '#64748b' }}>TechCorp Inc.</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: '#e0e7ff', color: 'var(--secondary)', border: '1px solid #c7d2fe' }}>Interviewing</span>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};
