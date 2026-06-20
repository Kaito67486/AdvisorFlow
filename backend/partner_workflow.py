from __future__ import annotations

from datetime import datetime
import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)
from sqlalchemy import (
    func,
    or_,
    select,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from database import get_db
from dependencies import get_current_advisor
from models import (
    Advisor,
    Client,
)
from partner_models import (
    Partner,
    Referral,
)


router = APIRouter(
    tags=["Partners"],
)


ALLOWED_PARTNER_STATUSES = {
    "ACTIVE",
    "INACTIVE",
}


ALLOWED_REFERRAL_STATUSES = {
    "DRAFT",
    "READY",
    "SENT",
    "ACCEPTED",
    "DECLINED",
    "CLOSED",
}


STOP_WORDS = {
    "about",
    "after",
    "again",
    "also",
    "and",
    "are",
    "best",
    "client",
    "for",
    "from",
    "have",
    "into",
    "more",
    "need",
    "needs",
    "other",
    "partner",
    "planning",
    "service",
    "services",
    "support",
    "that",
    "the",
    "their",
    "this",
    "with",
}


MATCH_CATEGORIES = {
    "retirement": {
        "retirement",
        "retire",
        "pension",
        "income",
        "annuity",
    },
    "protection": {
        "insurance",
        "protection",
        "coverage",
        "family",
        "medical",
        "health",
    },
    "investment": {
        "investment",
        "portfolio",
        "wealth",
        "growth",
        "fund",
        "equity",
    },
    "estate planning": {
        "estate",
        "will",
        "inheritance",
        "legacy",
        "trust",
    },
    "tax and accounting": {
        "tax",
        "accounting",
        "corporate",
        "business",
        "audit",
    },
    "property and lending": {
        "mortgage",
        "property",
        "home",
        "loan",
        "lending",
    },
    "education funding": {
        "education",
        "school",
        "university",
        "college",
        "tuition",
    },
}


class PartnerBase(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=180,
    )

    partner_type: str = Field(
        default="Other",
        min_length=1,
        max_length=80,
    )

    specialty: str = Field(
        min_length=1,
        max_length=240,
    )

    best_for: str | None = Field(
        default=None,
        max_length=3000,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    contact_name: str | None = Field(
        default=None,
        max_length=160,
    )

    email: str | None = Field(
        default=None,
        max_length=255,
    )

    phone: str | None = Field(
        default=None,
        max_length=60,
    )

    website: str | None = Field(
        default=None,
        max_length=500,
    )

    service_area: str | None = Field(
        default=None,
        max_length=240,
    )

    keywords: list[str] = Field(
        default_factory=list,
        max_length=30,
    )

    response_time_days: int | None = Field(
        default=None,
        ge=0,
        le=365,
    )

    status: str = Field(
        default="ACTIVE",
        max_length=40,
    )


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=180,
    )

    partner_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=80,
    )

    specialty: str | None = Field(
        default=None,
        min_length=1,
        max_length=240,
    )

    best_for: str | None = Field(
        default=None,
        max_length=3000,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    contact_name: str | None = Field(
        default=None,
        max_length=160,
    )

    email: str | None = Field(
        default=None,
        max_length=255,
    )

    phone: str | None = Field(
        default=None,
        max_length=60,
    )

    website: str | None = Field(
        default=None,
        max_length=500,
    )

    service_area: str | None = Field(
        default=None,
        max_length=240,
    )

    keywords: list[str] | None = Field(
        default=None,
        max_length=30,
    )

    response_time_days: int | None = Field(
        default=None,
        ge=0,
        le=365,
    )

    status: str | None = Field(
        default=None,
        max_length=40,
    )


class PartnerResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    advisor_id: int
    name: str
    partner_type: str
    specialty: str
    best_for: str | None
    description: str | None
    contact_name: str | None
    email: str | None
    phone: str | None
    website: str | None
    service_area: str | None
    keywords: list
    response_time_days: int | None
    status: str
    created_at: datetime
    updated_at: datetime


class PartnerMatchRequest(BaseModel):
    client_id: int

    notes: str | None = Field(
        default=None,
        max_length=5000,
    )


class PartnerMatchItem(BaseModel):
    partner_id: int
    name: str
    partner_type: str
    specialty: str
    description: str
    contact_name: str | None
    email: str | None
    phone: str | None
    website: str | None
    service_area: str | None
    response_time_days: int | None
    match_score: int
    why: list[str]
    next_step: str


class PartnerMatchResponse(BaseModel):
    client: dict
    best_match: PartnerMatchItem
    other_partners: list[
        PartnerMatchItem
    ]


class ReferralCreate(BaseModel):
    client_id: int
    partner_id: int

    match_score: int | None = Field(
        default=None,
        ge=0,
        le=100,
    )

    reasons: list[str] = Field(
        default_factory=list,
        max_length=20,
    )

    notes: str | None = Field(
        default=None,
        max_length=5000,
    )

    status: str = Field(
        default="DRAFT",
        max_length=40,
    )


class ReferralUpdate(BaseModel):
    status: str | None = Field(
        default=None,
        max_length=40,
    )

    notes: str | None = Field(
        default=None,
        max_length=5000,
    )


class ReferralResponse(BaseModel):
    id: int
    advisor_id: int
    client_id: int
    client_name: str
    partner_id: int | None
    partner_name: str
    match_score: int | None
    reasons: list
    notes: str | None
    status: str
    created_at: datetime
    updated_at: datetime


def clean_optional_text(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip()

    return normalized or None


def clean_keywords(
    keywords: list[str] | None,
) -> list[str]:
    if not keywords:
        return []

    result: list[str] = []
    seen: set[str] = set()

    for keyword in keywords:
        normalized = str(
            keyword
        ).strip()

        comparison_value = (
            normalized.lower()
        )

        if (
            normalized
            and comparison_value
            not in seen
        ):
            seen.add(
                comparison_value
            )

            result.append(
                normalized[:80]
            )

    return result[:30]


def validate_partner_status(
    value: str,
) -> str:
    normalized = value.strip().upper()

    if (
        normalized
        not in ALLOWED_PARTNER_STATUSES
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Partner status must be "
                "ACTIVE or INACTIVE."
            ),
        )

    return normalized


def validate_referral_status(
    value: str,
) -> str:
    normalized = value.strip().upper()

    if (
        normalized
        not in ALLOWED_REFERRAL_STATUSES
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Invalid referral status."
            ),
        )

    return normalized


