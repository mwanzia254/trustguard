import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { SellerProfilePage } from './pages/SellerProfilePage';
import { ReportPage } from './pages/ReportPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { WhatsAppAnalyzePage } from './pages/WhatsAppAnalyzePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { ScamAlertsPage } from './pages/ScamAlertsPage';

const App: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-1">
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/search"    element={<SearchPage />} />
        <Route path="/seller/:id" element={<SellerProfilePage />} />
        <Route path="/report"    element={<ReportPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/register"  element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin"     element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
        <Route path="/whatsapp"  element={<WhatsAppAnalyzePage />} />
        <Route path="/privacy"   element={<PrivacyPolicyPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/scam-alerts"  element={<ScamAlertsPage />} />
        <Route path="*" element={
          <div className="flex items-center justify-center py-24 flex-col gap-4 text-gray-500">
            <p className="text-6xl font-extrabold text-gray-200">404</p>
            <p className="text-xl">Page not found</p>
            <a href="/" className="text-primary-600 hover:underline">Go home</a>
          </div>
        } />
      </Routes>
    </main>
    <Footer />
  </div>
);

export default App;
