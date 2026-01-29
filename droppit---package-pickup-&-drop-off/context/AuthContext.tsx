
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (user: User) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('droppit_session');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('droppit_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const storedUsers = JSON.parse(localStorage.getItem('droppit_users_db') || '[]');
    const foundUser = storedUsers.find((u: User) => u.email.toLowerCase() === email.toLowerCase());

    if (foundUser && foundUser.password === password) {
      setUser(foundUser);
      localStorage.setItem('droppit_session', JSON.stringify(foundUser));
      return { success: true };
    }
    return { success: false, error: foundUser ? 'Invalid credentials' : 'No account found' };
  };

  const signUp = async (newUser: User) => {
    const storedUsers = JSON.parse(localStorage.getItem('droppit_users_db') || '[]');
    const emailExists = storedUsers.some((u: User) => u.email.toLowerCase() === newUser.email.toLowerCase());

    if (emailExists) {
      return { success: false, error: 'Email already registered' };
    }

    const fullUser: User = {
      ...newUser,
      id: crypto.randomUUID(),
    };

    const updatedUsers = [...storedUsers, fullUser];
    localStorage.setItem('droppit_users_db', JSON.stringify(updatedUsers));
    
    setUser(fullUser);
    localStorage.setItem('droppit_session', JSON.stringify(fullUser));
    
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('droppit_session');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('droppit_session', JSON.stringify(updatedUser));
    
    const storedUsers = JSON.parse(localStorage.getItem('droppit_users_db') || '[]');
    const updatedUsers = storedUsers.map((u: User) => 
      u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u
    );
    localStorage.setItem('droppit_users_db', JSON.stringify(updatedUsers));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
