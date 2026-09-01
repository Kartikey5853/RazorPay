import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { PeoplePage } from './pages/PeoplePage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { CreateJobPage } from './pages/CreateJobPage';
import { AICallPage } from './pages/AICallPage';
import { PersonProfilePage } from './pages/PersonProfilePage';
import { AddPersonPage } from './pages/AddPersonPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/ai-call" element={<AICallPage />} />

                {/* Authenticated Routes with Dock */}
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/people" element={<PeoplePage />} />
                    <Route path="/add-person" element={<AddPersonPage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/job-detail" element={<JobDetailPage />} />
                    <Route path="/job-detail/:id" element={<JobDetailPage />} />
                    <Route path="/create-job" element={<CreateJobPage />} />
                    <Route path="/person-profile" element={<PersonProfilePage />} />
                    <Route path="/person/:id" element={<PersonProfilePage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
