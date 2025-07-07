require('dotenv').config();
const express = require('express');
const { setupWhatsAppClient } = require('./whatsapp/client');
const { setupQRRoute } = require('./api/qr');

const app = express();
app.use(express.json());

const { client, getLatestQR } = setupWhatsAppClient();

setupQRRoute(app, getLatestQR);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor escuchando en el puerto ${PORT}`);
});

client.initialize();