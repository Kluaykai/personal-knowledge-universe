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
            // ✅ เพิ่ม system prompt บังคับให้ตอบ JSON array เดียว
            role: "system",
            content: `You are a JSON converter. You MUST output a single valid JSON array only.
No markdown, no code blocks, no extra text, no multiple arrays.
Only two types allowed: "text" and "code".
Output must start with [ and end with ]`
          },
          {
            role: "user",
            content: `Convert this text into a single JSON array of objects with "type" and "value" fields:

${text}`
          }
        ],
        max_tokens: 2048
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("⚠️ Groq API Error:", data);
      return res.status(response.status).json({ error: data.error?.message || 'Groq API Error' });
    }

    let rawContent = data.choices[0].message.content;
    
    // ✅ ทำความสะอาด
    rawContent = rawContent.replace(/```json|```/g, "").trim();

    // ✅ ถ้า AI ยังดันส่งหลาย array มา ให้ merge เป็นอันเดียว
    // หา pattern ][  หรือ ] \n [ แล้วเชื่อมกัน
    const merged = rawContent
      .replace(/\]\s*,?\s*\[/g, ",") // merge arrays
      .trim();

    const parsed = JSON.parse(merged);
    console.log("✅ Final parsed items:", parsed.length);
    res.status(200).json(parsed);

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: "การประมวลผล JSON ผิดพลาด: " + error.message });
  }
}