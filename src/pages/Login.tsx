import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, ArrowLeft, Shield } from 'lucide-react';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch, login } = useAuth();
  const [ssoUrl, setSsoUrl] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect to projects
    if (state.isAuthenticated) {
      navigate('/projects');
      return;
    }

    // Initialize SSO
    initializeSSO();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initializeSSO should only run on mount
  }, [state.isAuthenticated, navigate]);

  const initializeSSO = async () => {
    try {
      setIsInitializing(true);
      const callbackUrl = `${window.location.origin}/callback`;
      const response = await apiService.initSSO(callbackUrl);
      setSsoUrl(response.data.url);
    } catch (error) {
      console.error('Failed to initialize SSO:', error);
      toast.error('Failed to initialize authentication. Please try again.');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize SSO' });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSSOLogin = () => {
    if (!ssoUrl) {
      toast.error('Authentication not ready. Please wait or refresh the page.');
      return;
    }

    setIsAuthenticating(true);
    dispatch({ type: 'SET_LOADING', payload: true });

    // Open popup window
    const popup = window.open(
      ssoUrl,
      'sso-login',
      'width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
    );

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      setIsAuthenticating(false);
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    // Listen for messages from the popup
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'SSO_CALLBACK') {
        // Remove event listener immediately to prevent multiple calls
        window.removeEventListener('message', handleMessage);
        
        try {
          const { status, sesame_token, error } = event.data;

          if (error) {
            throw new Error(error);
          }

          if (status?.toLowerCase() !== 'ok') {
            throw new Error('Authentication was not successful');
          }

          if (!sesame_token) {
            throw new Error('Missing authentication token');
          }

          console.log('🔐 Starting SSO login process with token...');
          
          // Perform the SSO login API call
          const performLogin = async () => {
            // Call the SSO login endpoint with explicit timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sso/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sesame_token }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ SSO login API response received successfully');
            
            return data;
          };
          
          // Wait for the login API call to complete
          const response = await performLogin();
          
          // Extract user data and token
          const userData = {
            id: response.data.attributes.id,
            name: response.data.attributes.name,
            login: response.data.attributes.login,
            email: response.data.attributes.email,
            token: response.data.token
          };

          console.log('💾 Storing authentication data...');

          // Store authentication data synchronously
          login(userData);
          
          // Verify the data was stored
          const storedToken = localStorage.getItem('auth_token');
          const storedUserData = localStorage.getItem('user_data');
          
          if (!storedToken || !storedUserData) {
            throw new Error('Failed to store authentication data');
          }
          
          console.log('✅ Authentication data stored and verified');
          
          toast.success(`Welcome back, ${userData.name}!`);
          
          // Close popup
          popup.close();
          
          // Clear the popup check interval since we're successful
          clearInterval(checkClosed);
          
          console.log('🚀 Redirecting to projects...');
          
          // Use a longer delay to ensure everything is settled
          setTimeout(() => {
            navigate('/projects');
          }, 500);

        } catch (error) {
          console.error('❌ Authentication error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
          toast.error(`Authentication failed: ${errorMessage}`);
          dispatch({ type: 'SET_ERROR', payload: errorMessage });
          popup.close();
          
          // Clear the popup check interval on error too
          clearInterval(checkClosed);
        } finally {
          setIsAuthenticating(false);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Check if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Only show cancellation message if authentication hasn't completed successfully
        if (isAuthenticating) {
          setIsAuthenticating(false);
          dispatch({ type: 'SET_LOADING', payload: false });
          window.removeEventListener('message', handleMessage);
          toast('Authentication cancelled');
        }
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-cyan-400/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Back to Home Link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-300 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card gradient className="p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                  <Hexagon className="w-8 h-8 text-white fill-white/20" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-30 rounded-full blur-lg"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Welcome to SMARTQA
              </span>
            </h1>
            <p className="text-gray-400">Sign in with your organization account</p>
          </div>

          {/* SSO Login */}
          <div className="space-y-6">
            {state.error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm text-center">{state.error}</p>
              </div>
            )}

            <Button 
              onClick={handleSSOLogin}
              disabled={isInitializing || !ssoUrl || isAuthenticating}
              className="w-full py-4 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border border-blue-500/50"
              icon={Shield}
            >
              {isInitializing ? 'Initializing...' : 
               isAuthenticating ? 'Authenticating...' : 
               'Sign in with Microsoft'}
            </Button>

            {/* Microsoft-style design elements */}
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
              <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-sm"></div>
              <span className="ml-2">Microsoft</span>
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-sm text-gray-400 text-center">
              <strong className="text-cyan-400">Secure Authentication:</strong> 
              <br />
              Sign in using your organization's Microsoft account
              <br />
              <span className="text-xs text-gray-500 mt-1 block">
                A popup window will open for authentication
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;