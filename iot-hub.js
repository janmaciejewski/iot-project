const { Client, Message } = require('azure-iot-device');
const { Mqtt } = require('azure-iot-device-mqtt');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.IOT_HUB_DEVICE_CONNECTION_STRING;

let client = null;

function initClient() {
  if (!connectionString) {
    console.error("Brakuje IOT_HUB_DEVICE_CONNECTION_STRING w .env");
    return;
  }

  if (!client) {
    client = Client.fromConnectionString(connectionString, Mqtt);
    client.on('connect', () => console.log("Połączono z IoT Hub przez MQTTs"));
    client.on('error', (err) => console.error("Błąd klienta IoT Hub:", err.message));
  }
}

async function sendStatusToIoTHub(value, operation) {
  try {
    initClient();

    const message = {
      timestamp: new Date().toISOString(),
      value: value ?? null,
      operation,
    };

    const payload = JSON.stringify(message);

    const msg = new Message(payload);
    msg.contentType = 'application/json';
    msg.contentEncoding = 'utf-8';

    client.sendEvent(msg, (err) => {
      if (err) {
        console.error("Błąd wysyłania danych do IoT Hub:", err.message);
      } else {
        console.log("Wysłano dane do IoT Hub:", message);
      }
    });
  } catch (err) {
    console.error("Błąd sendStatusToIoTHub:", err.message);
  }
}

module.exports = { sendStatusToIoTHub };
