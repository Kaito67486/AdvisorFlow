from contextlib import asynccontextmanager
from datetime import (
    datetime,
    time,
    timedelta,
    timezone,
)
import logging
from pathlib import Path

from dashboard_workflow import (
    router as dashboard_workflow_router,
)

from client_ai import (
    router as client_ai_router,
)

from meeting_workflow import (
    router as meeting_workflow_router,
)

from partner_workflow import (
    router as partner_workflow_router,
)

from dashboard_workflow import (
    router as dashboard_workflow_router,
)

from client_ai import (
    router as client_ai_router,
)

from meeting_workflow import (
    router as meeting_workflow_router,
)

from partner_workflow import (
    router as partner_workflow_router,
)


from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Response,
    status,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_, select
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from advisor_engine import (
    generate_ai_brief,
)

from ai_provider import get_ai_provider
from database import Base, engine, get_db
from dependencies import get_current_advisor
from models import (
    Advisor,
    Client,
    Meeting,
    Task,
)
from schemas import (
    AdvisorResponse,
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    GenerateBriefRequest,
    GenerateSummaryRequest,
    GenerateSummaryResponse,
    LoginRequest,
    MeetingCreate,
    MeetingResponse,
    TaskCreate,
    TaskResponse,
)
from security import (
    create_access_token,
    verify_password,
)
from settings import settings


logger = logging.getLogger(
    "advisorflow"
)


BACKEND_DIR = (
    Path(__file__).resolve().parent
)

FRONTEND_DIR = (
    BACKEND_DIR.parent / "frontend"
)

CSS_DIR = FRONTEND_DIR / "css"
JS_DIR = FRONTEND_DIR / "js"


ALLOWED_HTML_PAGES = {
    "dashboard",
    "client",
    "client_details",
    "meeting",
    "partner", 
    "logout",
    "index"
}


@asynccontextmanager
async def lifespan(
    _app: FastAPI,
):
    try:
        Base.metadata.create_all(
            bind=engine,
        )

        logger.info(
            "Database schema check completed."
        )
    except Exception:
        logger.exception(
            "Database schema check failed. "
            "The frontend will still be served, "
            "but database APIs may fail."
        )

    yield


app = FastAPI(
    title=settings.app_name,
    version="0.3.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    client_ai_router
)

app.include_router(
    meeting_workflow_router
)

app.include_router(
    dashboard_workflow_router
)

app.include_router(
    partner_workflow_router
)

if not FRONTEND_DIR.exists():
    raise RuntimeError(
        "Frontend directory was not found: "
        f"{FRONTEND_DIR}"
    )


if not CSS_DIR.exists():
    raise RuntimeError(
        "Frontend CSS directory was not found: "
        f"{CSS_DIR}"
    )


if not JS_DIR.exists():
    raise RuntimeError(
        "Frontend JavaScript directory was not found: "
        f"{JS_DIR}"
    )


app.mount(
    "/css",
    StaticFiles(
        directory=str(CSS_DIR),
    ),
    name="css",
)


app.mount(
    "/js",
    StaticFiles(
        directory=str(JS_DIR),
    ),
    name="js",
)


@app.get("/ping")
def ping():
    return {
        "status": "ok",
        "service": "advisorflow-api",
        "timestamp": datetime.now(
            timezone.utc,
        ).isoformat(),
    }


@app.get("/api")
def api_home():
    return {
        "message": (
            "AdvisorFlow API running"
        ),
        "environment": settings.app_env,
    }


@app.get("/health")
def health_check(
    database: Session = Depends(get_db),
):
    try:
        database.execute(
            select(1)
        )

        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(
                timezone.utc,
            ).isoformat(),
        }
    except Exception as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "Database connection failed."
            ),
        ) from error


