/**
 * Login.jsx
 * Handles user authentication.
 */
import React, { useState, useRef, useEffect } from 'react';
import { generateKeys, decryptData, importAsymmetricKeys } from './crypto.js';
import * as faceapi from 'face-api.js';
import './index.css';

const Login = ({ onLogin, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Face Scan State: Determines if the user enabled facial recognition during signup
  const [faceRequired, setFaceRequired] = useState(false);
  // Cache the cryptographic keys temporarily while waiting for the face scan to complete
  const [authKeyCache, setAuthKeyCache] = useState(null);
  const [encKeyCache, setEncKeyCache] = useState(null);
  // Tracks if the massive faceapi machine learning models have finished loading
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState(null);
  
  // References to the DOM elements required for capturing and drawing the webcam feed
  const videoRef = useRef();

  /**
   * useEffect: Load Facial Recognition Models
   * Fetches the TinyFaceDetector and FaceLandmark68Net models from the public directory
   * when the component mounts. Required before the webcam can start scanning.
   */
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face models:", err);
        setError("Failed to load facial recognition models.");
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (faceRequired && modelsLoaded) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          setError("Failed to access camera.");
        });
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [faceRequired, modelsLoaded]);

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

      const data = await response.json();

      if (response.ok) {
        await processLoginSuccess(data, encryptionKey);
      } else if (response.status === 403 && data.face_required) {
        setFaceRequired(true);
        setAuthKeyCache(authKeyHex);
        setEncKeyCache(encryptionKey);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during cryptographic processing.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (!videoRef.current || !stream) {
        throw new Error("Camera not ready.");
      }
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        throw new Error("No face detected. Please look directly at the camera and try again.");
      }
      const faceDescriptorArr = Array.from(detection.descriptor);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          authKey: authKeyCache, 
          faceDescriptor: faceDescriptorArr 
        })
      });

      const data = await response.json();

      if (response.ok) {
        await processLoginSuccess(data, encKeyCache);
      } else {
        setError(data.message || 'Face recognition failed');
        setFaceRequired(false); 
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error processing face scan.');
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
        
        {!faceRequired ? (
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
              Don't have an account? <span onClick={onSwitchToSignup}>Sign up securely</span>
            </p>
          </form>
        ) : (
          <div className="face-scan-section" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '15px' }}>Your account requires Facial Recognition to log in.</p>
            <div className="video-container" style={{ marginBottom: '15px' }}>
              {!modelsLoaded ? (
                <p>Loading AI Models...</p>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  style={{ width: '100%', maxWidth: '300px', borderRadius: '8px' }}
                />
              )}
            </div>
            <button 
              onClick={handleFaceSubmit} 
              disabled={loading || !modelsLoaded} 
              className="auth-button"
            >
              {loading ? 'Scanning...' : 'Scan Face & Log In'}
            </button>
            <button 
              onClick={() => {
                setFaceRequired(false);
                setError('');
              }} 
              style={{ marginTop: '10px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
