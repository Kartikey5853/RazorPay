import React, { useState, useEffect } from 'react';
import { SettingsService, type User } from '../services/api';

export const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<Partial<User>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        SettingsService.get().then(data => {
            setSettings(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await SettingsService.update(settings);
            alert("Settings saved successfully.");
        } catch (error) {
            console.error("Failed to save settings", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-on-surface-variant font-medium">Loading settings...</div>;
    }

    return (
        <div className="w-full pb-32 pt-8 flex justify-center">
            <div className="w-full max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-5xl font-bold tracking-tight mb-4 text-primary">Settings</h1>
                    <p className="text-xl text-on-surface-variant">Manage your organization's preferences and integrations.</p>
                </header>

                <div className="flex flex-col gap-8">
                    <section className="glass-panel p-8 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">person</span> Personal Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#94a3b8' }}>Name</label>
                                <input name="name" className="input-field border" style={{ backgroundColor: '#fff', padding: '1rem' }} value={settings.name || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#94a3b8' }}>Email</label>
                                <input name="email" className="input-field border-none" style={{ backgroundColor: '#f8fafc', padding: '1rem' }} value={settings.email || ''} readOnly />
                            </div>
                        </div>
                    </section>

                    <section className="glass-panel p-8 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">domain</span> Business Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#94a3b8' }}>Company Name</label>
                                <input name="business_name" className="input-field border" style={{ backgroundColor: '#fff', padding: '1rem' }} value={settings.business_name || ''} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#94a3b8' }}>Primary Timezone</label>
                                <select name="timezone" className="input-field border" style={{ backgroundColor: '#fff', padding: '1rem' }} value={settings.timezone || ''} onChange={handleChange}>
                                    <option value="America/Los_Angeles">(GMT-08:00) Pacific Time</option>
                                    <option value="America/New_York">(GMT-05:00) Eastern Time</option>
                                    <option value="Europe/London">(GMT+00:00) London</option>
                                    <option value="Asia/Kolkata">(GMT+05:30) India Standard Time</option>
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
                    <button className="btn btn-outline bg-white shadow-sm" style={{ padding: '1rem 2rem' }} onClick={() => window.location.reload()}>Discard</button>
                    <button className="btn btn-primary shadow-xl" style={{ padding: '1rem 2rem' }} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
};
