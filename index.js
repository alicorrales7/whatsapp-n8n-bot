require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

const app = express();
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('[QR] Escanea el código con tu WhatsApp');
});

client.on('ready', () => {
  console.log('[CLIENT] Bot listo');
});

client.on('message', async msg => {
  const data = {
    from: msg.from,
    body: msg.body,
    timestamp: msg.timestamp
  };

  try {
    await axios.post(process.env.WEBHOOK_URL, data);
    console.log('[INFO] Mensaje enviado a n8n');
  } catch (error) {
    console.error('[ERROR] No se pudo enviar a n8n:', error.message);
  }
});

client.initialize();

app.listen(process.env.PORT, () => {
  console.log(`[SERVER] Corriendo en puerto ${process.env.PORT}`);
});