def tokenize(
    value: str,
) -> set[str]:
    words = re.findall(
        r"[a-z0-9]+",
        value.lower(),
    )

    return {
        word
        for word in words
        if (
            len(word) >= 3
            and word not in STOP_WORDS
        )
    }


def build_client_context(
    client: Client,
    notes: str | None,
) -> str:
    values: list[str] = [
        client.full_name,
        client.occupation or "",
        client.risk_profile or "",
        client.goal or "",
        client.priority or "",
        notes or "",
    ]

    confirmed_meetings = sorted(
        [
            meeting
            for meeting
            in client.meetings
            if meeting.advisor_confirmed
        ],
        key=lambda meeting: (
            meeting.scheduled_at
        ),
        reverse=True,
    )[:5]

    for meeting in confirmed_meetings:
        values.extend(
            [
                meeting.title or "",
                meeting.ai_summary or "",
                " ".join(
                    str(item)
                    for item
                    in (
                        meeting.client_needs
                        or []
                    )
                ),
                " ".join(
                    str(item)
                    for item
                    in (
                        meeting.action_items
                        or []
                    )
                ),
            ]
        )

    return " ".join(values)


def score_partner(
    partner: Partner,
    client: Client,
    client_context: str,
) -> PartnerMatchItem:
    partner_context = " ".join(
        [
            partner.name,
            partner.partner_type,
            partner.specialty,
            partner.best_for or "",
            partner.description or "",
            partner.service_area or "",
            " ".join(
                str(item)
                for item
                in (
                    partner.keywords
                    or []
                )
            ),
        ]
    )

    client_tokens = tokenize(
        client_context
    )

    partner_tokens = tokenize(
        partner_context
    )

    overlapping_tokens = sorted(
        client_tokens
        & partner_tokens
    )

    score = 30

    reasons: list[str] = []

    if overlapping_tokens:
        score += min(
            36,
            len(
                overlapping_tokens
            )
            * 8,
        )

        readable_matches = ", ".join(
            overlapping_tokens[:4]
        )

        reasons.append(
            (
                "Matches the client's recorded "
                f"needs around {readable_matches}."
            )
        )

    lower_client_context = (
        client_context.lower()
    )

    lower_partner_context = (
        partner_context.lower()
    )

    for category, category_words in (
        MATCH_CATEGORIES.items()
    ):
        client_has_category = any(
            word
            in lower_client_context
            for word
            in category_words
        )

        partner_has_category = any(
            word
            in lower_partner_context
            for word
            in category_words
        )

        if (
            client_has_category
            and partner_has_category
        ):
            score += 14

            reasons.append(
                (
                    "Relevant capability in "
                    f"{category}."
                )
            )

    risk_profile = (
        client.risk_profile
        or ""
    ).strip().lower()

    if (
        risk_profile
        == "conservative"
        and any(
            phrase
            in lower_partner_context
            for phrase in {
                "conservative",
                "protection",
                "stable",
                "low risk",
            }
        )
    ):
        score += 10

        reasons.append(
            (
                "The partner profile aligns "
                "with conservative client needs."
            )
        )

    if (
        risk_profile
        in {
            "aggressive",
            "growth",
        }
        and any(
            phrase
            in lower_partner_context
            for phrase in {
                "growth",
                "investment",
                "portfolio",
                "wealth",
            }
        )
    ):
        score += 10

        reasons.append(
            (
                "The partner profile aligns "
                "with growth-oriented needs."
            )
        )

    if (
        risk_profile
        in {
            "medium",
            "moderate",
        }
        and any(
            phrase
            in lower_partner_context
            for phrase in {
                "balanced",
                "diversified",
                "planning",
                "advisory",
            }
        )
    ):
        score += 8

        reasons.append(
            (
                "The partner profile supports "
                "balanced planning requirements."
            )
        )

    if (
        client.priority
        and client.priority.lower()
        == "high"
        and partner.response_time_days
        is not None
        and partner.response_time_days
        <= 2
    ):
        score += 6

        reasons.append(
            (
                "The recorded response time "
                "supports a high-priority case."
            )
        )

    if not reasons:
        reasons.append(
            (
                "The partner is active and "
                "available in the current directory."
            )
        )

    score = max(
        35,
        min(
            score,
            99,
        ),
    )

    description = (
        partner.description
        or partner.best_for
        or partner.specialty
    )

    next_step = (
        f"Review {partner.name} with "
        f"{client.full_name}, confirm client "
        "consent, and create a referral draft."
    )

    return PartnerMatchItem(
        partner_id=partner.id,
        name=partner.name,
        partner_type=(
            partner.partner_type
        ),
        specialty=partner.specialty,
        description=description,
        contact_name=(
            partner.contact_name
        ),
        email=partner.email,
        phone=partner.phone,
        website=partner.website,
        service_area=(
            partner.service_area
        ),
        response_time_days=(
            partner.response_time_days
        ),
        match_score=score,
        why=reasons[:6],
        next_step=next_step,
    )


