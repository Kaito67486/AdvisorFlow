from __future__ import annotations

from datetime import (
    date,
    datetime,
    time,
    timedelta,
    timezone,
)
import json
import logging
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from openai import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    OpenAI,
    RateLimitError,
)
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from database import get_db
from dependencies import get_current_advisor
from models import (
    Advisor,
    Client,
    Meeting,
    Task,
)
from settings import settings


logger = logging.getLogger(
    "advisorflow.dashboard"
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


APP_TIMEZONE = ZoneInfo(
    "Asia/Kuala_Lumpur"
)


PRIORITY_RANK = {
    "HIGH": 0,
    "MEDIUM": 1,
    "NORMAL": 1,
    "LOW": 2,
}


class DashboardChatMessage(BaseModel):
    role: Literal[
        "user",
        "assistant",
    ]

    content: str = Field(
        min_length=1,
        max_length=3000,
    )


class DashboardChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=3000,
    )

    selected_date: date | None = None

    focused_event_id: str | None = Field(
        default=None,
        max_length=100,
    )

    history: list[
        DashboardChatMessage
    ] = Field(
        default_factory=list,
        max_length=10,
    )


class DashboardChatResponse(BaseModel):
    reply: str
    model: str


def normalize_datetime(
    value: datetime | None,
) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc,
        )

    return value


def to_local_iso(
    value: datetime | None,
) -> str | None:
    normalized = normalize_datetime(
        value
    )

    if normalized is None:
        return None

    return normalized.astimezone(
        APP_TIMEZONE
    ).isoformat()


def get_local_today() -> date:
    return datetime.now(
        APP_TIMEZONE
    ).date()


def get_day_bounds(
    selected_date: date,
) -> tuple[datetime, datetime]:
    local_start = datetime.combine(
        selected_date,
        time.min,
        tzinfo=APP_TIMEZONE,
    )

    local_end = (
        local_start
        + timedelta(days=1)
    )

    return (
        local_start.astimezone(
            timezone.utc
        ),
        local_end.astimezone(
            timezone.utc
        ),
    )


def task_sort_key(
    task: Task,
) -> tuple:
    due_at = normalize_datetime(
        task.due_at
    )

    now = datetime.now(
        timezone.utc
    )

    is_overdue = (
        due_at is not None
        and due_at < now
    )

    priority = (
        task.priority
        or "MEDIUM"
    ).upper()

    due_sort = (
        due_at
        or datetime.max.replace(
            tzinfo=timezone.utc
        )
    )

    return (
        0 if is_overdue else 1,
        PRIORITY_RANK.get(
            priority,
            1,
        ),
        due_sort,
    )


