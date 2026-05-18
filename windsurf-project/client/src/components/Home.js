import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home({ user }) {
  return (
    <div className="home">
      <div className="hero">
        <h1 className="hero-title">Welcome to Boblox</h1>
        <p className="hero-subtitle">Create, Play, and Earn Bobux in 2D Games</p>
        <div className="hero-buttons">
          {user ? (
            <Link to="/marketplace" className="hero-button">Explore Games</Link>
          ) : (
            <>
              <Link to="/register" className="hero-button hero-button-primary">Get Started</Link>
              <Link to="/login" className="hero-button hero-button-secondary">Login</Link>
            </>
          )}
        </div>
      </div>

      <div className="features">
        <div className="feature">
          <div className="feature-icon">🎮</div>
          <h3>Create Games</h3>
          <p>Build your own 2D games using our simple game engine</p>
        </div>
        <div className="feature">
          <div className="feature-icon">💰</div>
          <h3>Earn Bobux</h3>
          <p>Start with 100 Bobux and earn more by creating popular games</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🛒</div>
          <h3>Marketplace</h3>
          <p>Buy and sell items in games using Bobux</p>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create Account</h3>
            <p>Sign up and get 100 Bobux to start</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Create or Play</h3>
            <p>Build your own game or play others'</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Earn & Spend</h3>
            <p>Buy items and earn Bobux</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
