import { useState } from "react"
import "./App.css"

const API_URL = "http://127.0.0.1:8000"

function App() {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)

  const [answer, setAnswer] = useState("")
  const [sql, setSql] = useState("")
  const [result, setResult] = useState(null)
  const [executionTime, setExecutionTime] = useState(null)

  const [error, setError] = useState("")

  const [database, setDatabase] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableData, setTableData] = useState(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [tableError, setTableError] = useState("")

  const [openFaq, setOpenFaq] = useState(0)

  const loadDatabase = async () => {
    setError("")
    setTableError("")

    try {
      const response = await fetch(`${API_URL}/database`)

      let data = {}

      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load database."
        )
      }

      setDatabase(data)
      setSelectedTable(null)
      setTableData(null)
      setTableError("")

      setTimeout(() => {
        document
          .getElementById("database-explorer")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          })
      }, 100)
    } catch (err) {
      setDatabase(null)
      setTableData(null)
      setSelectedTable(null)

      setError(
        err.message ||
        "Unable to connect to the backend."
      )
    }
  }

  const loadTable = async (tableName) => {
    setSelectedTable(tableName)
    setTableData(null)
    setTableLoading(true)
    setTableError("")
    setError("")

    try {
      const response = await fetch(
        `${API_URL}/database/${encodeURIComponent(tableName)}`
      )

      let data = {}

      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
          `Unable to load ${tableName}.`
        )
      }

      if (
        !data ||
        !Array.isArray(data.columns) ||
        !Array.isArray(data.rows)
      ) {
        throw new Error(
          "The backend returned an invalid table response."
        )
      }

      setTableData(data)
    } catch (err) {
      setTableData(null)

      setTableError(
        err.message ||
        `Unable to load ${tableName}.`
      )
    } finally {
      setTableLoading(false)
    }
  }

  const askSQLMind = async () => {
    if (!question.trim()) {
      setError("Please enter a question.")
      return
    }

    setLoading(true)
    setError("")

    setAnswer("")
    setSql("")
    setResult(null)
    setExecutionTime(null)

    try {
      const response = await fetch(
        `${API_URL}/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: question.trim()
          })
        }
      )

      let data = {}

      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Unable to process your question."
        )
      }

      setAnswer(data.answer || "")
      setSql(data.sql || "")
      setResult(data.result ?? null)
      setExecutionTime(data.execution_time ?? null)

      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          })
      }, 100)
    } catch (err) {
      setError(
        err.message ||
        "Unable to connect to SQLMind AI."
      )
    } finally {
      setLoading(false)
    }
  }

  const scrollToWorkspace = () => {
    document
      .getElementById("workspace")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
  }

  const scrollToSection = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
  }

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault()
      askSQLMind()
    }
  }

  const formatResult = () => {
    if (
      result === null ||
      result === undefined
    ) {
      return ""
    }

    if (typeof result === "string") {
      return result
    }

    return JSON.stringify(
      result,
      null,
      2
    )
  }

  const faqs = [
    {
      question: "What is SQLMind AI?",
      answer:
        "SQLMind AI is an AI-powered Text-to-SQL agent that converts natural-language questions into SQL queries, executes them against a database, and explains the results."
    },
    {
      question: "Do I need to know SQL?",
      answer:
        "No. You can ask questions using normal natural language. SQLMind generates the SQL query automatically."
    },
    {
      question: "Is the database read-only?",
      answer:
        "Yes. SQLMind is designed around read-only database access. Destructive operations such as INSERT, UPDATE, DELETE, DROP and ALTER are blocked."
    },
    {
      question: "What database does the demo use?",
      answer:
        "The current demo uses the Chinook SQLite database containing 11 tables and real sample records."
    },
    {
      question: "Can I see the generated SQL?",
      answer:
        "Yes. After a question is processed, SQLMind displays the generated SQL query, database response and AI-generated explanation."
    },
    {
      question: "Can I explore individual tables?",
      answer:
        "Yes. The Database Explorer lets you inspect table names, row counts, columns and actual records."
    }
  ]

  return (
    <div className="app">

      <header className="header">

        <div className="brand">

          <div className="brand-icon">
            SQL
          </div>

          <div>
            <h1>SQLMind AI</h1>
            <p>AI-Powered Data Analyst</p>
          </div>

        </div>

        <nav className="site-nav">

          <button
            onClick={() =>
              scrollToSection("features")
            }
          >
            Features
          </button>

          <button
            onClick={() =>
              scrollToSection("use-cases")
            }
          >
            Use Cases
          </button>

          <button
            onClick={() =>
              scrollToSection("sample-preview")
            }
          >
            Preview
          </button>

          <button
            onClick={() =>
              scrollToSection("faq")
            }
          >
            FAQ
          </button>

        </nav>

        <div className="header-status">
          <span className="status-dot"></span>
          Backend Online
        </div>

      </header>

      <main>

        <section className="hero-section">

          <div className="hero-content">

            <div className="hero-badge">
              <span className="badge-dot"></span>
              AUTONOMOUS TEXT-TO-SQL AGENT
            </div>

            <h2>
              Ask your database
              <span> anything.</span>
            </h2>

            <p>
              Transform natural-language questions into
              safe SQL, execute them against your database,
              and receive intelligent AI-powered answers.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-button"
                onClick={scrollToWorkspace}
              >
                Start Query
                <span>→</span>
              </button>

              <button
                className="secondary-button"
                onClick={loadDatabase}
              >
                Explore Database
              </button>

            </div>

            <div className="hero-stats">

              <div>
                <strong>
                  {database?.table_count || 11}
                </strong>

                <span>
                  Tables
                </span>
              </div>

              <div>
                <strong>
                  AI
                </strong>

                <span>
                  SQL Agent
                </span>
              </div>

              <div>
                <strong>
                  100%
                </strong>

                <span>
                  Read Only
                </span>
              </div>

            </div>

          </div>

          <div className="hero-visual">

            <div className="scene">

              <div className="orbit orbit-one"></div>
              <div className="orbit orbit-two"></div>
              <div className="orbit orbit-three"></div>

              <div className="floating-node node-one">
                SQL
              </div>

              <div className="floating-node node-two">
                AI
              </div>

              <div className="floating-node node-three">
                DB
              </div>

              <div className="floating-node node-four">
                RAG
              </div>

              <div className="database-stack">

                <div className="db-layer layer-top">
                  <span>SQL</span>
                </div>

                <div className="db-layer layer-middle">
                  <span>QUERY</span>
                </div>

                <div className="db-layer layer-bottom">
                  <span>DATABASE</span>
                </div>

                <div className="db-core">

                  <div className="core-ring"></div>

                  <div className="core-center">
                    AI
                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        <section
          className="features-section"
          id="features"
        >

          <div className="section-heading">

            <span>
              INTELLIGENT DATA INTERACTION
            </span>

            <h3>
              From question to insight.
            </h3>

            <p>
              SQLMind connects natural language,
              AI agents, database tools and secure
              SQL execution.
            </p>

          </div>

          <div className="feature-grid">

            <div className="feature-card">

              <div className="feature-icon">
                NL
              </div>

              <h3>
                Natural Language
              </h3>

              <p>
                Ask database questions normally
                without manually writing SQL queries.
              </p>

              <span className="feature-number">
                01
              </span>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                AI
              </div>

              <h3>
                AI SQL Agent
              </h3>

              <p>
                The agent discovers schemas,
                generates SQL, executes tools
                and explains results.
              </p>

              <span className="feature-number">
                02
              </span>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                ✓
              </div>

              <h3>
                Safe Queries
              </h3>

              <p>
                SQL validation prevents destructive
                database operations before execution.
              </p>

              <span className="feature-number">
                03
              </span>

            </div>

          </div>

        </section>

        <section className="how-section">

          <div className="section-heading">

            <span>
              HOW IT WORKS
            </span>

            <h3>
              From natural language to answer.
            </h3>

            <p>
              SQLMind turns a simple question into
              a validated database result.
            </p>

          </div>

          <div className="process-grid">

            <div className="process-card">
              <span>01</span>

              <div className="process-icon">
                ?
              </div>

              <h3>
                Question
              </h3>

              <p>
                Ask your database a question
                using natural language.
              </p>
            </div>

            <div className="process-card">
              <span>02</span>

              <div className="process-icon">
                DB
              </div>

              <h3>
                Schema
              </h3>

              <p>
                The agent understands tables,
                columns and relationships.
              </p>
            </div>

            <div className="process-card">
              <span>03</span>

              <div className="process-icon">
                SQL
              </div>

              <h3>
                Generate
              </h3>

              <p>
                The AI generates a read-only
                SQL query.
              </p>
            </div>

            <div className="process-card">
              <span>04</span>

              <div className="process-icon">
                ✓
              </div>

              <h3>
                Execute
              </h3>

              <p>
                The validated query runs
                against the database.
              </p>
            </div>

            <div className="process-card">
              <span>05</span>

              <div className="process-icon">
                AI
              </div>

              <h3>
                Answer
              </h3>

              <p>
                SQLMind explains the database
                result in natural language.
              </p>
            </div>

          </div>

        </section>

        <section
          className="use-cases-section"
          id="use-cases"
        >

          <div className="section-heading">

            <span>
              USE CASES
            </span>

            <h3>
              Built for intelligent data work.
            </h3>

            <p>
              Use SQLMind to interact with structured
              data without manually writing every query.
            </p>

          </div>

          <div className="use-case-grid">

            <div className="use-case-card">

              <div className="use-case-icon">
                DATA
              </div>

              <h3>
                Data Analysts
              </h3>

              <p>
                Ask questions, inspect records and
                quickly generate database insights.
              </p>

              <span>
                ANALYSIS
              </span>

            </div>

            <div className="use-case-card">

              <div className="use-case-icon">
                BI
              </div>

              <h3>
                Business Intelligence
              </h3>

              <p>
                Convert business questions into
                structured database queries.
              </p>

              <span>
                INSIGHTS
              </span>

            </div>

            <div className="use-case-card">

              <div className="use-case-icon">
                DEV
              </div>

              <h3>
                Developers
              </h3>

              <p>
                Explore schemas and generate SQL
                while developing database applications.
              </p>

              <span>
                DEVELOPMENT
              </span>

            </div>

            <div className="use-case-card">

              <div className="use-case-icon">
                DB
              </div>

              <h3>
                Database Exploration
              </h3>

              <p>
                Inspect tables, row counts, columns
                and actual database records.
              </p>

              <span>
                EXPLORATION
              </span>

            </div>

          </div>

        </section>

        <section
          className="sample-section"
          id="sample-preview"
        >

          <div className="section-heading">

            <span>
              PRODUCT PREVIEW
            </span>

            <h3>
              See SQLMind think.
            </h3>

            <p>
              From natural-language questions to safe SQL
              and database insights.
            </p>

          </div>

          <div className="product-flow">

            <div className="product-card">

              <div className="product-card-header">

                <div className="product-card-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <span className="product-card-title">
                  SQLMind AI
                </span>

              </div>

              <div className="product-question">

                <span className="product-label">
                  NATURAL LANGUAGE
                </span>

                <h3>
                  Which customers spent
                  the most?
                </h3>

                <div className="product-search">
                  Ask SQLMind
                  <span>
                    →
                  </span>
                </div>

                <div className="product-agent-status">

                  <span></span>

                  AI Agent Ready

                </div>

              </div>

            </div>

            <div className="product-card">

              <div className="product-card-header">

                <div className="product-card-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <span className="product-card-title">
                  AI Agent
                </span>

              </div>

              <div className="agent-flow">

                <div className="agent-step">

                  <div className="agent-check">
                    ✓
                  </div>

                  Understanding database schema

                </div>

                <div className="agent-step">

                  <div className="agent-check">
                    ✓
                  </div>

                  Generating safe SQL

                </div>

                <div className="agent-step">

                  <div className="agent-check">
                    ✓
                  </div>

                  Validating query

                </div>

                <div className="agent-step">

                  <div className="agent-check">
                    ✓
                  </div>

                  Executing read-only query

                </div>

                <div className="agent-result">
                  412 database records analyzed
                </div>

              </div>

            </div>

            <div className="product-card">

              <div className="product-card-header">

                <div className="product-card-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <span className="product-card-title">
                  Generated SQL
                </span>

              </div>

              <div className="sql-preview">

                <code>

                  <span className="sql-comment">
                    -- READ ONLY QUERY
                  </span>

                  {"\nSELECT CustomerId,"}

                  {"\nSUM(Total) AS spending"}

                  {"\nFROM Invoice"}

                  {"\nGROUP BY CustomerId"}

                  {"\nORDER BY spending DESC;"}

                </code>

                <div className="sql-readonly">
                  READ ONLY
                </div>

              </div>

            </div>

          </div>

        </section>

        <section
          className="workspace-section"
          id="workspace"
        >

          <div className="workspace-heading">

            <div>

              <span className="section-label">
                AI DATA WORKSPACE
              </span>

              <h2>
                Query your database.
              </h2>

              <p>
                Ask SQLMind a question and let
                the agent generate and execute SQL.
              </p>

            </div>

            <button
              className="database-button"
              onClick={loadDatabase}
            >
              Database
            </button>

          </div>

          <div className="workspace">

            <div className="workspace-top">

              <div className="workspace-indicator">
                <span></span>
                SQLMind Agent Ready
              </div>

              <span className="shortcut">
                Ctrl + Enter
              </span>

            </div>

            <div className="ai-search-box">

              <div className="search-icon">
                ✦
              </div>

              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask your database anything..."
              />

              {question && (
                <button
                  className="search-clear"
                  onClick={() =>
                    setQuestion("")
                  }
                  type="button"
                >
                  ×
                </button>
              )}

              <button
                className="search-submit"
                onClick={askSQLMind}
                disabled={loading}
                type="button"
              >

                {loading ? (
                  <span className="search-spinner"></span>
                ) : (
                  <>
                    Ask
                    <span>
                      →
                    </span>
                  </>
                )}

              </button>

            </div>

            <div className="search-suggestions">

              <button
                type="button"
                onClick={() =>
                  setQuestion(
                    "How many customers are there?"
                  )
                }
              >
                How many customers?
              </button>

              <button
                type="button"
                onClick={() =>
                  setQuestion(
                    "Which artist has the most albums?"
                  )
                }
              >
                Top artist
              </button>

              <button
                type="button"
                onClick={() =>
                  setQuestion(
                    "How many invoices are there?"
                  )
                }
              >
                Invoice count
              </button>

              <button
                type="button"
                onClick={() =>
                  setQuestion(
                    "How many tracks are in the database?"
                  )
                }
              >
                Track count
              </button>

            </div>

            <div className="input-footer">

              <span>
                Natural language → SQL → Database → Answer
              </span>

              <button
                className="ask-button"
                onClick={askSQLMind}
                disabled={loading}
                type="button"
              >

                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Ask SQLMind
                    <span>
                      →
                    </span>
                  </>
                )}

              </button>

            </div>

          </div>

        </section>

        {database && (

          <section
            className="database-explorer"
            id="database-explorer"
          >

            <div className="explorer-heading">

              <div>

                <span className="card-label">
                  DATABASE EXPLORER
                </span>

                <h2>
                  {database.database}
                </h2>

                <p>
                  Explore tables, row counts and real
                  database records.
                </p>

              </div>

              <div className="table-count">

                <strong>
                  {database.table_count}
                </strong>

                <span>
                  TABLES
                </span>

              </div>

            </div>

            <div className="explorer">

              <div className="table-list">

                <div className="table-list-title">
                  DATABASE TABLES
                </div>

                {database.tables?.map(
                  (table) => (

                    <button
                      key={table.name}
                      type="button"
                      className={
                        selectedTable === table.name
                          ? "table-item active"
                          : "table-item"
                      }
                      onClick={() =>
                        loadTable(table.name)
                      }
                    >

                      <span>
                        {table.name}
                      </span>

                      <small>
                        {Number(
                          table.rows ?? 0
                        ).toLocaleString()}{" "}
                        rows
                      </small>

                    </button>

                  )
                )}

              </div>

              <div className="table-preview">

                {tableLoading && (

                  <div className="empty-state">

                    <div className="spinner large"></div>

                    <h3>
                      Loading {selectedTable}...
                    </h3>

                    <p>
                      Reading records from the Chinook database.
                    </p>

                  </div>

                )}

                {!tableLoading &&
                  tableError && (

                    <div className="empty-state table-error-state">

                      <div className="db-icon error-db-icon">
                        !
                      </div>

                      <h3>
                        Unable to load table
                      </h3>

                      <p>
                        {tableError}
                      </p>

                      {selectedTable && (
                        <button
                          type="button"
                          className="secondary-button retry-button"
                          onClick={() =>
                            loadTable(selectedTable)
                          }
                        >
                          Try Again
                        </button>
                      )}

                    </div>

                  )}

                {!tableLoading &&
                  !tableError &&
                  !selectedTable && (

                    <div className="empty-state">

                      <div className="db-icon">
                        DB
                      </div>

                      <h3>
                        Select a table
                      </h3>

                      <p>
                        Choose a table from the database
                        to inspect its actual records.
                      </p>

                    </div>

                  )}

                {!tableLoading &&
                  !tableError &&
                  selectedTable &&
                  tableData && (

                    <div className="records-container">

                      <div className="records-header">

                        <div>

                          <span className="card-label">
                            TABLE
                          </span>

                          <h3>
                            {tableData.table}
                          </h3>

                        </div>

                        <div className="record-count">
                          {Number(
                            tableData.row_count ?? 0
                          ).toLocaleString()}{" "}
                          records
                        </div>

                      </div>

                      <div className="records-table-wrapper">

                        <table className="records-table">

                          <thead>

                            <tr>

                              {tableData.columns.map(
                                (column) => (

                                  <th key={column}>
                                    {column}
                                  </th>

                                )
                              )}

                            </tr>

                          </thead>

                          <tbody>

                            {tableData.rows.map(
                              (row, rowIndex) => (

                                <tr key={rowIndex}>

                                  {row.map(
                                    (
                                      value,
                                      columnIndex
                                    ) => (

                                      <td
                                        key={columnIndex}
                                      >
                                        {value === null
                                          ? "NULL"
                                          : String(value)}
                                      </td>

                                    )
                                  )}

                                </tr>

                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                      <p className="records-note">
                        Showing up to 20 records from
                        the selected table.
                      </p>

                    </div>

                  )}

              </div>

            </div>

          </section>

        )}

        {error && (

          <section className="error-card">

            <div className="error-icon">
              !
            </div>

            <div>

              <h3>
                Request failed
              </h3>

              <p>
                {error}
              </p>

            </div>

          </section>

        )}

        {answer && (

          <section
            className="results"
            id="results"
          >

            <div className="answer-card">

              <div className="result-title">

                <div>

                  <span className="card-label">
                    AI RESPONSE
                  </span>

                  <h3>
                    Answer
                  </h3>

                </div>

                {executionTime !== null && (

                  <div className="execution-time">

                    <span>
                      Execution
                    </span>

                    <strong>
                      {executionTime}s
                    </strong>

                  </div>

                )}

              </div>

              <p className="answer-text">
                {answer}
              </p>

            </div>

            {sql && (

              <div className="code-card">

                <div className="code-header">

                  <div>

                    <span className="card-label">
                      GENERATED QUERY
                    </span>

                    <h3>
                      SQL
                    </h3>

                  </div>

                  <span className="sql-badge">
                    READ ONLY
                  </span>

                </div>

                <pre>
                  {sql}
                </pre>

              </div>

            )}

            {result !== null && (

              <div className="code-card">

                <div className="code-header">

                  <div>

                    <span className="card-label">
                      DATABASE RESPONSE
                    </span>

                    <h3>
                      Query Result
                    </h3>

                  </div>

                </div>

                <pre className="result-output">
                  {formatResult()}
                </pre>

              </div>

            )}

          </section>

        )}

        <section
          className="faq-section"
          id="faq"
        >

          <div className="faq-intro">

            <span>
              FAQ
            </span>

            <h2>
              Frequently asked questions.
            </h2>

            <p>
              Everything you need to know about
              SQLMind AI.
            </p>

          </div>

          <div className="faq-list">

            {faqs.map(
              (faq, index) => (

                <div
                  className={
                    openFaq === index
                      ? "faq-item open"
                      : "faq-item"
                  }
                  key={faq.question}
                >

                  <button
                    type="button"
                    className="faq-question"
                    onClick={() =>
                      setOpenFaq(
                        openFaq === index
                          ? -1
                          : index
                      )
                    }
                  >

                    <span>
                      {faq.question}
                    </span>

                    <strong>
                      {openFaq === index
                        ? "−"
                        : "+"}
                    </strong>

                  </button>

                  {openFaq === index && (

                    <div className="faq-answer">
                      {faq.answer}
                    </div>

                  )}

                </div>

              )
            )}

          </div>

        </section>

        <section className="final-cta">

          <div className="cta-glow"></div>

          <span>
            READY TO QUERY?
          </span>

          <h2>
            Ask your database
            <br />
            anything.
          </h2>

          <p>
            Turn natural-language questions into
            intelligent database insights.
          </p>

          <button
            className="primary-button"
            onClick={scrollToWorkspace}
            type="button"
          >
            Start Query
            <span>
              →
            </span>
          </button>

        </section>

      </main>

      <footer className="footer">

        <div>

          <strong>
            SQLMind AI
          </strong>

          <span>
            Intelligent Text-to-SQL Agent
          </span>

        </div>

        <span>
          AI • SQL • Agents • Data
        </span>

      </footer>

    </div>
  )
}

export default App