def build_dashboard_overview(
    *,
    selected_date: date,
    database: Session,
    advisor: Advisor,
) -> dict:
    day_start, day_end = (
        get_day_bounds(
            selected_date
        )
    )

    now_utc = datetime.now(
        timezone.utc
    )

    meetings = database.scalars(
        select(Meeting)
        .options(
            selectinload(
                Meeting.client
            )
        )
        .where(
            Meeting.advisor_id
            == advisor.id,
            Meeting.scheduled_at
            >= day_start,
            Meeting.scheduled_at
            < day_end,
        )
        .order_by(
            Meeting.scheduled_at.asc()
        )
    ).all()

    due_tasks = database.scalars(
        select(Task)
        .options(
            selectinload(
                Task.client
            )
        )
        .where(
            Task.advisor_id
            == advisor.id,
            Task.status
            == "PENDING",
            Task.due_at.is_not(
                None
            ),
            Task.due_at
            >= day_start,
            Task.due_at
            < day_end,
        )
        .order_by(
            Task.due_at.asc()
        )
    ).all()

    pending_tasks = database.scalars(
        select(Task)
        .options(
            selectinload(
                Task.client
            )
        )
        .where(
            Task.advisor_id
            == advisor.id,
            Task.status
            == "PENDING",
        )
    ).all()

    pending_tasks = sorted(
        pending_tasks,
        key=task_sort_key,
    )

    total_clients = (
        database.scalar(
            select(
                func.count(Client.id)
            ).where(
                Client.advisor_id
                == advisor.id,
                Client.status
                == "ACTIVE",
            )
        )
        or 0
    )

    high_priority_clients = (
        database.scalar(
            select(
                func.count(Client.id)
            ).where(
                Client.advisor_id
                == advisor.id,
                Client.status
                == "ACTIVE",
                func.lower(
                    Client.priority
                )
                == "high",
            )
        )
        or 0
    )

    overdue_tasks = [
        task
        for task in pending_tasks
        if (
            normalize_datetime(
                task.due_at
            )
            is not None
            and normalize_datetime(
                task.due_at
            )
            < now_utc
        )
    ]

    calendar_events: list[dict] = []

    for meeting in meetings:
        client = meeting.client

        calendar_events.append(
            {
                "id": (
                    f"meeting-{meeting.id}"
                ),
                "entityId": meeting.id,
                "kind": "MEETING",
                "clientId": (
                    meeting.client_id
                ),
                "clientName": (
                    client.full_name
                ),
                "title": meeting.title,
                "startAt": to_local_iso(
                    meeting.scheduled_at
                ),
                "status": (
                    meeting.ai_status
                ),
                "priority": (
                    client.priority
                ),
                "description": (
                    meeting.ai_summary
                    or meeting.raw_notes
                    or "No meeting notes yet."
                ),
                "clientGoal": (
                    client.goal
                ),
                "riskProfile": (
                    client.risk_profile
                ),
                "advisorConfirmed": (
                    meeting
                    .advisor_confirmed
                ),
            }
        )

    for task in due_tasks:
        due_at = normalize_datetime(
            task.due_at
        )

        calendar_events.append(
            {
                "id": (
                    f"task-{task.id}"
                ),
                "entityId": task.id,
                "kind": "TASK",
                "clientId": (
                    task.client_id
                ),
                "clientName": (
                    task.client.full_name
                ),
                "title": task.title,
                "startAt": to_local_iso(
                    task.due_at
                ),
                "status": task.status,
                "priority": task.priority,
                "description": (
                    task.description
                    or "Client follow-up task."
                ),
                "source": task.source,
                "isOverdue": (
                    due_at is not None
                    and due_at < now_utc
                ),
            }
        )

    calendar_events.sort(
        key=lambda item: (
            item["startAt"]
            or ""
        )
    )

    priority_task_data: list[dict] = []

    for task in pending_tasks[:8]:
        due_at = normalize_datetime(
            task.due_at
        )

        priority_task_data.append(
            {
                "id": task.id,
                "eventId": (
                    f"task-{task.id}"
                ),
                "clientId": (
                    task.client_id
                ),
                "clientName": (
                    task.client.full_name
                ),
                "title": task.title,
                "description": (
                    task.description
                ),
                "priority": task.priority,
                "status": task.status,
                "source": task.source,
                "dueAt": to_local_iso(
                    task.due_at
                ),
                "isOverdue": (
                    due_at is not None
                    and due_at < now_utc
                ),
            }
        )

    daily_brief: list[str] = []

    if meetings:
        first_meeting = meetings[0]

        daily_brief.append(
            (
                f"Prepare for "
                f"{first_meeting.client.full_name}: "
                f"{first_meeting.title}."
            )
        )

    if overdue_tasks:
        first_overdue = (
            overdue_tasks[0]
        )

        daily_brief.append(
            (
                f"Overdue follow-up: "
                f"{first_overdue.client.full_name} — "
                f"{first_overdue.title}."
            )
        )

    if high_priority_clients:
        daily_brief.append(
            (
                f"{high_priority_clients} "
                "high-priority client(s) "
                "require attention."
            )
        )

    if not daily_brief:
        daily_brief.append(
            (
                "No urgent meetings or "
                "follow-ups were found "
                "for this date."
            )
        )

    return {
        "selectedDate": (
            selected_date.isoformat()
        ),
        "isToday": (
            selected_date
            == get_local_today()
        ),
        "timezone": str(
            APP_TIMEZONE
        ),
        "stats": {
            "totalClients": (
                total_clients
            ),
            "meetings": len(
                meetings
            ),
            "pendingFollowUps": len(
                pending_tasks
            ),
            "overdueFollowUps": len(
                overdue_tasks
            ),
            "highPriorityClients": (
                high_priority_clients
            ),
        },
        "calendarEvents": (
            calendar_events
        ),
        "priorityTasks": (
            priority_task_data
        ),
        "dailyBrief": daily_brief,
    }


