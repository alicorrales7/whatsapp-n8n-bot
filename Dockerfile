# Imagen base con Chromium preinstalado
FROM zenika/node:18-bullseye

# Crear carpeta de trabajo
WORKDIR /app

# Copiar archivos
COPY package*.json ./
RUN npm install
COPY . .

# Puerto expuesto
EXPOSE 3000

# Ejecutar app
CMD ["node", "index.js"]
