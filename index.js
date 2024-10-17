const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

app.post('/webhook', async (req, res) => {
  const body = req.body;
  const chatId = body.message?.chat.id;
  const text = body.message?.text;

  if (!chatId || !text) {
    return res.status(400).send('Invalid data');
  }

  if (text.includes('terabox')) {
    await sendTelegramMessage(chatId, "Processing your request, please wait...");

    try {
      const teraboxApiUrl = `https://terabox.mohanishx1.workers.dev/?url=${encodeURIComponent(text)}`;
      const teraboxResponse = await fetch(teraboxApiUrl);

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
      await sendTelegramMessage(chatId, `An error occurred: ${error.message}`);
    }
  } else {
    await sendTelegramMessage(chatId, "Please send a valid TeraBox link.");
  }

  res.send('OK');
});

// Send a message to Telegram
async function sendTelegramMessage(chatId, text) {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(TELEGRAM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  });
}

// Upload a document to Telegram
async function uploadDocumentToTelegram(chatId, fileBuffer, contentType) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', Buffer.from(fileBuffer), { contentType, filename: 'file.bin' });

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: formData,
  });
}

// Upload a photo to Telegram
async function uploadPhotoToTelegram(chatId, fileBuffer) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', Buffer.from(fileBuffer), { filename: 'photo.jpg' });

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });
}

// Upload a video to Telegram
async function uploadVideoToTelegram(chatId, fileBuffer) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('video', Buffer.from(fileBuffer), { filename: 'video.mp4' });

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
    method: 'POST',
    body: formData,
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
