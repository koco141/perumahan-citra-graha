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
      const res = await fetch('http://localhost:5000/api/auth/me', {
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
      // Don't logout on network error, keep current local state
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

