const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Muestra el QR para escanear
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('📲 Escanea este QR para conectar WhatsApp');
});

// Confirmación de conexión
client.on('ready', () => {
  console.log('✅ WhatsApp conectado');
});

// Al recibir un mensaje
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
    console.error('❌ Error enviando a n8n:', err.message);
  }
});

// Inicializa el cliente
client.initialize();

// Mantener el proceso activo (esto evita que Railway apague el contenedor)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
});
