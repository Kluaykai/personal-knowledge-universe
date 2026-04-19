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
        model: "llama-3.3-70b-versatile", // ✅ เปลี่ยน model ใหญ่ขึ้น ทำตาม instruction ได้ดีกว่า
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
        max_tokens: 4096
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("⚠️ Groq API Error:", data);
      return res.status(response.status).json({ error: data.error?.message });
    }

    let rawContent = data.choices[0].message.content;

    // clean markdown
    rawContent = rawContent.replace(/```json|```/g, "").trim();

    // merge multiple arrays
    rawContent = rawContent.replace(/\]\s*,?\s*\[/g, ",").trim();

    // ✅ ถ้า parse ไม่ได้ ให้ fallback เป็น plain text แทน ไม่ crash
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.warn("⚠️ JSON parse failed, using fallback");
      // ✅ Fallback: ส่งกลับเป็น text ธรรมดา 1 block
      parsed = [{ type: "text", value: text }];
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(parsed));

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: "การประมวลผล JSON ผิดพลาด: " + error.message });
  }
}