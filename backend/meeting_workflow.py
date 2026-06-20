from datetime import (
    date,
    datetime,
    time,
    timezone,
)
import logging
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Request,
    status,
)
from pydantic import (
    BaseModel,
    Field,
)
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
from models import (
    Advisor,
    Meeting,
    Task,
)
from settings import settings


logger = logging.getLogger(
    "advisorflow.meeting"
)


router = APIRouter(
    tags=["Meeting AI"],
)


ALLOWED_AUDIO_TYPES = {
    "audio/webm": ".webm",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/m4a": ".m4a",
    "audio/x-m4a": ".m4a",
}


class AudioTranscriptionResponse(
    BaseModel
):
    text: str
    discarded_audio: bool
    received_bytes: int


class MeetingReviewResponse(
    BaseModel
):
    meeting_id: int
    client_id: int
    raw_notes: str
    summary: str
    client_needs: list[str]
    action_items: list[str]
    next_follow_up_at: (
        datetime | None
    )
    ai_status: str
    advisor_confirmed: bool


class MeetingSummaryUpdateRequest(
    BaseModel
):
    summary: str = Field(
        min_length=1,
        max_length=4000,
    )

    client_needs: list[str] = Field(
        default_factory=list,
        max_length=10,
    )

    action_items: list[str] = Field(
        default_factory=list,
        max_length=10,
    )

    next_follow_up_at: (
        datetime | None
    ) = None


class ConfirmedTaskResponse(
    BaseModel
):
    id: int
    title: str
    status: str
    priority: str
    due_at: datetime | None


class MeetingConfirmationResponse(
    BaseModel
):
    meeting: MeetingReviewResponse

    created_tasks: list[
        ConfirmedTaskResponse
    ]

    already_confirmed: bool


def convert_follow_up_date(
    follow_up_date: date | None,
) -> datetime | None:
    if follow_up_date is None:
        return None

    malaysia_timezone = ZoneInfo(
        "Asia/Kuala_Lumpur"
    )

    local_datetime = datetime.combine(
        follow_up_date,
        time(
            hour=9,
            minute=0,
        ),
        tzinfo=malaysia_timezone,
    )

    return local_datetime.astimezone(
        timezone.utc
    )


def to_meeting_response(
    meeting: Meeting,
) -> MeetingReviewResponse:
    return MeetingReviewResponse(
        meeting_id=meeting.id,
        client_id=meeting.client_id,
        raw_notes=(
            meeting.raw_notes or ""
        ),
        summary=(
            meeting.ai_summary or ""
        ),
        client_needs=list(
            meeting.client_needs or []
        ),
        action_items=list(
            meeting.action_items or []
        ),
        next_follow_up_at=(
            meeting.next_follow_up_at
        ),
        ai_status=meeting.ai_status,
        advisor_confirmed=(
            meeting.advisor_confirmed
        ),
    )


@router.post(
    "/audio/transcribe",
    response_model=(
        AudioTranscriptionResponse
    ),
)
async def transcribe_audio(
    request: Request,
    x_audio_filename: (
        str | None
    ) = Header(default=None),
    _advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    raw_content_type = (
        request.headers.get(
            "content-type",
            "",
        )
    )

    content_type = (
        raw_content_type
        .split(";")[0]
        .strip()
        .lower()
    )

    if (
        content_type
        not in ALLOWED_AUDIO_TYPES
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),
            detail=(
                "Unsupported audio format. "
                "Use WEBM, MP4, M4A, "
                "MP3, or WAV."
            ),
        )

    audio_bytes = await request.body()

    if not audio_bytes:
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "The audio recording is empty."
            ),
        )

    received_bytes = len(
        audio_bytes
    )

    if (
        received_bytes
        > settings.max_audio_bytes
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "The recording is too large."
            ),
        )

    extension = ALLOWED_AUDIO_TYPES[
        content_type
    ]

    filename = (
        x_audio_filename
        or f"meeting-recording{extension}"
    )

    if not filename.lower().endswith(
        extension
    ):
        filename = (
            f"meeting-recording{extension}"
        )

    try:
        transcript = (
            get_ai_provider()
            .transcribe_audio(
                audio_bytes=audio_bytes,
                filename=filename,
                content_type=content_type,
            )
        )
    except Exception as error:
        logger.exception(
            "Audio transcription failed."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to transcribe the "
                "recording. Please retry or "
                "enter notes manually."
            ),
        ) from error
    finally:
        audio_bytes = b""

    return AudioTranscriptionResponse(
        text=transcript,
        discarded_audio=True,
        received_bytes=received_bytes,
    )


