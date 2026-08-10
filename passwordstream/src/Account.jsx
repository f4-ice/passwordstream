/**
 * Account.jsx
 * Handles account management features like changing the Master Password.
 * When changing a password, this component must:
 * 1. Generate the old keys and new keys.
 * 2. Decrypt every single vault item using the old keys.
 * 3. Re-encrypt every single vault item using the new keys.
 * 4. Send the bulk-update payload back to the server.
 */
import React, { useState } from 'react';
import { generateKeys, encryptData, decryptData } from './crypto';
import './index.css';

const Account = ({ token, setToken, setEncryptionKey, setCurrentPage }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Extract email from JWT token for salt
  const userEmail = JSON.parse(atob(token.split('.')[1])).email;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setMessage({ text: "New passwords do not match", type: "error" });
    }
    
    setLoading(true);
    setMessage({ text: "Re-encrypting your vault... Please wait.", type: "info" });

    try {
      // 1. Generate keys for old and new passwords
      const { authKeyHex: oldAuthKeyHex, encryptionKey: oldEncryptionKey } = await generateKeys(oldPassword, userEmail);
      const { authKeyHex: newAuthKeyHex, encryptionKey: newEncryptionKey } = await generateKeys(newPassword, userEmail);

      // 2. Fetch all vault items
      const res = await fetch('/api/vault', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch vault items");
      const vaultItems = await res.json();

      // 3. Decrypt and re-encrypt every item
      const vault_updates = await Promise.all(vaultItems.map(async (item) => {
        let decryptedPayloadStr;
        try {
          decryptedPayloadStr = await decryptData(item.encrypted_payload, item.iv, oldEncryptionKey);
        } catch (err) {
          throw new Error("Incorrect current password");
        }
        
        const { ciphertext, iv } = await encryptData(decryptedPayloadStr, newEncryptionKey);
        return { id: item.id, encrypted_payload: ciphertext, iv };
      }));

      // 4. Send the massive bulk update to the server
      const updateRes = await fetch('/api/account/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldAuthKey: oldAuthKeyHex,
          newAuthKey: newAuthKeyHex,
          vault_updates
        })
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(errorData.message || "Failed to change password");
      }

      // Success!
      setEncryptionKey(newEncryptionKey);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ text: "Master password successfully changed and vault re-encrypted!", type: "success" });

    } catch (err) {
      console.error(err);
      setMessage({ text: err.message || "An error occurred", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm("WARNING: This will permanently delete your account and ALL saved credentials. This cannot be undone. Are you absolutely sure?")) {
      return;
    }

    setLoading(true);
    try {
      const { authKeyHex } = await generateKeys(deletePassword, userEmail);
      
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ authKey: authKeyHex })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete account");
      }

      // Success, log the user out
      setToken(null);
      setEncryptionKey(null);
      setCurrentPage('landing');

    } catch (err) {
      console.error(err);
      setMessage({ text: err.message, type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="account-container">
      <div className="account-panel">
        <h2 className="account-title">Account Settings</h2>
        <p className="account-email">Logged in as: <strong>{userEmail}</strong></p>

        {message.text && (
          <div className={`message-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="account-section">
          <h3>Change Master Password</h3>
          <p className="section-description">
            Changing your password requires us to decrypt your entire vault in your browser using your old password, and instantly re-encrypt it with your new password before saving it back to the server.
          </p>
          <form className="account-form" onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Current Master Password</label>
              <input type="password" required className="form-input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>New Master Password</label>
              <input type="password" required className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength="8" />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" required className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength="8" />
            </div>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Change Password & Re-encrypt Vault'}
            </button>
          </form>
        </div>

        <div className="account-section danger-zone">
          <h3 className="danger-title">Danger Zone</h3>
          <p className="section-description">
            Permanently delete your account and all saved credentials. This action is irreversible.
          </p>
          <form className="account-form" onSubmit={handleDeleteAccount}>
            <div className="form-group">
              <label>Confirm Master Password to Delete</label>
              <input type="password" required className="form-input border-danger" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
            </div>
            <button type="submit" className="danger-btn" disabled={loading}>
              Delete Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Account;
