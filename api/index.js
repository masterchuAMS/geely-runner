const express = require('express');
const path = require('path');

const app = express();

// Раздаём статические файлы из папки public
app.use(express.static(path.join(__dirname, '../public')));

// API для сохранения рекорда
app.use(express.json());

let highScores = {};

app.post('/score', (req, res) => {
    const { distance, userId, userName } = req.body;
    
    if (userId) {
        if (!highScores[userId] || distance > highScores[userId].distance) {
            highScores[userId] = { userName, distance, date: new Date() };
        }
    }
    
    res.json({ 
        success: true, 
        highScores: Object.values(highScores)
            .sort((a, b) => b.distance - a.distance)
            .slice(0, 10) 
    });
});

app.get('/leaderboard', (req, res) => {
    res.json(
        Object.values(highScores)
            .sort((a, b) => b.distance - a.distance)
            .slice(0, 10)
    );
});

// Для Vercel serverless
module.exports = app;

