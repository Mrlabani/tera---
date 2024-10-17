const fetch = require('node-fetch');
const FormData = require('form-data');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
let lastUpdateId = 0;  // To track the last processed update

console.log("Starting bot with token:", TELEGRAM_BOT_TOKEN);

// Function to start polling Telegram API for updates
async function startPolling() {
  try {
    // Make a request to get updates (long polling)
    const updatesUrl = `${TELEGRAM_API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=60`;
    const response = await fetch(updatesUrl);
    const data = await response.json();

    if (data.ok) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;  // Update the last processed message ID
        const chatId = update.message?.chat.id;
        const text = update.message?.text;

        if (chatId && text) {
          console.log('Received message:', text);
          // Handle TeraBox URL
          if (text.includes('terabox')) {
            await sendTelegramMessage(chatId, "Processing your request, please wait...");
            await handleTeraBoxRequest(chatId, text);
          } else {
            // Send a prompt for an invalid message
            await sendTelegramMessage(chatId, "Please send a valid TeraBox link.");
          }
        }
      }
    } else {
      console.error('Failed to fetch updates:', data);
    }
  } catch (error) {
    console.error('Error in polling:', error);
  } finally {
    // Continue polling after a short delay
    setTimeout(startPolling, 1000);  // Poll again after 1 second
  }
}

// Handle the TeraBox URL and send the appropriate file
async function handleTeraBoxRequest(chatId, text) {
  try {
    const teraboxApiUrl = `https://terabox.mohanishx1.workers.dev/?url=${encodeURIComponent(text)}`;
    const teraboxResponse = await fetch(teraboxApiUrl);
    console.log('TeraBox response status:', teraboxResponse.status);

    if (teraboxResponse.ok) {
      const contentType = teraboxResponse.headers.get('content-type');
      const fileBuffer = await teraboxResponse.arrayBuffer();

      // Handle different file types (photo, video, or document)
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
}

// Send a message to Telegram
async function sendTelegramMessage(chatId, text) {
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text }),
    });
    const result = await response.json();
    console.log('Message sent:', result);
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
    const response = await fetch(`${TELEGRAM_API_URL}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    console.log('Document uploaded:', result);
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
    const response = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    console.log('Photo uploaded:', result);
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
    const response = await fetch(`${TELEGRAM_API_URL}/sendVideo`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    console.log('Video uploaded:', result);
  } catch (error) {
    console.error('Error uploading video:', error);
  }
}

// Start polling for messages
startPolling();
