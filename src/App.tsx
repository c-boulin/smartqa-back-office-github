import React, { Suspense } from 'react';
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

const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Callback = React.lazy(() => import('./pages/Callback'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Overview = React.lazy(() => import('./pages/Overview'));
const Projects = React.lazy(() => import('./pages/Projects'));
const TestCases = React.lazy(() => import('./pages/TestCases'));
const SharedSteps = React.lazy(() => import('./pages/SharedSteps'));
const TestRuns = React.lazy(() => import('./pages/TestRuns'));
const TestRunDetails = React.lazy(() => import('./pages/TestRunDetails'));
const TestRunsOverview = React.lazy(() => import('./pages/TestRunsOverview'));
const Templates = React.lazy(() => import('./pages/Templates'));
const TestPlans = React.lazy(() => import('./pages/TestPlans'));
const TestPlanDetails = React.lazy(() => import('./pages/TestPlanDetails'));
const Documentation = React.lazy(() => import('./pages/Documentation'));
const DocumentationDetail = React.lazy(() => import('./pages/DocumentationDetail'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const UploadFromPhonePage = React.lazy(() => import('./pages/UploadFromPhonePage'));
const AutomatedExecutionTestCases = React.lazy(() => import('./pages/AutomatedExecutionTestCases'));
const AutomatedExecutionSteps = React.lazy(() => import('./pages/AutomatedExecutionSteps'));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin dark:border-slate-700 dark:border-t-blue-400" />
  </div>
);

const AppContent: React.FC = () => {
  const { loading } = useLoading();

  return (
    <>
      <Router>
        <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/callback" element={<Callback />} />
              <Route path="/upload" element={<UploadFromPhonePage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="overview/*" element={<Overview />} />
                <Route path="projects" element={<Projects />} />
                <Route path="templates" element={<Templates />} />
                <Route path="documentation" element={<Documentation />} />
                <Route path="documentation/:sectionId" element={<DocumentationDetail />} />
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
          </Suspense>
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
