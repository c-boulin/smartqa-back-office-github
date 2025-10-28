import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  message: string;
}

interface LoadingContextType {
  loading: LoadingState;
  setLoading: (isLoading: boolean, message?: string) => void;
  withLoading: <T>(promise: Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: 'Loading...'
  });

  const setLoading = (isLoading: boolean, message: string = 'Loading...') => {
    setLoadingState({ isLoading, message });
  };

  const withLoading = async <T,>(promise: Promise<T>, message: string = 'Loading...'): Promise<T> => {
    setLoading(true, message);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingContext.Provider value={{ loading, setLoading, withLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- useLoading hook needs to be exported alongside provider
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};