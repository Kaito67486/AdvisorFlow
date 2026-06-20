# AdvisorFlow

AdvisorFlow is an AI-powered advisor workspace that helps financial advisors manage clients, prepare for meetings, create structured meeting summaries, track follow-up tasks, discover suitable partners, and manage referrals.

## Team

**Team Name:** Tonight Beat Tiger

| Name | Role |
|---|---|
| Chong Yong Shen | Team Leader |
| Ong Jia Jie | Team Member |
| Fang Jian Xun | Team Member |
| Rayment Choong Seng Tuck | Team Member |
| Leong Kai Wen | Team Member |

## Challenge and Approach

Financial advisors often manage client information across different places, such as meeting notes, calendars, emails, spreadsheets, and personal reminders. This makes it difficult to prepare for meetings, remember important client details, complete follow-up tasks, and find the right professional partner for a client.

The main challenge was not only storing information, but turning it into useful actions without removing the advisor’s control.

We designed AdvisorFlow around five key challenges.

### 1. Scattered client information

**Challenge:**
Client goals, risk profiles, meeting notes, tasks, and follow-up dates are often stored separately. Advisors may spend too much time searching for information before a meeting.

**Approach:**
We created a central Client Memory in PostgreSQL. Each client profile connects to their meetings, confirmed summaries, action items, follow-up tasks, and important background information.

This gives the advisor one place to understand the client’s current situation.

### 2. Time-consuming meeting documentation

**Challenge:**
Writing and organizing meeting notes manually takes time. Raw notes may also be incomplete or difficult to review later.

**Approach:**
AdvisorFlow allows the advisor to type notes or record a meeting with participant consent. The recording is temporarily sent for transcription and is discarded after the transcript is returned.

The AI then converts the raw notes into structured information:

* Meeting summary
* Client needs
* Action items
* Suggested next follow-up date
* Follow-up reason

The original notes are still saved, so the advisor can compare them with the generated result.

### 3. AI output may be inaccurate

**Challenge:**
AI can misunderstand meeting notes or generate information that was not actually discussed. Automatically saving AI output as final client information would create a trust and accuracy risk.

**Approach:**
We added a human-review workflow:

```text
Raw Notes
→ AI Summary
→ Advisor Review
→ Advisor Edit
→ Advisor Confirmation
→ Follow-up Tasks
```

The advisor can edit the summary, client needs, action items, and follow-up date. Follow-up tasks are only created after the advisor confirms the final result.

This makes AI an assistant instead of an automatic decision-maker.

### 4. Missed meetings and follow-ups

**Challenge:**
Advisors may forget an upcoming meeting, an overdue task, or an important high-priority client.

**Approach:**
We built a live dashboard using real PostgreSQL data.

The dashboard displays:

* Meetings for the selected date
* Pending follow-ups
* Overdue tasks
* High-priority clients
* Daily preparation priorities

The advisor can also add meetings, open client records, and complete tasks directly from the dashboard.

### 5. Finding suitable professional partners

**Challenge:**
Advisors may know many external partners, but it can be difficult to remember which partner is suitable for a specific client need.

**Approach:**
We created a Partner Directory where advisors can add and manage partners, specialties, service areas, contact information, response times, and matching keywords.

AdvisorFlow compares the client’s profile, goals, risk profile, confirmed meeting needs, and action items with active partners in the database.

The system provides:

* A recommended partner
* A match score
* Clear matching reasons
* Alternative partner options
* A suggested next step

The advisor makes the final decision and can create a referral draft.

### Technical approach

We separated AdvisorFlow into four main layers:

```text
Frontend
→ FastAPI Backend
→ PostgreSQL Database
→ OpenAI API
```

The frontend was built with HTML, CSS, and JavaScript. The backend uses FastAPI, Pydantic, and SQLAlchemy. Neon PostgreSQL stores the main application data, while the OpenAI API supports transcription, summaries, client briefs, and the dashboard assistant.

