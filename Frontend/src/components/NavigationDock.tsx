import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dock, DockIcon } from './ui/dock';

export const NavigationDock: React.FC = () => {
    const location = useLocation();
    
    // Removed profile from dock as requested
    const navItems = [
        { path: "/dashboard", icon: "dashboard", label: "Dashboard" },
        { path: "/people", icon: "group", label: "People" },
        { path: "/jobs", icon: "work", label: "Jobs" },
        { path: "/calendar", icon: "calendar_month", label: "Calendar" },
        { path: "/settings", icon: "settings", label: "Settings" },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <Dock direction="middle" iconSize={50} iconMagnification={75} iconDistance={150}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                        <DockIcon key={item.path}>
                            <Link to={item.path} className={`flex items-center justify-center w-full h-full rounded-full transition-colors ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: isActive ? 'var(--secondary)' : 'var(--on-surface-variant)', fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                                    {item.icon}
                                </span>
                            </Link>
                        </DockIcon>
                    );
                })}
            </Dock>
        </div>
    );
};
