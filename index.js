const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

let latestQR = null;

// Detectar Chromium en Railway
const chromiumPaths = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome'
];

let browserPath = null;
for (const path of chromiumPaths) {
  if (fs.existsSync(path)) {
    browserPath = path;
    console.log(`✅ Chromium encontrado en: ${path}`);
    break;
  }
}

if (!browserPath) {
  console.error('❌ No se encontró Chromium. El bot no podrá iniciar.');
  process.exit(1);
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Mostrar QR en consola y guardar para servirlo como imagen
client.on('qr', qr => {
  latestQR = qr;
  qrcodeTerminal.generate(qr, { small: true });
  console.log('📲 QR actualizado. También disponible en /qr');
});

// Exponer el QR como imagen en navegador
app.get('/qr', async (req, res) => {
  if (!latestQR) return res.status(404).send('QR no disponible aún');

  try {
    const qrImage = await QRCode.toDataURL(latestQR);
    const img = Buffer.from(qrImage.split(',')[1], 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } catch (err) {
    console.error('❌ Error generando imagen QR:', err.message);
    res.status(500).send('Error interno');
  }
});

// WhatsApp conectado
client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo');
});

// Reenviar mensaje recibido a n8n y responder si hay "reply"
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
    console.error('❌ Error comunicando con n8n:', err.message);
  }
});

// Iniciar cliente
client.initialize();

// Servidor Express para exponer /qr
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor Express escuchando en puerto ${PORT}`);
});
