<change>
<file>server.js</file>
<description>Added POST /api/market endpoint to handle creating new marketplace items.</description>
<content><![CDATA[
/**
* Ayinet Backend API Server
* Stack: Node.js, Express, PostgreSQL, Socket.IO
*/
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());
// --- Database Connection ---
// CRITICAL: Check for DATABASE_URL before proceeding.
if (!process.env.DATABASE_URL) {
console.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
console.error("Please connect a PostgreSQL database and set the DATABASE_URL variable in your deployment environment.");
process.exit(1);
}
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: {
rejectUnauthorized: false // Required for services like Railway
}
});
// Socket.IO Setup
const io = new Server(server, {
cors: {
origin: "*",
methods: ["GET", "POST"]
}
});
// --- AUTOMATIC DATABASE SETUP ---
const initDB = async () => {
const schema = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
code
Code
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    location VARCHAR(100) DEFAULT 'Haiti',
    is_diaspora BOOLEAN DEFAULT FALSE,
    is_business BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(100) DEFAULT 'Member',
    bio TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'text',
    media_url TEXT,
    is_global BOOLEAN DEFAULT FALSE,
    city VARCHAR(100),
    language VARCHAR(10) DEFAULT 'ht',
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    category VARCHAR(50) NOT NULL,
    vertical VARCHAR(50) DEFAULT 'all',
    image_url TEXT,
    location VARCHAR(100),
    is_sold BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    image_url TEXT,
    members_count INT DEFAULT 0,
    creator_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    content TEXT,
    media_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    reporter_id UUID,
    content_preview TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(100),
    category VARCHAR(50),
    description TEXT,
    website TEXT,
    rating DECIMAL(2, 1) DEFAULT 5.0,
    followers INT DEFAULT 0
);
`;
try {
await pool.query(schema);
console.log("✅ Database tables checked/created successfully.");
} catch (err) {
console.error("❌ Database setup error:", err);
}
};
// --- REAL-TIME SOCKET HANDLERS ---
const onlineUsers = new Map(); // Stores userId -> socketId mapping
io.on('connection', (socket) => {
const userId = socket.handshake.query.userId;
if (userId) {
onlineUsers.set(userId, socket.id);
console.log(User ${userId} connected with socket ${socket.id});
}
socket.on('send_message', async ({ message, receiverId }) => {
try {
const result = await pool.query(
'INSERT INTO messages (sender_id, receiver_id, content, status) VALUES ($1, $2, $3, $4) RETURNING *',
[message.senderId, receiverId, message.text, 'sent']
);
code
Code
const savedMsg = {
          ...result.rows[0], // Use DB data
          text: result.rows[0].content, // Align field name
          timestamp: new Date(result.rows[0].created_at).getTime(),
          type: 'text'
      };

      // Emit to Receiver (if they are online)
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', savedMsg);
      }
      
      // Emit back to Sender for confirmation
      socket.emit('receive_message', savedMsg);

  } catch (e) {
      console.error("Message save/send failed:", e);
  }
});
socket.on('disconnect', () => {
if (userId) {
onlineUsers.delete(userId);
console.log(User ${userId} disconnected.);
}
});
});
// --- REST API ROUTES ---
// AUTH: Register
app.post('/api/register', async (req, res) => {
const { name, email, password } = req.body;
try {
const result = await pool.query(
INSERT INTO users (name, email, password_hash, avatar_url) VALUES ($1, $2, crypt($3, gen_salt('bf')), $4) RETURNING id, name, email, location, avatar_url, is_business,
[name, email, password, https://api.dicebear.com/7.x/initials/svg?seed=${name}]
);
res.status(201).json(result.rows[0]);
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Registration failed. Email might be taken.' });
}
});
// AUTH: Login
app.post('/api/login', async (req, res) => {
const { email, password } = req.body;
try {
const result = await pool.query(
SELECT id, name, email, location, avatar_url, is_business, is_diaspora FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash),
[email, password]
);
code
Code
if (result.rows.length > 0) {
        res.json(result.rows[0]);
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
}
});
// GET: Posts Feed
app.get('/api/posts', async (req, res) => {
try {
const { rows } = await pool.query(SELECT p.*, json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar_url, 'location', u.location, 'isDiaspora', u.is_diaspora, 'occupation', u.occupation) as user FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 20);
const mappedRows = rows.map(row => ({
...row,
userId: row.user_id,
timestamp: new Date(row.created_at).getTime(),
user: { ...row.user, isDiaspora: row.user.isDiaspora }
}));
res.json(mappedRows);
} catch (err) {
console.error(err);
res.status(500).json([]);
}
});
// POST: Create a Post
app.post('/api/posts', async (req, res) => {
const { userId, content, type, isGlobal, location } = req.body;
try {
const result = await pool.query(
'INSERT INTO posts (user_id, content, post_type, is_global, city) VALUES ($1, $2, $3, $4, $5) RETURNING *',
[userId, content, type, isGlobal, location]
);
const userRes = await pool.query('SELECT id, name, avatar_url as avatar, location, is_diaspora as "isDiaspora", occupation FROM users WHERE id = $1', [userId]);
code
Code
const newPost = {
        ...result.rows[0],
        userId: result.rows[0].user_id,
        timestamp: new Date(result.rows[0].created_at).getTime(),
        user: userRes.rows[0]
    };
    
    res.status(201).json(newPost);
} catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' }); 
}
});
// GET: Marketplace Items
app.get('/api/market', async (req, res) => {
try {
const { rows } = await pool.query(SELECT m.*, json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar_url, 'location', u.location, 'isBusiness', u.is_business) as seller FROM market_items m JOIN users u ON m.seller_id = u.id ORDER BY m.created_at DESC LIMIT 50);
const mappedRows = rows.map(row => ({
...row,
image: row.image_url,
seller: row.seller
}));
res.json(mappedRows);
} catch (err) { res.status(500).json([]); }
});
// POST: Create Marketplace Item (New Feature)
app.post('/api/market', async (req, res) => {
const { seller, title, price, currency, category, vertical, description, image, location } = req.body;
try {
const result = await pool.query(
'INSERT INTO market_items (seller_id, title, price, currency, category, vertical, description, image_url, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
[seller.id, title, price, currency, category, vertical, description, image, location]
);
code
Code
const newItem = {
        ...result.rows[0],
        image: result.rows[0].image_url,
        seller: seller
    };
    res.status(201).json(newItem);
} catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' }); 
}
});
// GET: Active Alerts
app.get('/api/alerts', async (req, res) => {
try {
const { rows } = await pool.query('SELECT * FROM alerts WHERE is_active = TRUE');
const mappedRows = rows.map(row => ({
...row,
timestamp: new Date(row.created_at).getTime()
}));
res.json(mappedRows);
} catch (err) { res.status(500).json([]); }
});
// GET: Groups
app.get('/api/groups', async (req, res) => {
try {
const { rows } = await pool.query('SELECT * FROM groups ORDER BY members_count DESC');
const mappedRows = rows.map(row => ({
...row,
image: row.image_url,
members: row.members_count,
creatorId: row.creator_id
}));
res.json(mappedRows);
} catch(err) { res.status(500).json([]); }
});
// POST: Create Group
app.post('/api/groups', async (req, res) => {
const { name, category, description, creatorId } = req.body;
try {
const result = await pool.query(
'INSERT INTO groups (name, category, description, creator_id, image_url, members_count) VALUES ($1, $2, $3, $4, $5, 
{name}/200/200`, 1]
);
const row = result.rows[0];
res.status(201).json({
...row,
image: row.image_url,
members: row.members_count,
creatorId: row.creator_id
});
} catch(err) { res.status(500).send(err); }
});
// DELETE: Group
app.delete('/api/groups/:id', async (req, res) => {
try {
await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
res.sendStatus(200);
} catch(err) { res.status(500).send(err); }
});
// GET: Pending Reports
app.get('/api/reports', async (req, res) => {
try {
const { rows } = await pool.query("SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC");
const mappedRows = rows.map(row => ({
...row,
targetId: row.target_id,
contentPreview: row.content_preview,
timestamp: new Date(row.created_at).getTime()
}));
res.json(mappedRows);
} catch(err) { res.status(500).json([]); }
});
// POST: Create Report
app.post('/api/reports', async (req, res) => {
const { targetId, type, description, contentPreview } = req.body;
try {
const result = await pool.query(
'INSERT INTO reports (target_id, type, description, content_preview) VALUES ($1, $2, $3, $4) RETURNING *',
[targetId, type, description, contentPreview]
);
res.status(201).json(result.rows[0]);
} catch(err) { res.status(500).send(err); }
});
// PATCH: Resolve Report
app.patch('/api/reports/:id', async (req, res) => {
try {
await pool.query("UPDATE reports SET status = 'resolved' WHERE id = $1", [req.params.id]);
res.sendStatus(200);
} catch(err) { res.status(500).send(err); }
});
// POST: Create Business Profile
app.post('/api/users/:id/business', async (req, res) => {
const userId = req.params.id;
const { name, category, description, website } = req.body;
try {
await pool.query('BEGIN');
await pool.query(
'INSERT INTO business_profiles (user_id, business_name, category, description, website) VALUES ($1, $2, $3, $4, $5)',
[userId, name, category, description, website]
);
await pool.query('UPDATE users SET is_business = TRUE WHERE id = $1', [userId]);
await pool.query('COMMIT');
code
Code
const result = await pool.query('SELECT id, name, email, location, avatar_url, is_business, is_diaspora FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    res.status(200).json({ 
        ...user,
        businessProfile: { name, category, description, followers: 0, rating: 5.0, catalog: [] } 
    });
} catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create business profile' });
}
});
// Start Server & Initialize DB
server.listen(PORT, async () => {
console.log(Ayinet Server running on port ${PORT});
await initDB();
});
]]></content>
</change>
</changes>
