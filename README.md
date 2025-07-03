# WhatsApp Bot con n8n + ChatGPT

Este proyecto conecta un número de WhatsApp con un webhook en n8n para que cualquier mensaje recibido sea respondido por un agente de IA (ChatGPT).

## 🚀 Características

- ✅ Conexión automática con WhatsApp Web
- ✅ Reconexión automática en caso de desconexión
- ✅ Integración con n8n webhook
- ✅ Logging estructurado
- ✅ Health checks
- ✅ Rate limiting
- ✅ Seguridad mejorada
- ✅ Optimizado para Railway

## 📋 Requisitos

- Node.js 18+
- Número de WhatsApp real
- Webhook funcional en n8n
- Cuenta de OpenAI conectada a n8n
- Railway (para deployment)

## 🛠️ Configuración Local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp env.example .env
```

Edita `.env` con tus valores:

```env
# Configuración del Webhook de n8n
N8N_WEBHOOK=https://tu-instancia-n8n.railway.app/webhook/whatsapp

# Puerto del servidor
PORT=3000

# Configuración de logging
LOG_LEVEL=info
```

### 3. Ejecutar localmente

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🚂 Deployment en Railway

### 1. Conectar repositorio

1. Ve a [Railway](https://railway.app)
2. Crea un nuevo proyecto
3. Conecta tu repositorio de GitHub

### 2. Configurar variables de entorno

En Railway, ve a la pestaña "Variables" y configura:

```env
N8N_WEBHOOK=https://tu-instancia-n8n.railway.app/webhook/whatsapp
LOG_LEVEL=info
```

### 3. Deploy

Railway detectará automáticamente el Dockerfile y desplegará la aplicación.

## 📱 Configuración de WhatsApp

### 1. Obtener código QR

Una vez desplegado, accede a:

- `https://tu-app.railway.app/qr` - Para ver el código QR
- `https://tu-app.railway.app/status` - Para ver el estado de conexión

### 2. Escanear QR

1. Abre WhatsApp en tu teléfono
2. Ve a Configuración > Dispositivos vinculados
3. Escanea el código QR desde la URL `/qr`

### 3. Verificar conexión

El bot mostrará "✅ WhatsApp conectado y listo para usar" cuando esté listo.

## 🔗 Configuración de n8n

### 1. Crear webhook en n8n

1. Crea un nuevo workflow en n8n
2. Añade un nodo "Webhook"
3. Configura la URL del webhook
4. Conecta con un nodo de ChatGPT

### 2. Estructura del payload

El bot envía este payload a n8n:

```json
{
  "from": "5491112345678@c.us",
  "message": "Hola, ¿cómo estás?",
  "type": "chat",
  "timestamp": 1640995200,
  "name": "Juan Pérez",
  "isGroup": false
}
```

### 3. Respuesta esperada

n8n debe responder con:

```json
{
  "reply": "¡Hola! Estoy bien, gracias por preguntar. ¿En qué puedo ayudarte?"
}
```

O simplemente:

```json
{
  "success": true
}
```

## 📊 Endpoints de la API

### Health Check

```
GET /health
```

Retorna el estado de salud de la aplicación.

### Código QR

```
GET /qr
```

Retorna una imagen PNG del código QR para conectar WhatsApp.

### Estado

```
GET /status
```

Retorna el estado de conexión de WhatsApp.

## 🔧 Variables de Entorno

| Variable      | Descripción            | Requerido | Default |
| ------------- | ---------------------- | --------- | ------- |
| `N8N_WEBHOOK` | URL del webhook de n8n | ✅        | -       |
| `PORT`        | Puerto del servidor    | ❌        | 3000    |
| `LOG_LEVEL`   | Nivel de logging       | ❌        | info    |

## 🐛 Troubleshooting

### Problema: Chromium no encontrado

**Solución**: En Railway, Chromium se instala automáticamente. Si hay problemas, verifica los logs.

### Problema: WhatsApp se desconecta frecuentemente

**Solución**:

- Verifica la conexión a internet
- Asegúrate de que el número no esté siendo usado en otro dispositivo
- Revisa los logs para más detalles

### Problema: No recibe respuestas de n8n

**Solución**:

- Verifica que la URL del webhook sea correcta
- Asegúrate de que n8n esté funcionando
- Revisa los logs de n8n para errores

### Problema: Error de autenticación

**Solución**:

- Elimina la carpeta `.wwebjs_auth` y reinicia
- Escanea el nuevo código QR

## 📝 Logs

Los logs incluyen:

- Estado de conexión de WhatsApp
- Mensajes recibidos y enviados
- Errores de comunicación con n8n
- Intentos de reconexión

## 🔒 Seguridad

- Rate limiting implementado
- Headers de seguridad con Helmet
- Usuario no-root en Docker
- Validación de entrada
- Timeouts en requests

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles.
