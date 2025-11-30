import subprocess
import sys
from dotenv import load_dotenv
import requests
import json
import os

load_dotenv()

GEMINI_API_KEY=os.environ.get('GEMINI_API_KEY')
OPENAI_KEY=os.environ.get('OPENAI_KEY')


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

def generate_response_gemini(payload, api_key):
    headers = {
        "Content-Type": "application/json"
    }

    body = {
        "contents": [
            {"parts": [{"text": payload}]}
        ]
    }

    MODEL="gemini-2.0-flash"
    GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={api_key}",
            headers=headers,
            json=body
        )

        if not resp.ok:
            print("\n❌ API ERROR:", resp.status_code)
            print(resp.text)
            return None

        data = resp.json()

        # Navigate Gemini structure safely
        try:
            answer = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            print("\n❌ Unexpected response format:")
            print(data)
            return None

        return answer.strip()

    except Exception as e:
        print("\n❌ Request failed:", str(e))
        return None

    except Exception as e:
        print("\n❌ REQUEST FAILED:", str(e))
        return None

def generate_response_chatgpt(payload, api_key):
    url = "https://api.openai.com/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    body = {
        "model": "gpt-5.1",   # Change to whatever model you want
        "messages": [
            {"role": "user", "content": payload}
        ]
    }

    try:
        resp = requests.post(url, headers=headers, json=body)

        if not resp.ok:
            print("\n❌ API ERROR:", resp.status_code)
            print(resp.text)
            return None

        data = resp.json()

        try:
            answer = data["choices"][0]["message"]["content"]
        except Exception:
            print("\n❌ Unexpected response format:")
            print(data)
            return None

        return answer.strip()

    except Exception as e:
        print("\n❌ Request failed:", str(e))
        return None

def generate_response(content):
    # return generate_response_gemini(content, GEMINI_API_KEY)
    return generate_response_chatgpt(content, OPENAI_KEY)

def game_des_gen_call(content):
    with open('gamedes.txt', 'r') as f:
        sysprompt = f.read()
    return generate_response(f"{sysprompt}\n\nContent:{content}")

def cartridge_gen(content):
    with open('cartridge_gen.txt', 'r') as f:
        sysprompt = f.read()
    return generate_response(f"{sysprompt}\n\nContent:{content}")


if __name__ == '__main__':
    start_http_server()