@router.post(
    "/meetings/{meeting_id}/generate-summary",
    response_model=MeetingReviewResponse,
)
def generate_and_save_summary(
    meeting_id: int,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    meeting = database.scalar(
        select(Meeting)
        .options(
            selectinload(
                Meeting.client
            )
        )
        .where(
            Meeting.id == meeting_id,
            Meeting.advisor_id
            == advisor.id,
        )
    )

    if meeting is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "The meeting does not exist "
                "or is not available to "
                "this advisor."
            ),
        )

    raw_notes = (
        meeting.raw_notes or ""
    ).strip()

    if not raw_notes:
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Meeting notes are required "
                "before generating a summary."
            ),
        )

    meeting.ai_status = "PROCESSING"

    meeting.advisor_confirmed = (
        False
    )

    database.commit()

    try:
        result = (
            get_ai_provider()
            .generate_meeting_summary(
                notes=raw_notes,
                client_name=(
                    meeting
                    .client
                    .full_name
                ),
            )
        )

        next_follow_up_at = (
            convert_follow_up_date(
                result
                .next_follow_up_date
            )
        )

        meeting.ai_summary = (
            result.summary
        )

        meeting.client_needs = (
            result.client_needs
        )

        meeting.action_items = (
            result.action_items
        )

        meeting.next_follow_up_at = (
            next_follow_up_at
        )

        meeting.ai_status = "COMPLETED"

        meeting.advisor_confirmed = (
            False
        )

        meeting.client.last_contact_at = (
            datetime.now(timezone.utc)
        )

        if next_follow_up_at:
            meeting.client.next_follow_up_at = (
                next_follow_up_at
            )

        database.commit()
        database.refresh(meeting)

        return to_meeting_response(
            meeting
        )

    except Exception as error:
        logger.exception(
            "Meeting summary generation failed."
        )

        database.rollback()

        failed_meeting = database.scalar(
            select(Meeting).where(
                Meeting.id == meeting_id,
                Meeting.advisor_id
                == advisor.id,
            )
        )

        if failed_meeting:
            failed_meeting.ai_status = (
                "FAILED"
            )

            failed_meeting.advisor_confirmed = (
                False
            )

            database.commit()

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "The meeting was saved, "
                "but the AI summary could "
                "not be generated. You can "
                "retry without creating "
                "another meeting."
            ),
        ) from error


@router.patch(
    "/meetings/{meeting_id}/summary",
    response_model=MeetingReviewResponse,
)
def update_meeting_summary(
    meeting_id: int,
    payload: (
        MeetingSummaryUpdateRequest
    ),
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    meeting = database.scalar(
        select(Meeting)
        .options(
            selectinload(
                Meeting.client
            )
        )
        .where(
            Meeting.id == meeting_id,
            Meeting.advisor_id
            == advisor.id,
        )
    )

    if meeting is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Meeting not found.",
        )

    if meeting.advisor_confirmed:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "A confirmed summary "
                "cannot be edited."
            ),
        )

    meeting.ai_summary = (
        payload.summary.strip()
    )

    meeting.client_needs = [
        item.strip()
        for item
        in payload.client_needs
        if item.strip()
    ]

    meeting.action_items = [
        item.strip()
        for item
        in payload.action_items
        if item.strip()
    ]

    meeting.next_follow_up_at = (
        payload.next_follow_up_at
    )

    meeting.ai_status = "COMPLETED"

    if payload.next_follow_up_at:
        meeting.client.next_follow_up_at = (
            payload.next_follow_up_at
        )

    database.commit()
    database.refresh(meeting)

    return to_meeting_response(
        meeting
    )


@router.post(
    "/meetings/{meeting_id}/confirm-summary",
    response_model=(
        MeetingConfirmationResponse
    ),
)
def confirm_meeting_summary(
    meeting_id: int,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    meeting = database.scalar(
        select(Meeting)
        .options(
            selectinload(
                Meeting.client
            )
        )
        .where(
            Meeting.id == meeting_id,
            Meeting.advisor_id
            == advisor.id,
        )
    )

    if meeting is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Meeting not found.",
        )

    if (
        meeting.ai_status
        != "COMPLETED"
        or not (
            meeting.ai_summary or ""
        ).strip()
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Generate and review the "
                "AI summary before confirming it."
            ),
        )

    marker = (
        "AdvisorFlow Meeting ID: "
        f"{meeting.id}"
    )

    existing_tasks = database.scalars(
        select(Task).where(
            Task.advisor_id
            == advisor.id,
            Task.client_id
            == meeting.client_id,
            Task.source == "MEETING",
            Task.description.ilike(
                f"%{marker}%"
            ),
        )
    ).all()

    if meeting.advisor_confirmed:
        return MeetingConfirmationResponse(
            meeting=to_meeting_response(
                meeting
            ),
            created_tasks=[
                ConfirmedTaskResponse(
                    id=task.id,
                    title=task.title,
                    status=task.status,
                    priority=task.priority,
                    due_at=task.due_at,
                )
                for task
                in existing_tasks
            ],
            already_confirmed=True,
        )

    created_tasks: list[Task] = []

    if not existing_tasks:
        task_priority = (
            "HIGH"
            if (
                meeting.client.priority
                or ""
            ).lower() == "high"
            else "MEDIUM"
        )

        for action_item in (
            meeting.action_items or []
        ):
            title = str(
                action_item
            ).strip()

            if not title:
                continue

            task = Task(
                client_id=(
                    meeting.client_id
                ),
                advisor_id=advisor.id,
                title=title[:240],
                description=(
                    f"{marker}. Created from "
                    "the confirmed meeting summary."
                ),
                status="PENDING",
                priority=task_priority,
                source="MEETING",
                due_at=(
                    meeting
                    .next_follow_up_at
                ),
            )

            database.add(task)

            created_tasks.append(
                task
            )

    meeting.advisor_confirmed = True

    if meeting.next_follow_up_at:
        meeting.client.next_follow_up_at = (
            meeting.next_follow_up_at
        )

    database.commit()
    database.refresh(meeting)

    for task in created_tasks:
        database.refresh(task)

    final_tasks = (
        existing_tasks
        if existing_tasks
        else created_tasks
    )

    return MeetingConfirmationResponse(
        meeting=to_meeting_response(
            meeting
        ),
        created_tasks=[
            ConfirmedTaskResponse(
                id=task.id,
                title=task.title,
                status=task.status,
                priority=task.priority,
                due_at=task.due_at,
            )
            for task
            in final_tasks
        ],
        already_confirmed=False,
    )