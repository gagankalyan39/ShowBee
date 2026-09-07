'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('showbee_token');
    const savedUser = localStorage.getItem('showbee_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('showbee_token');
        localStorage.removeItem('showbee_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    if (res.success && res.data) {
      const { user: loggedInUser, token: authToken } = res.data;
      setUser(loggedInUser);
      setToken(authToken);
      localStorage.setItem('showbee_token', authToken);
      localStorage.setItem('showbee_user', JSON.stringify(loggedInUser));
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await authAPI.register({ name, email, password, phone });
    if (res.success && res.data) {
      const { user: registeredUser, token: authToken } = res.data;
      setUser(registeredUser);
      setToken(authToken);
      localStorage.setItem('showbee_token', authToken);
      localStorage.setItem('showbee_user', JSON.stringify(registeredUser));
    }
  };

  const logout = () => {
    authAPI.logout().catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem('showbee_token');
    localStorage.removeItem('showbee_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
