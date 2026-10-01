from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agent import ask_sql_agent
from .database import (
    get_database_info,
    get_table_data
)


app = FastAPI(
    title="SQLMind AI",
    description="AI-powered Text-to-SQL Agent",
    version="1.0.0"
)


origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class QueryRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )


class QueryResponse(BaseModel):
    question: str
    sql: str | None = None
    result: Any = None
    answer: str
    execution_time: float


@app.get("/")
def root():
    return {
        "name": "SQLMind AI",
        "description": "AI-powered Text-to-SQL Agent",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "SQLMind AI"
    }


@app.get("/database")
def database():
    try:
        return get_database_info()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@app.get("/database/{table_name}")
def table_data(table_name: str):
    try:
        return get_table_data(
            table_name
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@app.post(
    "/query",
    response_model=QueryResponse
)
def query_database(
    request: QueryRequest
):
    try:
        result = ask_sql_agent(
            request.question
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        error_message = str(error)

        if "429" in error_message:
            raise HTTPException(
                status_code=429,
                detail=(
                    "AI API quota exceeded. "
                    "Please try again later."
                )
            )

        raise HTTPException(
            status_code=500,
            detail=error_message
        )