import os
import re
import time
from typing import Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

from .database_manager import get_database
from .security import validate_sql


load_dotenv()


GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY environment variable is not configured."
    )


MODEL_NAME = "gemini-3.5-flash-lite"


def get_model():

    return ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        google_api_key=GOOGLE_API_KEY,
        temperature=0
    )


def clean_sql(text: str) -> str:

    text = text.strip()

    text = re.sub(
        r"```sql",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"```",
        "",
        text
    )

    text = text.strip()

    if "SQL:" in text.upper():

        parts = re.split(
            r"SQL:",
            text,
            flags=re.IGNORECASE
        )

        if len(parts) > 1:
            text = parts[-1].strip()

    return text.strip()


def generate_sql(question: str) -> str:

    database = get_database()

    schema = database.get_table_info()

    model = get_model()

    prompt = f"""
You are SQLMind AI, a Text-to-SQL database assistant.

Your task is to convert the user's natural language question
into ONE safe SQLite SELECT query.

DATABASE SCHEMA:

{schema}

USER QUESTION:

{question}

RULES:

1. Return only SQL.
2. Only SELECT queries are allowed.
3. Never use INSERT.
4. Never use UPDATE.
5. Never use DELETE.
6. Never use DROP.
7. Never use ALTER.
8. Never use CREATE.
9. Never use PRAGMA.
10. Never generate multiple SQL statements.
11. Use only tables and columns that exist in the schema.
12. Use SQLite-compatible SQL.
13. Do not use markdown.
14. Do not explain the SQL.
15. Use JOIN when necessary.

SQL:
"""

    response = model.invoke(prompt)

    content = response.content

    if isinstance(content, list):
        content = " ".join(
            str(item)
            for item in content
        )

    sql = clean_sql(str(content))

    return sql


def execute_sql(sql: str):

    database = get_database()

    valid, message = validate_sql(sql)

    if not valid:
        raise ValueError(message)

    return database.run(sql)


def generate_answer(
    question: str,
    sql: str,
    result: Any
) -> str:

    model = get_model()

    prompt = f"""
You are SQLMind AI.

Answer the user's database question using the SQL query
and database result.

USER QUESTION:
{question}

SQL QUERY:
{sql}

DATABASE RESULT:
{result}

Rules:

1. Give a clear natural-language answer.
2. Use only the supplied database result.
3. Do not invent information.
4. Keep the answer concise.
5. If the result contains a count, clearly state the count.
6. If the result contains rows, summarize the important information.
"""

    response = model.invoke(prompt)

    content = response.content

    if isinstance(content, list):
        content = " ".join(
            str(item)
            for item in content
        )

    return str(content).strip()


def ask_sql_agent(question: str):

    start_time = time.time()

    if not question or not question.strip():
        raise ValueError(
            "Question cannot be empty."
        )

    question = question.strip()

    sql = generate_sql(question)

    result = execute_sql(sql)

    answer = generate_answer(
        question,
        sql,
        result
    )

    execution_time = round(
        time.time() - start_time,
        3
    )

    return {
        "question": question,
        "sql": sql,
        "result": result,
        "answer": answer,
        "execution_time": execution_time
    }