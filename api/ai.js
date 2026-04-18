export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  const { text } = req.body;

  if (!apiKey) {
    console.error("❌ ERROR: API KEY MISSING");
    return res.status(500).json({ error: 'API Key missing' });
  }

  const prompt = `Convert the following text into a JSON array of objects.
Each object must have "type" (either "text" or "code") and "value" (content).
Example: [{"type": "text", "value": "Hello"}, {"type": "code", "value": "print('hi')"}]
IMPORTANT: Output ONLY the raw JSON. No markdown, no explanations.
Text:
${text}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("⚠️ Groq API Error:", data);
      return res.status(response.status).json({ error: data.error?.message || 'Groq API Error' });
    }

    let rawContent = data.choices[0].message.content;
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();

    console.log("✅ Cleaned AI Response:", cleanJson);
    res.status(200).json(JSON.parse(cleanJson));

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: "การประมวลผล JSON ผิดพลาด: " + error.message });
  }
}