def build_referral_response(
    referral: Referral,
    client_name: str,
    partner_name: str | None,
) -> ReferralResponse:
    return ReferralResponse(
        id=referral.id,
        advisor_id=(
            referral.advisor_id
        ),
        client_id=referral.client_id,
        client_name=client_name,
        partner_id=referral.partner_id,
        partner_name=(
            partner_name
            or referral
            .partner_name_snapshot
        ),
        match_score=(
            referral.match_score
        ),
        reasons=list(
            referral.reasons or []
        ),
        notes=referral.notes,
        status=referral.status,
        created_at=(
            referral.created_at
        ),
        updated_at=(
            referral.updated_at
        ),
    )


@router.get(
    "/partners",
    response_model=list[
        PartnerResponse
    ],
)
def list_partners(
    search: str | None = Query(
        default=None,
        max_length=120,
    ),
    specialty: str | None = Query(
        default=None,
        max_length=240,
    ),
    partner_status: str | None = Query(
        default=None,
        alias="status",
        max_length=40,
    ),
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    query = select(Partner).where(
        Partner.advisor_id
        == advisor.id,
    )

    if search:
        search_value = (
            f"%{search.strip()}%"
        )

        query = query.where(
            or_(
                Partner.name.ilike(
                    search_value
                ),
                Partner.partner_type.ilike(
                    search_value
                ),
                Partner.specialty.ilike(
                    search_value
                ),
                Partner.best_for.ilike(
                    search_value
                ),
                Partner.description.ilike(
                    search_value
                ),
                Partner.contact_name.ilike(
                    search_value
                ),
            )
        )

    if specialty:
        query = query.where(
            func.lower(
                Partner.specialty
            )
            == specialty
            .strip()
            .lower()
        )

    if partner_status:
        query = query.where(
            Partner.status
            == validate_partner_status(
                partner_status
            )
        )

    partners = database.scalars(
        query.order_by(
            Partner.name.asc()
        )
    ).all()

    return [
        PartnerResponse.model_validate(
            partner
        )
        for partner in partners
    ]


@router.post(
    "/partners",
    response_model=PartnerResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_partner(
    payload: PartnerCreate,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    partner = Partner(
        advisor_id=advisor.id,
        name=payload.name.strip(),
        partner_type=(
            payload.partner_type
            .strip()
        ),
        specialty=(
            payload.specialty.strip()
        ),
        best_for=clean_optional_text(
            payload.best_for
        ),
        description=clean_optional_text(
            payload.description
        ),
        contact_name=clean_optional_text(
            payload.contact_name
        ),
        email=clean_optional_text(
            payload.email
        ),
        phone=clean_optional_text(
            payload.phone
        ),
        website=clean_optional_text(
            payload.website
        ),
        service_area=clean_optional_text(
            payload.service_area
        ),
        keywords=clean_keywords(
            payload.keywords
        ),
        response_time_days=(
            payload.response_time_days
        ),
        status=validate_partner_status(
            payload.status
        ),
    )

    database.add(partner)

    try:
        database.commit()
        database.refresh(partner)

    except IntegrityError as error:
        database.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "A partner with this name "
                "already exists."
            ),
        ) from error

    return PartnerResponse.model_validate(
        partner
    )


@router.post(
    "/partner-matching/recommend",
    response_model=PartnerMatchResponse,
)
def recommend_partner(
    payload: PartnerMatchRequest,
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
            )
        )
        .where(
            Client.id
            == payload.client_id,
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

    partners = database.scalars(
        select(Partner)
        .where(
            Partner.advisor_id
            == advisor.id,
            Partner.status
            == "ACTIVE",
        )
        .order_by(
            Partner.name.asc()
        )
    ).all()

    if not partners:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Add at least one active "
                "partner before generating "
                "a recommendation."
            ),
        )

    client_context = (
        build_client_context(
            client,
            payload.notes,
        )
    )

    ranked_partners = sorted(
        [
            score_partner(
                partner,
                client,
                client_context,
            )
            for partner in partners
        ],
        key=lambda item: (
            -item.match_score,
            item.name.lower(),
        ),
    )

    return PartnerMatchResponse(
        client={
            "id": client.id,
            "full_name": (
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
        },
        best_match=ranked_partners[0],
        other_partners=(
            ranked_partners[1:]
        ),
    )


@router.get(
    "/partners/{partner_id}",
    response_model=PartnerResponse,
)
def get_partner(
    partner_id: int,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    partner = database.scalar(
        select(Partner).where(
            Partner.id
            == partner_id,
            Partner.advisor_id
            == advisor.id,
        )
    )

    if partner is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Partner not found.",
        )

    return PartnerResponse.model_validate(
        partner
    )


@router.patch(
    "/partners/{partner_id}",
    response_model=PartnerResponse,
)
def update_partner(
    partner_id: int,
    payload: PartnerUpdate,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    partner = database.scalar(
        select(Partner).where(
            Partner.id
            == partner_id,
            Partner.advisor_id
            == advisor.id,
        )
    )

    if partner is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Partner not found.",
        )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    required_text_fields = {
        "name",
        "partner_type",
        "specialty",
    }

    optional_text_fields = {
        "best_for",
        "description",
        "contact_name",
        "email",
        "phone",
        "website",
        "service_area",
    }

    for field_name in (
        required_text_fields
    ):
        if field_name in update_data:
            value = update_data[
                field_name
            ]

            if value is None:
                raise HTTPException(
                    status_code=(
                        status
                        .HTTP_422_UNPROCESSABLE_ENTITY
                    ),
                    detail=(
                        f"{field_name} cannot "
                        "be empty."
                    ),
                )

            normalized_value = (
                value.strip()
            )

            if not normalized_value:
                raise HTTPException(
                    status_code=(
                        status
                        .HTTP_422_UNPROCESSABLE_ENTITY
                    ),
                    detail=(
                        f"{field_name} cannot "
                        "be empty."
                    ),
                )

            update_data[
                field_name
            ] = normalized_value

    for field_name in (
        optional_text_fields
    ):
        if field_name in update_data:
            update_data[
                field_name
            ] = clean_optional_text(
                update_data[
                    field_name
                ]
            )

    if "keywords" in update_data:
        update_data["keywords"] = (
            clean_keywords(
                update_data[
                    "keywords"
                ]
            )
        )

    if "status" in update_data:
        if update_data["status"] is None:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "Partner status cannot "
                    "be empty."
                ),
            )

        update_data["status"] = (
            validate_partner_status(
                update_data[
                    "status"
                ]
            )
        )

    for field_name, value in (
        update_data.items()
    ):
        setattr(
            partner,
            field_name,
            value,
        )

    try:
        database.commit()
        database.refresh(partner)

    except IntegrityError as error:
        database.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "A partner with this name "
                "already exists."
            ),
        ) from error

    return PartnerResponse.model_validate(
        partner
    )


