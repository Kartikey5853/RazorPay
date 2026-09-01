import os
import json

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field
from typing import List


# ============================================================
# SETUP
# ============================================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")

client = genai.Client(api_key=API_KEY)

MODEL = "gemini-3.5-flash-lite"


# ============================================================
# CONFIG SCHEMA
# ============================================================

class AgentConfig(BaseModel):

    objective: str

    target_person: str

    required_information: List[str]

    qualification_criteria: List[str]

    conversation_rules: List[str]

    disqualification_conditions: List[str]

    call_end_conditions: List[str]

    follow_up: List[str]


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are helping a business owner configure an AI calling agent.

Your job is to understand what the owner wants the calling agent
to accomplish.

The owner may describe their requirements in messy, incomplete,
natural language.

During the setup conversation:

- Ask useful clarifying questions.
- Ask one or two questions at a time.
- Identify missing information.
- Identify constraints.
- Identify qualification requirements.
- Identify what the agent should collect.
- Identify what should cause the agent to end the call.
- Identify what should happen after the call.
- Point out contradictions if they appear.

Do not generate JSON during the normal conversation.

Do not invent requirements.

Do not assume information that the owner did not provide.

Keep the conversation concise and practical.
"""


# ============================================================
# CHAT
# ============================================================

chat = client.chats.create(
    model=MODEL,

    config={
        "system_instruction": SYSTEM_PROMPT
    }
)


# ============================================================
# DISPLAY
# ============================================================

print()
print("============================================")
print("       AGENT CONFIGURATION CHAT")
print("============================================")
print()
print("Tell me what you want your calling agent to do.")
print()
print("Commands:")
print("  /done  → finish configuration")
print("  /quit  → exit without saving")
print()
print("============================================")
print()


# ============================================================
# SETUP CONVERSATION
# ============================================================

while True:

    user_input = input("YOU: ").strip()

    if not user_input:
        continue


    # --------------------------------------------------------
    # QUIT
    # --------------------------------------------------------

    if user_input.lower() == "/quit":

        print()
        print("Configuration cancelled.")
        break


    # --------------------------------------------------------
    # DONE
    # --------------------------------------------------------

    if user_input.lower() == "/done":

        print()
        print("============================================")
        print("Generating configuration...")
        print("============================================")
        print()

        break


    # --------------------------------------------------------
    # NORMAL MESSAGE
    # --------------------------------------------------------

    response = chat.send_message(
        user_input
    )

    print()
    print("GEMINI:")
    print(response.text)
    print()


# ============================================================
# GENERATE FINAL CONFIG
# ============================================================

if user_input.lower() == "/done":

    history = chat.get_history()

    conversation_text = ""

    for message in history:

        if not message.parts:
            continue

        text_parts = []

        for part in message.parts:

            if part.text:
                text_parts.append(part.text)

        if not text_parts:
            continue

        text = " ".join(text_parts)

        conversation_text += (
            f"{message.role.upper()}: {text}\n"
        )


    final_prompt = f"""
Convert the following completed configuration conversation
into the final configuration for an AI calling agent.

IMPORTANT:

- Use ONLY requirements explicitly provided or agreed upon
  by the owner.
- Do not invent missing information.
- Do not add assumptions.
- Preserve the owner's actual intent.
- If something was explicitly rejected, do not include it.
- This is the final configuration that another AI will use
  during actual phone calls.

Return the configuration using the required schema.

CONFIGURATION CONVERSATION:

{conversation_text}
"""


    response = client.models.generate_content(

        model=MODEL,

        contents=final_prompt,

        config={
            "response_mime_type": "application/json",
            "response_schema": AgentConfig,
        }

    )


    config = response.parsed


    if config is None:

        raise RuntimeError(
            "Gemini failed to produce a structured configuration."
        )


    # ========================================================
    # SHOW CONFIG
    # ========================================================

    print()
    print("============================================")
    print("          GENERATED CONFIGURATION")
    print("============================================")
    print()

    print(
        config.model_dump_json(
            indent=2
        )
    )


    # ========================================================
    # APPROVAL
    # ========================================================

    print()
    print("============================================")
    print("Is this configuration correct?")
    print("Type YES to save.")
    print("Type NO to return to setup.")
    print("============================================")
    print()

    approval = input("YOU: ").strip().lower()


    if approval in [
        "yes",
        "y",
        "correct",
        "looks good"
    ]:

        with open(
            "agent_config.json",
            "w",
            encoding="utf-8"
        ) as file:

            file.write(
                config.model_dump_json(
                    indent=2
                )
            )


        print()
        print("============================================")
        print("       CONFIGURATION SAVED")
        print("============================================")
        print()
        print("💾 agent_config.json")
        print()


    else:

        print()
        print("Configuration was not saved.")
        print()
        print("Run the setup again and make your changes.")
        print()