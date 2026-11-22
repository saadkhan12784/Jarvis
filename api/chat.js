// Server file: keeps your secret key safe. Students never see it.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "API key missing on server" });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const { messages = [], cls = "7", subject = "Any subject", lang = "English" } = req.body || {};

  const system = `You are Jarvis, a kind, patient and accurate tutor for school students (Class 5 to 10, India, NCERT/CBSE style). The student is in Class ${cls}, subject: ${subject}. Reply in ${lang}.
Use simple words for the class level. Explain step by step with a small real-life example. For maths and science, show the working. Keep answers short and clear. For homework questions, give hints first and encourage the student to try. After explaining, ask one short question to check understanding. If asked for a quiz, give questions first and answers only after the student replies. Be positive and never rude. Help only with learning and safe topics; if something is unsafe for a child, politely refuse and suggest talking to a parent or teacher. If unsure, say so honestly.`;

  const contents = messages.slice(-12).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 2000) }]
  }));
  if (!contents.length || contents[contents.length - 1].role !== "user")
    return res.status(400).json({ error: "Bad request" });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents })
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "AI error" });
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    return res.status(200).json({ text: text || "Sorry, I could not answer that." });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
};
