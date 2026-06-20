
def generate_ai_brief(client):
    return {
        "focus": [""]
    }

def generate_partner_recommendation(
    client,
    meeting_notes="",
):
    occupation = client.get("occupation") or ""
    risk = client.get("riskProfile") or ""
    goal = client.get("goal") or ""
    last_meeting = client.get("lastMeeting") or ""

    combined_context = " ".join(
        [
            occupation,
            risk,
            goal,
            last_meeting,
            meeting_notes,
        ]
    ).lower()

    partners = [
        {
            "name": "ABC Insurance",
            "specialty": (
                "Retirement and conservative planning"
            ),
            "score": 10,
            "reason": [],
        },
        {
            "name": "SecureLife Group",
            "specialty": "Family protection",
            "score": 10,
            "reason": [],
        },
        {
            "name": "WealthBridge",
            "specialty": "Investment advisory",
            "score": 10,
            "reason": [],
        },
    ]

    for partner in partners:
        specialty = partner["specialty"].lower()

        if (
            "retirement" in combined_context
            and "retirement" in specialty
        ):
            partner["score"] += 40
            partner["reason"].append(
                "Relevant retirement planning experience."
            )

        if (
            "conservative" in combined_context
            and "conservative" in specialty
        ):
            partner["score"] += 30
            partner["reason"].append(
                "Experience supporting conservative client requirements."
            )

        if (
            (
                "family" in combined_context
                or "daughter" in combined_context
                or "education" in combined_context
            )
            and "family" in specialty
        ):
            partner["score"] += 25
            partner["reason"].append(
                "Relevant family protection experience."
            )

        if (
            "investment" in combined_context
            and "investment" in specialty
        ):
            partner["score"] += 30
            partner["reason"].append(
                "Relevant investment advisory experience."
            )

        if not partner["reason"]:
            partner["reason"].append(
                "Available in the current partner directory."
            )

    partners.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    best_partner = partners[0]

    return {
        "bestMatch": {
            "name": best_partner["name"],
            "description": best_partner["specialty"],
            "matchScore": min(
                best_partner["score"],
                100,
            ),
            "why": best_partner["reason"],
            "nextStep": (
                f"Review {best_partner['name']} with the "
                "client before creating a referral."
            ),
        },
        "otherPartners": [
            {
                "name": partner["name"],
                "specialty": partner["specialty"],
                "matchScore": min(
                    partner["score"],
                    100,
                ),
            }
            for partner in partners[1:]
        ],
    }