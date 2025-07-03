const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const winston = require('winston');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Configuración de logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsapp-bot' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configuración de Express con seguridad
const app = express();
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: 'Demasiadas requests desde esta IP'
});
app.use(limiter);

// Variables globales
let latestQR = null;
let client = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Verificación de variables de entorno
if (!process.env.N8N_WEBHOOK) {
  logger.error('❌ N8N_WEBHOOK no está configurado en las variables de entorno');
  process.exit(1);
}

logger.info('✅ Webhook apuntando a:', process.env.N8N_WEBHOOK);

// Configuración de Chromium para Railway
const chromiumPaths = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser', 
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable'
];

let browserPath = chromiumPaths.find(p => fs.existsSync(p));

if (!browserPath) {
  logger.error('❌ Chromium no encontrado. Instalando dependencias...');
  // En Railway, Chromium debería estar disponible
  browserPath = '/usr/bin/chromium';
}

// Función para inicializar el cliente de WhatsApp
function initializeWhatsAppClient() {
  try {
    client = new Client({
      authStrategy: new LocalAuth({ 
        dataPath: './.wwebjs_auth',
        clientId: 'whatsapp-bot-railway'
      }),
      puppeteer: {
        executablePath: browserPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      },
      webVersion: '2.2402.5',
      webVersionCache: {
        type: 'local'
      }
    });

    setupClientEvents();
    client.initialize();
  } catch (error) {
    logger.error('❌ Error inicializando cliente WhatsApp:', error);
    process.exit(1);
  }
}

// Configuración de eventos del cliente
function setupClientEvents() {
  client.on('qr', qr => {
    latestQR = qr;
    logger.info('📲 Nuevo QR generado');
    qrcodeTerminal.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isConnected = true;
    reconnectAttempts = 0;
    logger.info('✅ WhatsApp conectado y listo para usar');
  });

  client.on('authenticated', () => {
    logger.info('🔐 WhatsApp autenticado');
  });

  client.on('auth_failure', (msg) => {
    logger.error('❌ Fallo de autenticación WhatsApp:', msg);
    isConnected = false;
  });

  client.on('disconnected', (reason) => {
    isConnected = false;
    logger.warn('⚠️ WhatsApp desconectado:', reason);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      logger.info(`🔄 Intento de reconexión ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      setTimeout(() => {
        initializeWhatsAppClient();
      }, 5000 * reconnectAttempts);
    } else {
      logger.error('❌ Máximo de intentos de reconexión alcanzado');
    }
  });

  client.on('message', async msg => {
    try {
      const phone = msg.from;
      const text = msg.body;
      const messageType = msg.type;
      const timestamp = msg.timestamp;

      logger.info(`📨 Mensaje recibido de ${phone}: ${text.substring(0, 50)}...`);

      // Preparar payload para n8n
      const payload = {
        from: phone,
        message: text,
        type: messageType,
        timestamp: timestamp,
        name: msg._data.notifyName || 'Usuario',
        isGroup: msg.from.endsWith('@g.us')
      };

      // Enviar a n8n
      const response = await axios.post(process.env.N8N_WEBHOOK, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsApp-Bot/1.0'
        }
      });

      // Procesar respuesta de n8n
      if (response.data?.reply) {
        await client.sendMessage(phone, response.data.reply);
        logger.info(`✅ Respuesta enviada a ${phone}`);
      } else if (response.data?.success) {
        logger.info(`✅ Mensaje procesado por n8n para ${phone}`);
      }

    } catch (error) {
      logger.error('❌ Error procesando mensaje:', error.message);
      
      // Enviar mensaje de error al usuario si es posible
      try {
        if (client && isConnected) {
          await client.sendMessage(msg.from, 'Lo siento, estoy teniendo problemas técnicos. Inténtalo de nuevo en unos minutos.');
        }
      } catch (sendError) {
        logger.error('❌ Error enviando mensaje de error:', sendError.message);
      }
    }
  });
}

// Endpoints de la API
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    whatsapp: {
      connected: isConnected,
      reconnectAttempts
    },
    uptime: process.uptime()
  });
});

app.get('/qr', async (req, res) => {
  try {
    if (!latestQR) {
      return res.status(404).json({ 
        error: 'QR no generado aún',
        message: 'Espera a que se genere un nuevo código QR'
      });
    }

    const qrImage = await QRCode.toDataURL(latestQR);
    const img = Buffer.from(qrImage.split(',')[1], 'base64');
    
    res.writeHead(200, { 
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(img);
  } catch (err) {
    logger.error('❌ Error generando QR:', err);
    res.status(500).json({ error: 'Error interno generando QR' });
  }
});

app.get('/status', (req, res) => {
  res.json({
    whatsapp: {
      connected: isConnected,
      reconnectAttempts
    },
    webhook: process.env.N8N_WEBHOOK ? 'Configurado' : 'No configurado'
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  logger.error('❌ Error en Express:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('🛑 Recibida señal SIGTERM, cerrando aplicación...');
  if (client) {
    client.destroy();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 Recibida señal SIGINT, cerrando aplicación...');
  if (client) {
    client.destroy();
  }
  process.exit(0);
});

// Inicializar aplicación
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🌐 Servidor escuchando en el puerto ${PORT}`);
  logger.info('🚀 Iniciando cliente de WhatsApp...');
  initializeWhatsAppClient();
});