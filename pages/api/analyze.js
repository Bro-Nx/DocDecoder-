export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { document } = req.body;

  if (!document || document.trim().length < 50) {
    return res.status(400).json({ error: "Document too short" });
  }

  // CHECK API KEY
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY is not set!");
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in Vercel environment variables" });
  }
  
  console.log("✓ API Key found:", apiKey.substring(0, 20) + "...");

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
    console.log("→ Sending request to Anthropic API...");
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 5000,
        system: SYSTEM,
        messages: [{ role: "user", content: `Analyze this document:\n\n${document}` }],
      }),
    });

    console.log("← Response status:", response.status);

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ API Error:", response.status, err);
      return res.status(response.status).json({ error: `API error: ${response.status}`, detail: err });
    }

    console.log("✓ Got 200 from API, parsing JSON...");
    const data = await response.json();
    
    const raw = data.content?.find((b) => b.type === "text")?.text || "";
    console.log("✓ Got text response, parsing JSON object...");

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("❌ Could not find JSON in response");
      return res.status(500).json({ error: "Could not parse AI response", raw: raw.substring(0, 200) });
    }

    console.log("✓ Found JSON, parsing...");
    const parsed = JSON.parse(match[0]);
    console.log("✓ Success! Returning parsed JSON");
    
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("❌ Error:", err.message);
    return res.status(500).json({ error: err.message || "Analysis failed", stack: err.toString() });
  }
}
