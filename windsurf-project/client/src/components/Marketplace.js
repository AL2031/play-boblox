import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Marketplace.css';

function Marketplace({ user, updateUserBobux }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await axios.get('/api/games');
      setGames(response.data);
    } catch (err) {
      console.error('Failed to fetch games:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketplace container">
      <div className="marketplace-header">
        <h1>🎮 Game Marketplace</h1>
        <p>Discover and play amazing 2D games created by the community</p>
        <div className="bobux-display">💰 {user.bobux} Bobux</div>
      </div>

      {loading ? (
        <div className="loading">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="empty-state">
          <p>No games published yet. Be the first to create one!</p>
          <Link to="/create-game" className="button button-primary">
            Create a Game
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
                  <span>By {game.creator_name}</span>
                  <span>{game.item_count} items</span>
                </div>
                <Link to={`/play/${game.id}`} className="button button-primary">
                  Play Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Marketplace;
