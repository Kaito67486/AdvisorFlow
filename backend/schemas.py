from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email: str = Field(
        min_length=3,
        max_length=255,
    )

    password: str = Field(
        min_length=6,
        max_length=128,
    )


class AdvisorResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    email: str
    display_name: str
    role: str


class ClientCreate(BaseModel):
    full_name: str = Field(
        min_length=1,
        max_length=160,
    )

    email: str | None = Field(
        default=None,
        max_length=255,
    )

    phone: str | None = Field(
        default=None,
        max_length=50,
    )

    age: int | None = Field(
        default=None,
        ge=0,
        le=120,
    )

    occupation: str | None = Field(
        default=None,
        max_length=160,
    )

    risk_profile: str = Field(
        default="Medium",
        max_length=40,
    )

    goal: str | None = None

    priority: str = Field(
        default="Normal",
        max_length=40,
    )


class ClientUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=160,
    )

    email: str | None = Field(
        default=None,
        max_length=255,
    )

    phone: str | None = Field(
        default=None,
        max_length=50,
    )

    age: int | None = Field(
        default=None,
        ge=0,
        le=120,
    )

    occupation: str | None = Field(
        default=None,
        max_length=160,
    )

    risk_profile: str | None = Field(
        default=None,
        max_length=40,
    )

    goal: str | None = None

    priority: str | None = Field(
        default=None,
        max_length=40,
    )

    status: str | None = Field(
        default=None,
        max_length=40,
    )

    next_follow_up_at: datetime | None = None


class ClientResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    advisor_id: int
    full_name: str
    email: str | None
    phone: str | None
    age: int | None
    occupation: str | None
    risk_profile: str
    goal: str | None
    priority: str
    status: str
    last_contact_at: datetime | None
    next_follow_up_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MeetingCreate(BaseModel):
    client_id: int

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    scheduled_at: datetime
    raw_notes: str | None = None


class MeetingResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    client_id: int
    advisor_id: int
    title: str
    scheduled_at: datetime
    raw_notes: str | None
    ai_summary: str | None
    client_needs: list
    action_items: list
    next_follow_up_at: datetime | None
    ai_status: str
    advisor_confirmed: bool
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    client_id: int

    title: str = Field(
        min_length=1,
        max_length=240,
    )

    description: str | None = None

    priority: str = Field(
        default="MEDIUM",
        max_length=40,
    )

    due_at: datetime | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    client_id: int
    advisor_id: int
    title: str
    description: str | None
    status: str
    priority: str
    source: str
    due_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ClientBriefInput(BaseModel):
    name: str | None = None
    age: int | None = None
    occupation: str | None = None
    riskProfile: str = "Medium"
    goal: str | None = None
    lastMeeting: str | None = None
    priority: str = "Normal"


class GenerateBriefRequest(BaseModel):
    client: ClientBriefInput


class GenerateSummaryRequest(BaseModel):
    notes: str = Field(
        min_length=3,
        max_length=20_000,
    )

    client_id: int | None = None


class GenerateSummaryResponse(BaseModel):
    summary: str
    goal: str
    actions: list[str]
    email: str