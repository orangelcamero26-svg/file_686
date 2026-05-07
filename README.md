# EcoFlow Station Manager 🔋 (Shell Digital)

Sistema profesional de gestión de turnos, cierres de caja y auditoría para estaciones de servicio Shell.

## 🚀 Guía de Despliegue a Producción

Para llevar esta aplicación a producción con una base de datos real, sigue estos pasos:

### 1. Base de Datos (Supabase)
1. Crea un proyecto gratuito en [Supabase](https://supabase.com/).
2. Ve al **SQL Editor** en tu panel de Supabase.
3. Copia el contenido del archivo `supabase_setup.sql` que está en este repositorio y ejecútalo. Esto creará las tablas necesarias (`users`, `cierres`, `auditorias`).
4. Ve a **Project Settings > API** y copia la `URL` y la `anon key`.

### 2. Repositorio (GitHub)
1. Crea un nuevo repositorio en GitHub.
2. **IMPORTANTE:** Sube los **archivos** directamente a la raíz del repositorio. No subas una carpeta que contenga los archivos.
   - Correcto: `mi-repo/package.json`, `mi-repo/index.html`, `mi-repo/src/`
   - Incorrecto: `mi-repo/carpeta-del-proyecto/package.json`
3. Asegúrate de incluir el archivo `netlify.toml` que ya está preparado en el proyecto.

### 3. Hosting (Netlify)
1. Inicia sesión en [Netlify](https://netlify.com/) y selecciona **Add new site > Import from GitHub**.
2. Selecciona tu repositorio.
3. El archivo `netlify.toml` configurará automáticamente el comando de build (`npm run build`), la carpeta de publicación (`dist`) y las redirecciones.
4. **Variables de Entorno (CRÍTICO):**
   - Ve a **Site settings > Environment variables**.
   - Añade:
     - `VITE_SUPABASE_URL`: (Tu URL de Supabase)
     - `VITE_SUPABASE_ANON_KEY`: (Tu clave anon de Supabase)

### 4. Ejecución Local
1. Instala dependencias: `npm install`
2. Crea un archivo `.env` con tus credenciales de Supabase.
3. Ejecuta: `npm run dev`

---
*Desarrollado con ❤️ para la optimización de procesos en estaciones de servicio.*
