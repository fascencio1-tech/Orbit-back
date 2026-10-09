// Set window.ORBIT_API_BASE before this script when the API is hosted elsewhere.
const URL = (window.ORBIT_API_BASE || 'http://localhost:3002/api').replace(/\/+$/, '');

getApiStatus();
getObjects();
getPublications();
getPhotos();

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
            image.src = item.image_url;
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
            content.append(title, object, equipment);
            card.append(image, content);
            galleryGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar la galería:', error);
        galleryGrid.textContent = 'No se pudo cargar la galería de fotografías.';
    }
}
