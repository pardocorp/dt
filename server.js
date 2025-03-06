const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const DeviceDetector = require('node-device-detector');
const ClientHints = require('node-device-detector/client-hints');
const InfoDevice = require('node-device-detector/parser/device/info-device');

const app = express();
const port = process.env.PORT || 3000;

// Configurar DeviceDetector con opciones avanzadas
const detector = new DeviceDetector({
    clientIndexes: true,
    deviceIndexes: true,
    deviceAliasCode: true,  // Agrega códigos alias del dispositivo
    deviceTrusted: true,    // Verifica si el dispositivo es confiable
    deviceInfo: true        // Obtiene información detallada
});

const clientHints = new ClientHints();
const infoDevice = new InfoDevice();

infoDevice.setSizeConvertObject(true);
infoDevice.setResolutionConvertObject(true);

// ✅ Configurar CORS para evitar bloqueos de origen cruzado
app.use(cors({
    origin: 'https://datawifi.co', // Permitir solo este dominio
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ✅ Permitir preflight requests para todas las rutas
app.options('*', cors());

app.use(bodyParser.json());

app.post('/api/detect', (req, res) => {
    try {
        // ✅ Obtener datos de la solicitud
        const useragent = req.body.useragent || req.headers['user-agent'] || '';
        const aboutDevice = req.body.aboutDevice || false;
        const enableIndex = req.body.enableIndex || false;
        const headers = req.body.headers || '';

        // ✅ Procesar encabezados adicionales de client hints
        let customHeaders = {};
        if (headers) {
            try {
                customHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
            } catch (error) {
                console.error('Error parsing headers:', error);
            }
        }

        detector.deviceIndexes = Boolean(enableIndex);
        const clientHintData = clientHints.parse(customHeaders);

        // ✅ Detectar información del dispositivo
        let deviceResult = detector.detect(useragent, clientHintData);
        let botResult = detector.parseBot(useragent);

        // ✅ Obtener información adicional del dispositivo si es necesario
        let deviceInfoResult = null;
        if (aboutDevice && deviceResult.device?.brand && deviceResult.device?.model) {
            deviceInfoResult = infoDevice.info(
                deviceResult.device.brand,
                deviceResult.device.model
            );
        }

        // ✅ Enviar respuesta JSON al cliente
        res.json({
            useragent,
            deviceResult,
            botResult,
            deviceInfoResult
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
