require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@libsql/client');

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
    try {
        console.log('Conectando con Turso y preparando tablas...');

        // Crear la tabla en Turso si no existe
        await db.execute(`
            CREATE TABLE IF NOT EXISTS publications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                image_url TEXT,
                author TEXT DEFAULT 'Fernando Ascencio',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Leer el archivo CSV
        const csvData = fs.readFileSync('./publications_rows.csv', 'utf8');

        // Regex para parsear filas del CSV de forma segura
        const rowRegex = /(\d+),("(?:""|[^"])*"|[^,]*),("(?:""|[^"])*"|[^,]*),("(?:""|[^"])*"|[^,]*),("(?:""|[^"])*"|[^,]*)/g;
        let match;
        let count = 0;

        console.log('Subiendo publicaciones a la nube de Turso...');

        while ((match = rowRegex.exec(csvData)) !== null) {
            const id = parseInt(match[1]);
            const category = match[2].replace(/^"|"$/g, '').replace(/\\n/g, '').trim();
            const title = match[3].replace(/^"|"$/g, '').trim();
            const content = match[4].replace(/^"|"$/g, '').trim().replace(/""/g, '"');
            const imageData = match[5].replace(/^"|"$/g, '').trim();

            // Insertar en Turso
            await db.execute({
                sql: `INSERT OR REPLACE INTO publications (id, category, title, content, image_url) VALUES (?, ?, ?, ?, ?)`,
                args: [id, category, title, content, imageData]
            });
            count++;
        }

        console.log(`¡Éxito! Se migraron ${count} publicaciones directamente a Turso en la nube.`);
    } catch (err) {
        console.error('Error durante la migración a Turso:', err);
    }
}

migrate();