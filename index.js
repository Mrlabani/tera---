const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Debugging: Log environment variables to ensure they are set correctly
console.log("Starting app... TELEGRAM_BOT_TOKEN: ", TELEGRAM_BOT_TOKEN);

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('Incoming request:', JSON.stringify(body)); // Log request body for debugging

    const chatId = body.message?.chat.id;
    const text = body.message?.text;

    if (!chatId || !text) {
      console.log('Invalid request body:', body);
      return res.status(400).send('Invalid data');
    }

    if (text.includes('terabox')) {
      await sendTelegramMessage(chatId, "Processing your request, please wait...");

      try {
        const teraboxApiUrl = `https://terabox.mohanishx1.workers.dev/?url=${encodeURIComponent(text)}`;
        const teraboxResponse = await fetch(teraboxApiUrl);
        console.log('TeraBox response status:', teraboxResponse.status);

        if (teraboxResponse.ok) {
          const contentType = teraboxResponse.headers.get('content-type');
          const fileBuffer = await teraboxResponse.arrayBuffer();

          if (contentType.includes('image')) {
            await uploadPhotoToTelegram(chatId, fileBuffer);
          } else if (contentType.includes('video')) {
            await uploadVideoToTelegram(chatId, fileBuffer);
          } else {
            await uploadDocumentToTelegram(chatId, fileBuffer, contentType);
          }

          await sendTelegramMessage(chatId, "File uploaded successfully!");
        } else {
          await sendTelegramMessage(chatId, `Failed to fetch the file from TeraBox. Status code: ${teraboxResponse.status}`);
        }
      } catch (error) {
        console.error('Error fetching from TeraBox:', error);
        await sendTelegramMessage(chatId, `An error occurred: ${error.message}`);
      }
    } else {
      await sendTelegramMessage(chatId, "Please send a valid TeraBox link.");
    }

    res.send('OK');
  } catch (error) {
    console.error('Error in webhook handling:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Send a message to Telegram
async function sendTelegramMessage(chatId, text) {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text }),
    });
    console.log('Telegram API response:', await response.json());
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
  }
}

// Upload a document to Telegram
async function uploadDocumentToTelegram(chatId, fileBuffer, contentType) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', Buffer.from(fileBuffer), { contentType, filename: 'file.bin' });

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    console.log('Upload document response:', await response.json());
  } catch (error) {
    console.error('Error uploading document:', error);
  }
}

// Upload a photo to Telegram
async function uploadPhotoToTelegram(chatId, fileBuffer) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', Buffer.from(fileBuffer), { filename: 'photo.jpg' });

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    console.log('Upload photo response:', await response.json());
  } catch (error) {
    console.error('Error uploading photo:', error);
  }
}

// Upload a video to Telegram
async function uploadVideoToTelegram(chatId, fileBuffer) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('video', Buffer.from(fileBuffer), { filename: 'video.mp4' });

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
      method: 'POST',
      body: formData,
    });
    console.log('Upload video response:', await response.json());
  } catch (error) {
    console.error('Error uploading video:', error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
