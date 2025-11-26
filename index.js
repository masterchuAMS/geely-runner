const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Раздаём статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// API для сохранения рекорда (можно расширить)
app.use(express.json());

let highScores = {};

app.post('/api/score', (req, res) => {
    const { odometer, userId, userName } = req.body;
    
    if (userId) {
        if (!highScores[odometer] || odometer > highScores[userId].odometer) {
            highScores[userId] = { userName, odometer, date: new Date() };
        }
    }
    
    res.json({ success: true, highScores: Object.values(highScores).sort((a, b) => b.odometer - a.odometer).slice(0, 10) });
});

app.get('/api/leaderboard', (req, res) => {
    res.json(Object.values(highScores).sort((a, b) => b.odometer - a.odometer).slice(0, 10));
});

app.listen(PORT, () => {
    console.log(`🚗 Geely Runner запущен на порту ${PORT}`);
    console.log(`   Откройте http://localhost:${PORT}`);
});

