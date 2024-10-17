from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')  # Set your bot token as an environment variable

@app.route('/webhook', methods=['POST'])
def webhook():
    body = request.get_json()
    chat_id = body.get('message', {}).get('chat', {}).get('id')
    text = body.get('message', {}).get('text')

    if not chat_id or not text:
        return jsonify({'status': 'Invalid data'}), 400

    if 'terabox' in text:
        send_telegram_message(chat_id, "Processing your request, please wait...")

        try:
            terabox_api_url = f"https://terabox.mohanishx1.workers.dev/?url={requests.utils.quote(text)}"
            terabox_response = requests.get(terabox_api_url)

            if terabox_response.ok:
                content_type = terabox_response.headers.get('Content-Type')
                file_buffer = terabox_response.content

                # Handle different file types
                if 'image' in content_type:
                    upload_photo_to_telegram(chat_id, file_buffer)
                elif 'video' in content_type:
                    upload_video_to_telegram(chat_id, file_buffer)
                else:
                    upload_document_to_telegram(chat_id, file_buffer, content_type)

                send_telegram_message(chat_id, "File uploaded successfully!")
            else:
                send_telegram_message(chat_id, f"Failed to fetch the file from TeraBox. Status code: {terabox_response.status_code}")

        except Exception as error:
            send_telegram_message(chat_id, f"An error occurred: {str(error)}")

    else:
        send_telegram_message(chat_id, "Please send a valid TeraBox link.")

    return jsonify({'status': 'OK'}), 200

def send_telegram_message(chat_id, text):
    telegram_api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    requests.post(telegram_api_url, json={'chat_id': chat_id, 'text': text})

def upload_document_to_telegram(chat_id, file_buffer, content_type):
    files = {'document': (f'file.bin', file_buffer, content_type)}
    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument",
                  data={'chat_id': chat_id}, files=files)

def upload_photo_to_telegram(chat_id, file_buffer):
    files = {'photo': ('photo.jpg', file_buffer, 'image/jpeg')}
    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                  data={'chat_id': chat_id}, files=files)

def upload_video_to_telegram(chat_id, file_buffer):
    files = {'video': ('video.mp4', file_buffer, 'video/mp4')}
    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendVideo",
                  data={'chat_id': chat_id}, files=files)

if __name__ == '__main__':
    app.run(port=5000)