We also separated major backend features into different modules, including:

* Authentication
* Client management
* Meeting workflow
* Dashboard workflow
* AI provider
* Partner management
* Referral tracking

This structure makes the project easier to maintain and allows future features to be added without rebuilding the entire application.

### Final approach

Our final approach was to keep the product focused on one complete workflow:

```text
Understand the Client
→ Prepare for the Meeting
→ Record What Happened
→ Generate and Review the Summary
→ Create Follow-up Actions
→ Recommend a Suitable Partner
```

Instead of making AI replace the advisor, AdvisorFlow uses AI to organize information, reduce repetitive work, and help the advisor notice what requires attention.

The project was created for a hackathon based on the idea of improving advisor productivity, client attention, client memory, morning preparation, proactive follow-ups, and partnership ecosystem visibility.

---

## Overview

Financial advisors often manage client information across notes, calendars, emails, spreadsheets, and personal memory.

This can lead to:

- Missed follow-up actions
- Slow meeting preparation
- Incomplete client records
- Unstructured meeting notes
- Limited partner visibility
- Important information being difficult to find

AdvisorFlow brings these activities into one web application.

The main workflow is:

```text
Client Information
→ Meeting
→ Raw Notes or Audio Recording
→ AI Transcription
→ AI Summary
→ Advisor Review
→ Advisor Confirmation
→ Follow-up Tasks
→ Future Client Preparation
```

AdvisorFlow keeps the advisor in control. AI-generated information must be reviewed and confirmed before it creates follow-up tasks.

---

## Main Features

### 1. Secure Login and Logout

AdvisorFlow includes a database-backed advisor authentication system.

Features include:

- Hashed passwords
- JWT authentication
- HttpOnly authentication cookies
- Protected API routes
- Protected frontend pages
- Session expiration handling
- Login and logout pages
- Advisor ownership checks

The browser does not store the authentication token in `localStorage`.

---

### 2. Advisor Dashboard

The dashboard uses live PostgreSQL data.

It displays:

- Meetings for a selected date
- Pending follow-up tasks
- Overdue follow-ups
- High-priority clients
- Daily preparation priorities
- Client-related calendar events

The advisor can:

- Move to the previous or next date
- Select a specific date
- Add a meeting
- Open meeting details
- Open the related client
- Complete follow-up tasks
- Ask the AI assistant for help

---

### 3. AI Daily Assistant

The dashboard includes an AI assistant connected to AdvisorFlow data.

Example questions:

```text
What should I focus on today?
```

```text
Which follow-up should I complete first?
```

```text
Prepare me for my next client meeting.
```

```text
What information do we have about this client?
```

The assistant is limited to productivity and meeting preparation.

It should not provide financial, investment, legal, tax, or insurance advice.

---

### 4. Client Memory

Advisors can create and manage client profiles.

A client profile can contain:

- Full name
- Email
- Phone number
- Age
- Occupation
- Risk profile
- Financial goal
- Priority
- Status
- Last contact date
- Next follow-up date
- Meeting history
- Follow-up tasks

Available actions:

- Add client
- View client
- Edit client
- Delete client
- Search clients
- Generate an AI client brief

---

### 5. AI Client Brief

AdvisorFlow can generate a preparation brief using:

- Client profile information
- Confirmed meeting summaries
- Recorded client needs
- Previous action items
- Pending tasks
- Follow-up dates

The generated brief contains:

- Headline
- Current priorities
- Meeting preparation points
- Relevant client context
- Suggested next action

---

### 6. Meeting Recording

The meeting page supports browser audio recording.

The advisor must confirm that participants have agreed to the recording.

Supported audio formats may include:

- WebM
- MP4
- M4A
- MP3
- WAV

The audio workflow is:

```text
Record Audio
→ Send Temporary Audio to Backend
→ Transcribe Audio
→ Return Transcript
→ Discard Audio
```

The application does not need to permanently save the audio file.

---

