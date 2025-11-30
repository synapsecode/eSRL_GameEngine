import subprocess
import sys
import requests
import json

AI_URL = "https://ai-proto.crezam.com/v1"

def start_http_server( port=8000):
    # Start server in the current script directory
    directory = './gamex'

    print(f"Starting HTTP server in: {directory} (port {port})")

    process = subprocess.Popen([
        sys.executable,        # same python that runs this script
        "-m", "http.server",
        str(port)
    ], cwd=directory)

    return process

def generate_response(payload, api_key):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    body = {
        "inputs": payload,
        "response_mode": "blocking",
        "user": "eSRL"
    }

    try:
        resp = requests.post(
            f"{AI_URL}/completion-messages",
            headers=headers,
            json=body,
        )

        # If server returned non-200, print body
        if not resp.ok:
            print("\n❌ API ERROR:", resp.status_code)
            print(resp.text)
            return None

        # Try parsing JSON safely
        try:
            data = resp.json()
        except:
            print("\n❌ NON-JSON RESPONSE:")
            print(resp.text)
            return None

        # Expected structure: {"answer": "..."}
        answer = data.get("answer")

        if not answer or not isinstance(answer, str):
            print("\n❌ Missing 'answer' in response")
            print(data)
            return None

        return answer.strip()

    except Exception as e:
        print("\n❌ REQUEST FAILED:", str(e))
        return None
