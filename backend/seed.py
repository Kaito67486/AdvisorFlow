from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from database import Base, SessionLocal, engine
from models import Advisor, Client, Meeting, Task
from security import hash_password


def get_or_create_advisor(
    database,
    *,
    email: str,
    display_name: str,
    password: str,
) -> Advisor:
    advisor = database.scalar(
        select(Advisor).where(
            Advisor.email == email,
        )    )

    if advisor is not None:
        return advisor

    advisor = Advisor(
        email=email,
        display_name=display_name,
        password_hash=hash_password(password),
        role="ADVISOR",
    )

    database.add(advisor)
    database.flush()

    return advisor


def get_or_create_client(
    database,
    *,
    advisor: Advisor,
    full_name: str,
    email: str,
    age: int,
    occupation: str,
    risk_profile: str,
    goal: str,
    priority: str,
    last_contact_at,
    next_follow_up_at,
) -> Client:
    client = database.scalar(
        select(Client).where(
            Client.advisor_id == advisor.id,
            Client.full_name == full_name,
        )
    )

    if client is not None:
        return client

    client = Client(
        advisor_id=advisor.id,
        full_name=full_name,
        email=email,
        age=age,
        occupation=occupation,
        risk_profile=risk_profile,
        goal=goal,
        priority=priority,
        last_contact_at=last_contact_at,
        next_follow_up_at=next_follow_up_at,
    )

    database.add(client)
    database.flush()

    return client


def seed_database():
    Base.metadata.create_all(bind=engine)

    database = SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        alex = get_or_create_advisor(
            database,
            email="alex@advisorflow.com",
            display_name="Alex",
            password="advisor123",
        )

        sarah = get_or_create_advisor(
            database,
            email="sarah@advisorflow.com",
            display_name="Sarah",
            password="advisor123",
        )

        alice = get_or_create_client(
            database,
            advisor=alex,
            full_name="Alice Tan",
            email="alice.tan@example.com",
            age=45,
            occupation="Business Owner",
            risk_profile="Conservative",
            goal="Retirement Planning",
            priority="High",
            last_contact_at=now - timedelta(days=9),
            next_follow_up_at=now - timedelta(days=1),
        )

        michael = get_or_create_client(
            database,
            advisor=alex,
            full_name="Michael Wong",
            email="michael.wong@example.com",
            age=52,
            occupation="Engineer",
            risk_profile="Medium",
            goal="Policy Renewal",
            priority="High",
            last_contact_at=now - timedelta(days=12),
            next_follow_up_at=now - timedelta(days=2),
        )

        daniel = get_or_create_client(
            database,
            advisor=alex,
            full_name="Daniel Lim",
            email="daniel.lim@example.com",
            age=38,
            occupation="Product Manager",
            risk_profile="Medium",
            goal="Investment Portfolio Review",
            priority="Normal",
            last_contact_at=now - timedelta(days=4),
            next_follow_up_at=now + timedelta(days=1),
        )

        jason = get_or_create_client(
            database,
            advisor=sarah,
            full_name="Jason Lee",
            email="jason.lee@example.com",
            age=41,
            occupation="Consultant",
            risk_profile="Aggressive",
            goal="Long-Term Wealth Growth",
            priority="High",
            last_contact_at=now,
            next_follow_up_at=now + timedelta(days=7),
        )

        existing_meeting = database.scalar(
            select(Meeting).where(
                Meeting.client_id == alice.id,
                Meeting.title == "Retirement Planning Review",
            )
        )

        if existing_meeting is None:
            database.add(
                Meeting(
                    client_id=alice.id,
                    advisor_id=alex.id,
                    title="Retirement Planning Review",
                    scheduled_at=now.replace(
                        hour=10,
                        minute=0,
                        second=0,
                        microsecond=0,
                    ),
                    raw_notes=(
                        "Client wants to review lower-risk "
                        "retirement income options."
                    ),
                )
            )

        existing_second_meeting = database.scalar(
            select(Meeting).where(
                Meeting.client_id == daniel.id,
                Meeting.title == "Investment Portfolio Update",
            )
        )

        if existing_second_meeting is None:
            database.add(
                Meeting(
                    client_id=daniel.id,
                    advisor_id=alex.id,
                    title="Investment Portfolio Update",
                    scheduled_at=now.replace(
                        hour=14,
                        minute=0,
                        second=0,
                        microsecond=0,
                    ),
                )
            )

        existing_task = database.scalar(
            select(Task).where(
                Task.client_id == alice.id,
                Task.title == "Send retirement information",
            )
        )

        if existing_task is None:
            database.add(
                Task(
                    client_id=alice.id,
                    advisor_id=alex.id,
                    title="Send retirement information",
                    description=(
                        "Send the information discussed "
                        "during the previous meeting."
                    ),
                    status="PENDING",
                    priority="HIGH",
                    source="MEETING",
                    due_at=now - timedelta(days=1),
                )
            )

        existing_second_task = database.scalar(
            select(Task).where(
                Task.client_id == michael.id,
                Task.title == "Follow up on policy renewal",
            )
        )

        if existing_second_task is None:
            database.add(
                Task(
                    client_id=michael.id,
                    advisor_id=alex.id,
                    title="Follow up on policy renewal",
                    description=(
                        "Contact the client regarding the "
                        "upcoming renewal."
                    ),
                    status="PENDING",
                    priority="HIGH",
                    source="MANUAL",
                    due_at=now - timedelta(days=2),
                )
            )

        database.commit()

        print("AdvisorFlow demo data created successfully.")
        print("")
        print("Demo accounts:")
        print("alex@advisorflow.com / advisor123")
        print("sarah@advisorflow.com / advisor123")

    except Exception:
        database.rollback()
        raise
    finally:
        database.close()


if __name__ == "__main__":
    seed_database()