import React from 'react';

export const SettingsPage: React.FC = () => {
    return (
        <div className="w-full pb-32">
            <div className="w-full" style={{ maxWidth: '1024px', margin: '0 auto' }}>
                <header className="mb-8">
                    <h1 className="text-5xl font-bold tracking-tight mb-4 text-primary">Settings</h1>
                    <p className="text-xl text-on-surface-variant">Manage your organization's preferences and integrations.</p>
                </header>

                <div className="flex flex-col gap-8">
                    <section className="glass-panel p-8 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">domain</span> Business Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#94a3b8' }}>Company Name</label>
                                <input className="input-field border-none" style={{ backgroundColor: '#f8fafc', padding: '1rem' }} value="Acme Corp Global" readOnly />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#94a3b8' }}>Primary Timezone</label>
                                <select className="input-field border-none" style={{ backgroundColor: '#f8fafc', padding: '1rem' }}>
                                    <option>(GMT-08:00) Pacific Time</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="glass-panel p-8 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">cable</span> Integrations
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                { name: "Razorpay", type: "Payment Gateway", icon: "payments", color: "#2563eb" },
                                { name: "Twilio", type: "Telephony", icon: "record_voice_over", color: "#9333ea" },
                                { name: "Google Gemini", type: "LLM Engine", icon: "smart_toy", color: "#4f46e5" }
                            ].map(int => (
                                <div key={int.name} className="p-4 border rounded-lg bg-white flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full border bg-slate-50 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined" style={{ color: int.color }}>{int.icon}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-primary">{int.name}</p>
                                            <p className="text-xs font-medium mt-1" style={{ color: '#64748b' }}>{int.type}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>Connected</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', display: 'flex', gap: '1rem', zIndex: 60 }}>
                    <button className="btn btn-outline bg-white shadow-sm" style={{ padding: '1rem 2rem' }}>Discard</button>
                    <button className="btn btn-primary shadow-xl" style={{ padding: '1rem 2rem' }}>Save Configuration</button>
                </div>
            </div>
        </div>
    );
};
