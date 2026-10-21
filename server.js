require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3002;
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const imageTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

async function ensureGallerySchema() {
    await db.execute(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        object_name TEXT,
        image_url TEXT NOT NULL,
        equipment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    const columns = await db.execute('PRAGMA table_info(gallery)');
    if (!columns.rows.some(column => column.name === 'image_data')) {
        await db.execute('ALTER TABLE gallery ADD COLUMN image_data BLOB');
    }
    if (!columns.rows.some(column => column.name === 'author')) {
        await db.execute("ALTER TABLE gallery ADD COLUMN author TEXT DEFAULT 'Anónimo'");
    }
}

app.get('/', (req, res) => {
    res.json({ status: 'ORBIT API funcionando correctamente en la nube' });
});

app.get('/api/publications', async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM publications');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener publicaciones:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

app.get('/api/publications/:id', async (req, res) => {
    try {
        const result = await db.execute({ sql: 'SELECT * FROM publications WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length) return res.status(404).json({ success: false, error: 'Publicación no encontrada' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error al obtener la publicación:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

async function listPhotos(req, res) {
    try {
        const result = await db.execute(`SELECT id, title, object_name,
            CASE WHEN image_data IS NOT NULL THEN '/api/gallery/' || id || '/image' ELSE image_url END AS image_url,
            author, equipment, created_at FROM gallery ORDER BY created_at DESC, id DESC`);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener la galería:', error);
        res.status(500).json({ success: false, error: 'No se pudo cargar la galería' });
    }
}

app.get('/api/gallery', listPhotos);
app.get('/api/photos', listPhotos);

app.post('/api/gallery', async (req, res) => {
    try {
        const { title, object_name, equipment, author, image } = req.body;
        if (!title?.trim() || !image) {
            return res.status(400).json({ success: false, error: 'El título y la imagen son obligatorios' });
        }
        const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(image);
        if (!match || !imageTypes[match[1]]) {
            return res.status(400).json({ success: false, error: 'Formato no válido. Usa JPG, PNG, WEBP o GIF' });
        }
        const imageData = Buffer.from(match[2], 'base64');
        if (!imageData.length || imageData.length > 5 * 1024 * 1024) {
            return res.status(413).json({ success: false, error: 'La imagen debe pesar máximo 5 MB' });
        }
        const result = await db.execute({
            sql: `INSERT INTO gallery (title, object_name, image_url, equipment, author, image_data)
                  VALUES (?, ?, '', ?, ?, ?)`,
            args: [title.trim(), object_name?.trim() || null, equipment?.trim() || null,
                author?.trim() || 'Anónimo', imageData],
        });
        const id = Number(result.lastInsertRowid);
        await db.execute({ sql: 'UPDATE gallery SET image_url = ? WHERE id = ?', args: [`/api/gallery/${id}/image`, id] });
        res.status(201).json({ success: true, data: { id, title: title.trim(), image_url: `/api/gallery/${id}/image` } });
    } catch (error) {
        console.error('Error al guardar foto:', error);
        res.status(500).json({ success: false, error: 'No se pudo guardar la fotografía' });
    }
});

app.get('/api/gallery/:id/image', async (req, res) => {
    try {
        const result = await db.execute({ sql: 'SELECT image_data FROM gallery WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length || !result.rows[0].image_data) return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
        const image = Buffer.from(result.rows[0].image_data);
        const type = imageTypes[`image/${image[0] === 0xff ? 'jpeg' : image[0] === 0x89 ? 'png' : image[0] === 0x47 ? 'gif' : 'webp'}`] || 'webp';
        res.type(type).set('Cache-Control', 'public, max-age=86400').send(image);
    } catch (error) {
        console.error('Error al obtener imagen:', error);
        res.status(500).json({ success: false, error: 'No se pudo cargar la imagen' });
    }
});

async function start() {
    try {
        await ensureGallerySchema();
        app.listen(PORT, () => console.log(`ORBIT API corriendo en el puerto ${PORT}`));
    } catch (error) {
        console.error('No se pudo preparar la galería en la base de datos:', error);
        process.exit(1);
    }
}

start();
