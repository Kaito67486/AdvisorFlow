from openai import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    RateLimitError,
)

from openai import OpenAI

from settings import settings


def main() -> None:
    if not settings.openai_api_key:
        print("ERROR: OPENAI_API_KEY is missing.")
        return

    print("Testing OpenAI API...")
    print(
        f"Summary model: "
        f"{settings.openai_summary_model}"
    )

    client = OpenAI(
        api_key=settings.openai_api_key,
    )

    try:
        response = client.responses.create(
            model=settings.openai_summary_model,
            input=(
                "Reply with exactly this text: "
                "ADVISORFLOW_API_OK"
            ),
        )

        print("SUCCESS:")
        print(response.output_text)

    except AuthenticationError as error:
        print("AUTHENTICATION ERROR:")
        print("The API key is invalid or belongs to the wrong project.")
        print(error)

    except RateLimitError as error:
        print("RATE LIMIT OR CREDIT ERROR:")
        print(
            "The account may have no API credits, "
            "or the project limit may have been reached."
        )
        print(error)

    except APIConnectionError as error:
        print("CONNECTION ERROR:")
        print(
            "The backend could not connect to OpenAI."
        )
        print(error)

    except APIStatusError as error:
        print("OPENAI API ERROR:")
        print(f"Status code: {error.status_code}")
        print(f"Response: {error.response}")
        print(error)

    except Exception as error:
        print("UNEXPECTED ERROR:")
        print(type(error).__name__)
        print(error)


if __name__ == "__main__":
    main()