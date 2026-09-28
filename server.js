const express = require('express');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Neon database connection using environment variable
const sql = neon(process.env.DATABASE_URL);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Auto-initialize database tables on startup
async function initDB() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS topics (
                id SERIAL PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                category VARCHAR(50) DEFAULT 'General',
                author VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS replies (
                id SERIAL PRIMARY KEY,
                topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
                username VARCHAR(50) NOT NULL,
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS neighbourhood_posts (
                id SERIAL PRIMARY KEY,
                author VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log("Database tables verified/initialized successfully.");
    } catch (err) {
        console.error("Database initialization error:", err);
    }
}
initDB();

// --- HTML ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));
app.get('/topics', (req, res) => res.sendFile(path.join(__dirname, 'topics.html')));
app.get('/neighbourhood', (req, res) => res.sendFile(path.join(__dirname, 'neighbourhood.html')));

// --- API: CHAT ---
app.get('/api/chat', async (req, res) => {
    try {
        const messages = await sql`SELECT * FROM messages ORDER BY id DESC LIMIT 50`;
        res.json(messages.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat', async (req, res) => {
    const { username, text } = req.body;
    if (!username || !text) return res.status(400).send("Missing fields");
    try {
        await sql`INSERT INTO messages (username, text) VALUES (${username}, ${text})`;
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
            return res.redirect('/chat.html');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API: TOPICS ---
app.get('/api/topics', async (req, res) => {
    try {
        const topics = await sql`
            SELECT t.*, COUNT(r.id) as reply_count 
            FROM topics t LEFT JOIN replies r ON t.id = r.topic_id 
            GROUP BY t.id ORDER BY t.id DESC LIMIT 30
        `;
        res.json(topics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/topics', async (req, res) => {
    const { title, category, author } = req.body;
    if (!title || !author) return res.status(400).send("Missing fields");
    try {
        await sql`INSERT INTO topics (title, category, author) VALUES (${title}, ${category || 'General'}, ${author})`;
        res.redirect('/topics.html');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API: NEIGHBOURHOOD ---
app.get('/api/neighbourhood', async (req, res) => {
    try {
        const posts = await sql`SELECT * FROM neighbourhood_posts ORDER BY id DESC LIMIT 30`;
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/neighbourhood', async (req, res) => {
    const { author, content } = req.body;
    if (!author || !content) return res.status(400).send("Missing fields");
    try {
        await sql`INSERT INTO neighbourhood_posts (author, content) VALUES (${author}, ${content})`;
        res.redirect('/neighbourhood.html');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`E-ink server running on port ${port}`);
});
