const { MongoClient } = require('mongodb');
require('dotenv').config();

// Create a dummy monitor with login credentials to test extraction
async function createTestMonitor() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db('thewebspider');

    // We use a safe public test site that has a login form (e.g., Hacker News login or a test site)
    // Actually, just creating the document. The scraper will try it. 
    // If it fails login it won't crash, but let's use a dummy URL that just loads so we can grab some generic cookies.
    await db.collection('monitors').insertOne({
        url: 'https://example.com',
        user_email: 'test@example.com',
        deep_crawl: false,
        requires_login: True,
        username: 'testuser',
        password: 'testpassword',
        is_first_run: true
    });

    console.log("Created test monitor. Now run scraper.py");
    await client.close();
}

createTestMonitor().catch(console.error);
