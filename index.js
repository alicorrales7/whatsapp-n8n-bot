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

// Detectar ruta de Chromium en Railway
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

// Mostrar qué webhook se está usando
console.log('✅ Webhook apuntando a:', process.env.N8N_WEBHOOK);

// Forzar una nueva sesión en cada despliegue
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'session-' + Date.now()
  }),
  puppeteer: {
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Evento: QR recibido
client.on('qr', qr => {
  console.log('📲 QR generado');
  latestQR = qr;
  qrcodeTerminal.generate(qr, { small: true });
  console.log('🔗 Accede al QR desde /qr');
});

// Evento: WhatsApp listo
client.on('ready', () => {
  console.log('✅ WhatsApp conectado y listo para usar');
});

// Endpoint para visualizar el QR
app.get('/qr', async (req, res) => {
  if (!latestQR) {
    console.log('❌ QR aún no disponible');
    return res.status(404).send('QR no generado aún');
  }
  try {
    const qrImage = await QRCode.toDataURL(latestQR);
    const img = Buffer.from(qrImage.split(',')[1], 'base64');
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(img);
  } catch (err) {
    console.error('❌ Error generando QR:', err.message);
    res.status(500).send('Error generando QR');
  }
});

// Evento: mensaje recibido
client.on('message', async msg => {
  const phone = msg.from;
  const text = msg.body;
  console.log(`📩 Mensaje de ${phone}: ${text}`);

  try {
    const response = await axios.post(process.env.N8N_WEBHOOK, {
      from: phone,
      message: text
    });

    if (response.data?.reply) {
      await client.sendMessage(phone, response.data.reply);
      console.log(`✅ Respuesta enviada a ${phone}`);
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
