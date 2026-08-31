import React from 'react';
import { useNavigate } from 'react-router-dom';

export const AICallPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 py-12">
            <div className="container w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-4 flex flex-col gap-6">
                    <div className="glass-panel p-8 rounded-xl flex flex-col items-center text-center shadow-md">
                        <img className="w-24 h-24 rounded-full mb-4 border" style={{ borderWidth: '4px', borderColor: 'white' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0bJLmc58QFPZCcsnPc-iXuZe710pArQIMbtIuw29FpmrSNqt0WXxDVawld1rhrY8PxjASDeBXtRoD2_ZgyJE53Cyx2ZBBez_hpJUmmbwHmWu9UTCU2TEPGjv0hGyKVpvBg0PjnZGZwrrrJrNqIK0t21rqqMABhTnnsHMSTGMjQQ9TqMqvU8MiZ3CWbo_Ti9iCcNqxv3V0g-cJjWoUZZ2Cyo9LNXxGF0qTVHLzdm9l-NCCnSTGHmo0sg" alt="Candidate" />
                        <h2 className="text-xl font-bold mb-1">Sarah Jenkins</h2>
                        <p className="text-sm text-on-surface-variant font-medium">Candidate</p>
                    </div>
                    <div className="glass-panel p-6 rounded-xl shadow-md">
                        <div className="flex justify-between mb-4 items-center">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Status</span>
                            <span className="text-secondary font-bold flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--secondary)', animation: 'pulse-border 2s infinite' }}></div> Speaking
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Duration</span>
                            <span className="font-mono font-bold text-lg">02:34</span>
                        </div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="btn btn-primary shadow-md py-4 text-base" style={{ backgroundColor: 'var(--error)' }}>
                        <span className="material-symbols-outlined">call_end</span> End Call
                    </button>
                </div>
                
                <div className="md:col-span-8 glass-panel rounded-xl flex flex-col shadow-md overflow-hidden" style={{ height: '600px' }}>
                    <div className="p-6 border-b font-bold flex justify-between items-center" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                        <span className="flex items-center gap-2 text-primary text-lg">
                            <span className="material-symbols-outlined">subtitles</span> Live Transcript
                        </span>
                        <span className="text-xs font-mono font-medium" style={{ color: '#94a3b8' }}>Started 10:42 AM</span>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                        <div className="flex gap-4" style={{ maxWidth: '85%' }}>
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-base">smart_toy</span>
                            </div>
                            <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ backgroundColor: '#f1f5f9', borderTopLeftRadius: '0' }}>
                                Hello Sarah. I'm calling to discuss the Q3 operational efficiency report.
                            </div>
                        </div>
                        <div className="flex gap-4" style={{ maxWidth: '85%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" style={{ backgroundColor: '#4f46e5' }}>S</div>
                            <div className="p-4 rounded-xl text-sm leading-relaxed text-white" style={{ backgroundColor: 'var(--secondary)', borderTopRightRadius: '0' }}>
                                Hi there. Yes, I reviewed the data. Which specific pipelines are showing anomalies?
                            </div>
                        </div>
                        <div className="flex gap-4" style={{ maxWidth: '85%' }}>
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-base">smart_toy</span>
                            </div>
                            <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ backgroundColor: '#f1f5f9', borderTopLeftRadius: '0', borderLeft: '3px solid var(--secondary)' }}>
                                Specifically, the European region data synchronization tasks have experienced latency. I recommend... 
                                <span className="inline-flex items-center gap-1 ml-2">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
