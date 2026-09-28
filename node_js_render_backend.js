const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and urlencoded form submissions (supports zero-JS standard HTML form posts)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static html files directly from current directory
app.use(express.static(__dirname));

let chatMessages = [
    { id: 1, author: "System", message: "Welcome to the E-Ink Community Hub!", timestamp: Date.now() - 3600000 },
    { id: 2, author: "KindleReader", message: "Pages load instantly. Excellent battery saving.", timestamp: Date.now() - 1800000 }
];

let topicsList = [
    {
        id: "topic_1",
        author: "Admin",
        title: "Welcome to E-Ink Forums",
        content: "Please keep discussions concise and friendly for e-reader screens.",
        timestamp: Date.now() - 86400000,
        replies: [
            { author: "Bookworm", message: "Glad to be here!", timestamp: Date.now() - 43200000 }
        ]
    }
];

let neighbourhoodPosts = [
    { id: 1, author: "TownCrier", content: "Library book sale happening this Saturday at the community center.", timestamp: Date.now() - 72000000 }
];


// Dashboard overview summary endpoint
app.get('/api/overview', (req, res) => {
    res.json({
        chats: chatMessages.slice(-5),
        topics: topicsList.slice(-3),
        posts: neighbourhoodPosts.slice(-3)
    });
});

// Chat Endpoints
app.get('/api/chat', (req, res) => {
    res.json(chatMessages.slice(-50)); // Return last 50 messages
});

app.post('/api/chat', (req, res) => {
    const { author, message } = req.body;
    if (!author || !message) {
        return res.status(400).json({ error: "Author and message are required." });
    }
    const newMsg = {
        id: Date.now(),
        author: String(author).substring(0, 30),
        message: String(message).substring(0, 250),
        timestamp: Date.now()
    };
    chatMessages.push(newMsg);
    if (chatMessages.length > 100) chatMessages.shift(); // Keep memory bounded

    // If submitted via standard form (non-AJAX), redirect back to chat page
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.redirect('/chat.html');
    }
    res.json({ success: true, message: newMsg });
});

// Topics Endpoints
app.get('/api/topics', (req, res) => {
    res.json(topicsList);
});

app.post('/api/topics', (req, res) => {
    const { author, title, content } = req.body;
    if (!author || !title || !content) {
        return res.status(400).json({ error: "All fields are required." });
    }
    const newTopic = {
        id: 'topic_' + Date.now(),
        author: String(author).substring(0, 30),
        title: String(title).substring(0, 60),
        content: String(content).substring(0, 400),
        timestamp: Date.now(),
        replies: []
    };
    topicsList.unshift(newTopic);
    if (topicsList.length > 30) topicsList.pop();

    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.redirect('/topics.html');
    }
    res.json({ success: true, topic: newTopic });
});

app.post('/api/topics/:id/reply', (req, res) => {
    const topicId = req.params.id;
    const { author, message } = req.body;
    const topic = topicsList.find(t => t.id === topicId);
    if (!topic) {
        return res.status(404).json({ error: "Topic not found." });
    }
    if (!author || !message) {
        return res.status(400).json({ error: "Author and message required." });
    }
    topic.replies.push({
        author: String(author).substring(0, 30),
        message: String(message).substring(0, 200),
        timestamp: Date.now()
    });

    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.redirect('/topics.html');
    }
    res.json({ success: true });
});

// Neighborhood Endpoints
app.get('/api/neighbourhood', (req, res) => {
    res.json(neighbourhoodPosts);
});

app.post('/api/neighbourhood', (req, res) => {
    const { author, content } = req.body;
    if (!author || !content) {
        return res.status(400).json({ error: "Author and content required." });
    }
    const newPost = {
        id: Date.now(),
        author: String(author).substring(0, 30),
        content: String(content).substring(0, 300),
        timestamp: Date.now()
    };
    neighbourhoodPosts.unshift(newPost);
    if (neighbourhoodPosts.length > 50) neighbourhoodPosts.pop();

    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        return res.redirect('/neighbourhood.html');
    }
    res.json({ success: true, post: newPost });
});

app.listen(PORT, () => {
    console.log(`E-Ink Hub server running on port ${PORT}`);
});