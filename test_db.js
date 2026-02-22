const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMonitors() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db('thewebspider');

    const monitors = await db.collection('monitors').find({}).toArray();
    console.log(`Found ${monitors.length} total monitors.`);

    let hasIssues = false;
    for (const m of monitors) {
        if (m.telegram_notifications_enabled) {
            console.log(`- Monitor: ${m.url} | Email: ${m.user_email} | Chat ID: '${m.telegram_chat_id}'`);
            if (!m.telegram_chat_id || m.telegram_chat_id === '') {
                console.log(`  [!] WARNING: Telegram is enabled but Chat ID is empty!`);
                hasIssues = true;
            }
        } else {
            console.log(`- Monitor: ${m.url} | Telegram Notifications Disabled`);
        }
    }

    if (hasIssues) {
        console.log("\nCONCLUSION: You have monitors with Telegram enabled but no Chat ID saved. You must delete these monitors and recreate them now that the UI fix is in place, because they were created before the chat ID block existed.");
    } else {
        console.log("\nCONCLUSION: All monitors with Telegram enabled have a Chat ID saved correctly.");
    }

    await client.close();
}

checkMonitors().catch(console.error);
