const venom = require('venom-bot');
const express = require('express');
const cors = require('cors'); // For handling cross-origin requests
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let client; // Holds the venom client instance
let qrCodeBase64 = null; // Store the current QR code

// Start venom bot and handle events
console.log("Starting venom.create()...");

venom
  .create(
    'whatsapp-session',
    (base64Qr) => {
      // Capture QR code in Base64 format
      console.log('QR Code received');
      qrCodeBase64 = base64Qr;
    },
    undefined,
    { headless: true } // Run in headless mode to avoid opening the browser window
  )
  .then((clientInstance) => {
    console.log("Venom bot connected successfully.");
    client = clientInstance;

    // Event listener for authentication success
    client.onAuthenticated(() => {
      console.log('WhatsApp session authenticated');
      qrCodeBase64 = null; // Clear QR code after authentication
    });

    // Event listener for authentication failure
    client.onAuthFailure((message) => {
      console.log('Authentication failed:', message);
    });
  })
  .catch((error) => {
    console.error('Error creating WhatsApp session:', error);
  });

// API route to fetch the QR code
app.get('/qr', (req, res) => {
  if (!qrCodeBase64) {
    return res.status(404).send('QR code not yet available');
  }

  // Remove the data:image/png;base64, prefix and convert the base64 string to binary
  const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Set the content type to image/png
  res.set('Content-Type', 'image/png');
  res.send(imageBuffer);
});

// API route to send a message
app.post('/send-message', (req, res) => {
  let { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ message: 'Phone and message are required' });
  }

  // Ensure the phone number includes @c.us
  if (!phone.endsWith('@c.us')) {
    phone += '@c.us';
  }

  // Send message using the venom bot
  client.sendText(phone, message)
    .then((result) => {
      console.log("Message sent successfully:", result);
      res.json({ message: 'Message sent successfully', result });
    })
    .catch((error) => {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message', error });
    });
});

// Serve the Express app
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
