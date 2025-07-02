const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const axios = require('axios');

require('dotenv').config();

const app = express();
app.use(express.json());

let latestQR = null;

// WhatsApp client con configuración compatible con Railway
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // necesario para Railway
  }
});

// Generar y exponer QR
client.on('qr', qr => {
  latestQR = qr;
  qrcodeTerminal.generate(qr, { small: true });
  console.log('📲 QR actualizado. También en /qr');
});

app.get('/qr', async (req, res) => {
  if (!latestQR) return res.status(404).send('QR no está listo todavía');
  try {
    const qrImage = await QRCode.toDataURL(latestQR);
    const img = Buffer.from(qrImage.split(',')[1], 'base64');
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(img);
  } catch (err) {
    console.error('❌ Error generando QR:', err.message);
    res.status(500).send('Error interno');
  }
});

// Cliente listo
client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo');
});

// Recibir mensajes y reenviarlos a n8n
client.on('message', async msg => {
  const phone = msg.from;
  const text = msg.body;

  try {
    const response = await axios.post(process.env.N8N_WEBHOOK, {
      from: phone,
      message: text
    });

    if (response.data?.reply) {
      await client.sendMessage(phone, response.data.reply);
    }
  } catch (err) {
    console.error('❌ Error contactando con n8n:', err.message);
  }
});

client.initialize();

// Servidor Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor escuchando en el puerto ${PORT}`);
});