### 7. AI Meeting Summary

The advisor can enter meeting notes manually or use an audio transcript.

AdvisorFlow saves the original meeting notes before generating the AI summary.

The AI can produce:

- Meeting summary
- Client needs
- Action items
- Suggested next follow-up date
- Follow-up reason

The advisor can:

- Review the summary
- Edit the summary
- Edit client needs
- Edit action items
- Change the follow-up date
- Save changes
- Confirm the final summary

---

### 8. Advisor Confirmation Workflow

AI-generated meeting information is not immediately treated as final.

The confirmation workflow is:

```text
AI Summary Generated
→ Advisor Reviews Output
→ Advisor Edits Output
→ Advisor Confirms Output
→ Follow-up Tasks Are Created
```

This reduces the risk of incorrect AI-generated information entering the client workflow.

---

### 9. Follow-up Tasks

Confirmed meeting action items can become follow-up tasks.

Tasks contain:

- Client
- Advisor
- Title
- Description
- Priority
- Status
- Source
- Due date

Tasks can be displayed on:

- Dashboard
- Client profile
- Daily schedule

The advisor can complete pending tasks from the dashboard.

---

### 10. Partner Directory

AdvisorFlow includes a database-backed partner directory.

Partner information includes:

- Partner name
- Partner type
- Specialty
- Best use case
- Description
- Contact person
- Email
- Phone
- Website
- Service area
- Matching keywords
- Response time
- Status

Available actions:

- Add partner
- Edit partner
- Delete partner
- Search partners
- Filter by specialty
- Filter by status

---

### 11. Client-Partner Matching

AdvisorFlow compares client needs with active partners.

The matching process can use:

- Client goal
- Client risk profile
- Client priority
- Confirmed meeting summaries
- Client needs
- Action items
- Additional advisor notes
- Partner specialty
- Partner description
- Partner keywords
- Partner response time

The result includes:

- Recommended partner
- Match score
- Matching reasons
- Alternative partners
- Suggested next step

The matching result is explainable so the advisor can understand why a partner was recommended.

---

### 12. Referral Tracking

The advisor can create a referral draft from a partner recommendation.

Referral statuses include:

- `DRAFT`
- `READY`
- `SENT`
- `ACCEPTED`
- `DECLINED`
- `CLOSED`

Referral history remains available even when the related partner profile is later deleted.

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Browser MediaRecorder API
- Fetch API

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Uvicorn

### Database

- PostgreSQL
- Neon

### AI

- OpenAI API
- Audio transcription model
- Text generation and structured output model

### Authentication

- JWT
- HttpOnly cookies
- bcrypt password hashing

### Development

- Git
- GitHub
- Visual Studio Code
- FastAPI Swagger UI

---

## System Architecture

```text
┌───────────────────────────────┐
│           Frontend            │
│ HTML + CSS + JavaScript       │
│                               │
│ Dashboard                     │
│ Clients                       │
│ Meetings                      │
│ Partners                      │
│ Login / Logout                │
└───────────────┬───────────────┘
                │ REST API
                │ credentials: include
                ▼
┌───────────────────────────────┐
│         FastAPI Backend       │
│                               │
│ Authentication                │
│ Client Workflow               │
│ Meeting Workflow              │
│ Dashboard Workflow            │
│ AI Provider                   │
│ Partner Workflow              │
│ Referral Workflow             │
└───────────┬───────────┬───────┘
            │           │
            │           │ OpenAI API
            │           ▼
            │   ┌───────────────────┐
            │   │ AI Transcription  │
            │   │ AI Summaries      │
            │   │ AI Briefs         │
            │   │ AI Assistant      │
            │   └───────────────────┘
            │
            ▼
┌───────────────────────────────┐
│      Neon PostgreSQL          │
│                               │
│ Advisors                      │
│ Clients                       │
│ Meetings                      │
│ Tasks                         │
│ Partners                      │
│ Referrals                     │
└───────────────────────────────┘
```

