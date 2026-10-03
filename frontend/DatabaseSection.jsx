import { useEffect, useMemo, useState } from "react";

const PRODUCTION_API = "https://sqlmind-ai-7c0y.onrender.com";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:8000"
      : PRODUCTION_API
  )
).replace(/\/+$/, "");

const styles = {
  page: {
    minHeight: "100vh",
    background: "#050914",
    color: "#eef4ff",
    padding: "80px 5vw 100px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  header: {
    maxWidth: "1400px",
    margin: "0 auto 55px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "30px",
  },

  title: {
    margin: 0,
    fontSize: "clamp(52px, 7vw, 100px)",
    lineHeight: 0.95,
    letterSpacing: "-0.06em",
    fontWeight: 800,
  },

  subtitle: {
    margin: "25px 0 0",
    color: "#7f96bd",
    fontSize: "18px",
  },

  refreshButton: {
    border: "1px solid #29436e",
    background: "rgba(8,15,30,.9)",
    color: "#c8d5ed",
    padding: "16px 25px",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    border: "1px solid #1b3155",
    borderRadius: "26px",
    background:
      "linear-gradient(180deg, rgba(7,15,31,.95), rgba(5,11,24,.98))",
    padding: "32px",
    boxShadow: "0 30px 100px rgba(0,0,0,.25)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "25px",
  },

  statCard: {
    border: "1px solid #1c3358",
    borderRadius: "18px",
    padding: "25px",
    background: "#070e1d",
    minHeight: "105px",
  },

  statLabel: {
    color: "#6e87b0",
    fontSize: "14px",
    marginBottom: "12px",
  },

  statValue: {
    color: "#f2f6ff",
    fontSize: "22px",
    fontWeight: 800,
  },

  connected: {
    color: "#35e5aa",
  },

  error: {
    border: "1px solid #6d2935",
    background: "rgba(100,25,40,.18)",
    color: "#ff9eaa",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "25px",
  },

  tableGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },

  tableButton: {
    width: "100%",
    border: "1px solid #1b3155",
    background: "#070e1d",
    color: "#dbe6fb",
    borderRadius: "17px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    textAlign: "left",
    transition: "all .2s ease",
  },

  tableLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    minWidth: 0,
  },

  dbIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#101f42",
    color: "#75a0ff",
    fontSize: "11px",
    fontWeight: 800,
    flexShrink: 0,
  },

  tableName: {
    fontSize: "17px",
    fontWeight: 750,
    color: "#dce7fb",
  },

  rowCount: {
    color: "#6781aa",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  arrow: {
    marginLeft: "15px",
    color: "#7297db",
    fontSize: "20px",
  },

  selectedPanel: {
    marginTop: "30px",
    border: "1px solid #254879",
    borderRadius: "22px",
    background: "#060d1b",
    overflow: "hidden",
  },

  selectedHeader: {
    padding: "25px 28px",
    borderBottom: "1px solid #1b3155",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  selectedTitle: {
    margin: 0,
    fontSize: "25px",
    fontWeight: 800,
  },

  selectedMeta: {
    marginTop: "7px",
    color: "#7088ad",
    fontSize: "14px",
  },

  closeButton: {
    border: "1px solid #29436e",
    background: "#091327",
    color: "#b8c9e6",
    padding: "10px 17px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },

  dataWrapper: {
    overflowX: "auto",
    maxHeight: "600px",
    overflowY: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "700px",
  },

  th: {
    position: "sticky",
    top: 0,
    background: "#0c1830",
    color: "#81a6ed",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    textAlign: "left",
    padding: "16px",
    borderBottom: "1px solid #233b62",
    whiteSpace: "nowrap",
    zIndex: 2,
  },

  td: {
    padding: "15px 16px",
    color: "#c7d4e9",
    borderBottom: "1px solid #132541",
    fontSize: "14px",
    verticalAlign: "top",
  },

  empty: {
    padding: "50px",
    textAlign: "center",
    color: "#7186a8",
  },

  loading: {
    padding: "50px",
    textAlign: "center",
    color: "#7da4ed",
  },
};

function formatCell(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export default function DatabaseSection() {
  const [database, setDatabase] = useState(null);
  const [loadingDatabase, setLoadingDatabase] = useState(true);
  const [databaseError, setDatabaseError] = useState("");

  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState("");

  const totalRows = useMemo(() => {
    if (!database?.tables) {
      return 0;
    }

    return database.tables.reduce(
      (total, table) => total + Number(table.rows || 0),
      0
    );
  }, [database]);

  async function loadDatabase() {
    setLoadingDatabase(true);
    setDatabaseError("");

    try {
      const response = await fetch(`${API_URL}/database`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        let message = `Backend returned ${response.status}`;

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          //
        }

        throw new Error(message);
      }

      const data = await response.json();

      setDatabase(data);
    } catch (error) {
      setDatabaseError(
        error?.message ||
          "Unable to load database information from the backend."
      );
      setDatabase(null);
    } finally {
      setLoadingDatabase(false);
    }
  }

  async function loadTable(tableName) {
    setSelectedTable(tableName);
    setTableData(null);
    setTableError("");
    setLoadingTable(true);

    try {
      const response = await fetch(
        `${API_URL}/database/${encodeURIComponent(tableName)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        let message = `Unable to load ${tableName}`;

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          //
        }

        throw new Error(message);
      }

      const data = await response.json();

      setTableData(data);
    } catch (error) {
      setTableError(
        error?.message ||
          `Failed to load data from the ${tableName} table.`
      );
    } finally {
      setLoadingTable(false);
    }
  }

  function closeTable() {
    setSelectedTable("");
    setTableData(null);
    setTableError("");
  }

  useEffect(() => {
    loadDatabase();
  }, []);

  return (
    <section style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Chinook SQLite.</h1>

          <p style={styles.subtitle}>
            Explore the database connected to SQLMind AI.
          </p>
        </div>

        <button
          type="button"
          style={styles.refreshButton}
          onClick={loadDatabase}
          disabled={loadingDatabase}
        >
          {loadingDatabase ? "Refreshing..." : "Refresh Database"}
        </button>
      </div>

      <div style={styles.container}>
        {databaseError && (
          <div style={styles.error}>
            <strong>Database Error</strong>
            <div style={{ marginTop: "7px" }}>{databaseError}</div>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Database</div>

            <div style={styles.statValue}>
              {database?.database || "Chinook SQLite"}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Tables</div>

            <div style={styles.statValue}>
              {loadingDatabase ? "..." : database?.table_count ?? 0}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Rows</div>

            <div style={styles.statValue}>
              {loadingDatabase
                ? "..."
                : totalRows.toLocaleString("en-IN")}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Status</div>

            <div
              style={{
                ...styles.statValue,
                ...styles.connected,
              }}
            >
              {loadingDatabase
                ? "Checking..."
                : database
                  ? "Connected"
                  : "Unavailable"}
            </div>
          </div>
        </div>

        {loadingDatabase ? (
          <div style={styles.loading}>
            Loading database tables...
          </div>
        ) : database?.tables?.length ? (
          <div style={styles.tableGrid}>
            {database.tables.map((table) => {
              const isSelected = selectedTable === table.name;

              return (
                <button
                  key={table.name}
                  type="button"
                  onClick={() => loadTable(table.name)}
                  style={{
                    ...styles.tableButton,
                    borderColor: isSelected
                      ? "#496fc0"
                      : "#1b3155",
                    background: isSelected
                      ? "#0a1730"
                      : "#070e1d",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor =
                      "#496fc0";
                    event.currentTarget.style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor =
                      isSelected ? "#496fc0" : "#1b3155";
                    event.currentTarget.style.transform =
                      "translateY(0)";
                  }}
                >
                  <div style={styles.tableLeft}>
                    <div style={styles.dbIcon}>DB</div>

                    <div style={styles.tableName}>
                      {table.name}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span style={styles.rowCount}>
                      {Number(table.rows || 0).toLocaleString(
                        "en-IN"
                      )}{" "}
                      rows
                    </span>

                    <span style={styles.arrow}>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={styles.empty}>
            No database tables found.
          </div>
        )}

        {selectedTable && (
          <div style={styles.selectedPanel}>
            <div style={styles.selectedHeader}>
              <div>
                <h2 style={styles.selectedTitle}>
                  {selectedTable}
                </h2>

                <div style={styles.selectedMeta}>
                  {tableData
                    ? `${Number(
                        tableData.row_count || 0
                      ).toLocaleString("en-IN")} total rows`
                    : "Loading table data..."}
                </div>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={closeTable}
              >
                Close
              </button>
            </div>

            {loadingTable && (
              <div style={styles.loading}>
                Loading {selectedTable} data...
              </div>
            )}

            {tableError && !loadingTable && (
              <div style={styles.error}>
                <strong>Unable to load table</strong>

                <div style={{ marginTop: "7px" }}>
                  {tableError}
                </div>
              </div>
            )}

            {tableData &&
              !loadingTable &&
              !tableError && (
                <div style={styles.dataWrapper}>
                  {tableData.columns?.length &&
                  tableData.rows?.length ? (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {tableData.columns.map((column) => (
                            <th
                              key={column}
                              style={styles.th}
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {tableData.rows.map(
                          (row, rowIndex) => (
                            <tr key={rowIndex}>
                              {tableData.columns.map(
                                (column, columnIndex) => (
                                  <td
                                    key={`${column}-${columnIndex}`}
                                    style={styles.td}
                                  >
                                    {formatCell(
                                      row[columnIndex]
                                    )}
                                  </td>
                                )
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div style={styles.empty}>
                      This table does not contain rows.
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </div>
    </section>
  );
}