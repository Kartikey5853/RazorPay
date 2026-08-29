import os
from typing import List, Optional

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field


# ============================================================
# SETUP
# ============================================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")

client = genai.Client(api_key=API_KEY)


# ============================================================
# STRUCTURED OUTPUT SCHEMA
# ============================================================

class Question(BaseModel):
    question: str = Field(
        description="A meaningful business-related question asked by the contact."
    )

    answered: bool = Field(
        description="Whether the question was actually answered during the call."
    )

    answer: Optional[str] = Field(
        description="The answer given, or null if unanswered."
    )


class PersonInfo(BaseModel):
    skills: List[str] = Field(
        description="Explicitly stated skills, technologies, or capabilities."
    )

    experience: List[str] = Field(
        description="Explicitly stated previous experience or projects."
    )

    interests: List[str] = Field(
        description="Explicitly stated work interests or preferences."
    )

    availability: Optional[str] = Field(
        description="Explicitly stated availability, or null if not provided."
    )

    compensation: Optional[str] = Field(
        description="Compensation information explicitly stated by the contact, or null."
    )


class CallResult(BaseModel):

    call_outcome: str = Field(
        description=(
            "Overall business outcome. Use one of: "
            "interested, not_interested, needs_follow_up, "
            "qualified, unqualified, completed."
        )
    )

    summary: List[str] = Field(
        description="Exactly 5 or 6 concise bullet points summarizing the call."
    )

    information_collected: PersonInfo

    questions_from_contact: List[Question] = Field(
        description=(
            "Meaningful business questions asked by the contact. "
            "Do not include conversational filler such as "
            "'Are we done?'"
        )
    )

    unanswered: List[str] = Field(
        description=(
            "Important business questions or requests from the contact "
            "that remained unanswered."
        )
    )

    next_action: Optional[str] = Field(
        description="The most appropriate next action for the business."
    )


# ============================================================
# TRANSCRIPT
# ============================================================

transcript = """
MARCUS:
Hi, I'm Marcus, an AI assistant calling on behalf of my employer.
We're looking for a software engineer for some upcoming web
development work, and I wanted to see if you'd be interested.

CANDIDATE:
Yes, I am a programmer. What's up?

MARCUS:
Great. I'd like to ask a few quick questions about your experience.
To start, what programming languages do you use?

CANDIDATE:
I usually just work in Python and JavaScript. Oh, why?

MARCUS:
We're asking about languages to get a sense of your skillset.
What kinds of websites or web applications do you build with
Python and JavaScript?

CANDIDATE:
If I don't really want to share that, can you tell me what type
of websites you're planning to build and I'll tell you if I can
do that or not.

MARCUS:
Right now, we're looking for someone who can handle both the
frontend and backend of web applications, primarily with a focus
on building functional business tools and content management
systems. Does that align with the kinds of projects you have
experience with?

CANDIDATE:
Yeah, I have built projects that have both frontend and backend
working and deployed. But what exactly is the project?

MARCUS:
Unfortunately, I don't have specific information about the
individual project requirements right now. My main goal is just
to get an overview of your skills.

CANDIDATE:
I'm more into backend work.

MARCUS:
What kind of projects do you typically enjoy working on?

CANDIDATE:
Currently I am open for work. Give me any project or problem and
I'll try to come up with a solution. I don't really have a
particular domain I'm interested in. I've worked in many domains.

CANDIDATE:
Actually, what is the pay? How much are you going to pay me?

MARCUS:
Unfortunately, I don't have specific information about the pay
range or compensation package right now. That's something my
employer would discuss with you directly if they proceed.

CANDIDATE:
Okay, are we done?

MARCUS:
Yes, I think so. Thanks again for your time. We'll be in touch
if there are next steps.
"""


# ============================================================
# ANALYSIS PROMPT
# ============================================================

prompt = f"""
Analyze this completed business call.

The transcript contains two speakers:
- MARCUS = the AI/business representative
- CANDIDATE = the person being contacted

Your job is to create an accurate business record of the call.

STRICT EXTRACTION RULES:

1. Extract information ONLY when the candidate explicitly stated it.

2. Do not infer missing information.

3. If the candidate says something such as:
   "I have built projects that have both frontend and backend
   working and deployed"
   then that MUST appear in experience.

4. If the candidate says:
   "Currently I am open for work"
   then availability MUST be "currently open for work".

5. Separate candidate information from information spoken by Marcus.

6. Capture meaningful questions asked by the candidate.

7. Do NOT classify conversational filler as a business question.
   For example:
   "Okay, are we done?"
   should NOT appear in questions_from_contact.

8. If a candidate asks something and Marcus does not have the
   information, mark that question as unanswered.

9. The call outcome should describe the business result, not merely
   say "Completed".

10. The summary MUST contain exactly 5 or 6 bullets.

11. The summary must prioritize:
    - candidate capabilities
    - experience
    - preferences
    - availability
    - concerns/questions
    - required follow-up

12. Do not invent company information, project details, salary,
    deadlines, or other facts.

TRANSCRIPT:

{transcript}
"""


# ============================================================
# GEMINI
# ============================================================

response = client.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents=prompt,
    config={
        "response_mime_type": "application/json",
        "response_schema": CallResult,
    },
)


# ============================================================
# PARSE STRUCTURED RESULT
# ============================================================

result = response.parsed

if result is None:
    raise RuntimeError(
        "Gemini did not return a parsed structured result."
    )


# ============================================================
# DISPLAY
# ============================================================

print()
print("============================================")
print("CALL SUMMARY")
print("============================================")
print()

for bullet in result.summary:
    print(f"• {bullet}")


print()
print("============================================")
print("STRUCTURED JSON")
print("============================================")
print()

print(
    result.model_dump_json(
        indent=2
    )
)