---

## Project Structure

```text
AdvisorFlow/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── settings.py
│   ├── dependencies.py
│   ├── models.py
│   ├── schemas.py
│   ├── ai_provider.py
│   ├── client_ai.py
│   ├── meeting_workflow.py
│   ├── dashboard_workflow.py
│   ├── partner_models.py
│   ├── partner_workflow.py
│   ├── seed.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── index.html
│   ├── logout.html
│   ├── dashboard.html
│   ├── client.html
│   ├── client_details.html
│   ├── meeting.html
│   ├── partner.html
│   │
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   ├── meeting-recorder.css
│   │   ├── meeting-review.css
│   │   ├── client-actions.css
│   │   └── partner.css
│   │
│   └── js/
│       ├── api.js
│       ├── auth.js
│       ├── login.js
│       ├── logout.js
│       ├── dashboard.js
│       ├── client.js
│       ├── client-ai.js
│       ├── client-actions.js
│       ├── meeting.js
│       └── partner.js
│
└── README.md
```

Your actual file structure may be slightly different. Update this section when necessary.

---

## Database Entities

### Advisor

Stores advisor account information.

Important fields:

- `id`
- `email`
- `display_name`
- `password_hash`
- `role`
- `status`

### Client

Stores client memory information.

Important fields:

- `id`
- `advisor_id`
- `full_name`
- `email`
- `phone`
- `age`
- `occupation`
- `risk_profile`
- `goal`
- `priority`
- `status`
- `last_contact_at`
- `next_follow_up_at`

### Meeting

Stores meetings and AI results.

Important fields:

- `id`
- `advisor_id`
- `client_id`
- `title`
- `scheduled_at`
- `raw_notes`
- `ai_summary`
- `client_needs`
- `action_items`
- `next_follow_up_at`
- `ai_status`
- `advisor_confirmed`

### Task

Stores follow-up actions.

Important fields:

- `id`
- `advisor_id`
- `client_id`
- `title`
- `description`
- `priority`
- `status`
- `source`
- `due_at`

### Partner

Stores partner directory information.

Important fields:

- `id`
- `advisor_id`
- `name`
- `partner_type`
- `specialty`
- `best_for`
- `description`
- `contact_name`
- `email`
- `phone`
- `website`
- `service_area`
- `keywords`
- `response_time_days`
- `status`

### Referral

Stores client-partner referral records.

Important fields:

- `id`
- `advisor_id`
- `client_id`
- `partner_id`
- `partner_name_snapshot`
- `match_score`
- `reasons`
- `notes`
- `status`

---

## Local Setup

### Requirements

Install the following:

- Python 3.11 or newer
- Git
- A Neon PostgreSQL database
- An OpenAI API key
- A modern browser such as Chrome or Edge

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/AdvisorFlow.git
cd AdvisorFlow
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 2. Create the Backend Virtual Environment

Open a terminal inside the backend folder:

```bash
cd backend
```

Create the virtual environment:

```bash
python -m venv .venv
```

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
```

### macOS or Linux

```bash
source .venv/bin/activate
```

---

## 3. Install Backend Packages

```bash
python -m pip install --upgrade pip
```

```bash
pip install -r requirements.txt
```

A possible `requirements.txt` may include:

```text
fastapi
uvicorn[standard]
sqlalchemy
psycopg[binary]
pydantic
pydantic-settings
python-dotenv
python-jose[cryptography]
passlib[bcrypt]
bcrypt
openai
email-validator
```

Use the versions that are already working in your project before the final submission.

---

## 4. Configure Environment Variables

Create:

```text
backend/.env
```

Example:

```env
APP_ENV=development

DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST/DATABASE?sslmode=require

JWT_SECRET_KEY=replace-this-with-a-long-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480

AI_PROVIDER=openai
OPENAI_API_KEY=replace-with-your-openai-api-key
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_SUMMARY_MODEL=gpt-5-mini

CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

