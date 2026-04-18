export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  const { text } = req.body;

  if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a JSON converter. Output a single valid JSON array only.
No markdown, no code blocks, no extra text.
Only two types: "text" and "code".
IMPORTANT: Write Thai characters directly as Thai text, never as unicode escape sequences.
Output must start with [ and end with ]`
          },
          {
            role: "user",
            content: `Convert this into a JSON array with "type" and "value" fields:\n\n${text}`
          }
        ],
        max_tokens: 2048
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("⚠️ Groq API Error:", data);
      return res.status(response.status).json({ error: data.error?.message });
    }

    let rawContent = data.choices[0].message.content;

    // ✅ Clean markdown fences
    rawContent = rawContent.replace(/```json|```/g, "").trim();

    // ✅ Merge multiple arrays ถ้า AI ดันส่งมาหลายอัน
    const merged = rawContent.replace(/\]\s*,?\s*\[/g, ",").trim();

    // ✅ Decode unicode escape sequences \uXXXX → ตัวอักษรจริง
    const decoded = merged.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    const parsed = JSON.parse(decoded);
    console.log("✅ Parsed items:", parsed.length);

    // ✅ ส่งกลับพร้อม charset utf-8 ชัดเจน
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(parsed);

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: "การประมวลผล JSON ผิดพลาด: " + error.message });
  }
}