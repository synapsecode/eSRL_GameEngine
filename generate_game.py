import subprocess
import sys
from dotenv import load_dotenv
import os
import requests
import json

load_dotenv()

TEXT2GAME_KEY = os.environ.get('TEXT2GAME_KEY')
GAME_CARTRIDGE_CREATOR = os.environ.get('GAME_CARTRIDGE_CREATOR')
INSTRUCTION_GEN = os.environ.get('INSTRUCTION_GEN')

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

# -----------------------------
# REQUEST WRAPPER
# -----------------------------
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


# -----------------------------
# CLEANUP CARTRIDGE FUNCTION
# -----------------------------
def cleanup_cartridge(text):
    if not isinstance(text, str):
        return ""

    parts = text.split("```")
    if len(parts) < 3:
        return ""

    return parts[1].strip()


# -----------------------------
# PIPELINE EXECUTION
# -----------------------------
with open("textbook.txt", "r") as f:
    textbook_data = f.read()


# ----------------------------------
# STEP 1 — Generate Game Design
# ----------------------------------
print("\n--- GENERATING GAME DESIGN ---")
game_design = generate_response(
    payload={"query": textbook_data},
    api_key=TEXT2GAME_KEY
)

if not game_design:
    print("❌ STEP 1 FAILED — EXITING")
    exit()


# ----------------------------------
# STEP 2 — Generate Cartridge Code
# ----------------------------------
print("\n--- GENERATING CARTRIDGE ---")
cartridge_raw = generate_response(
    payload={"query": game_design},
    api_key=GAME_CARTRIDGE_CREATOR
)

if not cartridge_raw:
    print("❌ STEP 2 FAILED — EXITING")
    exit()

cartridge_code = cleanup_cartridge(cartridge_raw).replace('javascript','')

if not cartridge_code:
    print("❌ EMPTY CLEANED CARTRIDGE — EXITING")
    exit()


# ----------------------------------
# STEP 3 — Generate Instructions
# ----------------------------------
print("\n--- GENERATING INSTRUCTIONS ---")
instructions = generate_response(
    payload={
        "CARTRIDGE_CODE": cartridge_code,
        "GAME_DESIGN": game_design
    },
    api_key=INSTRUCTION_GEN
)

if not instructions:
    print("❌ STEP 3 FAILED — EXITING")
    exit()


# ----------------------------------
# WRITE CARTRIDGE FILE
# ----------------------------------
with open("./gamex/cartridges/cartridge.js", "w") as f:
    f.write(cartridge_code)

print("\n===============================")
print("✅ Cartridge written successfully!")
print("✅ Instructions generated successfully!")
print("===============================")

print("\n📘 INSTRUCTIONS:")

with open('instructions.txt', 'w') as f:
    f.write(instructions)

start_http_server()