def generate_daily_assistant(
    message: str,
) -> dict[str, str]:
    normalized_message = (
        message.strip().lower()
    )

    if not normalized_message:
        return {
            "reply": (
                "Please enter a question so I can assist you."
            )
        }

    if normalized_message in {
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
    }:
        return {
            "reply": (
                "Hello! I can help you review today's "
                "priorities, prepare for meetings, identify "
                "follow-ups, and review partner matches."
            )
        }
    
    if normalized_message in {
    "bye",
    "good bye",
    "goodbye",
    "see you",
    "thank you",
    "thanks"
    }:
        return {
            "reply": (
                "Goodbye! Have a productive day. "
                "Feel free to return whenever you need help with meetings, follow-ups, or partner recommendations."
            )
        } 
    
    if normalized_message in {"clear", "clear chat", "reset", "reset chat"}:
        
        return {
            "reply": "CLEAR_CHAT"     
    }



    if (
        "priority" in normalized_message
        or "priorities" in normalized_message
        or "what should i do" in normalized_message
        or "today" in normalized_message
    ):
        return {
            "reply": (
                "Today's suggested priorities:\n"
                "1. Prepare for the next scheduled meeting.\n"
                "2. Complete overdue client follow-ups.\n"
                "3. Review high-priority clients with "
                "unfinished actions."
            )
        }

    if (
        "prepare" in normalized_message
        or "meeting" in normalized_message
        or "brief" in normalized_message
    ):
        return {
            "reply": (
                "For meeting preparation:\n"
                "- Review the client's profile and goals.\n"
                "- Check previous notes and unfinished commitments.\n"
                "- Prepare the relevant documents.\n"
                "- Confirm the expected next action."
            )
        }

    if (
        "follow-up" in normalized_message
        or "follow up" in normalized_message
        or "overdue" in normalized_message
    ):
        return {
            "reply": (
                "Review clients with overdue tasks first. "
                "Confirm the latest commitment, contact the "
                "client, and schedule a clear next follow-up date."
            )
        }

    if (
        "partner" in normalized_message
        or "referral" in normalized_message
    ):
        return {
            "reply": (
                "Review the client's stated need before "
                "selecting a partner. Verify suitability and "
                "obtain client consent before creating a referral."
            )
        }

    if (
        "email" in normalized_message
        or "message" in normalized_message
    ):
        return {
            "reply": (
                "AdvisorFlow can prepare a follow-up email draft "
                "from confirmed meeting notes. The advisor should "
                "review and edit the draft before sending it."
            )
        }

    return {
        "reply": (
            "I can help with today's priorities, meeting "
            "preparation, client follow-ups, partner matching, "
            "and follow-up email drafts."
        )
    }