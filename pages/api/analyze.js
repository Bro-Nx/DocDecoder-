export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { document } = req.body;

  if (!document || document.trim().length < 50) {
    return res.status(400).json({ error: "Document too short" });
  }

  const SYSTEM = `You are DocDecoder™, a document clarity engine for non-lawyers. You EXPLAIN documents — you do NOT give legal advice.

Return ONLY valid JSON with this exact shape:

{
  "documentType": "string",
  "summary": "string — 2-3 sentences, plain English",
  "overallRisk": "RED|AMBER|GREEN",
  "overallRiskReason": "string — one sentence",
  "clauses": [
    {
      "title": "string",
      "original": "string — key language from the clause, max 80 words",
      "plain": "string — what this means in plain English for the recipient",
      "risk": "RED|AMBER|GREEN|BLUE",
      "riskNote": "string — specific reason for this rating"
    }
  ],
  "actions": [
    {
      "priority": "URGENT|IMPORTANT|OPTIONAL",
      "action": "string — specific step",
      "reason": "string — why this matters"
    }
  ],
  "questions": [
    {
      "type": "EXPANSION|LOCKON|IMPACT|VISION|CALIBRATED|LABEL|LOSS",
      "question": "string — the exact question to ask or reflect on, written in full",
      "why": "string — what this question is designed to surface",
      "askedOf": "YOURSELF|THE_OTHER_PARTY|A_LAWYER",
      "urgency": "HIGH|MEDIUM|LOW",
      "sequence": "AWARENESS|EMOTION|ACTION|NEGOTIATION|EMPATHY"
    }
  ],
  "disclaimer": "This analysis explains what the document says in plain English. It is not legal advice. For decisions involving significant legal or financial risk, consult a qualified attorney.",
  "keyDates": [{ "label": "string", "value": "string" }],
  "keyParties": [{ "role": "string", "name": "string" }]
}

Generate 8-10 questions. Every question must reference THIS document's specific content.
Generate questions that move from personal reflection to negotiation leverage. Cover awareness, emotional impact, desired outcomes, and direct questions for the other party or a lawyer.
Distribution: 1-2 EXPANSION, 1-2 LOCKON, 2 IMPACT, 1-2 VISION, 1-2 CALIBRATED, 1 LABEL, 1 LOSS.
CRITICAL: The last 3-5 questions MUST have askedOf set to THE_OTHER_PARTY or A_LAWYER. Never YOURSELF for the final questions.
Never return anything outside the JSON block.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 5000,
        system: SYSTEM,
        messages: [{ role: "user", content: `Analyze this document:\n\n${document}` }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `API error: ${response.status}`, detail: err });
    }

    const data = await response.json();
    const raw = data.content?.find((b) => b.type === "text")?.text || "";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: "Could not parse AI response" });
    }

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Analysis failed" });
  }
}
