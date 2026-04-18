export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  const { text } = req.body;

  if (!apiKey) {
    console.error("❌ ERROR: API KEY MISSING");
    return res.status(500).json({ error: 'API Key missing' });
  }

  try {
    // 🔗 ใช้ v1 ซึ่งเสถียรที่สุดในตอนนี้
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `Task: Extract text and code from the following content into a structured list. Content: ${text}` }] 
        }],
        generationConfig: { 
          responseMimeType: "application/json",
          // 🌟 เพิ่ม Schema เพื่อบังคับรูปแบบคำตอบ ป้องกัน Error 400
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["text", "code"] },
                value: { type: "string" }
              },
              required: ["type", "value"]
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("⚠️ Google API Detail:", JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || 'Gemini Error' });
    }

    // ดึงผลลัพธ์ (Gemini จะคืนค่าเป็น String ที่เป็น JSON อยู่ข้างใน)
    const jsonResult = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(jsonResult));

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}