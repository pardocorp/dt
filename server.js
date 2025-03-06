const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const DeviceDetector = require('node-device-detector');
const ClientHints = require('node-device-detector/client-hints');
const InfoDevice = require('node-device-detector/parser/device/info-device');

const app = express();
const port = process.env.PORT || 3000;
const detector = new DeviceDetector({ clientIndexes: true });
const clientHints = new ClientHints();
const infoDevice = new InfoDevice();

infoDevice.setSizeConvertObject(true);
infoDevice.setResolutionConvertObject(true);

// ✅ Habilitar CORS para permitir solicitudes desde tu dominio
app.use(cors({
    origin: 'https://datawifi.co', // Cambia esto por tu dominio real
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

app.post('/api/detect', (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "https://datawifi.co"); // Permitir solicitudes desde datawifi.co
    res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept");

    let { useragent, aboutDevice, enableIndex, headers } = req.body;
    let customHeaders = {};

    if (headers && headers.includes('{')) {
        try {
            customHeaders = JSON.parse(headers);
        } catch (e) {
            console.error(e);
        }
    } else {
        headers.split("\n").forEach((item) => {
            let partStr = item.split(":", 2);
            customHeaders[partStr[0]] = partStr[1];
        });
    }

    detector.deviceIndexes = Boolean(enableIndex);
    let clientHintData = clientHints.parse(customHeaders);
    let deviceResult = detector.detect(useragent, clientHintData);
    let botResult = detector.parseBot(useragent);
    
    let deviceInfoResult = null;
    if (aboutDevice) {
        deviceInfoResult = infoDevice.info(
            deviceResult.device.brand,
            deviceResult.device.model
        );
    }

    res.json({
        useragent,
        deviceResult,
        botResult,
        deviceInfoResult
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
