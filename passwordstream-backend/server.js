// Import the Express framework to create our web server and handle API routes
import express from 'express';
// Import CORS to allow our frontend (running on a different port/domain) to communicate with this backend
import cors from 'cors';
// Import bcrypt to securely hash passwords before storing them, and to compare hashes during login
import bcrypt from 'bcrypt';
// Import jsonwebtoken to create and verify tokens that keep users logged in securely
import jwt from 'jsonwebtoken';
// Import the PostgreSQL client package to interact with our database
import pkg from 'pg';
// Import dotenv to load environment variables from a .env file into process.env
import dotenv from 'dotenv';
import { createRateLimiter, securityHeaders } from './security.js';

// Execute the dotenv config function to actually read the .env file and load the variables
dotenv.config();

// Extract the Pool class from the pg package. A pool manages a collection of reusable database connections.
const { Pool } = pkg;
// Initialize the Express application instance
const app = express();

app.disable('x-powered-by');
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}
app.use(securityHeaders);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:8081')
  .split(',')
  .map(origin => origin.trim());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed'));
  }
}));
// Use the JSON middleware to automatically parse incoming JSON payloads in request bodies
// Example Data That Needs Translation: '{"email":"test@example.com","authKey":"xyz123"}'
app.use(express.json());
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

// ---------------------------------------------------------
// DATABASE CONNECTION SETUP
// ---------------------------------------------------------
// Create a new connection pool for PostgreSQL using our environment variables
const pool = new Pool({
  // The database user
  user: process.env.DB_USER,
  // The database host
  host: process.env.DB_HOST,
  // The name of the database to connect to
  database: process.env.DB_NAME,
  // The password for the database user
  password: process.env.DB_PASSWORD,
  // The port PostgreSQL is listening on
  port: process.env.DB_PORT,
});

// Define the secret key used to sign JSON Web Tokens. It should be securely stored in .env in production!
// When a user successfully logs in, the server generates a JWT that essentially acts as a temporary digital ID card for the user. After that the JWT_SECRET is used to verify and validate the JWT.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}

// ---------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ---------------------------------------------------------
// This function sits in front of protected routes and ensures the user has a valid JWT token
const authenticateToken = (req, res, next) => {
  // Grab the "Authorization" header from the incoming request
  const authHeader = req.headers['authorization'];
  // The header usually looks like "Bearer <token>". We split it by space and take the second part to get the token itself.
  const token = authHeader && authHeader.split(' ')[1];

  // If there's no token, immediately reject the request with a 401 Unauthorized status
  if (!token) return res.sendStatus(401);

  // Use the jsonwebtoken library to verify if the token is valid, hasn't expired, and was signed with our JWT_SECRET
  jwt.verify(token, JWT_SECRET, (err, user) => {
    // If the token is invalid or expired, reject with a 403 Forbidden status
    if (err) return res.sendStatus(403);
    // If valid, attach the decoded user payload (like their ID and email) to the request object so the route handler can use it
    req.user = user;
    // Call next() to allow the request to proceed to the actual route handler
    next();
  });
};

// ---------------------------------------------------------
// AUTHENTICATION ROUTES (client-derived authentication key)
// ---------------------------------------------------------

