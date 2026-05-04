// ── App Router (All Routes + Role-based Protection) ──

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoginPage, DashboardPage, ExchangesPage, AISignalsPage, BacktestPage, RiskPage, TradeHistoryPage, SettingsPage, PortfolioPage, ScoringRulesPage, NotificationsPage, UserManagementPage, AuditLogPage, SystemSettingsPage } from '../pages';
import { PERMISSIONS, ROLES } from '@/shared/lib/permissions';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized"
          element={<div style={{ color: '#f3f4f6', padding: 40, background: '#030712', minHeight: '100vh' }}>
            <h2>Unauthorized</h2><p>Insufficient permissions. Contact your administrator.</p>
          </div>}
        />

        {/* Protected routes with layout */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          {/* Viewer+ */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<ProtectedRoute requiredPermissions={[PERMISSIONS.USER_READ]}><NotificationsPage /></ProtectedRoute>} />

          {/* Trader+ */}
          <Route path="/exchanges" element={<ProtectedRoute requiredRoles={[ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN]}><ExchangesPage /></ProtectedRoute>} />
          <Route path="/trades" element={<ProtectedRoute requiredRoles={[ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN]}><TradeHistoryPage /></ProtectedRoute>} />
          <Route path="/risk" element={<ProtectedRoute requiredPermissions={[PERMISSIONS.RISK_VIEW]}><RiskPage /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute requiredRoles={[ROLES.TRADER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN]}><PortfolioPage /></ProtectedRoute>} />

          {/* Analyst+ */}
          <Route path="/ai-signals" element={<ProtectedRoute requiredRoles={[ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AISignalsPage /></ProtectedRoute>} />
          <Route path="/backtest" element={<ProtectedRoute requiredRoles={[ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN]}><BacktestPage /></ProtectedRoute>} />
          <Route path="/scoring-rules" element={<ProtectedRoute requiredPermissions={[PERMISSIONS.SCORING_MANAGE]}><ScoringRulesPage /></ProtectedRoute>} />

          {/* Admin only */}
          <Route path="/admin/users" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><UserManagementPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><AuditLogPage /></ProtectedRoute>} />
          <Route path="/admin/system" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}><SystemSettingsPage /></ProtectedRoute>} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
