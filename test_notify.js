require('dotenv').config();
const { handler } = require('./functions/notify.js');

// Mock fetch for the test since Node 18+ has native fetch but our local test script might need it if we aren't careful
if (!global.fetch) {
    global.fetch = require('node-fetch');
}

async function testNotify() {
    process.env.WEBHOOK_SECRET = 'test-secret';
    process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test-bot-token'; // replace dynamically if testing real bot

    console.log("Testing Telegram Notifications...");

    const event = {
        httpMethod: 'POST',
        headers: {
            authorization: 'Bearer test-secret'
        },
        body: JSON.stringify({
            monitor: {
                url: 'https://example.com',
                user_email: 'test@example.com',
                email_notifications_enabled: false,
                telegram_notifications_enabled: true,
                telegram_chat_id: '123456789'
            },
            summary: '- Test change 1\n- Test change 2'
        })
    };

    try {
        const response = await handler(event, {});
        console.log("Function Response:", response);
    } catch (e) {
        console.error("Error running test:", e);
    }
}

testNotify();
