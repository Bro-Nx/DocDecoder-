import { useState } from "react";
import Head from "next/head";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!text.trim()) {
      setError("Please paste a document.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: text }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>DocDecoder™</title>
      </Head>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
        <h1>DocDecoder™</h1>
        <p>Understand any document before it costs you money.</p>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your document here..."
          style={{ width: "100%", height: 200, marginBottom: 10, padding: 10, fontFamily: "monospace" }}
        />
        
        <button onClick={analyze} disabled={loading} style={{ padding: "10px 20px", fontSize: 16, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
        
        {result && (
          <div style={{ marginTop: 20, border: "1px solid #ccc", padding: 10 }}>
            <h2>{result.documentType}</h2>
            <p>{result.summary}</p>
            <p><strong>Risk:</strong> {result.overallRisk}</p>
            <h3>Clauses:</h3>
            {result.clauses && result.clauses.map((c, i) => (
              <div key={i} style={{ marginBottom: 10, padding: 10, background: "#f5f5f5" }}>
                <strong>{c.title}</strong> - {c.risk}
                <p>{c.plain}</p>
              </div>
            ))}
            <h3>Action Plan:</h3>
            {result.actions && result.actions.map((a, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong>[{a.priority}]</strong> {a.action}
              </div>
            ))}
            <h3>Questions:</h3>
            {result.questions && result.questions.map((q, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <p><strong>{i + 1}. {q.question}</strong></p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
            }
