FROM ghcr.io/puppeteer/puppeteer:latest

# Crea directorio de trabajo
WORKDIR /app

# Copia archivos al contenedor
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el resto del código
COPY . .

# Expone el puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "start"]
