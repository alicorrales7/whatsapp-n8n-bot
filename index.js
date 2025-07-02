const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

let latestQR = null;

// ✅ Ruta fija para Google Chrome en macOS (ajusta si usas Windows o Linux)
const browserPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!fs.existsSync(browserPath)) {
  console.error(`❌ Google Chrome not found at: ${browserPath}`);
  process.exit(1);
}

// ✅ Inicializa el cliente de WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// 📲 Generar y mostrar QR
client.on('qr', qr => {
  latestQR = qr;
  qrcodeTerminal.generate(qr, { small: true });
  console.log('📲 QR updated. Accessible at /qr');
});

// 🌐 Endpoint para ver el QR en el navegador
app.get('/qr', async (req, res) => {
  if (!latestQR) return res.status(404).send('QR not ready yet');
  try {
    const qrImage = await QRCode.toDataURL(latestQR);
    const img = Buffer.from(qrImage.split(',')[1], 'base64');
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(img);
  } catch (err) {
    console.error('❌ Error generating QR:', err.message);
    res.status(500).send('Internal error');
  }
});

// ✅ WhatsApp listo
client.on('ready', () => {
  console.log('✅ WhatsApp connected and ready!');
});

// 📥 Al recibir mensaje, reenviar a n8n
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
    console.error('❌ Error contacting n8n:', err.message);
  }
});

// 🚀 Iniciar cliente y servidor Express
client.initialize();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});
