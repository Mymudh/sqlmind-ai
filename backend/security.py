import re


FORBIDDEN_SQL_KEYWORDS = {
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "REPLACE",
    "ATTACH",
    "DETACH",
    "PRAGMA",
}


def clean_sql(sql):
    if not sql:
        return ""

    sql = str(sql).strip()

    sql = re.sub(
        r"^```sql\s*",
        "",
        sql,
        flags=re.IGNORECASE
    )

    sql = re.sub(
        r"^```\s*",
        "",
        sql
    )

    sql = re.sub(
        r"\s*```$",
        "",
        sql
    )

    sql = sql.strip()

    return sql


def validate_sql(sql):
    if not sql or not sql.strip():
        return False, "SQL query is empty."

    cleaned_sql = clean_sql(sql)

    normalized_sql = re.sub(
        r"\s+",
        " ",
        cleaned_sql
    ).strip()

    normalized_upper = normalized_sql.upper()

    if not normalized_upper.startswith("SELECT"):
        return False, "Only SELECT queries are allowed."

    for keyword in FORBIDDEN_SQL_KEYWORDS:
        pattern = rf"\b{keyword}\b"

        if re.search(
            pattern,
            normalized_upper
        ):
            return False, (
                f"Forbidden SQL operation detected: {keyword}"
            )

    statement_without_final_semicolon = (
        normalized_sql.rstrip()
    )

    if statement_without_final_semicolon.endswith(";"):
        statement_without_final_semicolon = (
            statement_without_final_semicolon[:-1]
        )

    if ";" in statement_without_final_semicolon:
        return False, (
            "Multiple SQL statements are not allowed."
        )

    return True, "SQL query is safe."