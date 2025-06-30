const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

// Verifica paths posibles
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

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('📲 Escanea este código QR para conectar WhatsApp');
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado');
});

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

client.initialize();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
});
