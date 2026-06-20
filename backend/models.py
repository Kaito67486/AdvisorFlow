from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Advisor(Base):
    __tablename__ = "advisors"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    display_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(40),
        default="ADVISOR",
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    clients: Mapped[list["Client"]] = relationship(
        back_populates="advisor",
        cascade="all, delete-orphan",
    )

    meetings: Mapped[list["Meeting"]] = relationship(
        back_populates="advisor",
        cascade="all, delete-orphan",
    )

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="advisor",
        cascade="all, delete-orphan",
    )


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    advisor_id: Mapped[int] = mapped_column(
        ForeignKey(
            "advisors.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
        index=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    age: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    occupation: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
    )

    risk_profile: Mapped[str] = mapped_column(
        String(40),
        default="Medium",
        nullable=False,
    )

    goal: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    priority: Mapped[str] = mapped_column(
        String(40),
        default="Normal",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        default="ACTIVE",
        nullable=False,
    )

    last_contact_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    next_follow_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    advisor: Mapped["Advisor"] = relationship(
        back_populates="clients",
    )

    meetings: Mapped[list["Meeting"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        order_by="Meeting.scheduled_at.desc()",
    )

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
    )

class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    advisor_id: Mapped[int] = mapped_column(
        ForeignKey(
            "advisors.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    raw_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    ai_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    client_needs: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    action_items: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    next_follow_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    ai_status: Mapped[str] = mapped_column(
        String(40),
        default="NOT_STARTED",
        nullable=False,
    )

    advisor_confirmed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    client: Mapped["Client"] = relationship(
        back_populates="meetings",
    )

    advisor: Mapped["Advisor"] = relationship(
        back_populates="meetings",
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    advisor_id: Mapped[int] = mapped_column(
        ForeignKey(
            "advisors.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(240),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        default="PENDING",
        nullable=False,
        index=True,
    )

    priority: Mapped[str] = mapped_column(
        String(40),
        default="MEDIUM",
        nullable=False,
    )

    source: Mapped[str] = mapped_column(
        String(40),
        default="MANUAL",
        nullable=False,
    )

    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    client: Mapped["Client"] = relationship(
        back_populates="tasks",
    )

    advisor: Mapped["Advisor"] = relationship(
        back_populates="tasks",
    )


class AiGeneration(Base):
    __tablename__ = "ai_generations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    advisor_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "advisors.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    client_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "clients.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    meeting_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "meetings.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    generation_type: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
    )

    provider: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
    )

    model_name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    input_payload: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )

    output_payload: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        default="COMPLETED",
        nullable=False,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )