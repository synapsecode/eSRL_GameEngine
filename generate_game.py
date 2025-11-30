import subprocess
import sys
from dotenv import load_dotenv
import os

from utils import generate_response, start_http_server

load_dotenv()

TEXT2GAME_KEY = os.environ.get('TEXT2GAME_KEY')
GAME_CARTRIDGE_CREATOR = os.environ.get('GAME_CARTRIDGE_CREATOR')
INSTRUCTION_GEN = os.environ.get('INSTRUCTION_GEN')

# -----------------------------
# CLEANUP CARTRIDGE FUNCTION
# -----------------------------
def cleanup_cartridge(text):
    return text
    # print("DXXX ===> ", text)
    # if not isinstance(text, str):
    #     return ""

    # parts = text.split("```")
    # if len(parts) < 3:
    #     return ""

    # return parts[1].strip()


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

print(game_design)
# ----------------------------------
# STEP 2 — Generate Cartridge Code
# ----------------------------------
print("\n--- GENERATING CARTRIDGE ---")
cartridge_raw = generate_response(
    payload={"query": game_design},
    api_key=GAME_CARTRIDGE_CREATOR
)


print("C",cartridge_raw)

if not cartridge_raw:
    print("❌ STEP 2 FAILED — EXITING")
    exit()

cartridge_code = cleanup_cartridge(cartridge_raw).replace('javascript','')

print("XC",cartridge_code)

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