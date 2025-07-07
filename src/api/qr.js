const QRCode = require('qrcode');

function setupQRRoute(app, getLatestQR) {
  app.get('/qr', async (req, res) => {
    const latestQR = getLatestQR();
    if (!latestQR) return res.status(404).send('QR no generado aún');
    try {
      const qrImage = await QRCode.toDataURL(latestQR);
      const img = Buffer.from(qrImage.split(',')[1], 'base64');
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(img);
    } catch (err) {
      console.error('❌ Error generando QR:', err.message);
      res.status(500).send('Error interno');
    }
  });
}

module.exports = { setupQRRoute };