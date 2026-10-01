import os
import sqlite3

from langchain_community.utilities import SQLDatabase

from .database_manager import (
    get_active_database_path,
    get_database_name
)


def get_database():
    db_path = get_active_database_path()

    if not os.path.exists(db_path):
        raise FileNotFoundError(
            f"Database file not found: {db_path}"
        )

    return SQLDatabase.from_uri(
        f"sqlite:///{db_path}",
        sample_rows_in_table_info=3
    )


def get_connection():
    db_path = get_active_database_path()

    if not os.path.exists(db_path):
        raise FileNotFoundError(
            f"Database file not found: {db_path}"
        )

    connection = sqlite3.connect(
        db_path
    )

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

            name = table["name"]

            rows = connection.execute(
                f'SELECT COUNT(*) FROM "{name}"'
            ).fetchone()[0]

            result.append({
                "name": name,
                "rows": rows
            })

        return {
            "database": get_database_name(),
            "table_count": len(result),
            "tables": result
        }

    finally:
        connection.close()


def get_table_data(
    table_name,
    limit=20
):

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
            raise ValueError(
                "Invalid table name."
            )

        safe_limit = max(
            1,
            min(
                int(limit),
                50
            )
        )

        columns = [
            row["name"]
            for row in connection.execute(
                f'PRAGMA table_info("{table_name}")'
            ).fetchall()
        ]

        records = connection.execute(
            f'''
            SELECT *
            FROM "{table_name}"
            LIMIT {safe_limit}
            '''
        ).fetchall()

        total_rows = connection.execute(
            f'''
            SELECT COUNT(*)
            FROM "{table_name}"
            '''
        ).fetchone()[0]

        return {
            "table": table_name,
            "columns": columns,
            "rows": [
                [
                    row[column]
                    for column in columns
                ]
                for row in records
            ],
            "row_count": total_rows
        }

    finally:
        connection.close()