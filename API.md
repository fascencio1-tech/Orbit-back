# Conectar otra página con la API de ORBIT

La página consumidora solicita los datos al servidor de ORBIT por HTTP. No debe abrir `database.db` directamente. En desarrollo, inicia ORBIT con `npm start`; la API queda disponible en `http://localhost:3002/api`.

## Rutas disponibles

| Ruta | Respuesta |
| --- | --- |
| `GET /api/status` | Estado del servidor y conexión a SQLite |
| `GET /api/publications` | `{ data: [...] }` con todas las publicaciones, de más reciente a más antigua |
| `GET /api/publications/:id` | `{ data: {...} }` con una publicación; responde 404 si no existe |
| `GET /api/publications?category=...` | Publicaciones de una categoría exacta |
| `GET /api/gallery` | `{ data: [...] }` con fotos de la galería |
| `GET /api/photos` | Alias de `/api/gallery` |
| `POST /api/gallery` | Guarda una fotografía compartida en Turso |
| `GET /api/gallery/:id/image` | Entrega los bytes de una fotografía guardada |

Cada publicación incluye `id`, `title`, `content`, `image_url`, `category`, `author` y `created_at`. Las fotos incluyen `id`, `title`, `object_name`, `image_url`, `equipment` y `created_at`.

La subida acepta JSON con `title`, `object_name`, `author`, `equipment` e `image`. `image` debe ser un Data URL en formato JPG, PNG, WEBP o GIF y pesar hasta 5 MB. La API guarda los bytes en la tabla `gallery` de Turso; prepara las columnas `image_data` y `author` al iniciar. Las fotografías nuevas se sirven desde `/api/gallery/:id/image` y quedan disponibles para todas las páginas que consulten esta API.

## Ejemplo para la página consumidora

Configura la dirección de la API una sola vez, reemplazándola por el dominio HTTPS donde despliegues ORBIT:

```html
<script>
  window.ORBIT_API_BASE = 'https://TU-DOMINIO-ORBIT/api';
</script>
<script src="feed-orbit.js" defer></script>
```

```js
const ORBIT_API_BASE = window.ORBIT_API_BASE.replace(/\/+$/, '');

async function cargarPublicaciones() {
  const respuesta = await fetch(`${ORBIT_API_BASE}/publications`);
  if (!respuesta.ok) throw new Error(`ORBIT respondió HTTP ${respuesta.status}`);

  const { data } = await respuesta.json();
  const contenedor = document.querySelector('#publicaciones');
  contenedor.replaceChildren();

  for (const publicacion of data) {
    const articulo = document.createElement('article');
    const titulo = document.createElement('h2');
    titulo.textContent = publicacion.title;
    const texto = document.createElement('p');
    texto.textContent = publicacion.content;
    articulo.append(titulo, texto);

    if (publicacion.image_url) {
      const imagen = document.createElement('img');
      imagen.src = publicacion.image_url;
      imagen.alt = publicacion.title;
      articulo.prepend(imagen);
    }

    contenedor.append(articulo);
  }
}

cargarPublicaciones().catch(error => {
  console.error('No se pudieron cargar las publicaciones de ORBIT:', error);
});
```

Para cargar una sola publicación, solicita `${ORBIT_API_BASE}/publications/ID`. Para las fotos, usa `${ORBIT_API_BASE}/gallery` y consume igualmente `respuesta.json().data`.

## Al desplegar

- Despliega `server.js` como un servicio Node.js activo y establece `ORBIT_API_BASE` en la página consumidora al dominio HTTPS de ORBIT más `/api`.
- El proceso respeta `PORT` del proveedor y abre SQLite desde `database.db` junto a `server.js`.
- El alojamiento debe conservar el archivo SQLite entre reinicios y permitir escritura para sus migraciones. Si el proveedor usa almacenamiento efímero, configura un volumen persistente.
- ORBIT permite peticiones CORS para que otro dominio pueda leer la API. Las imágenes deben usar URL accesibles por navegador (idealmente HTTPS).
- Comprueba el despliegue abriendo `/api/status` y `/api/publications` en el dominio público.

El proyecto actualmente disponible en este workspace es ORBIT; el código de la otra página no está aquí. Este documento deja el contrato y un ejemplo listos para integrarlos allí.
