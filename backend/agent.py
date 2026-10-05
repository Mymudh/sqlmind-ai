import json
import os
import re
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai

from .database import get_connection, get_database


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE, override=True)


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash"
)

GEMINI_FALLBACK_MODEL = os.getenv(
    "GEMINI_FALLBACK_MODEL",
    "gemini-3.5-flash-lite"
)


if not GEMINI_API_KEY:
    raise RuntimeError(
        f"Gemini API key is not configured. "
        f"Expected GEMINI_API_KEY or GOOGLE_API_KEY in: {ENV_FILE}"
    )


client = genai.Client(
    api_key=GEMINI_API_KEY
)


def generate_with_fallback(
    prompt: str
) -> Any:
    try:
        return client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )

    except Exception as primary_error:
        error_text = str(primary_error).upper()

        temporary_error = (
            "503" in error_text
            or "UNAVAILABLE" in error_text
            or "HIGH DEMAND" in error_text
            or "RESOURCE_EXHAUSTED" in error_text
            or "429" in error_text
        )

        if not temporary_error or not GEMINI_FALLBACK_MODEL:
            raise

        time.sleep(1)

        try:
            return client.models.generate_content(
                model=GEMINI_FALLBACK_MODEL,
                contents=prompt
            )

        except Exception:
            raise primary_error


FORBIDDEN_SQL_WORDS = {
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "REPLACE",
    "TRUNCATE",
    "ATTACH",
    "DETACH",
    "VACUUM",
    "REINDEX",
    "PRAGMA",
    "GRANT",
    "REVOKE",
    "MERGE"
}


def clean_sql(text: str) -> str:
    if not text:
        raise ValueError(
            "Gemini returned an empty SQL query."
        )

    sql = text.strip()

    sql = re.sub(
        r"```(?:sql)?",
        "",
        sql,
        flags=re.IGNORECASE
    )

    sql = sql.replace(
        "```",
        ""
    ).strip()

    sql = re.sub(
        r"^\s*sql\s*:\s*",
        "",
        sql,
        flags=re.IGNORECASE
    )

    cleaned_lines = []

    for line in sql.splitlines():
        stripped = line.strip()

        if stripped.startswith("--"):
            continue

        if (
            stripped.startswith("/*")
            and stripped.endswith("*/")
        ):
            continue

        cleaned_lines.append(line)

    sql = "\n".join(
        cleaned_lines
    ).strip()

    match = re.search(
        r"\b(?:SELECT|WITH)\b",
        sql,
        flags=re.IGNORECASE
    )

    if match:
        sql = sql[match.start():]

    sql = sql.strip()

    if ";" in sql:
        statements = [
            statement.strip()
            for statement in sql.split(";")
            if statement.strip()
        ]

        if len(statements) > 1:
            raise ValueError(
                "Only one SQL statement is allowed."
            )

        sql = statements[0]

    return sql.strip()


def validate_sql(sql: str) -> str:
    sql = clean_sql(sql)

    normalized = re.sub(
        r"\s+",
        " ",
        sql
    ).strip()

    if not normalized:
        raise ValueError(
            "Gemini returned an empty SQL query."
        )

    if not re.match(
        r"^(SELECT|WITH)\b",
        normalized,
        flags=re.IGNORECASE
    ):
        raise ValueError(
            "Only SELECT queries are allowed."
        )

    for word in FORBIDDEN_SQL_WORDS:
        pattern = rf"\b{re.escape(word)}\b"

        if re.search(
            pattern,
            normalized,
            flags=re.IGNORECASE
        ):
            raise ValueError(
                f"Unsafe SQL operation detected: {word}"
            )

    if ";" in normalized:
        raise ValueError(
            "Multiple SQL statements are not allowed."
        )

    return sql


def get_schema() -> str:
    database = get_database()

    schema = database.get_table_info()

    if not schema:
        raise RuntimeError(
            "Unable to read database schema."
        )

    return schema


