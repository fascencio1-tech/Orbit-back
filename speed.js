// seed.js
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Función básica para parsear CSV asegurando el manejo de comillas y saltos de línea
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const results = [];
    let headers = [];
    
    lines.forEach((line, index) => {
        if (index === 0) {
            headers = line.split(',').map(h => h.trim());
            return;
        }
        if (!line.trim()) return;

        // Separación limpia considerando campos del CSV
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length >= 5) {
            results.push({
                id: cols[0].replace(/^"|"$/g, '').trim(),
                category: cols[1].replace(/^"|"$/g, '').trim().replace('\\n', ''),
                title: cols[2].replace(/^"|"$/g, '').trim(),
                content: cols[3].replace(/^"|"$/g, '').trim(),
                imageData: cols[4].replace(/^"|"$/g, '').trim()
            });
        }
    });
    return results;
}

fs.readFile('./publications_rows.csv', 'utf8', (err, data) => {
    if (err) {
        console.error('⚠️ No se encontró el archivo publications_rows.csv en la raíz.');
        return;
    }

    db.serialize(() => {
        // Asegurar que la tabla existe
        db.run(`CREATE TABLE IF NOT EXISTS publications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            author TEXT DEFAULT 'Fernando Ascencio',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Opcional: Limpiar datos previos
        db.run(`DELETE FROM publications`);

        const stmt = db.prepare(`INSERT INTO publications (id, category, title, content, image_url) VALUES (?, ?, ?, ?, ?)`);

        // Parsear CSV usando la biblioteca incorporada
        const records = [];
        // Usamos una expresión regular para procesar filas de CSV con saltos de línea internos
        const rowRegex = /(\d+),("(?:""|[^"])*"|[^,]*),("(?:""|[^"])*"|[^,]*),("(?:""|[^"])*"|[^,]*),("(?:""|[^"])*"|[^,]*)/g;
        let match;

        while ((match = rowRegex.exec(data)) !== null) {
            const id = match[1];
            const category = match[2].replace(/^"|"$/g, '').replace(/\\n/g, '').trim();
            const title = match[3].replace(/^"|"$/g, '').trim();
            const content = match[4].replace(/^"|"$/g, '').trim().replace(/""/g, '"');
            const imageData = match[5].replace(/^"|"$/g, '').trim();

            stmt.run(id, category, title, content, imageData);
        }

        stmt.finalize(() => {
            console.log('✅ ¡Las 16 publicaciones se importaron exitosamente a SQLite!');
            db.close();
        });
    });
});