# whatsapp-clean

Bot de WhatsApp que conecta con n8n y OpenAI.

## Uso

1. Copia `.env.example` a `.env` y configura tus variables.
2. Instala dependencias: `npm install`
3. Ejecuta: `npm start`
4. Accede a `/qr` para vincular WhatsApp.

## Docker

```sh
docker build -t whatsapp-clean .
docker run --env-file .env -p 3000:3000 whatsapp-clean
```

```

---

¿Quieres que te explique alguna parte en detalle, o necesitas que adapte la estructura a algún requerimiento especial?
```
