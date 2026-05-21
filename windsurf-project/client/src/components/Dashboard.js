import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard({ user, updateUserBobux }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserGames();
  }, [user]);

  const fetchUserGames = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/games/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGames(response.data);
    } catch (err) {
      console.error('Failed to fetch games:', err);
    } finally {
      setLoading(false);
    }
  };

  const claimDailyBobux = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/users/${user.id}/bobux`, 
        { amount: 10 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUserBobux(response.data.bobux);
      alert('You claimed 10 daily Bobux!');
    } catch (err) {
      alert('Failed to claim daily Bobux');
    }
  };

  return (
    <div className="dashboard container">
      <div className="dashboard-header">
        <h1>Welcome back, {user.username}!</h1>
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">{user.bobux}</div>
            <div className="stat-label">Bobux</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-value">{games.length}</div>
            <div className="stat-label">Games Created</div>
          </div>
        </div>
        <button onClick={claimDailyBobux} className="button button-primary">
          Claim Daily 10 Bobux
        </button>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>My Games</h2>
          <Link to="/create-game" className="button button-primary">
            + Create New Game
          </Link>
        </div>

        {loading ? (
          <div className="loading">Loading games...</div>
        ) : games.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any games yet.</p>
            <Link to="/create-game" className="button button-primary">
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="grid">
            {games.map(game => (
              <div key={game.id} className="game-card">
                <div className="game-card-image">
                  {game.title.charAt(0)}
                </div>
                <div className="game-card-content">
                  <h3 className="game-card-title">{game.title}</h3>
                  <p className="game-card-description">{game.description || 'No description'}</p>
                  <div className="game-card-meta">
                    <span>{game.published ? '✅ Published' : '📝 Draft'}</span>
                    <Link to={`/play/${game.id}`} className="button button-secondary">
                      Play
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <Link to="/create-game" className="quick-action">
            <div className="quick-action-icon">🎮</div>
            <div className="quick-action-title">Create Game</div>
          </Link>
          <Link to="/marketplace" className="quick-action">
            <div className="quick-action-icon">🛒</div>
            <div className="quick-action-title">Marketplace</div>
          </Link>
          <Link to="/inventory" className="quick-action">
            <div className="quick-action-icon">🎒</div>
            <div className="quick-action-title">My Inventory</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
