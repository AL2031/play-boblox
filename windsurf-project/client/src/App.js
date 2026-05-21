import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import GameCreator from './components/GameCreator';
import GamePlay from './components/GamePlay';
import Marketplace from './components/Marketplace';
import Inventory from './components/Inventory';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUserBobux = (newBobux) => {
    setUser({ ...user, bobux: newBobux });
    localStorage.setItem('user', JSON.stringify({ ...user, bobux: newBobux }));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />} />
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard user={user} updateUserBobux={updateUserBobux} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/create-game" 
          element={user ? <GameCreator user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/play/:gameId" 
          element={user ? <GamePlay user={user} updateUserBobux={updateUserBobux} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/marketplace" 
          element={user ? <Marketplace user={user} updateUserBobux={updateUserBobux} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/inventory" 
          element={user ? <Inventory user={user} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </div>
  );
}

export default App;
