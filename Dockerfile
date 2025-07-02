# Usa una imagen base oficial con Node y Debian (compatibilidad con Puppeteer)
FROM node:18-bullseye

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
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Crea carpeta persistente para la sesión de WhatsApp y da permisos
RUN mkdir -p /app/.wwebjs_auth && chmod -R 777 /app/.wwebjs_auth

# Establece directorio de trabajo
WORKDIR /app

# Copia archivos de proyecto
COPY package*.json ./
RUN npm install

COPY . .

# Expone el puerto para Express
EXPOSE 3000

# Ejecuta la app
CMD ["npm", "start"]