MAX_AUDIO_BYTES=24000000
```

Never commit `.env` to GitHub.

Add this to `.gitignore`:

```gitignore
.env
.venv/
__pycache__/
*.pyc
```

---

## 5. Create Database Tables and Demo Data

Run:

```bash
python seed.py
```

Expected result:

```text
AdvisorFlow demo data created successfully.
```

The project may also use:

```python
Base.metadata.create_all(bind=engine)
```

to create missing tables during startup.

For a production project, database migrations should be managed with Alembic.

---

## 6. Start the Backend

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 5000
```

Backend URL:

```text
http://127.0.0.1:5000
```

Swagger documentation:

```text
http://127.0.0.1:5000/docs
```

Health check:

```text
http://127.0.0.1:5000/health
```

---

## 7. Start the Frontend

Open another terminal:

```bash
cd frontend
```

Start a simple local web server:

```bash
python -m http.server 8000
```

Frontend URL:

```text
http://localhost:8000
```

Do not open the HTML files using `file://`.

Using a local server is required for API requests, authentication cookies, and browser recording permissions.

---

## Demo Account

```text
Email: alex@advisorflow.com
Password: advisor123
```

This account is only for demonstration.

Change or remove the demo password before using the project outside the hackathon environment.

---

## Main API Routes

### Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Clients

```text
GET    /clients
POST   /clients
GET    /clients/{client_id}
PATCH  /clients/{client_id}
DELETE /clients/{client_id}
POST   /clients/{client_id}/ai-brief
```

### Meetings

```text
POST  /meetings
POST  /audio/transcribe
POST  /meetings/{meeting_id}/generate-summary
PATCH /meetings/{meeting_id}/summary
POST  /meetings/{meeting_id}/confirm-summary
```

### Tasks

```text
PATCH /tasks/{task_id}/complete
```

The exact path may be different depending on the current implementation.

### Dashboard

```text
GET  /dashboard/overview
POST /dashboard/assistant
```

### Partners

```text
GET    /partners
POST   /partners
GET    /partners/{partner_id}
PATCH  /partners/{partner_id}
DELETE /partners/{partner_id}
POST   /partner-matching/recommend
```

### Referrals

```text
GET   /referrals
POST  /referrals
PATCH /referrals/{referral_id}
```

---

## Important Workflows

### Meeting Workflow

```text
1. Select a client
2. Enter the meeting title and time
3. Type notes or record audio
4. Transcribe the recording
5. Review the transcript
6. Save the meeting
7. Generate the AI summary
8. Review and edit the summary
9. Confirm the summary
10. Create follow-up tasks
```

### Client Brief Workflow

```text
1. Open a client profile
2. Select Generate AI Brief
3. Backend reads the client profile
4. Backend reads confirmed meetings
5. Backend reads pending tasks
6. AI creates preparation points
7. Brief appears on the client page
```

### Partner Workflow

```text
1. Add active partners
2. Select a client
3. Add optional matching context
4. Generate partner match
5. Review match score and reasons
6. Select the preferred partner
7. Create referral draft
8. Update referral status
```

---

## Security Design

AdvisorFlow currently includes:

- Password hashing
- JWT authentication
- HttpOnly cookies
- Advisor ownership filters
- Protected API routes
- Protected frontend pages
- Session expiration checking
- Input validation
- AI output review
- Recording consent confirmation

Important production improvements would include:

- CSRF protection
- Rate limiting
- Audit logging
- Refresh token rotation
- Strong secret management
- Automated database backups
- HTTPS-only deployment
- Security monitoring
- Privacy and retention policies

AdvisorFlow is a hackathon prototype and should receive a full security review before processing real financial client information.

---

## AI Safety Design

The AI is instructed to:

- Use only information supplied by AdvisorFlow
- Avoid inventing client information
- Avoid inventing meetings or tasks
- Avoid displaying internal database details
- Avoid financial advice
- Avoid tax advice
- Avoid legal advice
- Avoid insurance advice
- Focus on productivity and preparation

