export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  const { text } = req.body;

  if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a JSON converter. Output a single valid JSON array only. No markdown, no code blocks, no extra text. Only two types: "text" and "code". Output must start with [ and end with ]`
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

    // 1. clean markdown
    rawContent = rawContent.replace(/```json|```/g, "").trim();

    // 2. merge multiple arrays
    rawContent = rawContent.replace(/\]\s*,?\s*\[/g, ",").trim();

    // 3. parse ก่อน — ตอนนี้ \u0e01 ยังอยู่ใน string แต่ JSON.parse จะ decode ให้เองอยู่แล้ว!
    const parsed = JSON.parse(rawContent);

    // 4. ส่งกลับโดยใช้ res.end() แทน res.json() เพื่อควบคุม encoding เอง
    const output = JSON.stringify(parsed, null, 0);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(output);

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: "การประมวลผล JSON ผิดพลาด: " + error.message });
  }
}