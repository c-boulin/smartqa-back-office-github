import React from 'react';
import { Link } from 'react-router-dom';
import { Hexagon, ArrowRight, TestTube, BarChart3, Users, Shield, User, LogOut } from 'lucide-react';
import Button from '../components/UI/Button';
import { useAuth } from '../context/AuthContext';

const Landing: React.FC = () => {
  const { state, logout } = useAuth();
  // const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // Stay on landing page after logout
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity group"
              title="Retour à l'accueil"
            >
              <div className="relative">
                <Hexagon className="w-8 h-8 text-cyan-400 fill-cyan-400/20 group-hover:text-cyan-300 transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-20 rounded-lg blur-sm group-hover:opacity-30 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-purple-300 transition-all">
                SMARTQA
              </span>
            </Link>

            <nav className="flex items-center space-x-8">
              {!state.isAuthenticated && (
                <Link 
                  to="/features" 
                  className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
                >
                  Features
                </Link>
              )}
              
              <div className="flex items-center space-x-6">
                {state.isAuthenticated ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {state.user?.name || 'User'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {state.user?.email}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/login" 
                    className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
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
                <Hexagon className="w-16 h-16 text-white fill-white/20" />
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

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            The ultimate automated testing management platform. Streamline your QA processes, 
            track test executions, and generate comprehensive reports with our futuristic interface.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <TestTube className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Test Management</h3>
              <p className="text-gray-400 text-sm">Organize and manage your test cases efficiently</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Analytics</h3>
              <p className="text-gray-400 text-sm">Real-time insights and comprehensive reports</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <Users className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Collaboration</h3>
              <p className="text-gray-400 text-sm">Team-based testing with shared workflows</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <Shield className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Security</h3>
              <p className="text-gray-400 text-sm">Enterprise-grade security and compliance</p>
            </div>
          </div>

          {/* CTA Button */}
          <Link to="/login">
            <Button size="lg" className="text-lg px-8 py-4 shadow-2xl hover:shadow-cyan-500/25">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2024 SMARTQA. All rights reserved. Built for the future of testing.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;