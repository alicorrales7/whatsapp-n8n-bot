# Imagen base con Puppeteer + Chromium
FROM ghcr.io/puppeteer/puppeteer:20.9.0

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json antes para cachear dependencias
COPY package*.json ./

# Usar root temporalmente para instalar dependencias
USER root

# Instalar dependencias
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Restaurar usuario no root
USER pptruser

# Exponer el puerto (por si lo usas en Railway o local)
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
