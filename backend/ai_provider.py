from abc import ABC, abstractmethod
from datetime import date
import io
import json

from openai import OpenAI
from pydantic import BaseModel, Field

from settings import settings


class MeetingSummaryResult(BaseModel):
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

    next_follow_up_date: date | None = None

    follow_up_reason: str = Field(
        default="",
        max_length=1000,
    )

    follow_up_email: str = Field(
        default="",
        max_length=5000,
    )

    # Compatibility with the old /generate-summary route.
    @property
    def goal(self) -> str:
        if self.client_needs:
            return self.client_needs[0]

        return (
            "Review the client's current priorities."
        )

    @property
    def actions(self) -> list[str]:
        return self.action_items

    @property
    def email(self) -> str:
        return self.follow_up_email


class ClientBriefResult(BaseModel):
    headline: str = Field(
        min_length=1,
        max_length=300,
    )

    priorities: list[str] = Field(
        default_factory=list,
        max_length=6,
    )

    meeting_preparation: list[str] = Field(
        default_factory=list,
        max_length=6,
    )

    client_context: list[str] = Field(
        default_factory=list,
        max_length=6,
    )

    suggested_next_action: str = Field(
        min_length=1,
        max_length=1000,
    )


class AiProvider(ABC):
    @abstractmethod
    def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        raise NotImplementedError

    @abstractmethod
    def generate_meeting_summary(
        self,
        notes: str,
        client_name: str = "Client",
    ) -> MeetingSummaryResult:
        raise NotImplementedError

    @abstractmethod
    def generate_client_brief(
        self,
        client_context: dict,
    ) -> ClientBriefResult:
        raise NotImplementedError


class MockAiProvider(AiProvider):
    def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        raise RuntimeError(
            "Audio transcription requires "
            "AI_PROVIDER=openai."
        )

    def generate_meeting_summary(
        self,
        notes: str,
        client_name: str = "Client",
    ) -> MeetingSummaryResult:
        normalized_notes = " ".join(
            notes.split()
        )

        lower_notes = (
            normalized_notes.lower()
        )

        client_needs: list[str] = []
        action_items: list[str] = []

        if "retirement" in lower_notes:
            client_needs.append(
                "Retirement planning support"
            )

        if "education" in lower_notes:
            client_needs.append(
                "Education funding planning"
            )

        if "insurance" in lower_notes:
            client_needs.append(
                "Protection requirements review"
            )

        if not client_needs:
            client_needs.append(
                "Review current financial priorities"
            )

        action_items.extend(
            [
                (
                    "Review the confirmed client "
                    "requirements"
                ),
                (
                    "Prepare the relevant information"
                ),
                (
                    "Schedule the next follow-up "
                    "discussion"
                ),
            ]
        )

        return MeetingSummaryResult(
            summary=(
                f"Meeting with {client_name}: "
                f"{normalized_notes}"
            ),
            client_needs=client_needs,
            action_items=action_items,
            next_follow_up_date=None,
            follow_up_reason=(
                "Confirm progress on the agreed actions."
            ),
            follow_up_email=(
                f"Dear {client_name},\n\n"
                "Thank you for meeting with me. "
                "I have recorded the priorities and "
                "next steps discussed during our meeting. "
                "I will follow up on the agreed actions."
                "\n\nBest regards,\nYour Advisor"
            ),
        )

    def generate_client_brief(
        self,
        client_context: dict,
    ) -> ClientBriefResult:
        client = client_context.get(
            "client",
            {},
        )

        client_name = client.get(
            "full_name",
            "Client",
        )

        priority = client.get(
            "priority",
            "Normal",
        )

        pending_tasks = client_context.get(
            "pending_tasks",
            [],
        )

        recent_meetings = client_context.get(
            "recent_confirmed_meetings",
            [],
        )

        priorities = [
            task.get(
                "title",
                "Review pending follow-up",
            )
            for task in pending_tasks[:3]
        ]

        if not priorities:
            priorities.append(
                "Review the client's latest priorities"
            )

        preparation = [
            (
                "Review the client profile and "
                "confirmed meeting history"
            ),
            (
                "Check unfinished commitments before "
                "the next conversation"
            ),
        ]

        context_items = []

        if recent_meetings:
            context_items.append(
                f"{len(recent_meetings)} confirmed "
                "recent meeting(s) are available."
            )

        goal = client.get("goal")

        if goal:
            context_items.append(
                f"Recorded goal: {goal}"
            )

        return ClientBriefResult(
            headline=(
                f"{client_name} — "
                f"{priority} priority"
            ),
            priorities=priorities,
            meeting_preparation=preparation,
            client_context=context_items,
            suggested_next_action=priorities[0],
        )


