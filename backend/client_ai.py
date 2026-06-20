from datetime import (
    datetime,
    timezone,
)
import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from ai_provider import get_ai_provider
from database import get_db
from dependencies import (
    get_current_advisor,
)
from models import Advisor, Client


logger = logging.getLogger(
    "advisorflow.client_ai"
)


router = APIRouter(
    tags=["Client AI"],
)


class ClientBriefResponse(BaseModel):
    client_id: int
    headline: str
    priorities: list[str]
    meeting_preparation: list[str]
    client_context: list[str]
    suggested_next_action: str
    generated_at: datetime


@router.post(
    "/clients/{client_id}/ai-brief",
    response_model=ClientBriefResponse,
)
def generate_client_ai_brief(
    client_id: int,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    client = database.scalar(
        select(Client)
        .options(
            selectinload(
                Client.meetings
            ),
            selectinload(
                Client.tasks
            ),
        )
        .where(
            Client.id == client_id,
            Client.advisor_id
            == advisor.id,
        )
    )

    if client is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "The client does not exist "
                "or is not available to "
                "this advisor."
            ),
        )

    confirmed_meetings = sorted(
        [
            meeting
            for meeting in client.meetings
            if meeting.advisor_confirmed
        ],
        key=lambda meeting: (
            meeting.scheduled_at
        ),
        reverse=True,
    )[:5]

    pending_tasks = sorted(
        [
            task
            for task in client.tasks
            if task.status == "PENDING"
        ],
        key=lambda task: (
            task.due_at is None,
            task.due_at
            or datetime.max.replace(
                tzinfo=timezone.utc,
            ),
        ),
    )[:10]

    context = {
        "client": {
            "full_name": (
                client.full_name
            ),
            "age": client.age,
            "occupation": (
                client.occupation
            ),
            "risk_profile": (
                client.risk_profile
            ),
            "goal": client.goal,
            "priority": client.priority,
            "last_contact_at": (
                client.last_contact_at
            ),
            "next_follow_up_at": (
                client.next_follow_up_at
            ),
        },
        "recent_confirmed_meetings": [
            {
                "scheduled_at": (
                    meeting.scheduled_at
                ),
                "title": meeting.title,
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
                "next_follow_up_at": (
                    meeting
                    .next_follow_up_at
                ),
            }
            for meeting
            in confirmed_meetings
        ],
        "pending_tasks": [
            {
                "title": task.title,
                "description": (
                    task.description
                ),
                "priority": task.priority,
                "due_at": task.due_at,
            }
            for task
            in pending_tasks
        ],
    }

    try:
        result = (
            get_ai_provider()
            .generate_client_brief(
                context
            )
        )
    except Exception as error:
        logger.exception(
            "Client AI brief generation failed."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to generate the "
                "client AI brief. Please retry."
            ),
        ) from error

    return ClientBriefResponse(
        client_id=client.id,
        headline=result.headline,
        priorities=result.priorities,
        meeting_preparation=(
            result.meeting_preparation
        ),
        client_context=(
            result.client_context
        ),
        suggested_next_action=(
            result.suggested_next_action
        ),
        generated_at=datetime.now(
            timezone.utc
        ),
    )