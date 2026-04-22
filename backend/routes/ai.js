const express = require('express');
const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title required' });

  const prompt = `You are an emergency response AI. Analyze this incident title and respond ONLY with valid JSON (no markdown, no explanation).

Incident: "${title}"

Available services: Police, Fire Brigade, Ambulance, Disaster Relief, Electricity Dept, Coast Guard

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence analysis of the incident and immediate risks",
  "severity": "low or medium or high",
  "services": ["array of relevant service names from available list only"],
  "suggested_description": "A helpful pre-filled description for the reporter to edit"
}

Rules:
- Fire incidents: always include Fire Brigade + Ambulance
- Accidents: Police + Ambulance
- Flooding/natural disaster: Disaster Relief + Ambulance
- Electric hazard: Electricity Dept + Police
- severity high = life threatening, medium = serious, low = minor
- Only use services from the available list`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
        })
      }
    );

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    res.json({ success: true, ...parsed });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ success: false, error: 'AI analysis failed' });
  }
});

module.exports = router;