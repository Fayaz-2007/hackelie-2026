import time
import requests

_last_sent = {}
COOLDOWN_SECONDS = 300

def send_sms_alert(message: str, alert_type: str = "general") -> bool:
    now = time.time()
    if now - _last_sent.get(alert_type, 0) < COOLDOWN_SECONDS:
        return False
    try:
        resp = requests.post('https://textbelt.com/text', {
            'phone': '8838136070',
            'message': message,
            'key': 'textbelt',
        }, timeout=10)
        data = resp.json()
        if data.get('success'):
            _last_sent[alert_type] = now
            return True
        print(f"[sms_alert] failed: {data}")
        return False
    except requests.RequestException as e:
        print(f"[sms_alert] error: {e}")
        return False