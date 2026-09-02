import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PeopleService, type Person } from '../services/api';

/* Legacy visual sample retained only as a shape reference; page data is loaded from the API. */
const MOCK_PEOPLE: unknown[] = [
    {
        id: "rahul",
        name: "Rahul Sharma",
        email: "rahul.s@example.com",
        phone: "+91 98765 43210",
        company: "Self",
        type: "Candidate",
        role: "Backend Developer",
        status: "Interviewing",
        statusColor: "#22c55e",
        lastActivity: "2 days ago",
        outstanding: "-",
        tags: ["senior", "backend", "python"]
    },
    {
        id: "acme",
        name: "Acme Technologies",
        email: "billing@acmecorp.com",
        phone: "+1 555-0198",
        company: "Acme Corp",
        type: "Client",
        role: "Enterprise Account",
        status: "Active",
        statusColor: "#3b82f6",
        lastActivity: "Today, 10:42 AM",
        outstanding: "$12,500.00",
        tags: ["enterprise", "q3-renewal"]
    },
    {
        id: "sarah",
        name: "Sarah Jenkins",
        email: "sarah.j@designco.com",
        phone: "+1 555-0234",
        company: "Design Co",
        type: "Vendor",
        role: "Contract Designer",
        status: "Pending Contract",
        statusColor: "#f59e0b",
        lastActivity: "Yesterday",
        outstanding: "-",
        tags: ["design", "contractor"]
    },
    {
        id: "mike",
        name: "Michael Chen",
        email: "m.chen@startup.io",
        phone: "+44 7700 900123",
        company: "Startup.io",
        type: "Lead",
        role: "Founder",
        status: "Follow-up",
        statusColor: "#a855f7",
        lastActivity: "3 hrs ago",
        outstanding: "-",
        tags: ["hot-lead", "startup"]
    }
];

export const PeoplePage: React.FC = () => {
    void MOCK_PEOPLE;
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");
    const [people, setPeople] = useState<Person[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
    useEffect(() => { const timer = setTimeout(async () => { setLoading(true); try { setPeople(await PeopleService.getAll({search: searchQuery || undefined, type: activeFilter === 'All' ? undefined : activeFilter})); setError(''); } catch { setError('Could not load people.'); } finally { setLoading(false); } }, 250); return () => clearTimeout(timer); }, [searchQuery, activeFilter]);

    const filters = ["All", "Client", "Lead", "Candidate", "Vendor"];

    const filteredPeople = people;

    return (
        <div className="w-full pb-32">
            <main className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-4xl font-bold text-primary tracking-tight">People</h2>
                        <p className="text-on-surface-variant text-lg mt-2">Everyone your business interacts with.</p>
                    </div>
                    <button onClick={() => navigate('/add-person')} className="btn btn-primary shadow-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">person_add</span> Add Person
                    </button>
                </div>

                <div className="bg-white border rounded-lg p-4 mb-6 flex flex-col lg:flex-row justify-between items-center gap-4 shadow-sm">
                    <div className="w-full lg:w-96 relative">
                        <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">search</span>
                        <input 
                            className="input-field pl-10 bg-slate-50" 
                            placeholder="Search name, email, company, tags..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                        {filters.map((chip) => (
                            <button 
                                key={chip} 
                                onClick={() => setActiveFilter(chip)}
                                className={`px-4 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition-colors ${activeFilter === chip ? 'bg-secondary text-white border-secondary' : 'bg-white text-on-surface-variant hover:bg-slate-50'}`}
                            >
                                {chip === "Client" ? "Clients" : chip === "Lead" ? "Leads" : chip === "Candidate" ? "Candidates" : chip === "Vendor" ? "Vendors" : chip}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white border rounded-lg overflow-x-auto shadow-sm min-h-[400px]">
                    <table className="w-full text-left whitespace-nowrap" style={{ minWidth: '800px' }}>
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Role / Company</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Last Activity</th>
                                <th className="px-6 py-4 text-right">Outstanding</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPeople.length > 0 ? (
                                filteredPeople.map((person) => (
                                    <tr 
                                        key={person.id} 
                                        onClick={() => navigate(`/person/${person.id}`)}
                                        className="hover:bg-slate-50 cursor-pointer transition-colors border-b last:border-b-0 group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-primary group-hover:bg-white border transition-colors">
                                                    {person.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-primary">{person.name}</p>
                                            <p className="text-xs text-on-surface-variant mt-1">{person.email || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-1 rounded font-mono font-bold ${person.type === 'Client' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {person.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-sm text-primary">{person.company || '—'}</p>
                                            <p className="text-xs text-on-surface-variant mt-1">{person.location || '—'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-2 text-sm font-medium">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div> Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-on-surface-variant">{new Date(person.updated_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-400">
                                            —
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-on-surface-variant">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
                                            <p className="font-bold text-lg text-primary">{loading ? 'Loading people…' : error || 'No people found'}</p>
                                            <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                                            <button onClick={() => {setSearchQuery(""); setActiveFilter("All");}} className="mt-4 btn btn-outline text-xs">Clear Filters</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};
