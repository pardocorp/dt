const express = require('express');
const DeviceDetector = require('node-device-detector');

const app = express();
const port = process.env.PORT || 3000;
const detector = new DeviceDetector();

app.get('/', (req, res) => {
    const userAgent = req.headers['user-agent'];
    const result = detector.detect(userAgent);
    res.json(result);
});

app.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
