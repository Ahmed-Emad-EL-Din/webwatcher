const { getDb } = require('./utils/db');
const { ObjectId } = require('mongodb');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { id, email } = event.queryStringParameters;

    if (!id || !email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'ID and email parameters are required' }) };
    }

    try {
        const db = await getDb();
        const collection = db.collection('monitors');

        // Ensure the monitor belongs to the user
        const result = await collection.deleteOne({
            _id: new ObjectId(id),
            user_email: email
        });

        if (result.deletedCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Monitor not found or unauthorized' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Monitor deleted successfully' }),
        };
    } catch (error) {
        console.error('Error deleting monitor:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