def build_ai_context(
    *,
    selected_date: date,
    database: Session,
    advisor: Advisor,
) -> dict:
    overview = build_dashboard_overview(
        selected_date=selected_date,
        database=database,
        advisor=advisor,
    )

    clients = database.scalars(
        select(Client)
        .where(
            Client.advisor_id
            == advisor.id,
            Client.status
            == "ACTIVE",
        )
        .order_by(
            Client.full_name.asc()
        )
        .limit(50)
    ).all()

    recent_meetings = (
        database.scalars(
            select(Meeting)
            .options(
                selectinload(
                    Meeting.client
                )
            )
            .where(
                Meeting.advisor_id
                == advisor.id,
            )
            .order_by(
                Meeting
                .scheduled_at
                .desc()
            )
            .limit(20)
        ).all()
    )

    return {
        "advisor": {
            "display_name": (
                advisor.display_name
            ),
            "email": advisor.email,
        },
        "dashboard": overview,
        "clients": [
            {
                "name": (
                    client.full_name
                ),
                "occupation": (
                    client.occupation
                ),
                "risk_profile": (
                    client.risk_profile
                ),
                "goal": client.goal,
                "priority": (
                    client.priority
                ),
                "last_contact_at": (
                    to_local_iso(
                        client
                        .last_contact_at
                    )
                ),
                "next_follow_up_at": (
                    to_local_iso(
                        client
                        .next_follow_up_at
                    )
                ),
            }
            for client in clients
        ],
        "recent_meetings": [
            {
                "client_name": (
                    meeting
                    .client
                    .full_name
                ),
                "title": meeting.title,
                "scheduled_at": (
                    to_local_iso(
                        meeting
                        .scheduled_at
                    )
                ),
                "summary": (
                    meeting.ai_summary
                ),
                "client_needs": (
                    meeting.client_needs
                    or []
                ),
                "action_items": (
                    meeting.action_items
                    or []
                ),
                "advisor_confirmed": (
                    meeting
                    .advisor_confirmed
                ),
            }
            for meeting
            in recent_meetings
        ],
    }


