/**
 * Signup.jsx
 * Handles new user registration.
 */
import { useState } from 'react';
import { generateKeys, generateAsymmetricKeys } from './crypto.js';
import { readJsonResponse } from './api.js';
import './index.css';

const Signup = ({ onSignup, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProgress(10);
    setProgressText('Starting registration...');

    try {
      setProgress(30);
      setProgressText('Generating encryption keys...');

      // Generate keys using the Web Crypto API.
      const { authKeyHex, encryptionKey } = await generateKeys(password, email);
      
      setProgress(70);
      setProgressText('Generating asymmetric keys...');
      
      // Generate Asymmetric Keys (RSA & ECDSA)
      const asymKeys = await generateAsymmetricKeys(encryptionKey);

      setProgress(90);
      setProgressText('Saving encrypted account material...');

      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          authKey: authKeyHex,
          publicRsaKey: asymKeys.publicRsaKey,
          encryptedPrivateRsaKey: asymKeys.encryptedPrivateRsaKey,
          publicEcdsaKey: asymKeys.publicEcdsaKey,
          encryptedPrivateEcdsaKey: asymKeys.encryptedPrivateEcdsaKey
        })
      });

      const data = await readJsonResponse(response);

      if (response.ok) {
        setProgress(100);
        setProgressText('Registration complete!');
        setTimeout(() => onSignup(), 600);
      } else {
        setError(data.message || 'Registration failed');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during cryptographic processing.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create Secure Account</h2>
        <div className="auth-warning">
          <strong>WARNING:</strong> There is no password recovery. Keep your Master Password safe.
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label>Master Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Create a strong Master Password"
            />
          </div>
          {loading && (
            <div style={{ marginBottom: '15px' }}>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{progressText}</div>
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Processing...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <span onClick={onSwitchToLogin}>Log In</span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
