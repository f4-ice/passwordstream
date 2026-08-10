/**
 * Signup.jsx
 * Handles new user registration.
 */
import React, { useState, useRef, useEffect } from 'react';
import { generateKeys, generateAsymmetricKeys } from './crypto.js';
import * as faceapi from 'face-api.js';
import './index.css';

const Signup = ({ onSignup, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  // Facial Recognition State
  const [useFaceScan, setUseFaceScan] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef();

  // Load models when checkbox is checked
  useEffect(() => {
    if (useFaceScan && !modelsLoaded) {
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
          setUseFaceScan(false);
        }
      };
      loadModels();
    }
  }, [useFaceScan, modelsLoaded]);

  // Handle camera stream
  useEffect(() => {
    if (useFaceScan && modelsLoaded) {
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
          setUseFaceScan(false);
        });
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useFaceScan, modelsLoaded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProgress(10);
    setProgressText('Starting registration...');

    try {
      let faceDescriptorArr = null;
      
      if (useFaceScan) {
        if (!videoRef.current || !stream) {
          throw new Error("Camera not ready.");
        }
        setProgress(30);
        setProgressText('Scanning face...');
        const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
        if (!detection) {
          throw new Error("No face detected. Please ensure your face is clearly visible.");
        }
        faceDescriptorArr = Array.from(detection.descriptor);
      }

      setProgress(useFaceScan ? 50 : 30);
      setProgressText('Generating secure encryption keys...');

      // Generate keys securely using Web Crypto API.
      const { authKeyHex, encryptionKey } = await generateKeys(password, email);
      
      setProgress(70);
      setProgressText('Generating asymmetric keys...');
      
      // Generate Asymmetric Keys (RSA & ECDSA)
      const asymKeys = await generateAsymmetricKeys(encryptionKey);

      // Stop camera before network request
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      setProgress(90);
      setProgressText('Saving account securely...');

      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          authKey: authKeyHex,
          publicRsaKey: asymKeys.publicRsaKey,
          encryptedPrivateRsaKey: asymKeys.encryptedPrivateRsaKey,
          publicEcdsaKey: asymKeys.publicEcdsaKey,
          encryptedPrivateEcdsaKey: asymKeys.encryptedPrivateEcdsaKey,
          faceDescriptor: faceDescriptorArr
        })
      });

      const data = await response.json();

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
          <strong>WARNING:</strong> We use zero-knowledge encryption. If you forget your Master Password, we cannot recover your data.
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
          
          <div className="form-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                checked={useFaceScan} 
                onChange={(e) => setUseFaceScan(e.target.checked)} 
              />
              Add Facial Recognition (Optional)
            </label>
          </div>

          {useFaceScan && (
            <div className="video-container" style={{ textAlign: 'center', marginBottom: '15px' }}>
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
          )}

          {loading && (
            <div style={{ marginBottom: '15px' }}>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{progressText}</div>
            </div>
          )}

          <button type="submit" disabled={loading || (useFaceScan && !modelsLoaded)} className="auth-button">
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
