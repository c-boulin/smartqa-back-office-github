import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { UsersProvider } from './context/UsersContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { TestRunExecutionPollingProvider } from './context/TestRunExecutionPollingContext';
import GlobalLoader from './components/UI/GlobalLoader';
import { useLoading } from './context/LoadingContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import Overview from './pages/Overview';
import Projects from './pages/Projects';
import TestCases from './pages/TestCases';
import SharedSteps from './pages/SharedSteps';
import TestRuns from './pages/TestRuns';
import TestRunDetails from './pages/TestRunDetails';
import TestRunsOverview from './pages/TestRunsOverview';
import TestPlans from './pages/TestPlans';
import TestPlanDetails from './pages/TestPlanDetails';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AutomatedExecutionTestCases from './pages/AutomatedExecutionTestCases';
import AutomatedExecutionSteps from './pages/AutomatedExecutionSteps';

const AppContent: React.FC = () => {
  const { loading } = useLoading();

  return (
    <>
      <Router>
        <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard key={`dashboard-${Date.now()}`} />} />
              <Route path="overview" element={<Overview />} />
              <Route path="projects" element={<Projects />} />
              <Route path="test-cases" element={<TestCases />} />
              <Route path="shared-steps" element={<SharedSteps />} />
              <Route path="test-runs" element={<TestRuns />} />
              <Route path="test-runs/:id" element={<TestRunDetails />} />
              <Route path="test-runs-overview" element={<TestRunsOverview />} />
              <Route path="test-plans" element={<TestPlans />} />
              <Route path="test-plans/:id" element={<TestPlanDetails />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="automated-execution/:projectId" element={<AutomatedExecutionTestCases />} />
              <Route path="automated-execution/:projectId/test-case/:testCaseId" element={<AutomatedExecutionSteps />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: '',
              style: {
                background: 'rgb(var(--color-surface-primary))',
                color: 'rgb(var(--color-text-primary))',
                border: '1px solid rgb(var(--color-border-primary))'
              }
            }}
          >
            {(t) => (
              <ToastBar toast={t}>
                {({ icon, message }) => (
                  <>
                    {icon}
                    <span className="flex-1">{message}</span>
                    {t.type !== 'loading' && (
                      <button
                        type="button"
                        onClick={() => toast.dismiss(t.id)}
                        className="ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                    )}
                  </>
                )}
              </ToastBar>
            )}
          </Toaster>
        </div>
      </Router>
      <GlobalLoader isVisible={loading.isLoading} message={loading.message} />
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UsersProvider>
          <AppProvider>
            <LoadingProvider>
              <NotificationsProvider>
                <TestRunExecutionPollingProvider>
                  <AppContent />
                </TestRunExecutionPollingProvider>
              </NotificationsProvider>
            </LoadingProvider>
          </AppProvider>
        </UsersProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;