class OpenAiProvider(AiProvider):
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is required when "
                "AI_PROVIDER=openai."
            )

        self.client = OpenAI(
            api_key=settings.openai_api_key,
        )

    def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        del content_type

        audio_file = io.BytesIO(
            audio_bytes
        )

        audio_file.name = filename

        try:
            transcription = (
                self.client
                .audio
                .transcriptions
                .create(
                    model=(
                        settings
                        .openai_transcription_model
                    ),
                    file=audio_file,
                    response_format="text",
                    prompt=(
                        "This is a professional "
                        "client-advisor meeting. "
                        "Preserve names, dates, goals, "
                        "commitments, follow-up actions, "
                        "and professional terminology. "
                        "Use clear punctuation."
                    ),
                )
            )
        finally:
            audio_file.close()

        if isinstance(
            transcription,
            str,
        ):
            text = transcription
        else:
            text = getattr(
                transcription,
                "text",
                "",
            )

        normalized_text = str(
            text
        ).strip()

        if not normalized_text:
            raise RuntimeError(
                "The transcription service "
                "returned empty text."
            )

        return normalized_text

    def generate_meeting_summary(
        self,
        notes: str,
        client_name: str = "Client",
    ) -> MeetingSummaryResult:
        response = (
            self.client.responses.parse(
                model=(
                    settings.openai_summary_model
                ),
                input=[
                    {
                        "role": "system",
                        "content": (
                            "Structure advisor meeting "
                            "notes using only supported "
                            "facts. Do not invent dates, "
                            "preferences, products, "
                            "commitments, or professional "
                            "advice. Produce a concise "
                            "summary, client needs, "
                            "operational action items, "
                            "a follow-up date only when "
                            "stated or clearly inferable, "
                            "a short follow-up reason, "
                            "and a professional draft email."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Client name: "
                            f"{client_name}\n\n"
                            "Meeting transcript and notes:"
                            f"\n{notes}"
                        ),
                    },
                ],
                text_format=(
                    MeetingSummaryResult
                ),
            )
        )

        result = response.output_parsed

        if result is None:
            raise RuntimeError(
                "The summary service did not "
                "return a structured result."
            )

        return result

    def generate_client_brief(
        self,
        client_context: dict,
    ) -> ClientBriefResult:
        response = (
            self.client.responses.parse(
                model=(
                    settings.openai_summary_model
                ),
                input=[
                    {
                        "role": "system",
                        "content": (
                            "Create a factual advisor "
                            "preparation brief from the "
                            "provided client profile, "
                            "confirmed meeting history, "
                            "and pending tasks. Use only "
                            "supplied information. Do not "
                            "recommend financial products "
                            "and do not give financial, "
                            "legal, tax, insurance, or "
                            "investment advice. Prioritize "
                            "unfinished commitments, overdue "
                            "work, upcoming follow-ups, and "
                            "concrete meeting preparation."
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            client_context,
                            ensure_ascii=False,
                            default=str,
                        ),
                    },
                ],
                text_format=(
                    ClientBriefResult
                ),
            )
        )

        result = response.output_parsed

        if result is None:
            raise RuntimeError(
                "The client brief service did not "
                "return a structured result."
            )

        return result


def get_ai_provider() -> AiProvider:
    provider_name = (
        settings.ai_provider
        .strip()
        .lower()
    )

    if provider_name == "openai":
        return OpenAiProvider()

    return MockAiProvider()