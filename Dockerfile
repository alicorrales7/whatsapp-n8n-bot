# Usa una imagen base oficial con Node y Debian (compatibilidad con Puppeteer)
FROM node:18-bullseye-slim

# Instala Chromium y dependencias necesarias
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm-dev \
    curl \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Crea usuario no-root para seguridad
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Crea carpeta persistente para la sesión de WhatsApp
RUN mkdir -p /app/.wwebjs_auth && \
    chown -R appuser:appuser /app

# Establece directorio de trabajo
WORKDIR /app

# Copia archivos de dependencias primero (para mejor caching)
COPY package*.json ./

# Instala dependencias
RUN npm ci --only=production && \
    npm cache clean --force

# Copia el resto de archivos
COPY . .

# Cambia permisos y propietario
RUN chown -R appuser:appuser /app

# Cambia al usuario no-root
USER appuser

# Expone el puerto para Express
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Verifica que Chromium está instalado y muestra su versión
RUN which chromium && chromium --version || (echo 'Chromium no está instalado correctamente' && exit 1)

# Ejecuta la app
CMD ["npm", "start"]
