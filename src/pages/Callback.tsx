import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hexagon, CheckCircle, XCircle, Loader } from 'lucide-react';
import Card from '../components/UI/Card';

const Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleCallback should only run once
  }, []);

  const handleCallback = async () => {
    try {
      const statusParam = searchParams.get('status');
      const sesameToken = searchParams.get('sesame_token');

      if (statusParam?.toLowerCase() !== 'ok') {
        throw new Error('Authentication was not successful');
      }

      if (!sesameToken) {
        throw new Error('Missing authentication token');
      }

      setStatus('success');
      setMessage('Authentication successful! Closing window...');

      // Send message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'SSO_CALLBACK',
          status: statusParam,
          sesame_token: sesameToken
        }, window.location.origin);
        
        // Close the popup after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        // Fallback if not in popup (direct navigation)
        setMessage('Please close this window and return to the application.');
      }

    } catch (error) {
      console.error('Authentication callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
      
      // Send error message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'SSO_CALLBACK',
          status: 'error',
          error: error instanceof Error ? error.message : 'Authentication failed'
        }, window.location.origin);
        
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader className="w-8 h-8 text-cyan-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-cyan-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-6">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-cyan-400/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <Card gradient className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                  <Hexagon className="w-8 h-8 text-slate-900 dark:text-white fill-slate-900/20 dark:fill-white/20" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-30 rounded-full blur-lg"></div>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                SMARTQA
              </span>
            </h1>
          </div>

          {/* Status */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>

            <div>
              <h2 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
                {status === 'loading' && 'Authenticating...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Authentication Failed'}
              </h2>
              <p className="text-slate-600 dark:text-gray-400">{message}</p>
            </div>

            {status === 'loading' && (
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Callback;