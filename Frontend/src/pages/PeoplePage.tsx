import React from 'react';
import { Link } from 'react-router-dom';

export const PeoplePage: React.FC = () => {
    return (
        <div className="w-full pb-32">
            <main className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-4xl font-bold text-primary tracking-tight">People</h2>
                        <p className="text-on-surface-variant text-lg mt-2">Everyone your business interacts with.</p>
                    </div>
                    <button className="btn btn-primary shadow-sm">Add Person</button>
                </div>

                <div className="bg-white border rounded-lg p-4 mb-6 flex flex-col lg:flex-row justify-between items-center gap-4 shadow-sm">
                    <div className="w-full lg:w-96" style={{ position: 'relative' }}>
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>search</span>
                        <input className="input-field" style={{ paddingLeft: '2.5rem', backgroundColor: '#f8fafc' }} placeholder="Search people..." />
                    </div>
                    <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                        {["All", "Clients", "Leads", "Candidates", "Vendors"].map((chip, idx) => (
                            <button key={chip} className={`px-4 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition-colors ${idx === 0 ? 'bg-secondary text-white border-secondary' : 'bg-white text-on-surface-variant hover:bg-slate-50'}`}>
                                {chip}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white border rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left" style={{ minWidth: '800px' }}>
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Last Activity</th>
                                <th className="text-right">Outstanding</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <Link to="/person/rahul" className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-primary">R</div>
                                        <div>
                                            <p className="font-bold text-primary">Rahul Sharma</p>
                                            <p className="text-xs text-on-surface-variant mt-1">rahul.s@example.com</p>
                                        </div>
                                    </Link>
                                </td>
                                <td><span className="bg-slate-100 text-sm px-2 py-1 rounded font-mono font-bold" style={{ color: '#334155' }}>Candidate</span></td>
                                <td>Backend Developer</td>
                                <td>
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div> Interviewing
                                    </span>
                                </td>
                                <td className="text-on-surface-variant">2 days ago</td>
                                <td className="text-right" style={{ color: '#94a3b8' }}>-</td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>A</div>
                                        <div>
                                            <p className="font-bold text-primary">Acme Technologies</p>
                                            <p className="text-xs text-on-surface-variant mt-1">billing@acmecorp.com</p>
                                        </div>
                                    </div>
                                </td>
                                <td><span className="text-sm px-2 py-1 rounded font-mono font-bold" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>Client</span></td>
                                <td>Enterprise Account</td>
                                <td>
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div> Active
                                    </span>
                                </td>
                                <td className="text-on-surface-variant">Today, 10:42 AM</td>
                                <td className="text-right font-mono text-error font-bold">₹12,500.00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};
