export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  const { text } = req.body;

  if (!apiKey) return res.status(500).json({ error: 'API Key missing in Vercel' });

  // 🌟 พรอมต์บังคับให้ AI เป็นบรรณาธิการ
  const prompt = `You are an expert technical editor. Convert the following messy text into a structured JSON array.
  The JSON must be an array of objects, where each object has "type" (either "text" or "code") and "value" (the content).
  - Use "text" for explanations, paragraphs, and bullet points. Make it easy to read.
  - Use "code" strictly for programming code snippets, payloads, or terminal commands.
  OUTPUT ONLY VALID JSON. DO NOT INCLUDE MARKDOWN CODE BLOCKS like \`\`\`json.
  
  Text to process:\n\n${text}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" } // 🌟 ฟีเจอร์เด็ด บังคับออก JSON
      })
    });

    const data = await response.json();
    const jsonString = data.candidates[0].content.parts[0].text;
    
    // คืนค่ากลับไปให้ React
    res.status(200).json(JSON.parse(jsonString));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}