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
    "PRAGMA"
}


def validate_sql(sql: str) -> tuple[bool, str]:

    if not sql or not sql.strip():
        return False, "SQL query is empty."

    cleaned_sql = sql.strip()

    normalized_sql = re.sub(
        r"\s+",
        " ",
        cleaned_sql
    ).upper()

    if not normalized_sql.startswith("SELECT"):
        return False, "Only SELECT queries are allowed."

    for keyword in FORBIDDEN_SQL_KEYWORDS:

        pattern = rf"\b{keyword}\b"

        if re.search(
            pattern,
            normalized_sql
        ):
            return (
                False,
                f"Forbidden SQL operation detected: {keyword}"
            )

    if ";" in cleaned_sql.rstrip(";"):
        return (
            False,
            "Multiple SQL statements are not allowed."
        )

    return True, "SQL query is safe."