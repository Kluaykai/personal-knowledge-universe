export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  const { text } = req.body;

  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY IS MISSING IN VERCEL SETTINGS!");
    return res.status(500).json({ error: 'API Key missing' });
  }

  // 🌟 ปรับ Prompt ให้สั้นและบังคับ JSON ให้ชัดเจนขึ้น
  const prompt = `Task: Convert this text into a JSON array. 
  Each object must have "type" (text or code) and "value" (content).
  Text: ${text}`;

  try {
    // 🔗 เปลี่ยนไปใช้ v1 (Stable) และใช้ชื่อ model ที่แม่นยำกว่าเดิม
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.1 // ให้คำตอบนิ่งที่สุด
        }
      })
    });

    const data = await response.json();

    // เช็คกรณี API ตอบกลับเป็น Error (เช่น 400, 403)
    if (!response.ok) {
      console.error("⚠️ Google API Error:", data);
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API Error' });
    }

    const jsonString = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(jsonString));

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}