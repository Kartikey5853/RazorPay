import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PeopleService, errorMessage } from '../services/api';

export const AddPersonPage: React.FC = () => {
    const navigate = useNavigate();
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [errors, setErrors] = useState<{email?: string, phone?: string}>({});
    const [saving, setSaving] = useState(false); const [apiError, setApiError] = useState('');

    const [formData, setFormData] = useState({
        name: '', type: '', email: '', phone: '', company: '', location: '', notes: ''
    });

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const validateForm = () => {
        const newErrors: {email?: string, phone?: string} = {};
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
            newErrors.phone = 'Invalid phone format';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            setSaving(true); setApiError('');
            try { const person = await PeopleService.create({...formData, tags}); navigate(`/person/${person.id}`); }
            catch (err) { setApiError(errorMessage(err)); } finally { setSaving(false); }
        }
    };

    return (
        <div className="w-full pb-32 pt-8 flex justify-center">
            <div className="w-full max-w-2xl glass-panel rounded-xl p-8 shadow-xl mx-auto">
                <div className="mb-8 border-b pb-6">
                    <h1 className="text-3xl font-bold text-primary mb-2">Add Person</h1>
                    <p className="text-on-surface-variant">Add a new person Ergon will interact with.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-primary">Full Name *</label>
                            <input type="text" required className="input-field" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-primary">Type *</label>
                            <select required className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option value="">Select type...</option>
                                <option value="client">Client</option>
                                <option value="candidate">Candidate</option>
                                <option value="lead">Lead</option>
                                <option value="vendor">Vendor</option>
                                <option value="customer">Customer</option>
                                <option value="partner">Partner</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-primary">Email</label>
                            <input type="email" className={`input-field ${errors.email ? 'border-error' : ''}`} placeholder="john@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            {errors.email && <span className="text-xs text-error">{errors.email}</span>}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-primary">Phone</label>
                            <input type="tel" className={`input-field ${errors.phone ? 'border-error' : ''}`} placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            {errors.phone && <span className="text-xs text-error">{errors.phone}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-primary">Company / Organization</label>
                            <input type="text" className="input-field" placeholder="Acme Corp" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-primary">Location</label>
                            <input type="text" className="input-field" placeholder="New York, NY" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-primary">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <span key={tag} className="bg-slate-100 text-on-surface-variant text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                    {tag} <button type="button" onClick={() => removeTag(tag)} className="material-symbols-outlined text-[12px] hover:text-error">close</button>
                                </span>
                            ))}
                        </div>
                        <input type="text" className="input-field" placeholder="Type a tag and press Enter" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-primary">Notes</label>
                        <textarea className="input-field min-h-[100px]" placeholder="Add any background context..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                    </div>

                    <div className="pt-6 border-t flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => { if(window.confirm('Discard changes?')) navigate('/people'); }} className="btn btn-outline">Cancel</button>
                        {apiError && <p className="text-sm text-error self-center">{apiError}</p>}<button disabled={saving} type="submit" className="btn btn-primary">{saving ? 'Creating…' : 'Create Person'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
