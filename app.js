// Set window.ORBIT_API_BASE before this script when the API is hosted elsewhere.
const URL = (window.ORBIT_API_BASE || 'http://localhost:3002/api').replace(/\/+$/, '');

getApiStatus();
getObjects();
getPublications();
getPhotos();
setupGalleryUpload();

function updateStatusVisualState(isOnline) {
    const statusEl = document.getElementById('api-status');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    if (!statusEl || !statusDot || !statusText) return;

    statusEl.classList.toggle('online', isOnline);
    statusEl.classList.toggle('offline', !isOnline);
    statusDot.classList.toggle('online', isOnline);
    statusDot.classList.toggle('offline', !isOnline);
    statusText.textContent = isOnline ? 'ORBIT online' : 'ORBIT sin conexión';
}

async function getApiStatus() {
    try {
        const response = await fetch(`${URL}/status`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        updateStatusVisualState(data.status === 'Online' || data.status === 'ONLINE');
    } catch (error) {
        console.error('Error al consultar estado de la API:', error);
        updateStatusVisualState(false);
    }
}

async function getObjects() {
    try {
        const response = await fetch(`${URL}/objects`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const grid = document.getElementById('objects-grid');
        if (!grid) return;
        grid.replaceChildren();

        data.forEach(item => {
            const card = document.createElement('article');
            card.className = 'card';
            const type = document.createElement('div');
            type.className = 'card-type';
            type.textContent = item.type;
            const title = document.createElement('h2');
            title.className = 'card-title';
            title.textContent = item.name;
            const meta = document.createElement('p');
            meta.className = 'card-meta';
            meta.textContent = item.constellation;
            card.append(type, title, meta);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error al obtener objetos:', error);
    }
}

async function getPublications() {
    const grid = document.getElementById('publications-grid');
    if (!grid) return;
    try {
        const response = await fetch(`${URL}/publications`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const publications = result.data || [];
        grid.replaceChildren();

        if (!publications.length) {
            grid.textContent = 'Todavía no hay publicaciones.';
            return;
        }

        publications.forEach(item => {
            const card = document.createElement('article');
            card.className = 'card publication-card';
            if (item.image_url) {
                const image = document.createElement('img');
                image.src = item.image_url;
                image.alt = item.title || 'Imagen de la publicación';
                image.loading = 'lazy';
                card.appendChild(image);
            }
            const content = document.createElement('div');
            content.className = 'card-content';
            const category = document.createElement('div');
            category.className = 'card-type';
            category.textContent = item.category || 'Publicación';
            const title = document.createElement('h3');
            title.textContent = item.title || 'Sin título';
            const summary = document.createElement('p');
            summary.textContent = item.summary || item.content || '';
            const footer = document.createElement('div');
            footer.className = 'card-footer';
            footer.textContent = [item.author, item.created_at].filter(Boolean).join(' · ');
            content.append(category, title, summary, footer);
            card.appendChild(content);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar publicaciones:', error);
        grid.textContent = 'No se pudieron cargar las publicaciones. Revisa que el servidor de ORBIT esté activo.';
    }
}

async function getPhotos() {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    try {
        const response = await fetch(`${URL}/photos`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const photos = result.data || [];
        galleryGrid.replaceChildren();

        if (!photos.length) {
            galleryGrid.textContent = 'Todavía no hay fotografías en la galería.';
            return;
        }

        photos.forEach(item => {
            const card = document.createElement('article');
            card.className = 'card photo-card';
            const image = document.createElement('img');
            image.src = item.image_url?.startsWith('/') ? new URL(item.image_url, URL).href : item.image_url;
            image.alt = item.title || 'Fotografía astronómica';
            image.loading = 'lazy';
            const content = document.createElement('div');
            content.className = 'card-content';
            const title = document.createElement('h3');
            title.textContent = item.title || 'Fotografía';
            const object = document.createElement('p');
            object.textContent = `Objeto: ${item.object_name || 'N/A'}`;
            const equipment = document.createElement('small');
            equipment.textContent = item.equipment || '';
            const author = document.createElement('small');
            author.className = 'photo-author';
            author.textContent = item.author ? `Compartida por ${item.author}` : '';
            content.append(title, object, equipment, author);
            card.append(image, content);
            galleryGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar la galería:', error);
        galleryGrid.textContent = 'No se pudo cargar la galería de fotografías.';
    }
}

function setupGalleryUpload() {
    const form = document.getElementById('gallery-upload-form');
    if (!form) return;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const status = document.getElementById('gallery-upload-status');
        const button = form.querySelector('button[type="submit"]');
        const fields = new FormData(form);
        const file = fields.get('image');
        if (!file || !file.size) return;
        if (file.size > 5 * 1024 * 1024) {
            status.textContent = 'La imagen debe pesar máximo 5 MB.';
            return;
        }
        button.disabled = true;
        status.textContent = 'Subiendo fotografía…';
        try {
            const image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
                reader.readAsDataURL(file);
            });
            const response = await fetch(`${URL}/gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: fields.get('title'),
                    object_name: fields.get('object_name'),
                    author: fields.get('author'),
                    equipment: fields.get('equipment'),
                    image,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
            form.reset();
            status.textContent = 'Fotografía compartida con la comunidad.';
            await getPhotos();
        } catch (error) {
            console.error('Error al subir fotografía:', error);
            status.textContent = error.message || 'No se pudo subir la fotografía.';
        } finally {
            button.disabled = false;
        }
    });
}
