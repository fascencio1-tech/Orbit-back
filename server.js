require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3002;


app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// conexion a turso
const DB = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:database.db",
    authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJxNERZWDhRQUVmR1JxZkkwUVROYi1nIiwib3JnX2lkIjoxMDAwMjY4MjMzfQ.wXisceBFltvXDaFjMacf_fdmf4nvFxPjLFPAmfjiwY1BfNLBOCfZAribhWcnIXKlL18oTQpEUT4QDRdoxT9-AA",
})

// Create missing tables and safely migrate older databases without replacing data.
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS publications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL DEFAULT 'General',
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        author TEXT DEFAULT 'Fernando Ascencio',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) return console.error('Error al preparar publications:', err.message);
        db.all('PRAGMA table_info(publications)', (pragmaErr, columns) => {
            if (pragmaErr) return console.error('Error al revisar publications:', pragmaErr.message);
            if (!columns.some(column => column.name === 'summary')) {
                db.run('ALTER TABLE publications ADD COLUMN summary TEXT', (alterErr) => {
                    if (alterErr) console.error('Error al agregar summary:', alterErr.message);
                });
            }
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        object_name TEXT,
        image_url TEXT NOT NULL,
        equipment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error al preparar gallery:', err.message);
    });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api', (req, res) => res.json({ system: 'ORBIT API Core', version: '1.0', status: 'Online' }));
app.get('/api/status', (req, res) => {
    db.get('SELECT 1 AS connected', (err) => {
        if (err) return res.status(503).json({ status: 'Offline', error: 'Base de datos no disponible' });
        res.json({ status: 'Online' });
    });
});

app.get('/api/objects', (req, res) => {
    res.json([
        { id: 1, type: 'Galaxia', name: 'M81', constellation: 'Osa Mayor' },
        { id: 2, type: 'Nebulosa', name: 'NGC 1976', constellation: 'Orión' },
        { id: 3, type: 'Cúmulo', name: 'M13', constellation: 'Hércules' }
    ]);
});

// Return article fields that exist in both the original schema and migrated databases.
app.get('/api/publications', (req, res) => {
    const params = [];
    let sql = 'SELECT id, title, content, image_url, category, author, created_at FROM publications';
    if (req.query.category) {
        sql += ' WHERE category = ?';
        params.push(req.query.category);
    }
    sql += ' ORDER BY id DESC';
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/publications/:id', (req, res) => {
    db.get('SELECT * FROM publications WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Publicación no encontrada' });
        res.json({ data: row });
    });
});

app.get('/api/photos', (req, res) => {
    db.all('SELECT * FROM gallery ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/gallery', (req, res) => {
    db.all('SELECT * FROM gallery ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.get('/api/apod', async (req, res) => {
    try {
        const nasaRes = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
        if (!nasaRes.ok) throw new Error(`NASA respondió HTTP ${nasaRes.status}`);
        res.json(await nasaRes.json());
    } catch (err) {
        res.status(502).json({ error: 'Error al consultar NASA APOD' });
    }
});

app.listen(PORT, () => console.log(`ORBIT API Server corriendo en http://localhost:${PORT}`));
