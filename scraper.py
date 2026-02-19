import os
import json
import asyncio
import datetime
import requests
from pymongo import MongoClient
from playwright.async_api import async_playwright
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configuration
MONGO_URI = os.getenv("MONGO_URI")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Netlify URL for notifications
NETLIFY_URL = os.getenv("NETLIFY_URL", "http://localhost:8888") # Default for local dev

# AI Setup
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

async def trigger_notifications(monitor_doc, summary):
    notify_url = f"{NETLIFY_URL}/.netlify/functions/notify"
    payload = {
        "monitor": {
            "url": monitor_doc['url'],
            "user_email": monitor_doc['user_email'],
            "email_notifications_enabled": monitor_doc.get('email_notifications_enabled', False),
            "telegram_notifications_enabled": monitor_doc.get('telegram_notifications_enabled', False),
            "telegram_chat_id": monitor_doc.get('telegram_chat_id', '')
        },
        "summary": summary
    }

    try:
        response = requests.post(notify_url, json=payload, timeout=10)
        if response.status_code == 200:
            print(f"Notifications triggered for {monitor_doc['url']}")
        else:
            print(f"Failed to trigger notifications: {response.text}")
    except Exception as e:
        print(f"Error calling notification function: {e}")

async def summarize_changes(old_text, new_text):
    prompt = f"""
    Compare the following two versions of a webpage's text content and summarize the significant changes in 2-3 concise bullet points.
    If the changes are only minor (like timestamps or random numbers), state "No significant changes".
    
    OLD CONTENT:
    {old_text[:5000]}
    
    NEW CONTENT:
    {new_text[:5000]}
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Manual check required due to summarization error."

async def scrape_monitor(context, monitor_doc):
    url = monitor_doc['url']
    print(f"Processing: {url}")
    
    page = await context.new_page()
    
    try:
        # Handle Cookies/Captcha JSON
        if monitor_doc.get('has_captcha') and monitor_doc.get('captcha_json'):
            try:
                cookies = json.loads(monitor_doc['captcha_json'])
                await context.add_cookies(cookies)
                print(f"Injected {len(cookies)} cookies")
            except Exception as e:
                print(f"Error parsing cookies: {e}")

        # Navigate
        await page.goto(url, wait_until="networkidle", timeout=60000)

        # Handle Login
        if monitor_doc.get('requires_login'):
            try:
                user_input = await page.query_selector('input[type="text"], input[type="email"]')
                pass_input = await page.query_selector('input[type="password"]')
                
                if user_input and pass_input:
                    await user_input.fill(monitor_doc['username'])
                    await pass_input.fill(monitor_doc['password'])
                    await page.keyboard.press("Enter")
                    await page.wait_for_load_state("networkidle")
                    print("Attempted login submission")
            except Exception as e:
                print(f"Login automated step failed: {e}")

        # Extract Text
        content = await page.evaluate("() => document.body.innerText")
        clean_text = " ".join(content.split())
        
        return clean_text
    
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None
    finally:
        await page.close()

async def run_worker():
    client = MongoClient(MONGO_URI)
    db = client.get_database("webwatcher")
    monitors_col = db.monitors
    
    monitors = list(monitors_col.find({}))
    print(f"Found {len(monitors)} monitors to process")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
        
        for monitor in monitors:
            new_text = await scrape_monitor(context, monitor)
            
            if new_text is None:
                continue
            
            if monitor.get('is_first_run'):
                print(f"First run for {monitor['url']}. Saving base text.")
                monitors_col.update_one(
                    {"_id": monitor["_id"]},
                    {
                        "$set": {
                            "last_scraped_text": new_text,
                            "is_first_run": False,
                            "last_updated_timestamp": datetime.datetime.now()
                        }
                    }
                )
            else:
                old_text = monitor.get('last_scraped_text', '')
                
                if old_text != new_text:
                    print(f"Changes detected on {monitor['url']}")
                    summary = await summarize_changes(old_text, new_text)
                    
                    if "No significant changes" not in summary:
                        monitors_col.update_one(
                            {"_id": monitor["_id"]},
                            {
                                "$set": {
                                    "last_scraped_text": new_text,
                                    "latest_ai_summary": summary,
                                    "last_updated_timestamp": datetime.datetime.now()
                                }
                            }
                        )
                        
                        # Trigger notifications via Netlify
                        await trigger_notifications(monitor, summary)
                    else:
                        print("AI determined changes were not significant.")
                        monitors_col.update_one(
                            {"_id": monitor["_id"]},
                            {"$set": {"last_updated_timestamp": datetime.datetime.now()}}
                        )
                else:
                    print(f"No changes on {monitor['url']}")
                    monitors_col.update_one(
                        {"_id": monitor["_id"]},
                        {"$set": {"last_updated_timestamp": datetime.datetime.now()}}
                    )

        await browser.close()
    client.close()

if __name__ == "__main__":
    asyncio.run(run_worker())
