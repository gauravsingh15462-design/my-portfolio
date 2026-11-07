import logging
import html
import json
import os
import threading
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path
from time import monotonic

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
)


app = FastAPI(title="Gaurav Singh Portfolio API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

PROFILE_PATH = Path(__file__).parent / "data" / "profile.json"
load_dotenv(Path(__file__).parent / ".env")
logger = logging.getLogger(__name__)
INK = colors.HexColor("#17211c")
MUTED = colors.HexColor("#5c6b61")
ACCENT = colors.HexColor("#668034")
CONTACT_WINDOW_SECONDS = 600
CONTACT_MAX_SUBMISSIONS = 3
PUBLIC_EMAIL_PLACEHOLDER = "your.email@example.com"
contact_submissions: dict[str, list[float]] = {}
contact_submissions_lock = threading.Lock()


class ChatQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=400)


class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=100, pattern=r"^[^\r\n]+$")
    email: EmailStr
    message: str = Field(min_length=10, max_length=3000)

    @field_validator("name", "message")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


def load_profile() -> dict:
    try:
        with PROFILE_PATH.open(encoding="utf-8") as profile_file:
            return json.load(profile_file)
    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=500, detail="Unable to load portfolio profile"
        ) from error


def safe_text(value: str) -> str:
    return html.escape(value, quote=True)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/profile")
def get_profile() -> dict:
    profile = load_profile()
    profile["email"] = PUBLIC_EMAIL_PLACEHOLDER
    profile["socials"] = {"linkedin": ""}
    return profile


def check_contact_rate_limit(client_host: str) -> None:
    now = monotonic()
    with contact_submissions_lock:
        attempts = [
            timestamp
            for timestamp in contact_submissions.get(client_host, [])
            if now - timestamp < CONTACT_WINDOW_SECONDS
        ]
        if len(attempts) >= CONTACT_MAX_SUBMISSIONS:
            raise HTTPException(
                status_code=429,
                detail="Too many messages were sent. Please wait a few minutes and try again.",
            )
        attempts.append(now)
        contact_submissions[client_host] = attempts


