from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from database import Base
from models import utc_now


class Partner(Base):
    __tablename__ = "partners"

    __table_args__ = (
        UniqueConstraint(
            "advisor_id",
            "name",
            name="uq_partner_advisor_name",
        ),
    )

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

    name: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        index=True,
    )

    partner_type: Mapped[str] = mapped_column(
        String(80),
        default="Other",
        nullable=False,
    )

    specialty: Mapped[str] = mapped_column(
        String(240),
        nullable=False,
        index=True,
    )

    best_for: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    contact_name: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(60),
        nullable=True,
    )

    website: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    service_area: Mapped[str | None] = mapped_column(
        String(240),
        nullable=True,
    )

    keywords: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    response_time_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        default="ACTIVE",
        nullable=False,
        index=True,
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


class Referral(Base):
    __tablename__ = "referrals"

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

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    partner_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "partners.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    partner_name_snapshot: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
    )

    match_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    reasons: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        default="DRAFT",
        nullable=False,
        index=True,
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