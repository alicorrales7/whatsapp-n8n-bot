const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const { sendToN8N } = require('../services/n8n');
const fs = require('fs');

let latestQR = null;

function setupWhatsAppClient() {
  const browserPath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  if (!fs.existsSync(browserPath)) {
    console.error('❌ Google Chrome no encontrado. Ajusta CHROME_PATH en tu .env');
    process.exit(1);
  }

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      executablePath: browserPath,
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  });

  client.on('qr', qr => {
    latestQR = qr;
    qrcodeTerminal.generate(qr, { small: true });
    console.log('📲 Escanea este QR para vincular WhatsApp');
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp conectado y listo para usar');
  });

  client.on('message', async msg => {
    const phone = msg.from;
    const text = msg.body;
    try {
        const reply = await sendToN8N(phone, text);
        console.log('--- DEPURACION CRITICA ---');
        console.log('Valor de reply RECIBIDO en client.js:', reply);
        console.log('Tipo de reply:', typeof reply);
        console.log('¿Es reply un string vacío?', reply === '');
        console.log('¿Es reply null/undefined?', reply === null || reply === undefined);
        console.log('--- FIN DEPURACION CRITICA ---');

        if (reply && typeof reply === 'string' && reply.trim().length > 0) {
            console.log('Condición "if (reply)" TRUE. Intentando enviar:', reply);
            await client.sendMessage(phone, reply.trim());
            console.log('sendMessage aparentemente exitoso.');
        } else {
            console.log('Condición "if (reply)" FALSE. Enviando fallback.');
            await client.sendMessage(phone, 'No recibí respuesta del agente. (Desde fallback)');
        }

    } catch (err) {
        console.error('❌ Error CRÍTICO en client.sendMessage directo:', err.message);
        await client.sendMessage(phone, 'Lo siento, no pude enviar un mensaje directo.');
    }
  });

  return { client, getLatestQR: () => latestQR };
}

module.exports = { setupWhatsAppClient };