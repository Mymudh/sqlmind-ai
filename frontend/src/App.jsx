import { useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");

  const askDatabase = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const url = `${API_URL.replace(/\/$/, "")}/query`;

      console.log("SQLMind API:", url);

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 120000);

      const result = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: cleanQuestion
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const contentType =
        result.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await result.json();
      } else {
        data = await result.text();
      }

      if (!result.ok) {
        const message =
          typeof data === "object"
            ? data.detail || JSON.stringify(data)
            : data;

        throw new Error(
          `API error ${result.status}: ${message}`
        );
      }

      setResponse(data);

    } catch (err) {
      console.error("SQLMind request error:", err);

      if (err.name === "AbortError") {
        setError(
          "The backend took too long to respond. Render may be waking up. Please try again."
        );
      } else if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes("fetch")
      ) {
        setError(
          `Cannot connect to SQLMind backend.\nAPI: ${API_URL}`
        );
      } else {
        setError(
          err.message || "Something went wrong."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      askDatabase();
    }
  };

  const useExample = (value) => {
    setQuestion(value);
    setError("");
  };

  return (
    <div className="app">

      <header className="header">
        <div className="logo">
          <span className="logo-icon">✦</span>
          <span>SQLMind AI</span>
        </div>

        <nav>
          <a href="#features">Features</a>
          <a href="#database">Database</a>
          <a href="#query">Query</a>
        </nav>

        <div className="status">
          <span className="status-dot"></span>
          SQLMind Agent Ready
        </div>
      </header>

      <main>

        <section className="hero">
          <div className="badge">
            AI-POWERED TEXT-TO-SQL AGENT
          </div>

          <h1>
            Ask your database
            <br />
            <span>anything.</span>
          </h1>

          <p>
            Transform natural-language questions into safe SQL queries,
            execute them against your database, and receive intelligent
            AI-powered answers.
          </p>

          <div className="hero-actions">
            <button
              onClick={() =>
                document
                  .getElementById("query")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              Start Query →
            </button>

            <button
              className="secondary"
              onClick={() =>
                document
                  .getElementById("database")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              Explore Database
            </button>
          </div>
        </section>

        <section id="query" className="query-section">

          <div className="agent-status">
            <span className="status-dot"></span>
            SQLMind Agent Ready

            <span className="shortcut">
              Ctrl + Enter
            </span>
          </div>

          <div className="query-box">

            <div className="query-icon">
              ✦
            </div>

            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask your database anything..."
              rows={3}
            />

            <button
              className="ask-button"
              onClick={askDatabase}
              disabled={loading}
            >
              {loading ? "Thinking..." : "Ask →"}
            </button>

          </div>

          <div className="examples">
            <button
              onClick={() =>
                useExample("How many customers?")
              }
            >
              How many customers?
            </button>

            <button
              onClick={() =>
                useExample("Who is the top artist?")
              }
            >
              Top artist
            </button>

            <button
              onClick={() =>
                useExample("How many invoices are there?")
              }
            >
              Invoice count
            </button>

            <button
              onClick={() =>
                useExample("How many tracks are there?")
              }
            >
              Track count
            </button>
          </div>

          <div className="flow">
            Natural language → SQL → Database → Answer
          </div>

        </section>

        {loading && (
          <section className="result-card loading-card">
            <div className="loader"></div>
            <h2>SQLMind is thinking...</h2>
            <p>
              Generating SQL and querying the database.
            </p>
          </section>
        )}

        {error && (
          <section className="result-card error-card">
            <h2>Request failed</h2>

            <pre>{error}</pre>

            <button
              onClick={askDatabase}
            >
              Try Again
            </button>
          </section>
        )}

        {response && !loading && (
          <section className="result-card">

            <div className="result-header">
              <div>
                <span className="result-label">
                  QUESTION
                </span>

                <h2>
                  {response.question}
                </h2>
              </div>
            </div>

            <div className="answer-box">
              <span className="result-label">
                AI ANSWER
              </span>

              <p>
                {response.answer}
              </p>
            </div>

            {response.sql && (
              <div className="sql-box">
                <div className="result-label">
                  GENERATED SQL
                </div>

                <pre>
                  {response.sql}
                </pre>
              </div>
            )}

            {response.result !== undefined && (
              <div className="data-box">
                <div className="result-label">
                  DATABASE RESULT
                </div>

                <pre>
                  {JSON.stringify(
                    response.result,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            <div className="execution">
              Execution time:{" "}
              {response.execution_time?.toFixed
                ? response.execution_time.toFixed(2)
                : response.execution_time}
              s
            </div>

          </section>
        )}

        <section id="database" className="database-section">

          <div className="section-heading">
            <span>DATABASE</span>

            <h2>
              Chinook SQLite
            </h2>

            <p>
              SQLMind AI currently works with the
              Chinook sample database.
            </p>
          </div>

          <div className="database-grid">

            <div>
              <strong>11</strong>
              <span>Tables</span>
            </div>

            <div>
              <strong>59</strong>
              <span>Customers</span>
            </div>

            <div>
              <strong>3503</strong>
              <span>Tracks</span>
            </div>

            <div>
              <strong>275</strong>
              <span>Artists</span>
            </div>

          </div>

        </section>

        <section id="features" className="features-section">

          <div className="section-heading">
            <span>CAPABILITIES</span>

            <h2>
              Intelligent database interaction
            </h2>
          </div>

          <div className="features-grid">

            <div className="feature-card">
              <h3>Natural Language</h3>
              <p>
                Ask questions using normal human language.
              </p>
            </div>

            <div className="feature-card">
              <h3>Text-to-SQL</h3>
              <p>
                AI converts questions into executable SQL.
              </p>
            </div>

            <div className="feature-card">
              <h3>SQL Validation</h3>
              <p>
                Only safe read-only SQL operations are allowed.
              </p>
            </div>

            <div className="feature-card">
              <h3>AI Answers</h3>
              <p>
                Query results are converted into understandable answers.
              </p>
            </div>

          </div>

        </section>

      </main>

      <footer>
        <p>
          SQLMind AI · AI-Powered Text-to-SQL Agent
        </p>
      </footer>

    </div>
  );
}

export default App;