@app.post("/api/contact")
def send_contact_message(message: ContactMessage, request: Request) -> dict[str, str]:
    profile = load_profile()
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Email sending is not configured yet. Add RESEND_API_KEY.",
        )

    client_host = request.client.host if request.client else "unknown"
    check_contact_rate_limit(client_host)

    payload = json.dumps(
        {
            "from": "Portfolio <onboarding@resend.dev>",
            "to": [profile["email"]],
            "reply_to": str(message.email),
            "subject": f"New portfolio message from {message.name}",
            "text": (
                f"New message from the portfolio contact form.\n\n"
                f"Name: {message.name}\n"
                f"Email: {message.email}\n\n"
                f"{message.message}\n"
            ),
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "portfolio-backend/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            response.read()
    except (urllib.error.URLError, OSError):
        logger.exception("Unable to deliver portfolio contact message")
        raise HTTPException(
            status_code=502,
            detail="Your message could not be delivered. Please try again later.",
        ) from None

    return {"message": "Thanks—your message has been sent. I’ll reply by email."}


@app.post("/api/chat")
def chat_about_profile(message: ChatQuestion) -> dict[str, str]:
    question = message.question.strip().casefold()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be blank")

    profile = load_profile()
    journey = profile["journey"]
    projects = profile["projects"] + profile.get("projectRooms", [])
    matched_project = next(
        (
            project
            for project in sorted(projects, key=lambda item: len(item["name"]), reverse=True)
            if project["name"].casefold() in question
            or any(
                alias.casefold() in question
                for alias in project.get("aliases", [])
            )
            or (
                project.get("marker")
                and project["marker"].casefold() in question
            )
        ),
        None,
    )

    if matched_project:
        details = matched_project.get("technologies", matched_project.get("chips", []))
        status = matched_project.get("status")
        project_name = matched_project["name"]
        if status:
            project_name += f" ({status})"
        answer = (
            f"{project_name}: "
            f"{matched_project['description']} "
            f"Listed details: {', '.join(details)}."
        )
    elif any(word in question for word in ("hello", "hi ", "hey", "namaste")):
        answer = (
            f"Hi! I can answer questions using {profile['name']}'s published "
            "portfolio. Ask me about his background, education, skills, projects, "
            "Smart India Hackathon participation, or how to get in touch."
        )
    elif any(word in question for word in ("hackathon", "smart india", "sih")):
        item = next(
            (entry for entry in journey if "hackathon" in entry["title"].casefold()),
            None,
        )
        answer = (
            "Gaurav participated in Smart India Hackathon. The portfolio does not "
            "currently list the year, team, problem statement, or result."
            if item
            else "Smart India Hackathon participation is not listed in the published profile."
        )
    elif any(word in question for word in ("project", "work", "built", "build")):
        answer = "Gaurav's listed projects are " + "; ".join(
            f"{project['name']}"
            + (f" — {project['status']}" if project.get("status") else "")
            + f" — {project['description']}"
            for project in projects
        )
    elif any(
        word in question
        for word in ("skill", "technology", "technologies", "know", "language", "course", "certificate")
    ):
        answer = (
            f"{profile['skillsIntro']} Current skills and learning areas: "
            f"{', '.join(profile['skills'])}."
        )
    elif any(word in question for word in ("study", "education", "college", "school", "jee")):
        answer = " ".join(
            f"{entry['title']}: {entry['description']}"
            for entry in journey
            if any(
                term in f"{entry['title']} {entry['description']}".casefold()
                for term in ("b.tech", "school", "jee", "dsa")
            )
        )
    elif any(
        word in question
        for word in ("contact", "email", "linkedin", "github", "social", "reach")
    ):
        answer = (
            "Use the contact form on the portfolio to reach Gaurav. "
            "Email and social links will be added when confirmed."
        )
    elif any(
        word in question
        for word in (
            "who",
            "about",
            "gaurav",
            "yourself",
            "location",
            "where",
            "student",
            "study",
            "education",
            "college",
            "school",
            "jee",
            "career",
            "title",
            "role",
            "experience",
            "currently",
        )
    ):
        answer = (
            f"{profile['name']} is a {profile['title']} based in {profile['location']}. "
            f"{profile['about']}"
        )
    else:
        answer = (
            "I can only answer from Gaurav's published portfolio details, and I "
            "don't have that information. Try asking about his education, skills, "
            "projects, Smart India Hackathon participation, or contact links."
        )

    return {"answer": answer}


@app.get("/api/cv")
def download_cv() -> Response:
    profile = load_profile()
    stream = BytesIO()
    document = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=19 * mm,
        leftMargin=19 * mm,
        topMargin=17 * mm,
        bottomMargin=17 * mm,
        title=f"{profile['name']} - CV",
        author=profile["name"],
    )
    base = getSampleStyleSheet()
    styles = {
        "name": ParagraphStyle(
            "CVName",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=29,
            alignment=TA_LEFT,
            textColor=INK,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "CVSubtitle",
            parent=base["Normal"],
            fontSize=10,
            leading=15,
            textColor=MUTED,
            spaceAfter=6,
        ),
        "section": ParagraphStyle(
            "CVSection",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=ACCENT,
            spaceBefore=13,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "CVBody",
            parent=base["BodyText"],
            fontSize=9,
            leading=13,
            textColor=INK,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "CVSmall",
            parent=base["BodyText"],
            fontSize=8,
            leading=11,
            textColor=MUTED,
            spaceAfter=3,
        ),
    }

    story = [
        Paragraph(safe_text(profile["name"]), styles["name"]),
        Paragraph(
            f"{safe_text(profile['title'])} &nbsp;|&nbsp; "
            f"{safe_text(profile['location'])}",
            styles["subtitle"],
        ),
        Paragraph(
            f"Email: {safe_text(PUBLIC_EMAIL_PLACEHOLDER)} &nbsp;|&nbsp; "
            "LinkedIn: link to add",
            styles["small"],
        ),
    ]
    story.extend(
        [
            HRFlowable(width="100%", thickness=0.8, color=ACCENT, spaceBefore=8),
            Paragraph("PROFILE", styles["section"]),
            Paragraph(safe_text(profile["about"]), styles["body"]),
            Paragraph("EDUCATION & LEARNING", styles["section"]),
        ]
    )
    for item in profile["journey"]:
        story.append(
            Paragraph(
                f"<b>{safe_text(item['title'])}</b> "
                f"<font color='#668034'>— {safe_text(item['period'])}</font>",
                styles["body"],
            )
        )
        story.append(Paragraph(safe_text(item["description"]), styles["small"]))

    story.append(Paragraph("SKILLS", styles["section"]))
    story.append(Paragraph(safe_text("  •  ".join(profile["skills"])), styles["body"]))
    story.append(Paragraph("SELECTED PROJECTS", styles["section"]))
    for project in profile["projects"] + profile.get("projectRooms", []):
        project_status = project.get("status", "")
        status_label = f" ({safe_text(project_status)})" if project_status else ""
        story.append(
            Paragraph(
                f"<b>{safe_text(project['name'])}</b>{status_label} — "
                f"{safe_text(project['description'])}",
                styles["body"],
            )
        )
        technologies = project.get("technologies", project.get("chips", []))
        story.append(Paragraph(safe_text(", ".join(technologies)), styles["small"]))

    document.build(story)
    filename = f"{profile['name'].replace(' ', '-')}-CV.pdf"
    return Response(
        content=stream.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
