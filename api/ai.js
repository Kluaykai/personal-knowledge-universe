export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  const { text } = req.body;

  if (!apiKey) {
    console.error("❌ ERROR: API KEY MISSING");
    return res.status(500).json({ error: 'API Key missing' });
  }

  // 🌟 Prompt สายโหด: สั่งให้ตอบแค่ JSON เท่านั้น ห้ามมีตัวหนังสืออื่นปน
  const prompt = `Task: Convert the following text into a JSON array of objects.
Each object must have "type" (either "text" or "code") and "value" (content).
Example: [{"type": "text", "value": "Hello"}, {"type": "code", "value": "print('hi')"}]
IMPORTANT: Output ONLY the raw JSON. No markdown tags, no explanations.

Text to process:
${text}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
        // ❌ ตัด generationConfig เจ้าปัญหาออกไปเลย
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("⚠️ Google API Error:", data);
      return res.status(response.status).json({ error: data.error?.message || 'Gemini Error' });
    }

    // 🧹 ขั้นตอนการทำความสะอาด (Cleanup)
    // บางครั้ง AI ชอบแถม ```json ... ``` มาให้ เราต้องตัดออก
    let rawContent = data.candidates[0].content.parts[0].text;
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    
    console.log("✅ Cleaned AI Response:", cleanJson);
    
    res.status(200).json(JSON.parse(cleanJson));

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: "การประมวลผล JSON ผิดพลาด: " + error.message });
  }
}