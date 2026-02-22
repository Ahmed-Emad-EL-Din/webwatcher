import requests
import os
from dotenv import load_dotenv

load_dotenv()

NETLIFY_URL = os.getenv("NETLIFY_URL", "http://localhost:8888").strip()
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "").strip()

def test_notify():
    notify_url = f"{NETLIFY_URL}/.netlify/functions/notify"
    headers = {
        "Content-Type": "application/json"
    }
    if WEBHOOK_SECRET:
        headers["Authorization"] = f"Bearer {WEBHOOK_SECRET}"

    print(f"Sending to: {notify_url}")

    payload = {
        "monitor": {
            "url": "https://example.com/scraper-test",
            "user_email": "test@example.com",
            "email_notifications_enabled": False,
            "telegram_notifications_enabled": True,
            "telegram_chat_id": "8571384404" # Use an invalid ID just to see if Telegram rejects it, or your real one if you know it
        },
        "summary": "This is a test summary from Python scraper simulation."
    }

    try:
        response = requests.post(notify_url, json=payload, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_notify()
