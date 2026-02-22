const { getDb } = require('./utils/db');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { admin_email, target_email } = JSON.parse(event.body);
        const systemAdminEmail = process.env.ADMIN_GMAIL;

        if (!systemAdminEmail || admin_email.toLowerCase() !== systemAdminEmail.toLowerCase()) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized.' }) };
        }

        if (!target_email) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Target email is required' }) };
        }

        if (target_email.toLowerCase() === systemAdminEmail.toLowerCase()) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Cannot delete the admin account.' }) };
        }

        const db = await getDb();
        const collection = db.collection('monitors');

        const result = await collection.deleteMany({ user_email: target_email });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Account for ${target_email} deleted. Removed ${result.deletedCount} monitors.` }),
        };
    } catch (error) {
        console.error('Error deleting account:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
