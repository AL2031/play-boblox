import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './GameCreator.css';

function GameCreator({ user }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    code: getDefaultGameCode(),
    published: false
  });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', type: 'item' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function getDefaultGameCode() {
    return `// Boblox 2D Game Engine
// Create your game here!

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let player = { x: 50, y: 50, width: 30, height: 30, color: '#667eea' };
let score = 0;

// Game loop
function gameLoop() {
  // Clear canvas
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  
  // Draw score
  ctx.fillStyle = '#333';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 10, 30);
  
  requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();

// Add your game logic here!
// You can move the player, add obstacles, collect items, etc.
`;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) {
      alert('Please fill in item name and price');
      return;
    }
    setItems([...items, { ...newItem, price: parseInt(newItem.price) }]);
    setNewItem({ name: '', description: '', price: '', type: 'item' });
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Create game
      const gameResponse = await axios.post('/api/games', {
        title: formData.title,
        description: formData.description,
        code: formData.code,
        published: formData.published
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const gameId = gameResponse.data.id;

      // Add items
      for (const item of items) {
        await axios.post(`/api/games/${gameId}/items`, item, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-creator container">
      <h1>Create Your Game</h1>
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="game-form">
        <div className="form-section">
          <h2>Game Details</h2>
          <input
            type="text"
            name="title"
            placeholder="Game Title"
            value={formData.title}
            onChange={handleChange}
            className="input"
            required
          />
          <textarea
            name="description"
            placeholder="Game Description"
            value={formData.description}
            onChange={handleChange}
            className="textarea"
          />
        </div>

        <div className="form-section">
          <h2>Game Code</h2>
          <p className="code-help">
            Write your game using JavaScript! The game runs in a canvas element.
            Use the provided template to get started.
          </p>
          <textarea
            name="code"
            value={formData.code}
            onChange={handleChange}
            className="textarea code-editor"
            style={{ fontFamily: 'monospace', minHeight: '400px' }}
            required
          />
        </div>

        <div className="form-section">
          <h2>In-Game Items (for players to buy with Bobux)</h2>
          <div className="item-creator">
            <input
              type="text"
              placeholder="Item Name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="input"
            />
            <input
              type="number"
              placeholder="Price (Bobux)"
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              className="input"
            />
            <select
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
              className="input"
            >
              <option value="item">Item</option>
              <option value="powerup">Power-up</option>
              <option value="skin">Skin</option>
            </select>
            <button type="button" onClick={handleAddItem} className="button button-secondary">
              + Add Item
            </button>
          </div>

          {items.length > 0 && (
            <div className="items-list">
              {items.map((item, index) => (
                <div key={index} className="item-row">
                  <span>{item.name}</span>
                  <span>💰 {item.price} Bobux</span>
                  <button type="button" onClick={() => handleRemoveItem(index)} className="button button-secondary">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            />
            Publish immediately (others can play your game)
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Game'}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="button button-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default GameCreator;
