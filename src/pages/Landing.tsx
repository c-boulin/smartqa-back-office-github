import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Hexagon,
  TestTube,
  BarChart3,
  Users,
  Shield,
  User,
  LogOut,
  FolderOpen,
  Play,
  Calendar,
  Layers,
  CheckCircle
} from 'lucide-react';
import Card from '../components/UI/Card';
import { useAuth } from '../context/AuthContext';

const Landing: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.isAuthenticated) {
      navigate('/projects');
    }
  }, [state.isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    // Stay on landing page after logout
  };

  const features = [
    {
      icon: FolderOpen,
      title: 'Project Management',
      description: 'Create, organize, and manage multiple testing projects with advanced filtering and search capabilities.',
      benefits: ['Unlimited projects', 'Advanced search', 'Status tracking', 'Team collaboration']
    },
    {
      icon: TestTube,
      title: 'Test Case Management',
      description: 'Comprehensive test case creation with step-by-step instructions, shared steps, and priority management.',
      benefits: ['Detailed test steps', 'Shared components', 'Priority levels', 'Tag system']
    },
    {
      icon: Layers,
      title: 'Shared Steps',
      description: 'Reusable test components that can be shared across multiple test cases for efficiency.',
      benefits: ['Reusable components', 'Version control', 'Usage tracking', 'Easy maintenance']
    },
    {
      icon: Play,
      title: 'Test Execution',
      description: 'Execute tests with real-time tracking, result recording, and comprehensive execution history.',
      benefits: ['Real-time tracking', 'Result recording', 'Execution history', 'Environment tracking']
    },
    {
      icon: Calendar,
      title: 'Test Plans',
      description: 'Create and manage test plans with scheduling, progress tracking, and team assignments.',
      benefits: ['Schedule management', 'Progress tracking', 'Team assignments', 'Milestone tracking']
    },
    {
      icon: BarChart3,
      title: 'Advanced Reporting',
      description: 'Generate detailed reports with charts, trends, and export capabilities in multiple formats.',
      benefits: ['PDF/CSV export', 'Custom charts', 'Trend analysis', 'Scheduled reports']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-100 via-purple-100 to-slate-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 border-b border-purple-300 dark:border-purple-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Hexagon className="w-8 h-8 text-cyan-400 fill-cyan-400/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-20 rounded-lg blur-sm"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                SMARTQA
              </span>
            </div>

            <nav className="flex items-center space-x-8">
              <div className="flex items-center space-x-6">
                {state.isAuthenticated ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-900 dark:text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {state.user?.name || 'User'}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-gray-400">
                          {state.user?.email}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-slate-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/login" 
                    className="text-slate-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-medium"
                  >
                    Login
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8 group">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
                <Hexagon className="w-16 h-16 text-slate-900 dark:text-white fill-slate-900/20 dark:fill-white/20" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-30 rounded-full blur-xl"></div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SMARTQA
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-700 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            The ultimate test management platform. Streamline your QA processes,
            track test executions, and generate comprehensive reports with our futuristic interface.
          </p>

          {/* Quick Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-gradient-to-br from-white to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-300 dark:border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <TestTube className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mx-auto mb-4" />
              <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Test Management</h3>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Organize and manage your test cases efficiently</p>
            </div>
            <div className="bg-gradient-to-br from-white to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-300 dark:border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Analytics</h3>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Real-time insights and comprehensive reports</p>
            </div>
            <div className="bg-gradient-to-br from-white to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-300 dark:border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <Users className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Collaboration</h3>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Team-based testing with shared workflows</p>
            </div>
            <div className="bg-gradient-to-br from-white to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-300 dark:border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <Shield className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
              <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Security</h3>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Enterprise-grade security and compliance</p>
            </div>
          </div>

        </div>
      </main>

      {/* Detailed Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h2>
          <p className="text-xl text-slate-700 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to manage your testing lifecycle from start to finish
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card key={index} gradient hover className="p-6 h-full">
              <div className="flex flex-col h-full">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg mr-4">
                    <feature.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                </div>

                <p className="text-slate-700 dark:text-gray-300 mb-6 flex-grow">{feature.description}</p>

                <div className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center text-sm text-slate-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-slate-300 dark:border-purple-500/20 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-600 dark:text-gray-400">
            © 2024 SMARTQA. All rights reserved. Built for the future of testing.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;