const axios = require('axios');

async function sendToN8N(phone, text) {
  try {
    const response = await axios.post(process.env.N8N_WEBHOOK, {
      from: phone,
      message: text,
    }, { timeout: 10000 });

    const n8nResponse = response.data;
    console.log('Respuesta de n8n (completa):', JSON.stringify(n8nResponse, null, 2));

    if (n8nResponse && n8nResponse.message && typeof n8nResponse.message.content === 'string') {
      console.log('Devolviendo contenido del asistente:', n8nResponse.message.content);
      return n8nResponse.message.content;
    } else {
      console.warn('n8n no devolvió un campo de contenido válido del asistente.');
      return null;
    }
  } catch (err) {
    console.error('❌ Error al enviar al webhook de n8n o procesar la respuesta:', err.message);
    return null;
  }
}

module.exports = { sendToN8N };