def generate_sql(
    question: str,
    schema: str
) -> str:

    prompt = f"""
You are SQLMind AI, a professional Text-to-SQL agent.

Convert the user's natural-language question into exactly
ONE safe SQLite SELECT query.

DATABASE SCHEMA:
{schema}

USER QUESTION:
{question}

STRICT RULES:

1. Return ONLY the SQL query.
2. Do not return Markdown.
3. Do not use ```sql.
4. Do not explain the query.
5. The query must be read-only.
6. The query must begin with SELECT or WITH.
7. Never use INSERT.
8. Never use UPDATE.
9. Never use DELETE.
10. Never use DROP.
11. Never use ALTER.
12. Never use CREATE.
13. Never use REPLACE.
14. Never use TRUNCATE.
15. Never use PRAGMA.
16. Never use ATTACH.
17. Never use DETACH.
18. Never use VACUUM.
19. Never use REINDEX.
20. Never use GRANT.
21. Never use REVOKE.
22. Never use MERGE.
23. Never generate multiple SQL statements.
24. Use only tables and columns present in the schema.
25. Use SQLite-compatible SQL.
26. For counting records, use COUNT(*).
27. For totals, use SUM() when appropriate.
28. For averages, use AVG().
29. For maximum values, use MAX().
30. For minimum values, use MIN().
31. For ranking questions, use ORDER BY and LIMIT.
32. For top questions, return the most relevant result.
33. For aggregate questions, return the aggregate value.
34. Use clear column aliases.
35. Use JOIN when required by the schema.
36. Do not guess table or column names.

Examples:

Question:
How many customers are there?

SQL:
SELECT COUNT(*) AS total_customers
FROM Customer

Question:
How many invoices are there?

SQL:
SELECT COUNT(*) AS total_invoices
FROM Invoice

Question:
What is the total invoice amount?

SQL:
SELECT SUM(Total) AS total_invoice_amount
FROM Invoice

Question:
What is the average invoice amount?

SQL:
SELECT AVG(Total) AS average_invoice_amount
FROM Invoice

Question:
Who is the top artist?

SQL:
SELECT ar.Name AS artist,
       COUNT(*) AS track_count
FROM Artist ar
JOIN Album al
    ON al.ArtistId = ar.ArtistId
JOIN Track t
    ON t.AlbumId = al.AlbumId
GROUP BY ar.ArtistId, ar.Name
ORDER BY track_count DESC
LIMIT 1

Question:
How many employees are there?

SQL:
SELECT COUNT(*) AS total_employees
FROM Employee

Question:
How many tracks are there?

SQL:
SELECT COUNT(*) AS total_tracks
FROM Track

Question:
What are the top 5 customers by spending?

SQL:
SELECT c.CustomerId,
       c.FirstName,
       c.LastName,
       SUM(i.Total) AS total_spent
FROM Customer c
JOIN Invoice i
    ON i.CustomerId = c.CustomerId
GROUP BY c.CustomerId,
         c.FirstName,
         c.LastName
ORDER BY total_spent DESC
LIMIT 5

Return ONLY the SQL query.
"""

    response = generate_with_fallback(
        prompt
    )

    text = response.text

    if not text:
        raise RuntimeError(
            "Gemini did not return a SQL response."
        )

    return validate_sql(text)


def execute_sql(
    sql: str
) -> list[dict[str, Any]]:

    sql = validate_sql(sql)

    connection = get_connection()

    try:
        cursor = connection.execute(sql)

        rows = cursor.fetchall()

        columns = [
            description[0]
            for description in (
                cursor.description or []
            )
        ]

        result = []

        for row in rows:
            item = {}

            for column in columns:
                value = row[column]

                if isinstance(
                    value,
                    bytes
                ):
                    value = value.decode(
                        "utf-8",
                        errors="replace"
                    )

                item[column] = value

            result.append(item)

        return result

    finally:
        connection.close()


def make_json_safe(
    value: Any
) -> Any:

    if value is None:
        return None

    if isinstance(
        value,
        (
            str,
            int,
            float,
            bool
        )
    ):
        return value

    if isinstance(
        value,
        bytes
    ):
        return value.decode(
            "utf-8",
            errors="replace"
        )

    if isinstance(
        value,
        list
    ):
        return [
            make_json_safe(item)
            for item in value
        ]

    if isinstance(
        value,
        tuple
    ):
        return [
            make_json_safe(item)
            for item in value
        ]

    if isinstance(
        value,
        dict
    ):
        return {
            str(key): make_json_safe(item)
            for key, item in value.items()
        }

    return str(value)


def generate_answer(
    question: str,
    sql: str,
    result: list[dict[str, Any]]
) -> str:

    safe_result = make_json_safe(
        result
    )

    result_json = json.dumps(
        safe_result,
        ensure_ascii=False,
        default=str
    )

    prompt = f"""
You are SQLMind AI, an AI database analyst.

Answer the user's database question using ONLY
the database result provided below.

USER QUESTION:
{question}

SQL QUERY:
{sql}

DATABASE RESULT:
{result_json}

RULES:

1. Give a direct answer.
2. Use only the database result.
3. Never invent information.
4. If the result contains one number, clearly state that number.
5. If the result contains rows, summarize the important result.
6. If multiple rows are returned, explain the result clearly.
7. If there are no rows, say that no matching records were found.
8. Keep the answer concise and professional.
9. Do not mention Gemini.
10. Do not mention internal prompts.
11. Do not generate SQL.
12. Do not modify the database.

Return only the natural-language answer.
"""

    response = generate_with_fallback(
        prompt
    )

    answer = response.text

    if not answer:

        if not result:
            return "No matching records were found."

        if (
            len(result) == 1
            and len(result[0]) == 1
        ):
            value = next(
                iter(
                    result[0].values()
                )
            )

            return f"The result is {value}."

        return (
            f"The query returned "
            f"{len(result)} result(s)."
        )

    return answer.strip()


def ask_sql_agent(
    question: str
) -> dict[str, Any]:

    start_time = time.perf_counter()

    question = question.strip()

    if not question:
        raise ValueError(
            "Please enter a database question."
        )

    if len(question) > 2000:
        raise ValueError(
            "Question is too long."
        )

    schema = get_schema()

    sql = generate_sql(
        question,
        schema
    )

    sql = validate_sql(
        sql
    )

    result = execute_sql(
        sql
    )

    result = make_json_safe(
        result
    )

    answer = generate_answer(
        question,
        sql,
        result
    )

    execution_time = round(
        time.perf_counter()
        - start_time,
        3
    )

    return {
        "question": question,
        "sql": sql,
        "result": result,
        "answer": answer,
        "execution_time": execution_time
    }