@router.get("/overview")
def get_dashboard_overview(
    selected_date: date | None = Query(
        default=None,
        alias="date",
    ),
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    target_date = (
        selected_date
        or get_local_today()
    )

    return build_dashboard_overview(
        selected_date=target_date,
        database=database,
        advisor=advisor,
    )


@router.post(
    "/assistant",
    response_model=DashboardChatResponse,
)
def dashboard_assistant(
    payload: DashboardChatRequest,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=(
                status
                .HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "OPENAI_API_KEY is not configured."
            ),
        )

    target_date = (
        payload.selected_date
        or get_local_today()
    )

    context = build_ai_context(
        selected_date=target_date,
        database=database,
        advisor=advisor,
    )

    dashboard_data = context[
        "dashboard"
    ]

    focused_event = None

    if payload.focused_event_id:
        focused_event = next(
            (
                event
                for event
                in dashboard_data[
                    "calendarEvents"
                ]
                if event["id"]
                == payload.focused_event_id
            ),
            None,
        )

    safe_calendar_events = [
        {
            "type": (
                "Client meeting"
                if event["kind"]
                == "MEETING"
                else "Follow-up task"
            ),
            "client": (
                event["clientName"]
            ),
            "title": event["title"],
            "time": event["startAt"],
            "priority": (
                event.get(
                    "priority"
                )
            ),
            "details": (
                event.get(
                    "description"
                )
            ),
            "overdue": bool(
                event.get(
                    "isOverdue",
                    False,
                )
            ),
        }
        for event
        in dashboard_data[
            "calendarEvents"
        ]
    ]

    safe_priority_tasks = [
        {
            "client": (
                task["clientName"]
            ),
            "task": task["title"],
            "due_at": task["dueAt"],
            "priority": (
                task["priority"]
            ),
            "overdue": (
                task["isOverdue"]
            ),
        }
        for task
        in dashboard_data[
            "priorityTasks"
        ][:8]
    ]

    safe_clients = [
        {
            "name": client["name"],
            "occupation": (
                client["occupation"]
            ),
            "risk_profile": (
                client["risk_profile"]
            ),
            "goal": client["goal"],
            "priority": (
                client["priority"]
            ),
            "last_contact_at": (
                client["last_contact_at"]
            ),
            "next_follow_up_at": (
                client[
                    "next_follow_up_at"
                ]
            ),
        }
        for client
        in context["clients"]
    ]

    safe_recent_meetings = [
        {
            "client": (
                meeting[
                    "client_name"
                ]
            ),
            "title": (
                meeting["title"]
            ),
            "scheduled_at": (
                meeting[
                    "scheduled_at"
                ]
            ),
            "summary": (
                meeting["summary"]
            ),
            "client_needs": (
                meeting[
                    "client_needs"
                ]
            ),
            "action_items": (
                meeting[
                    "action_items"
                ]
            ),
            "confirmed": (
                meeting[
                    "advisor_confirmed"
                ]
            ),
        }
        for meeting
        in context[
            "recent_meetings"
        ][:10]
    ]

    safe_focused_event = None

    if focused_event:
        safe_focused_event = {
            "type": (
                "Client meeting"
                if focused_event["kind"]
                == "MEETING"
                else "Follow-up task"
            ),
            "client": (
                focused_event[
                    "clientName"
                ]
            ),
            "title": (
                focused_event["title"]
            ),
            "time": (
                focused_event[
                    "startAt"
                ]
            ),
            "priority": (
                focused_event.get(
                    "priority"
                )
            ),
            "details": (
                focused_event.get(
                    "description"
                )
            ),
        }

    assistant_context = {
        "advisor_name": (
            advisor.display_name
        ),
        "selected_date": (
            target_date.isoformat()
        ),
        "schedule": (
            safe_calendar_events
        ),
        "priority_follow_ups": (
            safe_priority_tasks
        ),
        "clients": safe_clients,
        "recent_meetings": (
            safe_recent_meetings
        ),
        "focused_item": (
            safe_focused_event
        ),
        "summary": {
            "meetings": (
                dashboard_data[
                    "stats"
                ]["meetings"]
            ),
            "pending_follow_ups": (
                dashboard_data[
                    "stats"
                ][
                    "pendingFollowUps"
                ]
            ),
            "overdue_follow_ups": (
                dashboard_data[
                    "stats"
                ][
                    "overdueFollowUps"
                ]
            ),
            "high_priority_clients": (
                dashboard_data[
                    "stats"
                ][
                    "highPriorityClients"
                ]
            ),
        },
    }

    model_name = getattr(
        settings,
        "openai_summary_model",
        "gpt-5-mini",
    )

    if not model_name:
        model_name = "gpt-5-mini"

    input_messages = [
        {
            "role": item.role,
            "content": item.content,
        }
        for item
        in payload.history[-8:]
    ]

    input_messages.append(
        {
            "role": "user",
            "content": json.dumps(
                {
                    "question": (
                        payload.message
                        .strip()
                    ),
                    "advisorflow_context": (
                        assistant_context
                    ),
                },
                ensure_ascii=False,
                default=str,
            ),
        }
    )

    instructions = (
        "You are AdvisorFlow's friendly AI productivity "
        "assistant for a financial advisor. "

        "Answer the advisor's question using only the "
        "AdvisorFlow context included in the request. "

        "Never expose internal database IDs, client IDs, "
        "meeting IDs, task IDs, JSON field names, enum "
        "values, raw booleans, implementation details, "
        "API information, or database terminology. "

        "Translate internal statuses into natural language. "
        "Do not display values such as NOT_STARTED, "
        "PROCESSING, COMPLETED, true, or false directly. "

        "Do not mention the timezone unless the advisor "
        "specifically asks about it. "

        "Do not repeat a technical dashboard snapshot. "
        "Give a natural conversational answer. "

        "For a greeting, reply briefly and offer useful "
        "help based on the advisor's current schedule. "

        "When giving priorities, use no more than five "
        "short bullet points. "

        "Normally keep answers below 140 words. "

        "Do not invent clients, meetings, tasks, dates, "
        "preferences, commitments, or partner matches. "

        "When information is not available, clearly say "
        "that it is not recorded in AdvisorFlow. "

        "Do not provide financial, investment, tax, legal, "
        "or insurance advice. Focus on productivity, "
        "meeting preparation, client context, and "
        "follow-up actions."
    )

    request_arguments = {
        "model": model_name,
        "instructions": instructions,
        "input": input_messages,
        "max_output_tokens": 1200,
        "store": False,
    }

    if model_name.startswith(
        (
            "gpt-5",
            "o1",
            "o3",
            "o4",
        )
    ):
        request_arguments[
            "reasoning"
        ] = {
            "effort": "minimal",
        }

    try:
        client = OpenAI(
            api_key=(
                settings.openai_api_key
            ),
            timeout=45.0,
            max_retries=1,
        )

        response = (
            client.responses.create(
                **request_arguments
            )
        )

        response_status = str(
            getattr(
                response,
                "status",
                "",
            )
            or ""
        ).lower()

        if (
            response_status
            == "incomplete"
        ):
            incomplete_details = (
                getattr(
                    response,
                    "incomplete_details",
                    None,
                )
            )

            incomplete_reason = (
                getattr(
                    incomplete_details,
                    "reason",
                    "unknown",
                )
            )

            raise RuntimeError(
                "OpenAI response was "
                "incomplete. Reason: "
                f"{incomplete_reason}."
            )

        if response_status == "failed":
            response_error = getattr(
                response,
                "error",
                None,
            )

            error_message = getattr(
                response_error,
                "message",
                None,
            )

            raise RuntimeError(
                error_message
                or (
                    "OpenAI response "
                    "failed."
                )
            )

        reply = str(
            getattr(
                response,
                "output_text",
                "",
            )
            or ""
        ).strip()

        if not reply:
            logger.error(
                "OpenAI returned no text. "
                "Status=%s "
                "Incomplete=%s "
                "Output=%s",
                response_status,
                getattr(
                    response,
                    "incomplete_details",
                    None,
                ),
                getattr(
                    response,
                    "output",
                    None,
                ),
            )

            raise RuntimeError(
                "OpenAI returned an "
                "empty response."
            )

        return DashboardChatResponse(
            reply=reply,
            model=model_name,
        )

    except AuthenticationError as error:
        logger.exception(
            "OpenAI authentication failed."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "The OpenAI API key is invalid, "
                "expired, or belongs to a "
                "different project."
            ),
        ) from error

    except RateLimitError as error:
        logger.exception(
            "OpenAI rate limit or quota error."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "OpenAI rejected the request "
                "because of a rate limit or "
                "insufficient API credits."
            ),
        ) from error

    except APIConnectionError as error:
        logger.exception(
            "Unable to connect to OpenAI."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "The AdvisorFlow backend could "
                "not connect to OpenAI. Check "
                "your internet connection, "
                "proxy, or firewall."
            ),
        ) from error

    except APIStatusError as error:
        logger.exception(
            "OpenAI API status error. "
            "Status=%s Request ID=%s",
            error.status_code,
            getattr(
                error,
                "request_id",
                None,
            ),
        )

        safe_error = str(error)

        if len(safe_error) > 500:
            safe_error = (
                safe_error[:500]
                + "..."
            )

        detail = (
            "OpenAI API request failed "
            f"with status {error.status_code}."
        )

        if not settings.is_production:
            detail = (
                f"{detail} {safe_error}"
            )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=detail,
        ) from error

    except Exception as error:
        logger.exception(
            "Dashboard AI assistant failed."
        )

        if settings.is_production:
            detail = (
                "Unable to contact the "
                "AI assistant. "
                "Please try again."
            )
        else:
            error_message = str(
                error
            )

            if len(error_message) > 500:
                error_message = (
                    error_message[:500]
                    + "..."
                )

            detail = (
                f"{type(error).__name__}: "
                f"{error_message}"
            )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=detail,
        ) from error