Important AI-generated records require advisor review.

---

## Troubleshooting

### Backend cannot be reached

Error:

```text
ERR_CONNECTION_REFUSED
```

Check that the backend is running:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 5000
```

---

### Frontend cannot connect to backend

Check:

- Backend port
- Frontend API base URL
- CORS origins
- `credentials: "include"`
- Browser developer console
- Backend terminal logs

---

### Login does not work

Check:

- Demo advisor exists in PostgreSQL
- Password hash was created correctly
- JWT secret is configured
- Frontend and backend use allowed origins
- Cookies are not blocked
- Backend is running

---

### OpenAI request fails

Possible causes:

- Missing API key
- Invalid API key
- No API credits
- Project spending limit
- Unsupported model
- Network or firewall problem
- OpenAI response limit

Check:

```env
OPENAI_API_KEY=...
AI_PROVIDER=openai
```

Also check the backend terminal for the detailed error.

---

### Audio recording does not work

Check:

- Browser microphone permission
- Recording consent checkbox
- Browser support for MediaRecorder
- HTTPS or localhost usage
- Supported audio format
- Maximum audio size

---

### Partner match cannot be generated

Make sure:

- At least one partner exists
- The partner status is `ACTIVE`
- A client was selected
- The client belongs to the signed-in advisor

---

### Database connection fails

Check the Neon connection string:

```env
DATABASE_URL=postgresql://...
```

The Neon URL should normally include:

```text
sslmode=require
```

Never post the real database password publicly.

---

## Deployment Notes

### Backend

The backend can be deployed to a Python hosting platform.

Example start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Production environment variables must be configured in the hosting platform.

Set:

```env
APP_ENV=production
```

When production mode is enabled, authentication cookies should use secure HTTPS settings.

### Frontend

The frontend can be deployed to a static hosting platform.

After deployment:

- Update the API base URL
- Update backend CORS origins
- Use HTTPS
- Confirm cookies are sent correctly
- Test login and logout
- Test microphone permission
- Test OpenAI requests

---

## Future Improvements

Planned improvements include:

- Google Calendar integration
- Gmail draft integration
- Reminder notifications
- Manager dashboard
- Role-based access control
- Audit logs
- Soft delete and archive
- Semantic client search
- Automated testing
- Database migrations
- Better mobile support
- Production privacy controls
- AI-assisted partner ranking
- Referral email workflow
- Client document upload
- Multi-advisor organization support

---

## Project Principles

AdvisorFlow follows four main principles:

### 1. Advisor control

AI assists the advisor but does not silently make final decisions.

### 2. Explainable output

The advisor should understand why a task, brief, or partner was recommended.

### 3. Maintainable architecture

Frontend, backend, database, and AI logic are separated so future features can be added more easily.

### 4. Client attention

The main goal is to help advisors notice important client needs and follow-up work earlier.

---

## Disclaimer

AdvisorFlow is a productivity and workflow prototype.

It does not provide:

- Financial advice
- Investment advice
- Tax advice
- Legal advice
- Insurance advice

AI-generated information must be reviewed by a qualified human advisor.

Do not use the hackathon version with real confidential client information without completing a security, privacy, and compliance review.

---

## Built With

- HTML5
- CSS3
- JavaScript
- Python
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- Neon
- OpenAI API
- JWT
- bcrypt
- Uvicorn
- REST APIs
- Git
- GitHub

---

## Project Status

AdvisorFlow currently supports an end-to-end demonstration of:

```text
Secure Login
→ Live Dashboard
→ Client Management
→ Meeting Recording
→ AI Transcription
→ AI Summary Review
→ Follow-up Tasks
→ AI Client Brief
→ Partner Directory
→ Partner Matching
→ Referral Tracking
→ Secure Logout
```

---

## License

This project was created for a hackathon.

Add an appropriate open-source license before allowing wider reuse or distribution.
