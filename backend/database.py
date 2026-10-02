import os
import sqlite3
from langchain_community.utilities import SQLDatabase

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "chinook.db")


def get_db_path():
    return DB_PATH


def check_database():
    return {
        "exists": os.path.exists(DB_PATH),
        "path": DB_PATH,
        "size": os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
    }


def get_database():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(
            f"chinook.db not found at: {DB_PATH}"
        )

    return SQLDatabase.from_uri(
        f"sqlite:///{DB_PATH}",
        sample_rows_in_table_info=3
    )


def get_connection():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(
            f"chinook.db not found at: {DB_PATH}"
        )

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def get_database_info():
    connection = get_connection()

    try:
        tables = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        ).fetchall()

        result = []

        for table in tables:
            table_name = table["name"]

            row_count = connection.execute(
                f'SELECT COUNT(*) FROM "{table_name}"'
            ).fetchone()[0]

            result.append({
                "name": table_name,
                "rows": row_count
            })

        return {
            "database": "Chinook SQLite",
            "table_count": len(result),
            "tables": result
        }

    finally:
        connection.close()


def get_table_data(table_name, limit=20):
    connection = get_connection()

    try:
        tables = {
            row["name"]
            for row in connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                AND name NOT LIKE 'sqlite_%'
                """
            ).fetchall()
        }

        if table_name not in tables:
            raise ValueError("Invalid table name.")

        safe_limit = max(1, min(int(limit), 50))

        columns = [
            row["name"]
            for row in connection.execute(
                f'PRAGMA table_info("{table_name}")'
            ).fetchall()
        ]

        records = connection.execute(
            f'SELECT * FROM "{table_name}" LIMIT {safe_limit}'
        ).fetchall()

        total_rows = connection.execute(
            f'SELECT COUNT(*) FROM "{table_name}"'
        ).fetchone()[0]

        return {
            "table": table_name,
            "columns": columns,
            "rows": [
                [row[column] for column in columns]
                for row in records
            ],
            "row_count": total_rows
        }

    finally:
        connection.close()