@router.delete(
    "/partners/{partner_id}",
)
def delete_partner(
    partner_id: int,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    partner = database.scalar(
        select(Partner).where(
            Partner.id
            == partner_id,
            Partner.advisor_id
            == advisor.id,
        )
    )

    if partner is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Partner not found.",
        )

    partner_name = partner.name

    database.delete(partner)
    database.commit()

    return {
        "success": True,
        "deleted_partner_id": (
            partner_id
        ),
        "message": (
            f"{partner_name} was "
            "deleted successfully."
        ),
    }


@router.get(
    "/referrals",
    response_model=list[
        ReferralResponse
    ],
)
def list_referrals(
    referral_status: str | None = Query(
        default=None,
        alias="status",
        max_length=40,
    ),
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    query = select(Referral).where(
        Referral.advisor_id
        == advisor.id,
    )

    if referral_status:
        query = query.where(
            Referral.status
            == validate_referral_status(
                referral_status
            )
        )

    referrals = database.scalars(
        query.order_by(
            Referral.created_at.desc()
        )
    ).all()

    client_ids = {
        referral.client_id
        for referral in referrals
    }

    partner_ids = {
        referral.partner_id
        for referral in referrals
        if referral.partner_id
        is not None
    }

    clients = (
        database.scalars(
            select(Client).where(
                Client.id.in_(
                    client_ids
                )
            )
        ).all()
        if client_ids
        else []
    )

    partners = (
        database.scalars(
            select(Partner).where(
                Partner.id.in_(
                    partner_ids
                )
            )
        ).all()
        if partner_ids
        else []
    )

    client_names = {
        client.id: client.full_name
        for client in clients
    }

    partner_names = {
        partner.id: partner.name
        for partner in partners
    }

    return [
        build_referral_response(
            referral,
            client_names.get(
                referral.client_id,
                "Unknown client",
            ),
            partner_names.get(
                referral.partner_id
            ),
        )
        for referral in referrals
    ]


@router.post(
    "/referrals",
    response_model=ReferralResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_referral(
    payload: ReferralCreate,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    client = database.scalar(
        select(Client).where(
            Client.id
            == payload.client_id,
            Client.advisor_id
            == advisor.id,
        )
    )

    partner = database.scalar(
        select(Partner).where(
            Partner.id
            == payload.partner_id,
            Partner.advisor_id
            == advisor.id,
        )
    )

    if client is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Client not found.",
        )

    if partner is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Partner not found.",
        )

    referral = Referral(
        advisor_id=advisor.id,
        client_id=client.id,
        partner_id=partner.id,
        partner_name_snapshot=(
            partner.name
        ),
        match_score=(
            payload.match_score
        ),
        reasons=[
            item.strip()
            for item
            in payload.reasons
            if item.strip()
        ][:20],
        notes=clean_optional_text(
            payload.notes
        ),
        status=validate_referral_status(
            payload.status
        ),
    )

    database.add(referral)
    database.commit()
    database.refresh(referral)

    return build_referral_response(
        referral,
        client.full_name,
        partner.name,
    )


@router.patch(
    "/referrals/{referral_id}",
    response_model=ReferralResponse,
)
def update_referral(
    referral_id: int,
    payload: ReferralUpdate,
    database: Session = Depends(
        get_db
    ),
    advisor: Advisor = Depends(
        get_current_advisor
    ),
):
    referral = database.scalar(
        select(Referral).where(
            Referral.id
            == referral_id,
            Referral.advisor_id
            == advisor.id,
        )
    )

    if referral is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Referral not found.",
        )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    if (
        "status" in update_data
        and update_data["status"]
        is not None
    ):
        referral.status = (
            validate_referral_status(
                update_data["status"]
            )
        )

    if "notes" in update_data:
        referral.notes = (
            clean_optional_text(
                update_data["notes"]
            )
        )

    database.commit()
    database.refresh(referral)

    client = database.get(
        Client,
        referral.client_id,
    )

    partner = (
        database.get(
            Partner,
            referral.partner_id,
        )
        if referral.partner_id
        is not None
        else None
    )

    return build_referral_response(
        referral,
        (
            client.full_name
            if client
            else "Unknown client"
        ),
        (
            partner.name
            if partner
            else None
        ),
    )