require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());

// Inicializar la conexión a Turso en la nube
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Ruta de prueba general
app.get('/', (req, res) => {
    res.json({ status: 'ORBIT API funcionando correctamente en la nube ' });
});

// Endpoint para obtener todas las publicaciones
app.get('/api/publications', async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM publications');
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener publicaciones:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// Endpoint para obtener una publicación específica por ID
app.get('/api/publications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.execute({
            sql: 'SELECT * FROM publications WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Publicación no encontrada' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener la publicación:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`ORBIT API corriendo en el puerto ${PORT}`);
});