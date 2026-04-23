import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async (t) => {
    try {
      const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api' 
        : '/api';
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${t}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error("Auth validation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    if (data.user?.mustChangePassword) {
      setMustChangePassword(true);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    localStorage.removeItem('token');
  };

  const clearMustChange = () => setMustChangePassword(false);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, mustChangePassword, clearMustChange }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

