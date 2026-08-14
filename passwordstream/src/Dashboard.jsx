/**
 * Dashboard.jsx
 * The core vault interface where users manage and share their passwords.
 * Responsibilities:
 * 1. Fetches encrypted vault items and decrypts them locally.
 * 2. Handles creating, editing, and deleting vault items with local encryption.
 * 3. Fetches shared items, verifies their ECDSA signatures, and decrypts them with the Private RSA Key.
 * 4. Handles sharing items by encrypting them with the receiver's Public RSA Key and signing with the sender's Private ECDSA Key.
 */
import { useCallback, useEffect, useState } from 'react';
import { decryptData, decryptSharedPayload, encryptData, encryptHybrid, fingerprintPublicKey, signECDSA, verifyECDSA } from './crypto';
import './index.css';

const Dashboard = ({ token, encryptionKey, asymKeys }) => {
  const [credentials, setCredentials] = useState([]);
  const [sharedCredentials, setSharedCredentials] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' or 'shared'

  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [recipientFingerprint, setRecipientFingerprint] = useState('');
  const [fingerprintConfirmed, setFingerprintConfirmed] = useState(false);
  const [fingerprintStatus, setFingerprintStatus] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Fetches the user's personal vault items from the backend and decrypts them locally.
   * Because the backend only stores encrypted blobs, the browser must decrypt every single item
   * using the symmetric Master Encryption Key before it can be displayed.
   */
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/vault', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch vault items');
      const items = await res.json();

      const decryptedItems = await Promise.all(items.map(async (item) => {
        try {
          const decryptedPayloadStr = await decryptData(item.encrypted_payload, item.iv, encryptionKey);
          const data = JSON.parse(decryptedPayloadStr);
          return { id: item.id, ...data, created_at: item.created_at, type: 'vault' };
        } catch (e) {
          console.error("Failed to decrypt item", item.id, e);
          return { id: item.id, title: 'Decryption Error', error: true, type: 'vault' };
        }
      }));
      return decryptedItems;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [token, encryptionKey]);

  /**
   * Fetches passwords that other users have shared with this account.
   * This is a complex asymmetric process:
   * 1. It verifies the ECDSA digital signature to mathematically prove who sent it.
   * 2. It uses the user's Private RSA Key to decrypt the payload (which was encrypted specifically for them).
   */
  const fetchSharedCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/shares', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch shared items');
      const items = await res.json();

      const decryptedShared = [];
      for (const item of items) {
        try {
          // 1. Verify signature
          const senderPublicEcdsaObj = await window.crypto.subtle.importKey(
            'jwk', JSON.parse(item.sender_public_ecdsa_key), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
          );
          const isValid = await verifyECDSA(item.encrypted_payload, item.signature, senderPublicEcdsaObj);
          
          if (!isValid) {
            console.error("Invalid signature for shared item", item.id);
            decryptedShared.push({ id: item.id, title: 'Invalid Signature', error: true, type: 'shared' });
            continue;
          }

          // 2. Decrypt with my private RSA
          const decryptedPayloadStr = await decryptSharedPayload(item.encrypted_payload, asymKeys.rsaPrivate);
          const data = JSON.parse(decryptedPayloadStr);
          
          decryptedShared.push({ 
            id: item.id, 
            ...data, 
            sender_email: item.sender_email, 
            created_at: item.created_at,
            type: 'shared'
          });
        } catch (e) {
          console.error("Failed to decrypt shared item", item.id, e);
          decryptedShared.push({ id: item.id, title: 'Decryption Error', error: true, type: 'shared' });
        }
      }
      return decryptedShared;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [token, asymKeys]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCredentials(), fetchSharedCredentials()])
      .then(([vaultItems, sharedItems]) => {
        if (cancelled) return;
        setCredentials(vaultItems);
        setSharedCredentials(sharedItems);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, fetchCredentials, fetchSharedCredentials]);

  /**
   * Securely shares a credential with another user using Asymmetric Cryptography.
   * 1. Fetches the recipient's Public RSA Key from the server.
   * 2. Encrypts with AES-GCM and wraps the random AES key with the recipient's RSA key.
   * 3. Digitally signs the encrypted payload using the sender's Private ECDSA Key (to prove authenticity).
   * 4. Sends the encrypted and signed package to the backend.
   */
  const handleShare = async () => {
    if (!shareEmail) return alert('Enter an email address');
    if (!selectedItem) return;
    setShareLoading(true);

    try {
      // 1. Fetch recipient public keys
      const res = await fetch(`/api/users/public-keys/${encodeURIComponent(shareEmail)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'User not found' : 'Failed to fetch user');
      const recipient = await res.json();

      if (!recipient.public_rsa_key) {
        throw new Error("This user was created before the sharing feature was implemented and doesn't have a public key. They need to recreate their account.");
      }

      const recipientRsaPublicObj = await window.crypto.subtle.importKey(
        'jwk', JSON.parse(recipient.public_rsa_key), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
      );

      const fingerprint = await fingerprintPublicKey(recipient.public_rsa_key);
      const pinKey = `passwordstream:rsa-pin:${shareEmail.trim().toLowerCase()}`;
      const pinnedFingerprint = localStorage.getItem(pinKey);
      if (pinnedFingerprint && pinnedFingerprint !== fingerprint) {
        setRecipientFingerprint(fingerprint);
        setFingerprintStatus('The recipient key changed since your last share. Do not continue until you verify it out of band.');
        throw new Error('Recipient public key changed');
      }
      if (recipientFingerprint !== fingerprint) {
        setRecipientFingerprint(fingerprint);
        setFingerprintConfirmed(false);
        setFingerprintStatus(pinnedFingerprint ? 'This key matches the fingerprint pinned in this browser.' : 'First use: verify this fingerprint with the recipient through another channel.');
        return;
      }
      if (!fingerprintConfirmed) throw new Error('Confirm the recipient fingerprint before sharing');

      // 2. Prepare payload
      const payloadStr = JSON.stringify({
        title: selectedItem.title,
        username: selectedItem.username,
        password: selectedItem.password,
        url: selectedItem.url,
        notes: selectedItem.notes
      });

      // 3. Encrypt payload with AES-GCM and wrap only the AES key with RSA-OAEP
      const encryptedPayload = await encryptHybrid(payloadStr, recipientRsaPublicObj);

      // 4. Sign encrypted payload with My ECDSA Private Key
      const signature = await signECDSA(encryptedPayload, asymKeys.ecdsaPrivate);

      // 5. Send to server
      const shareRes = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: recipient.id,
          encrypted_payload: encryptedPayload,
          signature: signature
        })
      });

      if (!shareRes.ok) throw new Error('Failed to share item');

      localStorage.setItem(pinKey, fingerprint);
      alert(`Successfully shared with ${shareEmail}`);
      setShowShareModal(false);
      setShareEmail('');
      setRecipientFingerprint('');
      setFingerprintConfirmed(false);
      setFingerprintStatus('');
    } catch (err) {
      console.error(err);
      alert(err.message || "Error sharing credential");
    } finally {
      setShareLoading(false);
    }
  };

  /**
   * Encrypts and saves a new or edited credential to the personal vault.
   * 1. Converts the form data into a plain JSON string.
   * 2. Encrypts the string locally using the symmetric Master Encryption Key (AES-GCM).
   * 3. Sends ONLY the locked ciphertext and the Initialization Vector (IV) to the backend.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("Title is required");

    try {
      const payloadStr = JSON.stringify({
        title: formData.title,
        username: formData.username,
        password: formData.password,
        url: formData.url,
        notes: formData.notes
      });

      const { ciphertext, iv } = await encryptData(payloadStr, encryptionKey);

      const method = selectedItem && selectedItem.id !== 'new' ? 'PUT' : 'POST';
      const endpoint = selectedItem && selectedItem.id !== 'new' ? `/api/vault/${selectedItem.id}` : '/api/vault';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ encrypted_payload: ciphertext, iv })
      });

      if (!res.ok) throw new Error("Failed to save item");

      setCredentials(await fetchCredentials());
      setIsEditing(false);
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
      alert("Error saving credential");
    }
  };

  /**
   * Permanently deletes a credential from the backend database.
   * Requires confirmation to prevent accidental data loss.
   */
  const handleDelete = async () => {
    if (!selectedItem || selectedItem.id === 'new') return;

    if (!window.confirm("Are you sure you want to permanently delete this credential?")) {
      return;
    }

    try {
      const res = await fetch(`/api/vault/${selectedItem.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete item");

      setCredentials(await fetchCredentials());
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting credential");
    }
  };

  const currentList = activeTab === 'vault' ? credentials : sharedCredentials;
  const filteredCredentials = currentList.filter(c =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      {/* LEFT SIDEBAR */}
      <div className="dashboard-sidebar">
        <div className="sidebar-tabs" style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '10px' }}>
            <button className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`} onClick={() => { setActiveTab('vault'); setSelectedItem(null); }} style={{ flex: 1, padding: '10px', background: activeTab === 'vault' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'vault' ? 'bold' : 'normal' }}>My Vault</button>
            <button className={`tab-btn ${activeTab === 'shared' ? 'active' : ''}`} onClick={() => { setActiveTab('shared'); setSelectedItem(null); }} style={{ flex: 1, padding: '10px', background: activeTab === 'shared' ? '#e2e8f0' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'shared' ? 'bold' : 'normal' }}>Shared With Me</button>
        </div>

        <div className="sidebar-header">
          <input
            type="text"
            placeholder="Search credentials..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {activeTab === 'vault' && (
            <button
              className="new-item-btn"
              onClick={() => {
                setSelectedItem({ id: 'new' });
                setFormData({ title: '', username: '', password: '', url: '', notes: '' });
                setIsEditing(true);
                setShowPassword(false);
              }}
            >
              + New Credential
            </button>
          )}
        </div>

        <div className="credential-list">
          {loading ? <div className="loading-state">Loading...</div> :
            filteredCredentials.length === 0 ? <div className="empty-list">No items found</div> :
              filteredCredentials.map(item => (
                <div
                  key={item.id}
                  className={`credential-item ${selectedItem?.id === item.id ? 'active' : ''}`}
                  onClick={() => {
                    if (item.error) return alert("Cannot view corrupted item");
                    setSelectedItem(item);
                    setIsEditing(false);
                    setShowPassword(false);
                    setFormData({ title: item.title, username: item.username, password: item.password, url: item.url, notes: item.notes });
                  }}
                >
                  <h4>{item.title}</h4>
                  <p>{item.username || 'No username'} {item.type === 'shared' && <span style={{fontSize: '11px', color: '#666'}}><br/>(from {item.sender_email})</span>}</p>
                </div>
              ))}
        </div>
      </div>

      {/* RIGHT MAIN PANEL */}
      <div className="dashboard-main">
        {!selectedItem && (
          <div className="empty-state">
            <h2>Select a credential to view its properties</h2>
          </div>
        )}

        {selectedItem && !isEditing && (
          <div className="properties-view">
            <div className="actions-header">
              {activeTab === 'vault' && (
                  <>
                    <button className="secondary-btn" onClick={() => setIsEditing(true)}>Edit</button>
                    <button className="secondary-btn" onClick={() => {
                      setRecipientFingerprint('');
                      setFingerprintConfirmed(false);
                      setFingerprintStatus('');
                      setShowShareModal(true);
                    }}>Share</button>
                    <button className="secondary-btn" onClick={() => {
                        const dup = { ...selectedItem, id: 'new', title: selectedItem.title + " (Copy)" };
                        setSelectedItem(dup);
                        setFormData(dup);
                        setIsEditing(true);
                        setShowPassword(false);
                    }}>Duplicate</button>
                    <button className="secondary-btn delete-btn" onClick={handleDelete} style={{ color: 'red', borderColor: 'red' }}>Delete</button>
                  </>
              )}
            </div>

            <h2 className="properties-title">{selectedItem.title} {activeTab === 'shared' && <div style={{fontSize: '14px', color: '#888', marginTop: '5px'}}>Shared by {selectedItem.sender_email}</div>}</h2>

            <div className="property-group">
              <label>Username / Email</label>
              <div className="property-value">{selectedItem.username || '-'}</div>
            </div>

            <div className="property-group">
              <label>Password</label>
              <div className="property-value password-value">
                <span>{showPassword ? selectedItem.password : '••••••••••••••••'}</span>
                {selectedItem.password && (
                  <button className="icon-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </div>

            <div className="property-group">
              <label>URL</label>
              <div className="property-value">{selectedItem.url ? <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">{selectedItem.url}</a> : '-'}</div>
            </div>

            <div className="property-group">
              <label>Notes</label>
              <div className="property-value notes-value">{selectedItem.notes || '-'}</div>
            </div>
          </div>
        )}

        {selectedItem && isEditing && (
          <form className="edit-form" onSubmit={handleSave}>
            <h2>{selectedItem.id === 'new' ? 'Create New Credential' : 'Edit Credential'}</h2>

            <div className="form-group">
              <label>Title</label>
              <input type="text" className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
            </div>

            <div className="form-group">
              <label>Username / Email</label>
              <input type="text" className="form-input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} className="form-input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            <div className="form-group">
              <label>URL</label>
              <input type="url" className="form-input" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea className="form-input" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows="5"></textarea>
            </div>

            <div className="form-actions">
              <button type="button" className="secondary-btn" onClick={() => {
                if (selectedItem.id === 'new') setSelectedItem(null);
                else setIsEditing(false);
              }}>Cancel</button>
              <button type="submit" className="primary-btn">Save</button>
            </div>
          </form>
        )}
      </div>

      {showShareModal && (
          <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
              <div className="modal-content" style={{background: 'white', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%'}}>
                  <h3>Share "{selectedItem?.title}"</h3>
                  <p style={{marginBottom: '15px', color: '#666', fontSize: '14px'}}>Enter the email address of the user you want to share this with. They must have an existing account.</p>
                  <input 
                      type="email" 
                      className="form-input" 
                      value={shareEmail} 
                      onChange={e => {
                        setShareEmail(e.target.value);
                        setRecipientFingerprint('');
                        setFingerprintConfirmed(false);
                        setFingerprintStatus('');
                      }}
                      placeholder="user@example.com"
                  />
                  {recipientFingerprint && (
                    <div style={{ marginTop: '15px', padding: '12px', background: '#f8fafc', borderRadius: '6px', overflowWrap: 'anywhere' }}>
                      <strong>Recipient RSA fingerprint (SHA-256)</strong>
                      <div style={{ fontFamily: 'monospace', margin: '8px 0', fontSize: '12px' }}>{recipientFingerprint}</div>
                      <p style={{ fontSize: '12px', color: '#555' }}>{fingerprintStatus}</p>
                      {!fingerprintStatus.startsWith('The recipient key changed') && (
                        <label style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                          <input type="checkbox" checked={fingerprintConfirmed} onChange={e => setFingerprintConfirmed(e.target.checked)} />
                          I verified this fingerprint through another channel
                        </label>
                      )}
                    </div>
                  )}
                  <div className="form-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                      <button className="secondary-btn" onClick={() => setShowShareModal(false)}>Cancel</button>
                      <button className="primary-btn" onClick={handleShare} disabled={shareLoading}>
                          {shareLoading ? 'Working...' : recipientFingerprint ? 'Share' : 'Check recipient key'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
