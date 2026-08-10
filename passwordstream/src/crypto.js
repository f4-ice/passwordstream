// crypto.js
// Utility functions for Zero-Knowledge Cryptography using the native Web Crypto API

// Helper to convert string to ArrayBuffer and vice-versa
const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * Converts a buffer to a hex string for sending over the network
 */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives a strong 512-bit cryptographic key from the user's master password and email.
 * This ensures two users with the same password have completely different keys.
 */
async function deriveMasterKeyMaterial(password, email) {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    // Converts String into bytes
    enc.encode(password),
    // Uses PBKDF2 Algorithm
    { name: 'PBKDF2' },
    // Does not need to be exported
    false,
    // Used to derive bits and keys
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(email.toLowerCase()), // Using email as the salt
      iterations: 600000, // OWASP recommended iterations for extreme security
      hash: 'SHA-256'
    },
    keyMaterial,
    512 // We need 512 bits total (256 for Auth, 256 for Encrypt)
  );
}

/**
 * Generates the Authentication Key (sent to server) and the Encryption Key (kept strictly local)
 */
export async function generateKeys(password, email) {
  const bits = await deriveMasterKeyMaterial(password, email);

  // Split the 512 bits into two completely separate 256-bit arrays
  const authKeyBuffer = bits.slice(0, 32);
  const encryptKeyBuffer = bits.slice(32, 64);

  // Convert Auth Key to hex so we can send it to the server in JSON
  const authKeyHex = bufferToHex(authKeyBuffer);

  // Import the Encryption Key for AES-GCM usage
  const encryptionKey = await window.crypto.subtle.importKey(
    'raw',
    encryptKeyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  return { authKeyHex, encryptionKey };
}

/**
 * Encrypts a plaintext string using the user's local Encryption Key.
 * Returns both the ciphertext and the IV (Initialization Vector) needed for decryption.
 */
export async function encryptData(text, encryptionKey) {
  // Generate a random 12-byte Initialization Vector (IV) for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    encryptionKey,
    enc.encode(text)
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    iv: bufferToHex(iv)
  };
}

/**
 * Decrypts a string coming from the server using the user's local Encryption Key.
 */
export async function decryptData(ciphertextHex, ivHex, encryptionKey) {
  // Convert hex strings back into Uint8Arrays
  const ciphertextBuffer = new Uint8Array(ciphertextHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const ivBuffer = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      encryptionKey,
      ciphertextBuffer
    );
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed. The encryption key or data is invalid.", err);
    throw err;
  }
}

// --- ASYMMETRIC CRYPTOGRAPHY (ZERO-KNOWLEDGE SHARING) ---

export function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateAsymmetricKeys(encryptionKey) {
  const rsaKeyPair = await window.crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['encrypt', 'decrypt']
  );

  const ecdsaKeyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true, ['sign', 'verify']
  );

  const publicRsaJwk = JSON.stringify(await window.crypto.subtle.exportKey('jwk', rsaKeyPair.publicKey));
  const publicEcdsaJwk = JSON.stringify(await window.crypto.subtle.exportKey('jwk', ecdsaKeyPair.publicKey));

  const privateRsaJwk = JSON.stringify(await window.crypto.subtle.exportKey('jwk', rsaKeyPair.privateKey));
  const privateEcdsaJwk = JSON.stringify(await window.crypto.subtle.exportKey('jwk', ecdsaKeyPair.privateKey));

  const encryptedPrivateRsa = await encryptData(privateRsaJwk, encryptionKey);
  const encryptedPrivateEcdsa = await encryptData(privateEcdsaJwk, encryptionKey);

  return {
    publicRsaKey: publicRsaJwk,
    encryptedPrivateRsaKey: JSON.stringify(encryptedPrivateRsa),
    publicEcdsaKey: publicEcdsaJwk,
    encryptedPrivateEcdsaKey: JSON.stringify(encryptedPrivateEcdsa),
    privateRsaKeyObj: rsaKeyPair.privateKey,
    privateEcdsaKeyObj: ecdsaKeyPair.privateKey
  };
}

export async function importAsymmetricKeys(publicRsaJwk, privateRsaJwk, publicEcdsaJwk, privateEcdsaJwk) {
  const rsaPublic = publicRsaJwk ? await window.crypto.subtle.importKey('jwk', JSON.parse(publicRsaJwk), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']) : null;
  const rsaPrivate = privateRsaJwk ? await window.crypto.subtle.importKey('jwk', JSON.parse(privateRsaJwk), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']) : null;

  const ecdsaPublic = publicEcdsaJwk ? await window.crypto.subtle.importKey('jwk', JSON.parse(publicEcdsaJwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']) : null;
  const ecdsaPrivate = privateEcdsaJwk ? await window.crypto.subtle.importKey('jwk', JSON.parse(privateEcdsaJwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) : null;

  return { rsaPublic, rsaPrivate, ecdsaPublic, ecdsaPrivate };
}

export async function encryptRSA(text, rsaPublicKeyObj) {
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKeyObj,
    enc.encode(text)
  );
  return bufferToBase64(encryptedBuffer);
}

export async function decryptRSA(base64Ciphertext, rsaPrivateKeyObj) {
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKeyObj,
    base64ToBuffer(base64Ciphertext)
  );
  return dec.decode(decryptedBuffer);
}

export async function signECDSA(text, ecdsaPrivateKeyObj) {
  const signatureBuffer = await window.crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    ecdsaPrivateKeyObj,
    enc.encode(text)
  );
  return bufferToBase64(signatureBuffer);
}

export async function verifyECDSA(text, base64Signature, ecdsaPublicKeyObj) {
  return await window.crypto.subtle.verify(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    ecdsaPublicKeyObj,
    base64ToBuffer(base64Signature),
    enc.encode(text)
  );
}
