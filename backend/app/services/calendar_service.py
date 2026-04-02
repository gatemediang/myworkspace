import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime, timedelta

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_calendar_service():
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    try:
        if creds_json:
            info = json.loads(creds_json)
            creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        else:
            creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "/app/google-credentials.json")
            if not os.path.exists(creds_path):
                print(f"[CALENDAR] Credentials not found at {creds_path}")
                return None
            creds = service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f"[CALENDAR] Auth error: {e}")
        return None

def create_calendar_event(name: str, email: str, date_str: str, time_str: str, message: str = "") -> str | None:
    """Create a blocked event on Google Calendar. Returns event URL or None."""
    service = get_calendar_service()
    if not service:
        return None
    calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "tunjiologun@gmail.com")
    try:
        # Parse date and time
        time_str = time_str or "09:00"
        start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)

        event = {
            'summary': f"📅 Appointment with {name}",
            'description': f"Client: {name}\nEmail: {email}\nMessage: {message}\n\nBooked via MyWorkSpace chatbot/contact form.",
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Europe/London'},
            'end':   {'dateTime': end_dt.isoformat(),   'timeZone': 'Europe/London'},
            'attendees': [{'email': email}],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email',  'minutes': 24 * 60},
                    {'method': 'popup',  'minutes': 60},
                ],
            },
        }
        result = service.events().insert(calendarId=calendar_id, body=event, sendUpdates='all').execute()
        print(f"[CALENDAR] Event created: {result.get('htmlLink')}")
        return result.get('htmlLink')
    except Exception as e:
        print(f"[CALENDAR] Error creating event: {e}")
        return None

def block_slot(date_str: str, time_str: str, label: str = "Blocked"):
    """Block a time slot so it shows as busy."""
    service = get_calendar_service()
    if not service:
        return
    calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "tunjiologun@gmail.com")
    try:
        time_str = time_str or "09:00"
        start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)
        event = {
            'summary': label,
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Europe/London'},
            'end':   {'dateTime': end_dt.isoformat(),   'timeZone': 'Europe/London'},
            'status': 'confirmed',
            'transparency': 'opaque',
        }
        service.events().insert(calendarId=calendar_id, body=event).execute()
    except Exception as e:
        print(f"[CALENDAR] Block slot error: {e}")