@app.post("/auth/login")
def login(
    payload: LoginRequest,
    response: Response,
    database: Session = Depends(get_db),
):
    email = (
        payload.email.strip().lower()
    )

    advisor = database.scalar(
        select(Advisor).where(
            func.lower(Advisor.email)
            == email,
        )
    )

    if (
        advisor is None
        or not advisor.is_active
        or not verify_password(
            payload.password,
            advisor.password_hash,
        )
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid email or password."
            ),
        )

    token = create_access_token(
        advisor_id=advisor.id,
        email=advisor.email,
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=(
            settings.jwt_expire_minutes
            * 60
        ),
        path="/",
    )

    return {
        "success": True,
        "user": (
            AdvisorResponse.model_validate(
                advisor
            )
        ),
    }


@app.post("/auth/logout")
def logout(
    response: Response,
):
    response.delete_cookie(
        key="access_token",
        path="/",
        secure=settings.is_production,
        samesite="lax",
    )

    return {
        "success": True,
        "message": (
            "Logged out successfully."
        ),
    }


@app.get("/auth/me")
def get_current_user(
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    return {
        "success": True,
        "user": (
            AdvisorResponse.model_validate(
                advisor
            )
        ),
    }


@app.get(
    "/clients",
    response_model=list[ClientResponse],
)
def list_clients(
    search: str | None = Query(
        default=None,
        max_length=120,
    ),
    priority: str | None = Query(
        default=None,
        max_length=40,
    ),
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    query = select(Client).where(
        Client.advisor_id == advisor.id,
    )

    if search:
        search_value = (
            f"%{search.strip()}%"
        )

        query = query.where(
            or_(
                Client.full_name.ilike(
                    search_value
                ),
                Client.email.ilike(
                    search_value
                ),
                Client.occupation.ilike(
                    search_value
                ),
                Client.goal.ilike(
                    search_value
                ),
            )
        )

    if priority:
        query = query.where(
            func.lower(Client.priority)
            == priority.strip().lower()
        )

    query = query.order_by(
        Client.full_name.asc(),
    )

    clients = database.scalars(
        query
    ).all()

    return [
        ClientResponse.model_validate(
            client
        )
        for client in clients
    ]


@app.post(
    "/clients",
    response_model=ClientResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_client(
    payload: ClientCreate,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    client = Client(
        advisor_id=advisor.id,
        full_name=(
            payload.full_name.strip()
        ),
        email=payload.email,
        phone=payload.phone,
        age=payload.age,
        occupation=payload.occupation,
        risk_profile=(
            payload.risk_profile
        ),
        goal=payload.goal,
        priority=payload.priority,
    )

    database.add(client)
    database.commit()
    database.refresh(client)

    return ClientResponse.model_validate(
        client
    )


@app.get("/clients/{client_id}")
def get_client(
    client_id: int,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
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
            Client.advisor_id == advisor.id,
        )
    )

    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "The client does not exist or is not "
                "available to this advisor."
            ),
        )

    meetings = sorted(
        client.meetings,
        key=lambda meeting: meeting.scheduled_at,
        reverse=True,
    )

    tasks = sorted(
        client.tasks,
        key=lambda task: (
            task.due_at is None,
            task.due_at
            or datetime.max.replace(
                tzinfo=timezone.utc,
            ),
        ),
    )

    return {
        "client": ClientResponse.model_validate(
            client
        ),
        "meetings": [
            MeetingResponse.model_validate(
                meeting
            )
            for meeting in meetings
        ],
        "tasks": [
            TaskResponse.model_validate(
                task
            )
            for task in tasks
        ],
    }


@app.patch(
    "/clients/{client_id}",
    response_model=ClientResponse,
)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    client = database.scalar(
        select(Client).where(
            Client.id == client_id,
            Client.advisor_id == advisor.id,
        )
    )

    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "The client does not exist or is not "
                "available to this advisor."
            ),
        )

    update_data = payload.model_dump(
        exclude_unset=True,
    )

    if "full_name" in update_data:
        full_name = update_data["full_name"]

        if full_name is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail="Full name cannot be empty.",
            )

        normalized_name = full_name.strip()

        if not normalized_name:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail="Full name cannot be empty.",
            )

        update_data["full_name"] = (
            normalized_name
        )

    allowed_risk_profiles = {
        "Conservative",
        "Medium",
        "Aggressive",
    }

    if (
        "risk_profile" in update_data
        and update_data["risk_profile"]
        not in allowed_risk_profiles
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail="Invalid risk profile.",
        )

    allowed_priorities = {
        "High",
        "Normal",
        "Low",
    }

    if (
        "priority" in update_data
        and update_data["priority"]
        not in allowed_priorities
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail="Invalid priority.",
        )

    allowed_statuses = {
        "ACTIVE",
        "INACTIVE",
    }

    if (
        "status" in update_data
        and update_data["status"]
        not in allowed_statuses
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail="Invalid client status.",
        )

    for field_name, value in (
        update_data.items()
    ):
        setattr(
            client,
            field_name,
            value,
        )

    try:
        database.commit()
        database.refresh(client)

    except Exception as error:
        database.rollback()

        logger.exception(
            "Client update failed."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to update the client."
            ),
        ) from error

    return ClientResponse.model_validate(
        client
    )


