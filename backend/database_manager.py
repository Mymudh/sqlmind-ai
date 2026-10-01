import os
import shutil
import sqlite3
import uuid
from pathlib import Path

BASE_DIR = Path(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

DATABASE_DIR = BASE_DIR / "databases"
DATABASE_DIR.mkdir(
    parents=True,
    exist_ok=True
)

CHINOOK_PATH = BASE_DIR / "chinook.db"
ACTIVE_DB_FILE = DATABASE_DIR / "active_database.txt"


def initialize_database_manager():
    if not ACTIVE_DB_FILE.exists():
        ACTIVE_DB_FILE.write_text(
            str(CHINOOK_PATH),
            encoding="utf-8"
        )


def get_active_database_path():
    initialize_database_manager()

    path = Path(
        ACTIVE_DB_FILE.read_text(
            encoding="utf-8"
        ).strip()
    )

    if not path.exists():
        ACTIVE_DB_FILE.write_text(
            str(CHINOOK_PATH),
            encoding="utf-8"
        )
        return CHINOOK_PATH

    return path


def set_active_database(path):
    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            "Database file does not exist."
        )

    ACTIVE_DB_FILE.write_text(
        str(path),
        encoding="utf-8"
    )


def get_database_name():
    path = get_active_database_path()

    if path.resolve() == CHINOOK_PATH.resolve():
        return "Chinook SQLite"

    return path.stem


def list_databases():
    initialize_database_manager()

    databases = []

    if CHINOOK_PATH.exists():
        databases.append({
            "name": "Chinook SQLite",
            "filename": "chinook.db",
            "path": str(CHINOOK_PATH),
            "type": "sqlite",
            "is_default": True,
            "is_active": (
                get_active_database_path().resolve()
                == CHINOOK_PATH.resolve()
            )
        })

    for file in DATABASE_DIR.iterdir():

        if not file.is_file():
            continue

        if file.name == "active_database.txt":
            continue

        if file.suffix.lower() not in {
            ".db",
            ".sqlite",
            ".sqlite3"
        }:
            continue

        databases.append({
            "name": file.stem,
            "filename": file.name,
            "path": str(file),
            "type": "sqlite",
            "is_default": False,
            "is_active": (
                get_active_database_path().resolve()
                == file.resolve()
            )
        })

    return databases


def validate_sqlite_database(path):
    connection = sqlite3.connect(
        f"file:{path}?mode=ro",
        uri=True
    )

    try:
        result = connection.execute(
            """
            PRAGMA database_list
            """
        ).fetchall()

        if not result:
            raise ValueError(
                "The uploaded file is not a valid SQLite database."
            )

        connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type='table'
            LIMIT 1
            """
        ).fetchall()

    finally:
        connection.close()


def save_uploaded_database(source_path, original_filename):
    extension = Path(
        original_filename
    ).suffix.lower()

    allowed_extensions = {
        ".db",
        ".sqlite",
        ".sqlite3"
    }

    if extension not in allowed_extensions:
        raise ValueError(
            "Only .db, .sqlite and .sqlite3 files are supported."
        )

    unique_name = (
        f"{Path(original_filename).stem}_"
        f"{uuid.uuid4().hex[:8]}"
        f"{extension}"
    )

    destination = DATABASE_DIR / unique_name

    shutil.copy2(
        source_path,
        destination
    )

    try:
        validate_sqlite_database(destination)
    except Exception:
        destination.unlink(
            missing_ok=True
        )
        raise ValueError(
            "The uploaded file is not a valid SQLite database."
        )

    return destination


def delete_database(path):
    path = Path(path)

    if path.resolve() == CHINOOK_PATH.resolve():
        raise ValueError(
            "The default Chinook database cannot be deleted."
        )

    if path.resolve() == get_active_database_path().resolve():
        set_active_database(CHINOOK_PATH)

    if path.exists():
        path.unlink()


initialize_database_manager()