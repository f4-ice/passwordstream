/**
 * Login.jsx
 * Handles user authentication.
 */
import { useState } from 'react';
import { generateKeys, decryptData, importAsymmetricKeys } from './crypto.js';
import { readJsonResponse } from './api.js';
import './index.css';

const Login = ({ onLogin, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Generate Auth Key and Encryption Key locally using Web Crypto API
      const { authKeyHex, encryptionKey } = await generateKeys(password, email);

      // 2. Send the Auth Key to the backend for verification
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), authKey: authKeyHex })
      });

      const data = await readJsonResponse(response);

      if (response.ok) {
        await processLoginSuccess(data, encryptionKey);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during cryptographic processing.');
    } finally {
      setLoading(false);
    }
  };

  const processLoginSuccess = async (data, encryptionKey) => {
    let rsaPrivateJwk = null;
    let ecdsaPrivateJwk = null;
    
    if (data.encryptedPrivateRsaKey) {
        const parsedRsa = JSON.parse(data.encryptedPrivateRsaKey);
        rsaPrivateJwk = await decryptData(parsedRsa.ciphertext, parsedRsa.iv, encryptionKey);
    }
    if (data.encryptedPrivateEcdsaKey) {
        const parsedEcdsa = JSON.parse(data.encryptedPrivateEcdsaKey);
        ecdsaPrivateJwk = await decryptData(parsedEcdsa.ciphertext, parsedEcdsa.iv, encryptionKey);
    }

    const asymKeys = await importAsymmetricKeys(null, rsaPrivateJwk, null, ecdsaPrivateJwk);

    onLogin(data.token, encryptionKey, asymKeys);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Log In to PasswordStream</h2>
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
                placeholder="Enter your Master Password"
              />
            </div>
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Decrypting & Authenticating...' : 'Log In'}
            </button>
            <p className="auth-switch">
              Don't have an account? <span onClick={onSwitchToSignup}>Create an account</span>
            </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
