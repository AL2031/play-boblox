import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Inventory.css';

function Inventory({ user }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, [user]);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/users/${user.id}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inventory container">
      <div className="inventory-header">
        <h1>🎒 My Inventory</h1>
        <div className="bobux-display">💰 {user.bobux} Bobux</div>
      </div>

      {loading ? (
        <div className="loading">Loading inventory...</div>
      ) : inventory.length === 0 ? (
        <div className="empty-state">
          <p>Your inventory is empty. Play games and buy items to fill it!</p>
        </div>
      ) : (
        <div className="grid">
          {inventory.map(item => (
            <div key={item.id} className="inventory-item">
              <div className="inventory-item-icon">🎁</div>
              <div className="inventory-item-content">
                <h3>{item.name}</h3>
                <p className="inventory-item-description">{item.description}</p>
                <p className="inventory-item-game">From: {item.game_title}</p>
                <p className="inventory-item-type">Type: {item.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Inventory;
