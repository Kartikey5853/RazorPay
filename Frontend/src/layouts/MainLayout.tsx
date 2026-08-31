import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { NavigationDock } from '../components/NavigationDock';
import { Logo } from '../components/Logo';

export const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        navigate('/login');
    };

    return (
        <div style={{ paddingBottom: 'var(--dock-bottom-margin)' }}>
            <header className="bg-surface border-b sticky top-0" style={{ zIndex: 50 }}>
                <div className="w-full px-4 md:px-8 h-20 flex items-center justify-between">
                    <Logo />
                    
                    <div className="relative">
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-primary focus:outline-none"
                            style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDd7OgtOsgV-7fT-PMAtRkZQwiy26IRY1cplWwENE5X55QdnILLHM9zFqQkADS1ou8-DipYMPul9aRMnvjk_aCr8_kJcYZhiKmBpnTrVKMGVgVlKq6Lyi5y85unkuFWVcIBGP_P9zxVk6lsP2bFGvbb04uSgMEDXt5n0AhQ5NWF9dqtitb2pTbIFv8JU7yES5ZPGfZtHDvqbll0Q-taRwPIkKycs6ZaG4UjxE-CJhNYBBSxRyS8mm_eqg)', backgroundSize: 'cover' }}
                        >
                            {/* Fallback text if no image */}
                        </button>
                        
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border overflow-hidden" style={{ zIndex: 60 }}>
                                <div className="p-3 border-b bg-slate-50">
                                    <p className="text-sm font-bold text-primary">Admin User</p>
                                    <p className="text-xs text-on-surface-variant">admin@ergon.ai</p>
                                </div>
                                <button onClick={() => { setDropdownOpen(false); navigate('/profile'); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">person</span> Profile
                                </button>
                                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-red-50 text-error flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">logout</span> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <main 
                style={{ 
                    width: 'min(1200px, calc(100vw - 64px))', 
                    marginLeft: 'auto', 
                    marginRight: 'auto',
                    paddingTop: '6rem' // 96px
                }}
            >
                <Outlet />
            </main>
            
            <NavigationDock />
        </div>
    );
};
