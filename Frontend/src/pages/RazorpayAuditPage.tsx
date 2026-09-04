import React, { useEffect, useState } from 'react';
import { PaymentService, errorMessage, type Payment } from '../services/api';

export const RazorpayAuditPage: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [linkingId, setLinkingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [personFilter, setPersonFilter] = useState('');
    const [jobFilter, setJobFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const loadPayments = async () => {
        setLoading(true);
        try {
            const data = await PaymentService.getAll();
            setPayments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayments();
        const timer = window.setInterval(loadPayments, 15000);
        return () => window.clearInterval(timer);
    }, []);

    const createLink = async (paymentId: string) => {
        setLinkingId(paymentId);
        setError('');
        try {
            const updated = await PaymentService.createLink(paymentId);
            setPayments(current => current.map(payment => payment.id === updated.id ? { ...payment, ...updated } : payment));
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLinkingId(null);
        }
    };

    const filteredPayments = payments.filter(p => {
        if (statusFilter && p.status !== statusFilter) return false;
        if (personFilter && !p.person_name?.toLowerCase().includes(personFilter.toLowerCase())) return false;
        if (jobFilter && !p.job_title?.toLowerCase().includes(jobFilter.toLowerCase())) return false;
        if (dateFilter) {
            const pDate = new Date(p.created_at).toISOString().split('T')[0];
            if (pDate !== dateFilter) return false;
        }
        return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="w-full pb-24 px-4 md:px-8 py-8 flex justify-center bg-[#fafafa] min-h-screen">
            <div className="w-full max-w-[1300px]">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Razorpay</h1>
                    <p className="text-sm text-on-surface-variant mt-2">Track payment requests and payment activity.</p>
                </header>

                {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-8">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border p-1.5 text-xs rounded bg-white">
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="requested">Requested</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="expired">Expired</option>
                        </select>
                        <input type="text" placeholder="Filter by Person..." value={personFilter} onChange={e => setPersonFilter(e.target.value)} className="border p-1.5 text-xs rounded" />
                        <input type="text" placeholder="Filter by Job..." value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="border p-1.5 text-xs rounded" />
                        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border p-1.5 text-xs rounded" />
                        <button onClick={() => { setStatusFilter(''); setPersonFilter(''); setJobFilter(''); setDateFilter(''); }} className="text-xs text-secondary hover:underline font-medium">Clear Filters</button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs text-on-surface-variant uppercase tracking-widest bg-white">
                                    <th className="p-4 font-bold">Payment</th>
                                    <th className="p-4 font-bold">Person</th>
                                    <th className="p-4 font-bold">Job</th>
                                    <th className="p-4 font-bold text-right">Amount</th>
                                    <th className="p-4 font-bold">Status</th>
                                    <th className="p-4 font-bold">Due Date</th>
                                    <th className="p-4 font-bold">Created</th>
                                    <th className="p-4 font-bold text-right">Razorpay Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-sm text-on-surface-variant">Loading records...</td>
                                    </tr>
                                ) : filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-sm text-on-surface-variant">No payment records found.</td>
                                    </tr>
                                ) : (
                                    filteredPayments.map(p => (
                                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm group">
                                            <td className="p-4 font-bold text-primary">{p.title || 'Payment'}</td>
                                            <td className="p-4 font-medium text-slate-700">{p.person_name || '—'}</td>
                                            <td className="p-4 text-slate-600">{p.job_title || '—'}</td>
                                            <td className="p-4 font-bold text-right text-slate-800">{p.currency} {p.amount.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${p.status === 'paid' ? 'bg-green-100 text-green-700' : p.status === 'overdue' || p.status === 'cancelled' || p.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-slate-500">{p.due_at ? new Date(p.due_at).toLocaleDateString() : '—'}</td>
                                            <td className="p-4 text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 text-right flex justify-end gap-2 items-center">
                                                {p.metadata?.payment_link_url ? (
                                                    <>
                                                        <a href={p.metadata.payment_link_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline">
                                                            Open
                                                        </a>
                                                        <button onClick={() => navigator.clipboard.writeText(p.metadata.payment_link_url)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:underline">
                                                            Copy
                                                        </button>
                                                    </>
                                                ) : p.status === 'paid' || p.status === 'cancelled' || p.status === 'expired' ? (
                                                    <span className="text-xs text-slate-400">Not available</span>
                                                ) : (
                                                    <button onClick={() => createLink(p.id)} disabled={linkingId === p.id} className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline disabled:cursor-not-allowed disabled:opacity-50">
                                                        {linkingId === p.id ? 'Creating…' : 'Create link'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
