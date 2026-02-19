const { getDb } = require('./utils/db');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { email } = event.queryStringParameters;

    if (!email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email parameter is required' }) };
    }

    try {
        const db = await getDb();
        const collection = db.collection('monitors');

        const monitors = await collection.find({ user_email: email }).toArray();

        return {
            statusCode: 200,
            body: JSON.stringify(monitors),
        };
    } catch (error) {
        console.error('Error fetching monitors:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
