import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './GamePlay.css';

function GamePlay({ user, updateUserBobux }) {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShop, setShowShop] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  const fetchGame = async () => {
    try {
      const token = localStorage.getItem('token');
      const [gameResponse, itemsResponse] = await Promise.all([
        axios.get(`/api/games/${gameId}`),
        axios.get(`/api/games/${gameId}/items`)
      ]);
      setGame(gameResponse.data);
      setItems(itemsResponse.data);
    } catch (err) {
      console.error('Failed to fetch game:', err);
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (item) => {
    if (user.bobux < item.price) {
      alert('Not enough Bobux!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/purchases', { gameItemId: item.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateUserBobux(response.data.newBobuxBalance);
      alert(`Purchased ${item.name} for ${item.price} Bobux!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Purchase failed');
    }
  };

  useEffect(() => {
    if (game && game.code && canvasRef.current) {
      try {
        // Create a safe execution environment
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Execute the game code
        const gameFunction = new Function('canvas', 'ctx', 'user', 'items', game.code);
        gameFunction(canvas, ctx, user, items);
      } catch (err) {
        console.error('Game execution error:', err);
      }
    }
  }, [game, canvasRef]);

  if (loading) {
    return <div className="game-play loading">Loading game...</div>;
  }

  if (!game) {
    return <div className="game-play error">Game not found</div>;
  }

  return (
    <div className="game-play">
      <div className="game-header">
        <h1>{game.title}</h1>
        <div className="game-info">
          <span>By {game.creator_name}</span>
          <span className="bobux-display">💰 {user.bobux} Bobux</span>
        </div>
      </div>

      <div className="game-container">
        <div className="game-canvas-wrapper">
          <canvas
            ref={canvasRef}
            id="gameCanvas"
            width={800}
            height={600}
            className="game-canvas"
          />
        </div>

        <div className="game-sidebar">
          <button
            onClick={() => setShowShop(!showShop)}
            className="button button-primary shop-toggle"
          >
            🛒 {showShop ? 'Close Shop' : 'Open Shop'}
          </button>

          {showShop && (
            <div className="shop-panel">
              <h3>In-Game Shop</h3>
              {items.length === 0 ? (
                <p>No items available</p>
              ) : (
                <div className="shop-items">
                  {items.map(item => (
                    <div key={item.id} className="shop-item">
                      <div className="shop-item-info">
                        <h4>{item.name}</h4>
                        <p>{item.description}</p>
                        <span className="shop-item-price">💰 {item.price} Bobux</span>
                      </div>
                      <button
                        onClick={() => purchaseItem(item)}
                        className="button button-primary"
                        disabled={user.bobux < item.price}
                      >
                        Buy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="game-description">
            <h3>About</h3>
            <p>{game.description || 'No description provided'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePlay;
