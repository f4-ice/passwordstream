// crypto.js
// Client-side cryptography helpers using the native Web Crypto API.

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
 * Derives 512 bits from the user's master password and normalized email.
 * Overall resistance to guessing still depends on master-password strength.
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
      iterations: 600000,
      hash: 'SHA-256'
    },
    keyMaterial,
    512 // We need 512 bits total (256 for Auth, 256 for Encrypt)
  );
}

/**
 * Generates the Authentication Key (sent to the server) and Encryption Key
 * (retained in memory by the intended client).
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

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer
    },
    encryptionKey,
    ciphertextBuffer
  );
  return dec.decode(decryptedBuffer);
}

export async function rotateEncryptedData(serializedEncryptedData, oldEncryptionKey, newEncryptionKey) {
  const encryptedData = JSON.parse(serializedEncryptedData);
  const plaintext = await decryptData(encryptedData.ciphertext, encryptedData.iv, oldEncryptionKey);
  return JSON.stringify(await encryptData(plaintext, newEncryptionKey));
}

// --- ASYMMETRIC AND HYBRID SHARING CRYPTOGRAPHY ---

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

/**
 * Encrypts an arbitrary-length payload with AES-256-GCM and wraps only the
 * random AES key with RSA-OAEP. The serialized envelope is what gets signed.
 */
export async function encryptHybrid(text, rsaPublicKeyObj) {
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(text);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const wrappedKey = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKeyObj, rawAesKey);

  return JSON.stringify({
    v: 1,
    alg: 'RSA-OAEP-256+A256GCM',
    wrappedKey: bufferToBase64(wrappedKey),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext)
  });
}

export async function decryptHybrid(serializedEnvelope, rsaPrivateKeyObj) {
  const envelope = JSON.parse(serializedEnvelope);
  if (envelope.v !== 1 || envelope.alg !== 'RSA-OAEP-256+A256GCM') {
    throw new Error('Unsupported sharing envelope');
  }

  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKeyObj,
    base64ToBuffer(envelope.wrappedKey)
  );
  const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(envelope.iv)) },
    aesKey,
    base64ToBuffer(envelope.ciphertext)
  );
  return dec.decode(plaintext);
}

export async function decryptSharedPayload(payload, rsaPrivateKeyObj) {
  try {
    const envelope = JSON.parse(payload);
    if (envelope?.v === 1) return decryptHybrid(payload, rsaPrivateKeyObj);
  } catch {
    // Legacy shares are a single base64-encoded RSA-OAEP ciphertext.
  }
  return decryptRSA(payload, rsaPrivateKeyObj);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function fingerprintPublicKey(publicJwk) {
  const parsed = typeof publicJwk === 'string' ? JSON.parse(publicJwk) : publicJwk;
  const digest = await window.crypto.subtle.digest('SHA-256', enc.encode(canonicalJson(parsed)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .match(/.{1,4}/g)
    .join(' ');
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
