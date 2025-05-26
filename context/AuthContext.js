import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase, getCurrentSession, signIn, signUp, signOut } from '../lib/supabase';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Initialize auth state
  useEffect(() => {
    const initializeAuthState = async () => {
      try {
        if (!isMounted.current) return;
        const currentSession = await getCurrentSession();
        
        if (currentSession && isMounted.current) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initializeAuthState();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (isMounted.current) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setLoading(false);
        }
      }
    );

    // Cleanup subscription and mounted state
    return () => {
      isMounted.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      if (!isMounted.current) return { success: false, error: 'Component unmounted' };
      setLoading(true);
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Signup function
  const register = async (email, password, fullName) => {
    try {
      if (!isMounted.current) return { success: false, error: 'Component unmounted' };
      setLoading(true);
      const { data, error } = await signUp(email, password, fullName);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (!isMounted.current) return { success: false, error: 'Component unmounted' };
      setLoading(true);
      
      // Attempt to sign out from Supabase first
      const { error } = await signOut();
      
      // If there's no error or if the error is just that the session wasn't found,
      // we can safely clear the local state
      if (!error || error.message?.includes('session_not_found')) {
        if (isMounted.current) {
          setUser(null);
          setSession(null);
        }
        return { success: true };
      }
      
      throw error;
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Context value
  const value = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  // Return provider
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};