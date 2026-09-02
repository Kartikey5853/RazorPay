import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService, errorMessage } from '../services/api';

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate(); const [form, setForm] = useState({name:'',email:'',business_name:'',password:''}); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
    const submit=async(e:React.FormEvent)=>{e.preventDefault();setLoading(true);setError('');try{const r=await AuthService.register(form);localStorage.setItem('auth_token',r.access_token);navigate('/dashboard')}catch(x){setError(errorMessage(x))}finally{setLoading(false)}};
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
                    <form className="flex flex-col gap-4" onSubmit={submit}>
                        <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input-field" placeholder="Full Name" />
                        <input required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input-field" placeholder="Work Email" type="email" />
                        <input required value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})} className="input-field" placeholder="Business Name" />
                        <input required minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="input-field" placeholder="Password" type="password" />
                        {error && <p className="text-sm text-error">{error}</p>}
                        <button disabled={loading} className="btn btn-secondary w-full shadow-md mt-4">{loading?'Creating…':'Create account'} <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
                    </form>
                </div>
            </div>
        </div>
    );
};
