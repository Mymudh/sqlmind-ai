import re
import time

from dotenv import load_dotenv

load_dotenv()

from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.agent_toolkits import SQLDatabaseToolkit

from .database import get_database
from .security import validate_sql


model = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    temperature=0,
    max_retries=2
)


def extract_text(message):
    content = getattr(
        message,
        "content",
        ""
    )

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts = []

        for item in content:
            if isinstance(item, dict):
                text = item.get(
                    "text",
                    ""
                )

                if text:
                    parts.append(text)

        return "\n".join(parts)

    return str(content)


def extract_sql(text):
    if not text:
        return ""

    matches = re.findall(
        r"```sql\s*(.*?)```",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if matches:
        return matches[-1].strip()

    matches = re.findall(
        r"\bSELECT\b.*?(?:;|$)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if matches:
        return matches[-1].strip()

    return ""


def clean_sql(sql):
    if not sql:
        return ""

    sql = sql.strip()

    sql = re.sub(
        r"^```sql",
        "",
        sql,
        flags=re.IGNORECASE
    )

    sql = re.sub(
        r"```$",
        "",
        sql
    )

    return sql.strip()


def build_agent():

    database = get_database()

    toolkit = SQLDatabaseToolkit(
        db=database,
        llm=model
    )

    toolkit_tools = toolkit.get_tools()

    tools = []

    for current_tool in toolkit_tools:

        if current_tool.name == "sql_db_query":
            continue

        tools.append(current_tool)

    @tool
    def safe_sql_query(query: str) -> str:
        """
        Execute a read-only SQL SELECT query.
        Only SELECT statements are allowed.
        """

        is_safe, message = validate_sql(
            query
        )

        if not is_safe:
            return (
                f"SQL BLOCKED: {message}"
            )

        try:

            result = database.run(
                query
            )

            return str(result)

        except Exception as error:

            return (
                "SQL execution error: "
                f"{error}"
            )

    tools.append(
        safe_sql_query
    )

    system_prompt = """
You are SQLMind AI, an autonomous Text-to-SQL database agent.

Your task is to answer natural-language questions
about the currently connected SQLite database.

WORKFLOW:

1. Inspect the database schema when necessary.
2. Identify the correct tables and columns.
3. Generate valid SQLite SQL.
4. Only generate READ-ONLY SELECT queries.
5. Execute the SQL using safe_sql_query.
6. If execution fails, inspect the error and correct the SQL.
7. Return a concise natural-language answer.
8. Never modify the database.

SECURITY RULES:

- Only SELECT statements are allowed.
- Never use INSERT.
- Never use UPDATE.
- Never use DELETE.
- Never use DROP.
- Never use ALTER.
- Never use CREATE.
- Never use REPLACE.
- Never use ATTACH.
- Never use DETACH.
- Never use PRAGMA.
- Never execute multiple SQL statements.
- Never invent database information.

Use the database tools to inspect the actual schema
and data before answering questions.

When the user asks for database information,
always use the actual connected database.
"""

    return create_agent(
        model=model,
        tools=tools,
        system_prompt=system_prompt
    )


def ask_sql_agent(question):

    if not question or not question.strip():
        raise ValueError(
            "Question cannot be empty."
        )

    start_time = time.time()

    agent = build_agent()

    result = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": question.strip()
                }
            ]
        }
    )

    messages = result.get(
        "messages",
        []
    )

    final_answer = ""

    for message in reversed(messages):

        text = extract_text(
            message
        )

        if text:
            final_answer = text
            break

    sql = ""

    for message in messages:

        text = extract_text(
            message
        )

        detected_sql = extract_sql(
            text
        )

        if detected_sql:
            sql = detected_sql

    sql = clean_sql(
        sql
    )

    database_result = None

    for message in messages:

        tool_name = getattr(
            message,
            "name",
            ""
        )

        if tool_name == "safe_sql_query":

            database_result = extract_text(
                message
            )

            break

    execution_time = round(
        time.time() - start_time,
        3
    )

    return {
        "question": question.strip(),
        "sql": sql or None,
        "result": database_result,
        "answer": final_answer,
        "execution_time": execution_time
    }