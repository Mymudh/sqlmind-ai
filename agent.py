import os
import sys
import argparse

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

console = Console()

SYSTEM_PROMPT = """
You are an expert Text-to-SQL AI agent.

Your job is to answer natural-language questions by safely querying the SQL database.

Follow these rules:

1. Always inspect the available database tables first.
2. Inspect the schema of the relevant tables before writing SQL.
3. Generate syntactically correct SQL for the database dialect.
4. Only select columns relevant to the user's question.
5. Do not use SELECT * unless absolutely necessary.
6. Limit results to 5 rows unless the user requests a different number.
7. Double-check every SQL query before executing it.
8. If a SQL query fails, analyze the error, correct the query, and try again.
9. Only perform read-only SQL operations.
10. NEVER execute INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE,
    REPLACE, CREATE, or other destructive SQL statements.
11. Use the actual database results to answer the question.
12. Never invent database values.
13. Explain the final result clearly in simple language.
"""


def create_sql_agent():
    db_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "chinook.db"
    )

    if not os.path.exists(db_path):
        raise FileNotFoundError(
            f"Database file not found: {db_path}"
        )

    db = SQLDatabase.from_uri(
        f"sqlite:///{db_path}",
        sample_rows_in_table_info=3
    )

    model = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash",
        temperature=0,
        max_retries=5
    )

    toolkit = SQLDatabaseToolkit(
        db=db,
        llm=model
    )

    tools = toolkit.get_tools()

    agent = create_agent(
        model=model,
        tools=tools,
        system_prompt=SYSTEM_PROMPT
    )

    return agent


def extract_answer(result):
    messages = result.get("messages", [])

    if not messages:
        return "No response was returned."

    for message in reversed(messages):
        content = getattr(message, "content", None)

        if isinstance(content, str) and content.strip():
            return content

        if isinstance(content, list):
            text_parts = []

            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        text = item.get("text", "")

                        if text:
                            text_parts.append(text)
                elif isinstance(item, str):
                    text_parts.append(item)

            if text_parts:
                return "\n".join(text_parts)

    return str(messages[-1])


def main():
    parser = argparse.ArgumentParser(
        description="Gemini Text-to-SQL AI Agent"
    )

    parser.add_argument(
        "question",
        type=str,
        help="Natural-language question for the database"
    )

    args = parser.parse_args()

    console.print(
        Panel(
            f"[bold cyan]Question:[/bold cyan]\n\n{args.question}",
            border_style="cyan"
        )
    )

    try:
        console.print(
            "\n[dim]Creating Gemini SQL Agent...[/dim]"
        )

        agent = create_sql_agent()

        console.print(
            "[dim]Inspecting database and processing query...[/dim]\n"
        )

        result = agent.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": args.question
                    }
                ]
            }
        )

        answer = extract_answer(result)

        console.print(
            Panel(
                f"[bold green]Answer:[/bold green]\n\n{answer}",
                border_style="green"
            )
        )

    except Exception as error:
        console.print(
            Panel(
                f"[bold red]Error:[/bold red]\n\n{error}",
                border_style="red"
            )
        )

        sys.exit(1)


if __name__ == "__main__":
    main()