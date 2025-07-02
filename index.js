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

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Show QR in terminal and serve as PNG on endpoint
client.on('qr', qr => {
  latestQR = qr;
  qrcodeTerminal.generate(qr, { small: true });
  console.log('📲 QR updated. Accessible at /qr');
});

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

client.on('ready', () => {
  console.log('✅ WhatsApp connected and ready!');
});

// Forward incoming WhatsApp messages to n8n webhook
client.on('message', async msg => {
  const phone = msg.from;
  const text = msg.body;

  console.log(`[${phone}] → ${text}`);

  try {
    const response = await axios.post(process.env.N8N_WEBHOOK, {
      from: phone,
      message: text
    });

    if (response.data?.reply) {
      console.log(`[GPT] ← ${response.data.reply}`);
      await client.sendMessage(phone, response.data.reply);
    }
  } catch (err) {
    console.error('❌ Error contacting n8n:', err.message);
  }
});

client.initialize();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});