@app.delete("/clients/{client_id}")
def delete_client(
    client_id: int,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    client = database.scalar(
        select(Client).where(
            Client.id == client_id,
            Client.advisor_id == advisor.id,
        )
    )

    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "The client does not exist or is not "
                "available to this advisor."
            ),
        )

    deleted_client_id = client.id
    deleted_client_name = client.full_name

    try:
        database.delete(client)
        database.commit()

    except Exception as error:
        database.rollback()

        logger.exception(
            "Client deletion failed."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to delete the client."
            ),
        ) from error

    return {
        "success": True,
        "deleted_client_id": (
            deleted_client_id
        ),
        "message": (
            f"{deleted_client_name} "
            "was deleted successfully."
        ),
    }


@app.post(
    "/meetings",
    response_model=MeetingResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_meeting(
    payload: MeetingCreate,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
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

    meeting = Meeting(
        client_id=client.id,
        advisor_id=advisor.id,
        title=payload.title.strip(),
        scheduled_at=(
            payload.scheduled_at
        ),
        raw_notes=payload.raw_notes,
    )

    database.add(meeting)
    database.commit()
    database.refresh(meeting)

    return MeetingResponse.model_validate(
        meeting
    )


@app.get(
    "/meetings",
    response_model=list[MeetingResponse],
)
def list_meetings(
    client_id: int | None = None,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    query = select(Meeting).where(
        Meeting.advisor_id == advisor.id,
    )

    if client_id is not None:
        query = query.where(
            Meeting.client_id
            == client_id,
        )

    query = query.order_by(
        Meeting.scheduled_at.desc(),
    )

    meetings = database.scalars(
        query
    ).all()

    return [
        MeetingResponse.model_validate(
            meeting
        )
        for meeting in meetings
    ]


@app.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_task(
    payload: TaskCreate,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
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

    task = Task(
        client_id=client.id,
        advisor_id=advisor.id,
        title=payload.title.strip(),
        description=(
            payload.description
        ),
        priority=payload.priority,
        due_at=payload.due_at,
    )

    database.add(task)

    if payload.due_at is not None:
        client.next_follow_up_at = (
            payload.due_at
        )

    database.commit()
    database.refresh(task)

    return TaskResponse.model_validate(
        task
    )


@app.patch(
    "/tasks/{task_id}/complete",
    response_model=TaskResponse,
)
def complete_task(
    task_id: int,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    task = database.scalar(
        select(Task).where(
            Task.id == task_id,
            Task.advisor_id
            == advisor.id,
        )
    )

    if task is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Task not found.",
        )

    task.status = "COMPLETED"
    task.completed_at = datetime.now(
        timezone.utc,
    )

    database.commit()
    database.refresh(task)

    return TaskResponse.model_validate(
        task
    )


@app.get("/dashboard")
def get_dashboard(
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    now = datetime.now(timezone.utc)

    today_start = datetime.combine(
        now.date(),
        time.min,
        tzinfo=timezone.utc,
    )

    today_end = (
        today_start
        + timedelta(days=1)
    )

    total_clients = database.scalar(
        select(
            func.count(Client.id)
        ).where(
            Client.advisor_id
            == advisor.id,
        )
    )

    high_priority_clients = (
        database.scalar(
            select(
                func.count(Client.id)
            ).where(
                Client.advisor_id
                == advisor.id,
                func.lower(
                    Client.priority
                )
                == "high",
            )
        )
    )

    pending_follow_ups = (
        database.scalar(
            select(
                func.count(Task.id)
            ).where(
                Task.advisor_id
                == advisor.id,
                Task.status
                == "PENDING",
            )
        )
    )

    today_meetings = (
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
                Meeting.scheduled_at
                >= today_start,
                Meeting.scheduled_at
                < today_end,
            )
            .order_by(
                Meeting.scheduled_at.asc()
            )
        ).all()
    )

    overdue_tasks = (
        database.scalars(
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
                Task.due_at < now,
            )
            .order_by(
                Task.due_at.asc()
            )
        ).all()
    )

    return {
        "stats": {
            "totalClients": (
                total_clients or 0
            ),
            "todayMeetings": len(
                today_meetings
            ),
            "pendingFollowUps": (
                pending_follow_ups
                or 0
            ),
            "highPriorityClients": (
                high_priority_clients
                or 0
            ),
        },
        "todayMeetings": [
            {
                "id": meeting.id,
                "clientId": (
                    meeting.client_id
                ),
                "client": (
                    meeting.client.full_name
                ),
                "topic": meeting.title,
                "scheduledAt": (
                    meeting
                    .scheduled_at
                    .isoformat()
                ),
            }
            for meeting
            in today_meetings
        ],
        "overdueTasks": [
            {
                "id": task.id,
                "clientId": (
                    task.client_id
                ),
                "client": (
                    task.client.full_name
                ),
                "title": task.title,
                "dueAt": (
                    task.due_at.isoformat()
                    if task.due_at
                    else None
                ),
                "status": task.status,
            }
            for task
            in overdue_tasks
        ],
    }


@app.post("/generate-brief")
def generate_brief(
    payload: GenerateBriefRequest,
    _advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    return generate_ai_brief(
        payload.client.model_dump()
    )






@app.post(
    "/generate-summary",
    response_model=(
        GenerateSummaryResponse
    ),
)
def generate_summary(
    payload: GenerateSummaryRequest,
    database: Session = Depends(get_db),
    advisor: Advisor = Depends(
        get_current_advisor,
    ),
):
    if payload.client_id is not None:
        client = database.scalar(
            select(Client).where(
                Client.id
                == payload.client_id,
                Client.advisor_id
                == advisor.id,
            )
        )

        if client is None:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
                detail=(
                    "The client does not "
                    "exist or is not "
                    "available to this "
                    "advisor."
                ),
            )

    provider = get_ai_provider()

    result = (
        provider
        .generate_meeting_summary(
            payload.notes
        )
    )

    return GenerateSummaryResponse(
        summary=result.summary,
        goal=result.goal,
        actions=result.actions,
        email=result.email,
    )


@app.get(
    "/",
    include_in_schema=False,
)
def serve_index():
    return FileResponse(
        FRONTEND_DIR
        / "index.html"
    )


@app.get(
    "/{page_name}.html",
    include_in_schema=False,
)
def serve_html_page(
    page_name: str,
):
    if (
        page_name
        not in ALLOWED_HTML_PAGES
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Page not found.",
        )

    page_path = (
        FRONTEND_DIR
        / f"{page_name}.html"
    )

    if not page_path.exists():
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Page file not found."
            ),
        )

    return FileResponse(page_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.app_host,
        port=settings.app_port,
        reload=False,
        log_level="debug",
    )