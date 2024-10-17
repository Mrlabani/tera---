require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// Replace with your Cloudflare Worker TeraBox API URL
const TERABOX_API_URL = 'https://terabox.mohanishx1.workers.dev/?url=';

// Initialize the bot using the token from .env
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Use webhooks instead of polling
bot.start((ctx) => {
    ctx.reply("Hi! Send me a TeraBox link, and I'll download the file for you.");
});

// Handle TeraBox links
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    if (userMessage.includes('terabox')) {
        ctx.reply('Processing your request, please wait...');
        try {
            const teraboxUrl = `${TERABOX_API_URL}${encodeURIComponent(userMessage)}`;
            const response = await fetch(teraboxUrl);

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                const fileBuffer = await response.arrayBuffer();

                if (contentType.includes('image')) {
                    await ctx.replyWithPhoto({ source: Buffer.from(fileBuffer) });
                } else if (contentType.includes('video')) {
                    await ctx.replyWithVideo({ source: Buffer.from(fileBuffer) });
                } else {
                    await ctx.replyWithDocument({ source: Buffer.from(fileBuffer), filename: 'file.bin' });
                }
                ctx.reply('File uploaded successfully!');
            } else {
                ctx.reply(`Failed to download the file from TeraBox. Status code: ${response.status}`);
            }
        } catch (error) {
            ctx.reply(`An error occurred: ${error.message}`);
        }
    } else {
        ctx.reply('Please send a valid TeraBox link.');
    }
});

// Set webhook
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);  // Pass the update from Vercel to the bot
        } catch (err) {
            console.error('Error handling update:', err);
        }
        res.status(200).send('OK');
    } else {
        res.status(404).send('Not Found');
    }
};
