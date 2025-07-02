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

// Detect installed Chromium binary (needed for puppeteer in Railway)
const chromiumPaths = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome'
];

let browserPath = null;
for (const path of chromiumPaths) {
  if (fs.existsSync(path)) {
    browserPath = path;
    console.log(`✅ Chromium found at: ${path}`);
    break;
  }
}

if (!browserPath) {
  console.error('❌ Chromium not found. Cannot continue.');
  process.exit(1);
}

// Mostrar el webhook que realmente está usando
console.log('✅ Webhook apuntando a:', process.env.N8N_WEBHOOK);

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Generar y mostrar QR
client.on('qr', qr => {
  latestQR = qr;
  qrcodeTerminal.generate(qr, { small: true });
  console.log('📲 Escanea este QR para vincular WhatsApp. También está disponible en /qr');
});

// Endpoint para mostrar QR en navegador
app.get('/qr', async (req, res) => {
  if (!latestQR) return res.status(404).send('QR no generado aún');
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

// WhatsApp listo
client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo para usar');
});

// Al recibir mensaje, reenviarlo a n8n
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
    console.error('❌ Error al enviar al webhook de n8n:', err.message);
  }
});

client.initialize();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor escuchando en el puerto ${PORT}`);
});
