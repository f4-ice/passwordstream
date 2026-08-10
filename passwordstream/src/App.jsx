/**
 * App.jsx
 * The root component of PasswordStream.
 * Handles top-level routing (Landing page, Login, Signup, Vault, Account).
 * Manages the global state for the JWT token and cryptographic keys (Encryption Key, Asymmetric Keys)
 * so they can be passed down to the Dashboard and Account pages securely in memory.
 */
import React, { useMemo, useState } from 'react';
import siteLogo from './assets/logo.svg';
import './index.css';
import Login from './Login.jsx';
import Signup from './Signup.jsx';
import Dashboard from './Dashboard.jsx';
import Account from './Account.jsx';
import SiteGate from './SiteGate.jsx';
import Legal from './Legal.jsx';
import FAQ from './FAQ.jsx';
import DatabaseSchema from './DatabaseSchema.jsx';
import Checkout from './Checkout.jsx';

const CheckIcon = () => (
  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const WalletIcon = () => (<svg className="feature-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>);
const ShieldIcon = () => (<svg className="feature-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>);
const LockIcon = () => (<svg className="feature-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>);
const GlobeIcon = () => (<svg className="feature-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>);

/**
 * WaveLines Component
 * Generates the animated, sweeping background waves seen on the landing page.
 * Uses SVG paths calculated via sine waves for a smooth, mathematical curve effect.
 */
const WaveLines = () => {
  // Total number of parallel wave lines to render
  const linesCount = 26;
  const period = 1000;

  // Memoize the line calculations so they only run once on mount, preventing lag during re-renders.
  const lines = useMemo(() => {
    return Array.from({ length: linesCount }).map((_, i) => {
      // Offset each line's starting point (phase) to create the overlapping effect
      const phase = i * 50;
      // Vary the height (amplitude) slightly per line using a sine function
      const amplitude = 20 + Math.sin(i * 0.4) * 15;

      // Construct the SVG path string (M = Move to, L = Line to)
      let d = `M 0 ${Math.sin(phase * (Math.PI * 2 / period)) * amplitude} `;
      for (let x = 10; x <= 4500 + period; x += 15) {
        const y = Math.sin((x + phase) * (Math.PI * 2 / period)) * amplitude;
        d += `L ${x} ${y} `;
      }

      return { id: i, d, period, duration: 10 };
    });
  }, []);

  return (
    <div className="wave-lines-container">
      <div className="wave-lines-mask">
        <div className="wave-lines-group">
          {lines.map((line, i) => (
            <div key={line.id} className="wave-line-wrapper" style={{ top: `${i * 22}px` }}>
              <svg className="wave-line-svg" width="6000" height="80" style={{ '--period': `${line.period}px`, animationDuration: `${line.duration}s` }}>
                <path d={line.d} fill="none" stroke="rgba(14, 165, 233, 0.35)" strokeWidth="2" transform="translate(0, 40)" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [token, setToken] = useState(null);
  
  // Security parameters stored purely in memory
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [asymKeys, setAsymKeys] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleLoginSuccess = (newToken, newEncryptionKey, newAsymKeys) => {
    setToken(newToken);
    setEncryptionKey(newEncryptionKey);
    setAsymKeys(newAsymKeys);
    setCurrentPage('vault');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'landing':
        return renderLandingPage();
      case 'login':
        return <Login onLogin={handleLoginSuccess} onSwitchToSignup={() => setCurrentPage('signup')} />;
      case 'signup':
        return <Signup onSignup={() => setCurrentPage('login')} onSwitchToLogin={() => setCurrentPage('login')} />;
      case 'vault':
        return <Dashboard token={token} encryptionKey={encryptionKey} asymKeys={asymKeys} />;
      case 'account':
        return <Account token={token} setToken={setToken} setEncryptionKey={setEncryptionKey} setCurrentPage={setCurrentPage} />;
      case 'legal':
        return <Legal />;
      case 'checkout':
        return <Checkout selectedPlan={selectedPlan} setCurrentPage={setCurrentPage} />;
      default:
        return renderLandingPage();
    }
  };

  const renderLandingPage = () => {
    return (
      <div className="landing-page">
        <section className="hero">
          <WaveLines />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5rem', width: '100%', maxWidth: '1200px', zIndex: 1, position: 'relative', flexWrap: 'wrap', padding: '2rem' }}>
            
            {/* Left Card */}
            <div className="hero-title-card" style={{ flex: '1', minWidth: '300px', backgroundColor: 'white', borderRadius: '24px', padding: '4rem 2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <h1 style={{ fontFamily: '"Impact", "Arial Black", sans-serif', color: '#4facfe', fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: 0, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
                YOUR PASSWORD<br/>MANAGER
              </h1>
            </div>
            
            {/* Right Cards */}
            <div style={{ position: 'relative', width: '320px', height: '380px', flexShrink: 0 }}>
              {/* Black Foreground Card */}
              <div style={{ position: 'absolute', right: 0, width: '100%', height: '100%', backgroundColor: '#111524', borderRadius: '24px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 2 }}>
                <div style={{ width: '140px', height: '140px', backgroundColor: 'white', borderRadius: '50%', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                   <img src="/f4-ice-logo.png" alt="f4-ice logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
                </div>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 'bold' }}>Check Out My Github!</h3>
                <a href="https://github.com" style={{ backgroundColor: 'white', color: '#111524', padding: '0.7rem 1.8rem', borderRadius: '50px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block', fontSize: '0.95rem', cursor: 'pointer' }}>Follow Github</a>
              </div>
            </div>

          </div>
        </section>
        <section className="flowcharts-section">
          <div className="flowchart-header">
            <h2 className="flowchart-title">Zero-Knowledge Architecture</h2>
            <p>Scroll to explore the cryptographic flows</p>
          </div>

          <div className="flowchart-scroll-container">
            <div className="flow-row-wrapper">
              <div className="flow-content-card">
                <div className="flow-row-title">Master Key Generation</div>
                <div className="flow-row">
                  <div className="flow-box">
                    <h4>User Input</h4>
                    <p>You type your Email and Master Password.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Convert to Bytes</h4>
                    <p>Strings are turned into raw computer bytes (ArrayBuffer).</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>PBKDF2 Key Derivation</h4>
                    <p>Smash the bytes 600,000 times using SHA-256 and your Email as a 'Salt' to prevent guessing.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>512-Bit Master Key</h4>
                    <p>A massive, extremely secure cryptographic key is born.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Slice the Key</h4>
                    <p>Cut the 512 bits perfectly in half into two 256-bit chunks.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>Auth Key (First Half)</h4>
                    <p>Sent to the server to log you in. The server NEVER sees your real password.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>Encryption Key (Second Half)</h4>
                    <p>Imported into AES-GCM and stays strictly hidden on your device to lock your vault.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flow-row-wrapper">
              <div className="flow-content-card">
                <div className="flow-row-title">Vault Encryption</div>
                <div className="flow-row">
                  <div className="flow-box">
                    <h4>Raw Vault Data</h4>
                    <p>For example: your Netflix username and password saved in a plain JSON object.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Generate Random IV</h4>
                    <p>Create a random 12-byte 'Initialization Vector' so every encryption looks completely unique.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>AES-256-GCM Encryption</h4>
                    <p>Lock the JSON using your secret 256-bit Encryption Key and the random IV.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>Create Secure Blob</h4>
                    <p>Convert the scrambled text and the IV into Hex strings.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>Upload to Database</h4>
                    <p>Server stores the blob but has zero knowledge of your Encryption Key, so it can NEVER read it.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flow-row-wrapper">
              <div className="flow-content-card">
                <div className="flow-row-title">Password Sharing</div>
                <div className="flow-row">
                  <div className="flow-box">
                    <h4>Setup (Done at Signup)</h4>
                    <p>You generated an RSA lock/key pair for encryption, and an ECDSA pair for signatures.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>Fetch Receiver's Lock</h4>
                    <p>You want to share a password. You ask the server for the Receiver's Public RSA Key.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Encrypt Data</h4>
                    <h4>(RSA-OAEP)</h4>
                    <p>You put the password in a box and lock it with THEIR RSA Public Key. Now ONLY THEY can open it!</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Sign Data (ECDSA P-256)</h4>
                    <p>You stamp the locked box with YOUR Private ECDSA signature to mathematically prove you actually sent it.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>Server Routing</h4>
                    <p>The server delivers the locked, stamped box. It cannot peek inside!</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Receiver Opens Box</h4>
                    <p>Receiver checks your stamp with your Public ECDSA Key, then unlocks the box with their Private RSA Key.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flow-row-wrapper">
              <div className="flow-content-card">
                <div className="flow-row-title">Biometric Authentication</div>
                <div className="flow-row">
                  <div className="flow-box">
                    <h4>Biometric Prompt</h4>
                    <p>Device asks you to look at the camera (FaceID / Windows Hello).</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Secure Enclave</h4>
                    <p>Your hardware securely matches your face locally. Face data NEVER leaves the device!</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box algo-box">
                    <h4>Sign Challenge (ECDSA)</h4>
                    <p>Device signs a random server challenge using your secure Hardware Private Key.</p>
                  </div>
                  <div className="flow-connector"></div>
                  <div className="flow-box">
                    <h4>Server Verification</h4>
                    <p>Server mathematically verifies the signature using your Public Key to log you in.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="tech-stack-section">
          <h2 className="tech-stack-title">Powered By Modern Technologies</h2>
          <div className="tech-grid">
            <div className="tech-track">
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" alt="React" />
                React 18
              </div>
              <div className="tech-card">
                <img src="https://vitejs.dev/logo.svg" alt="Vite" />
                Vite
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" alt="Node.js" />
                Node.js
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg" alt="Express" className="invert" />
                Express
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" />
                PostgreSQL
              </div>
              <div className="tech-card">
                <img src="https://www.vectorlogo.zone/logos/docker/docker-icon.svg" alt="Docker" />
                Docker
              </div>
              <div className="tech-card">
                Web Crypto API
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg" alt="AWS" className="invert" />
                AWS EC2
              </div>
            </div>
            {/* Duplicated track for seamless infinite marquee loop */}
            <div className="tech-track" aria-hidden="true">
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" alt="React" />
                React 18
              </div>
              <div className="tech-card">
                <img src="https://vitejs.dev/logo.svg" alt="Vite" />
                Vite
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" alt="Node.js" />
                Node.js
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg" alt="Express" className="invert" />
                Express
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" />
                PostgreSQL
              </div>
              <div className="tech-card">
                <img src="https://www.vectorlogo.zone/logos/docker/docker-icon.svg" alt="Docker" />
                Docker
              </div>
              <div className="tech-card">
                Web Crypto API
              </div>
              <div className="tech-card">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg" alt="AWS" className="invert" />
                AWS EC2
              </div>
            </div>
          </div>
        </section>
        <section className="tech-details-section">
          <div className="features-header">
            <h2>Technology Deep Dive</h2>
            <p>How each piece of our modern stack contributes to your security and experience.</p>
          </div>
          <div className="tech-details-grid">
            <div className="tech-detail-card">
              <h3><img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" alt="React" style={{ width: '24px', verticalAlign: 'middle', marginRight: '8px' }} /> React 18</h3>
              <p>Powers the dynamic frontend, providing a seamless and highly responsive user interface with component-level state management.</p>
            </div>
            <div className="tech-detail-card">
              <h3><img src="https://vitejs.dev/logo.svg" alt="Vite" style={{ width: '24px', verticalAlign: 'middle', marginRight: '8px' }} /> Vite</h3>
              <p>Serves as the lightning-fast build tool and development server, ensuring rapid deployment and optimal frontend performance.</p>
            </div>
            <div className="tech-detail-card">
              <h3><img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" alt="Node.js" style={{ width: '24px', verticalAlign: 'middle', marginRight: '8px' }} /> Node.js & Express</h3>
              <p>Provides the robust, scalable backend infrastructure to handle API routing, session management, and database connections.</p>
            </div>
            <div className="tech-detail-card">
              <h3><img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" style={{ width: '24px', verticalAlign: 'middle', marginRight: '8px' }} /> PostgreSQL</h3>
              <p>A highly reliable relational database used to store strictly encrypted user vaults and authentication metadata.</p>
            </div>
            <div className="tech-detail-card">
              <h3><img src="https://www.vectorlogo.zone/logos/docker/docker-icon.svg" alt="Docker" style={{ width: '24px', verticalAlign: 'middle', marginRight: '8px' }} /> Docker</h3>
              <p>Containerizes the entire application architecture, guaranteeing perfectly consistent and reproducible deployments across any environment.</p>
            </div>
            <div className="tech-detail-card">
              <h3>Web Crypto API</h3>
              <p>Executes military-grade zero-knowledge encryption algorithms (AES-GCM, RSA, ECDSA) directly inside the browser sandbox before any data reaches the server.</p>
            </div>
            <div className="tech-detail-card" style={{ gridColumn: '1 / -1', maxWidth: '600px', margin: '0 auto' }}>
              <h3><img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg" alt="AWS" style={{ width: '36px', verticalAlign: 'middle', marginRight: '8px' }} /> AWS EC2</h3>
              <p>Delivers the highly available, reliable cloud infrastructure where the Node backend and PostgreSQL database are securely hosted.</p>
            </div>
          </div>
        </section>
        <DatabaseSchema />

        <section className="features-section">
          <div className="features-header">
            <h2>Why Choose Us</h2>
            <p>Discover why thousands trust PasswordStream to secure their digital lives.</p>
          </div>
          <div className="features-grid">

            <div className="feature-card">
              <div className="feature-icon-wrapper"><WalletIcon /></div>
              <h3>Unbeatable Value</h3>
              <p>Premium security shouldn't break the bank. Enjoy top-tier protection at an affordable price point that makes sense for everyone.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper"><ShieldIcon /></div>
              <h3>Rock-Solid Reliability</h3>
              <p>Built on infrastructure you can count on. Your credentials are always available when you need them, with maximum uptime guaranteed.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper"><LockIcon /></div>
              <h3>Zero-Knowledge Architecture</h3>
              <p>Total privacy by design. Your data is encrypted before it ever leaves your device, meaning even we cannot access your passwords.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper"><GlobeIcon /></div>
              <h3>Access Anywhere</h3>
              <p>Your digital vault lives securely in the cloud. Seamlessly access your credentials from any browser, on any device, anywhere in the world.</p>
            </div>

          </div>
        </section>
        <section className="plans-section">
          <h2 className="plans-title">Plans</h2>
          <div className="plans-grid">

            <div
              className="plan-card"
              style={{ cursor: 'pointer' }}
              onClick={() => { setSelectedPlan({ name: 'Basic', price: '2$/year' }); setCurrentPage('checkout'); }}
            >
              <h3 className="plan-name">Basic</h3>
              <div className="plan-price">2$/year</div>
              <ul className="plan-features">
                <li><CheckIcon /> <span>Generate passwords securely</span></li>
                <li><CheckIcon /> <span>Use on all of your devices</span></li>
                <li><CheckIcon /> <span>Share passwords with anyone using PasswordStream</span></li>
                <li><CheckIcon /> <span>Up to 1 account</span></li>
              </ul>
              <div className="plan-action" style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--primary-blue)', fontWeight: 'bold' }}>Select Plan ➔</div>
            </div>

            <div
              className="plan-card"
              style={{ cursor: 'pointer' }}
              onClick={() => { setSelectedPlan({ name: 'Family', price: '4$/year' }); setCurrentPage('checkout'); }}
            >
              <h3 className="plan-name">Family</h3>
              <div className="plan-price">4$/year</div>
              <ul className="plan-features">
                <li><CheckIcon /> <span>Generate passwords securely</span></li>
                <li><CheckIcon /> <span>Use on all of your devices</span></li>
                <li><CheckIcon /> <span>Share passwords with anyone using PasswordStream</span></li>
                <li><CheckIcon /> <span>Up to 5 accounts</span></li>
              </ul>
              <div className="plan-action" style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--primary-blue)', fontWeight: 'bold' }}>Select Plan ➔</div>
            </div>

            <div
              className="plan-card"
              style={{ cursor: 'pointer' }}
              onClick={() => { setSelectedPlan({ name: 'Group', price: '20$/year' }); setCurrentPage('checkout'); }}
            >
              <h3 className="plan-name">Group</h3>
              <div className="plan-price">20$/year</div>
              <ul className="plan-features">
                <li><CheckIcon /> <span>Generate passwords securely</span></li>
                <li><CheckIcon /> <span>Use on all of your devices</span></li>
                <li><CheckIcon /> <span>Share passwords with anyone using PasswordStream</span></li>
                <li><CheckIcon /> <span>Up to 100 accounts</span></li>
              </ul>
              <div className="plan-action" style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--primary-blue)', fontWeight: 'bold' }}>Select Plan ➔</div>
            </div>

          </div>
        </section>
        <FAQ />
      </div>
    );
  };

  return (
    <SiteGate>
      <div className="app-container">
        <header className="header">
          <div className="logo" onClick={() => setCurrentPage('landing')} style={{ cursor: 'pointer' }}>
            <img src={siteLogo} alt="PasswordStream" className="logo-image" />
          </div>
          <nav className="nav-links">
            <a href="#home" onClick={(e) => { e.preventDefault(); setCurrentPage('landing'); }}>Homepage</a>

            {token ? (
              <>
                <a href="#dashboard" onClick={(e) => { e.preventDefault(); setCurrentPage('vault'); }}>Dashboard</a>
                <a href="#account" onClick={(e) => { e.preventDefault(); setCurrentPage('account'); }}>Account</a>
                <button className="signup-btn" onClick={() => { setToken(null); setEncryptionKey(null); setAsymKeys(null); setCurrentPage('landing'); }}>Log Out</button>
              </>
            ) : (
              <div className="auth-buttons">
                <button className="login-btn" onClick={() => setCurrentPage('login')}>Log In</button>
                <button className="signup-btn" onClick={() => setCurrentPage('signup')}>Sign Up</button>
              </div>
            )}
          </nav>
        </header>

        {renderContent()}

        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-logo">
              <img src={siteLogo} alt="PasswordStream Logo" />
            </div>
            <div className="footer-links">
              <a href="#legal" onClick={(e) => { e.preventDefault(); setCurrentPage('legal'); }}>
                Legal & Compliance
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="demo-warning-banner">
              <div className="demo-warning-text">
                <strong>Educational Demo:</strong> <br />This application is for educational purposes only and is not a real product. The objective of this project was to learn and implement advanced zero-knowledge encryption and modern credential management technologies.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </SiteGate>
  );
}

export default App;