// Endpoint to handle new user registration
app.post('/api/signup', authLimiter, async (req, res) => {
  // Extract all the required fields from the request body. 
  // The intended client sends a derived authentication key, not the raw master password.
  const {
    email,
    authKey,
    publicRsaKey,
    encryptedPrivateRsaKey,
    publicEcdsaKey,
    encryptedPrivateEcdsaKey
  } = req.body;

  // Validate that absolutely every piece of cryptographic data was provided
  if (!email || !authKey || !publicRsaKey || !encryptedPrivateRsaKey || !publicEcdsaKey || !encryptedPrivateEcdsaKey) {
    // If anything is missing, reject the request with a 400 Bad Request status
    return res.status(400).json({ message: 'All fields including asymmetric keys are required' });
  }

  try {
    // Generate a salt to hash the authKey before storing it in the database
    const salt = await bcrypt.genSalt(10);
    // Hash the derived authentication key before storing it.
    const authKeyHash = await bcrypt.hash(authKey, salt);

    // Insert the new user's email and all their cryptographic data into the database.
    // The RETURNING clause immediately gives us back the newly generated user ID and their email.
    const result = await pool.query(
      `INSERT INTO users (
        email, auth_key_hash, public_rsa_key, encrypted_private_rsa_key, public_ecdsa_key, encrypted_private_ecdsa_key
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email`,
      [email, authKeyHash, publicRsaKey, encryptedPrivateRsaKey, publicEcdsaKey, encryptedPrivateEcdsaKey]
    );

    // Respond with a 201 Created status and the user's basic info
    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (err) {
    // PostgreSQL error code '23505' stands for unique_violation. This triggers if the email already exists in the database.
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email already in use' });
    }
    // For any other unexpected errors, log them and return a 500 Server Error
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint to handle user login
app.post('/api/login', authLimiter, async (req, res) => {
  // Extract email and the pre-hashed authKey from the request body
  const { email, authKey } = req.body;
  // Require both fields
  if (!email || !authKey) return res.status(400).json({ message: 'Email and AuthKey are required' });

  try {
    // Search the database for a user with the matching email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    // If no user is found, reject with a generic "Invalid credentials" error to prevent leaking which emails exist
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    // Grab the user data from the query result
    const user = result.rows[0];
    // Compare the authKey provided by the client with the bcrypt hash stored in the database
    const validKey = await bcrypt.compare(authKey, user.auth_key_hash);

    // If the comparison fails, the password was wrong. Reject the request.
    if (!validKey) return res.status(401).json({ message: 'Invalid credentials' });

    // If login is successful, generate a JWT token containing the user's ID and email.
    // The token is set to expire in 24 hours.
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    // Send back the token, a success message, and the user's encrypted private keys so the frontend can decrypt them and use them
    res.json({
      token,
      message: 'Logged in successfully',
      encryptedPrivateRsaKey: user.encrypted_private_rsa_key,
      encryptedPrivateEcdsaKey: user.encrypted_private_ecdsa_key
    });
  } catch (err) {
    // Log unexpected errors and return a generic 500 status
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------
// VAULT ROUTES (Encrypted Data Only)
// Notice how every route here uses the "authenticateToken" middleware!
// ---------------------------------------------------------

// Endpoint to add a new credential to the user's vault
app.post('/api/vault', authenticateToken, async (req, res) => {
  // Extract the ciphertext (encrypted payload) and the Initialization Vector (IV) needed to decrypt it later
  const { encrypted_payload, iv } = req.body;

  // Ensure both parts of the encrypted data are provided
  if (!encrypted_payload || !iv) return res.status(400).json({ message: 'Payload and IV are required' });

  try {
    // Insert the encrypted item into the database, tying it to the user's ID (which was extracted from their JWT token)
    // The RETURNING clause gives us back the auto-generated ID of the new item
    const result = await pool.query(
      `INSERT INTO vault_items (user_id, encrypted_payload, iv) VALUES ($1, $2, $3) RETURNING id`,
      [req.user.id, encrypted_payload, iv]
    );
    // Return a 201 Created status alongside the ID of the new item
    res.status(201).json({ id: result.rows[0].id, message: 'Encrypted vault item stored' });
  } catch (err) {
    // Log errors and return a 500 status if insertion fails
    console.error(err);
    res.status(500).json({ message: 'Failed to store vault item' });
  }
});

// Endpoint to fetch all credentials in the user's vault
app.get('/api/vault', authenticateToken, async (req, res) => {
  try {
    // Select all vault items that belong to the logged-in user, ordered by creation date (newest first)
    const result = await pool.query('SELECT id, encrypted_payload, iv, created_at FROM vault_items WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    // Send the entire array of rows back to the frontend as JSON
    res.json(result.rows);
  } catch (err) {
    // Log errors and return a 500 status if retrieval fails
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve vault items' });
  }
});

// Endpoint to update an existing credential in the vault
app.put('/api/vault/:id', authenticateToken, async (req, res) => {
  // Extract the item ID from the URL parameters (the part after the colon in the route definition)
  const { id } = req.params;
  // Extract the newly re-encrypted payload and IV from the request body
  const { encrypted_payload, iv } = req.body;

  try {
    // Update the record where the ID matches AND it belongs to the logged-in user.
    // Checking the user_id prevents a malicious user from editing someone else's item even if they guess the ID!
    const result = await pool.query(
      `UPDATE vault_items SET encrypted_payload = $1, iv = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING id`,
      [encrypted_payload, iv, id, req.user.id]
    );
    // If rowCount is 0, it means no item matched the ID and user_id combo, so return a 404 Not Found error
    if (result.rowCount === 0) return res.status(404).json({ message: 'Item not found' });
    // Otherwise, return a success message
    res.json({ message: 'Encrypted vault item updated' });
  } catch (err) {
    // Catch and handle server errors
    console.error(err);
    res.status(500).json({ message: 'Failed to update vault item' });
  }
});

// Endpoint to delete a credential from the vault
app.delete('/api/vault/:id', authenticateToken, async (req, res) => {
  // Extract the item ID from the URL parameters
  const { id } = req.params;

  try {
    // Delete the record where the ID matches AND it belongs to the logged-in user
    const result = await pool.query(
      'DELETE FROM vault_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    // If rowCount is 0, the item didn't exist or didn't belong to the user
    if (result.rowCount === 0) return res.status(404).json({ message: 'Item not found' });
    // Respond with a success message
    res.json({ message: 'Vault item deleted successfully' });
  } catch (err) {
    // Catch and handle server errors
    console.error(err);
    res.status(500).json({ message: 'Failed to delete vault item' });
  }
});

// ---------------------------------------------------------
// SHARING ROUTES
// ---------------------------------------------------------

// Endpoint to fetch another user's public keys using their email address
app.get('/api/users/public-keys/:email', authenticateToken, async (req, res) => {
  try {
    // Query the database for the user's ID and public keys, converting the email to lowercase for consistent matching
    const result = await pool.query('SELECT id, public_rsa_key, public_ecdsa_key FROM users WHERE email = $1', [req.params.email.toLowerCase()]);
    // If no user exists with that email, return a 404 Not Found error
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    // Return the keys and user ID as JSON
    res.json(result.rows[0]);
  } catch (err) {
    // Catch and handle server errors
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve public keys' });
  }
});

// Endpoint to create a new "share" (sharing a password with someone else)
app.post('/api/shares', authenticateToken, async (req, res) => {
  // Extract the target user's ID, the payload (encrypted specifically with THEIR public key), and a cryptographic signature proving who sent it
  const { receiver_id, encrypted_payload, signature } = req.body;
  // Ensure all pieces of data were provided
  if (!receiver_id || !encrypted_payload || !signature) return res.status(400).json({ message: 'Missing fields' });

  try {
    // Insert the shared item into the shares table, recording who sent it (the logged-in user) and who receives it
    await pool.query(
      `INSERT INTO shares (sender_id, receiver_id, encrypted_payload, signature) VALUES ($1, $2, $3, $4)`,
      [req.user.id, receiver_id, encrypted_payload, signature]
    );
    // Return a 201 Created status
    res.status(201).json({ message: 'Item shared successfully' });
  } catch (err) {
    // Catch and handle server errors
    console.error(err);
    res.status(500).json({ message: 'Failed to share item' });
  }
});

// Endpoint to fetch all items that have been shared WITH the logged-in user
app.get('/api/shares', authenticateToken, async (req, res) => {
  try {
    // Perform a JOIN query. This grabs the share data AND looks up the sender's email and public key from the users table.
    // The sender's public key is necessary so the receiver can mathematically verify the signature to prove the sender's identity.
    const result = await pool.query(`
      SELECT 
        s.id, s.encrypted_payload, s.signature, s.created_at,
        u.email as sender_email, u.public_ecdsa_key as sender_public_ecdsa_key
      FROM shares s
      JOIN users u ON s.sender_id = u.id
      WHERE s.receiver_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    // Return the list of shares
    res.json(result.rows);
  } catch (err) {
    // Catch and handle server errors
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve shared items' });
  }
});

// ---------------------------------------------------------
// ACCOUNT ROUTES
// ---------------------------------------------------------

// Endpoint to completely delete a user's account and all their data
app.delete('/api/account', authenticateToken, authLimiter, async (req, res) => {
  // Require the user to re-enter their master password (authKey) for safety before deletion
  const { authKey } = req.body;
  // If not provided, reject the request
  if (!authKey) return res.status(400).json({ message: 'Password is required to delete account' });

  try {
    // Fetch the user's stored authKey hash
    const userRes = await pool.query('SELECT auth_key_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    // Verify the password matches
    const validKey = await bcrypt.compare(authKey, userRes.rows[0].auth_key_hash);
    if (!validKey) return res.status(401).json({ message: 'Incorrect password' });

    // Delete the user from the users table. 
    // Because the database uses ON DELETE CASCADE constraints, this single query will automatically wipe out all their vault_items and shares too!
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    // Respond with a success message
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    // Catch and handle server errors
    console.error(err);
    res.status(500).json({ message: 'Server error deleting account' });
  }
});

// Endpoint to handle Master Password changes
// Changing the master password fundamentally changes the encryption key, so ALL vault items must be re-encrypted and uploaded!
app.get('/api/account/keys', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT encrypted_private_rsa_key, encrypted_private_ecdsa_key FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({
      encryptedPrivateRsaKey: result.rows[0].encrypted_private_rsa_key,
      encryptedPrivateEcdsaKey: result.rows[0].encrypted_private_ecdsa_key
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to retrieve encrypted account keys' });
  }
});

app.put('/api/account/password', authenticateToken, authLimiter, async (req, res) => {
  // Extract the old password to verify identity, the new password to save, and the massive array of updated vault items
  const {
    oldAuthKey,
    newAuthKey,
    vault_updates,
    encryptedPrivateRsaKey,
    encryptedPrivateEcdsaKey
  } = req.body;

  // Basic validation to ensure data is present
  if (!oldAuthKey || !newAuthKey) return res.status(400).json({ message: 'Old and new passwords required' });
  if (!Array.isArray(vault_updates)) return res.status(400).json({ message: 'vault_updates must be an array' });
  if (!encryptedPrivateRsaKey || !encryptedPrivateEcdsaKey) {
    return res.status(400).json({ message: 'Re-encrypted private keys are required' });
  }

  // Acquire a dedicated client from the pool to run a SQL Transaction
  // A transaction guarantees that either ALL updates succeed, or NONE of them do.
  const client = await pool.connect();
  try {
    // Begin the transaction
    await client.query('BEGIN');

    // Fetch the user's current stored authKey hash to verify their old password
    const userRes = await client.query('SELECT auth_key_hash FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    // If user is missing, throw an error to trigger the catch block and rollback
    if (userRes.rows.length === 0) throw new Error('User not found');

    // Compare the provided old password against the stored hash
    const validKey = await bcrypt.compare(oldAuthKey, userRes.rows[0].auth_key_hash);
    if (!validKey) {
      // If the password was wrong, manually rollback the transaction and return an error
      await client.query('ROLLBACK');
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const vaultRes = await client.query('SELECT id FROM vault_items WHERE user_id = $1 FOR UPDATE', [req.user.id]);
    const existingIds = new Set(vaultRes.rows.map(row => String(row.id)));
    const updateIds = new Set(vault_updates.map(item => String(item.id)));
    const completeVaultUpdate = vault_updates.length === updateIds.size
      && existingIds.size === updateIds.size
      && [...existingIds].every(id => updateIds.has(id));
    const validVaultUpdate = vault_updates.every(item =>
      item && item.id && typeof item.encrypted_payload === 'string' && item.encrypted_payload.length > 0
      && typeof item.iv === 'string' && /^[0-9a-f]{24}$/i.test(item.iv)
    );
    if (!completeVaultUpdate || !validVaultUpdate) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'A complete and valid vault update is required' });
    }

    // Generate a new salt and hash the new master password
    const salt = await bcrypt.genSalt(10);
    const newAuthKeyHash = await bcrypt.hash(newAuthKey, salt);
    // Update the user's record with the new password hash
    await client.query(
      `UPDATE users
       SET auth_key_hash = $1, encrypted_private_rsa_key = $2, encrypted_private_ecdsa_key = $3
       WHERE id = $4`,
      [newAuthKeyHash, encryptedPrivateRsaKey, encryptedPrivateEcdsaKey, req.user.id]
    );

    // Loop through the array of re-encrypted vault items provided by the frontend
    for (const item of vault_updates) {
      const { id, encrypted_payload, iv } = item;
      // Overwrite each existing item in the database with its newly encrypted counterpart
      await client.query(
        'UPDATE vault_items SET encrypted_payload = $1, iv = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4',
        [encrypted_payload, iv, id, req.user.id]
      );
    }

    // If the loop finishes without any errors, COMMIT the transaction to permanently save all changes to the database
    await client.query('COMMIT');
    // Return a success message
    res.json({ message: 'Password changed; vault and private sharing keys were re-encrypted.' });
  } catch (err) {
    // If ANY error occurs (e.g. database disconnect, malformed data), ROLLBACK the transaction. 
    // This restores the database to exactly how it was before the BEGIN command, preventing data corruption!
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Failed to change password' });
  } finally {
    // Always release the client back to the connection pool so it can be used by other requests
    client.release();
  }
});

// Determine which port to listen on. Fall back to 3000 if not defined in .env
const PORT = process.env.PORT || 3000;
// Start the Express server and instruct it to listen for incoming network requests on the specified port
app.listen(PORT, () => {
  // Log a message to the console once the server is successfully running
  console.log(`PasswordStream zero-knowledge API running on port ${PORT}`);
});
