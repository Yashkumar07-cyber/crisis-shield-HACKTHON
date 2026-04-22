const express = require('express');
const router = express.Router();

// Cache — same title dobara analyze na ho
const cache = new Map();

// Multiple models try karo — agar ek fail ho toh doosra
const MODELS = [
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-1.0-pro'
];

async function callGemini(title) {
  const prompt = `Emergency AI. Analyze incident and return ONLY valid JSON, no markdown.
Incident: "${title}"
Services available: Police, Fire Brigade, Ambulance, Disaster Relief, Electricity Dept, Coast Guard
Rules: fire=Fire Brigade+Ambulance, accident=Police+Ambulance, flood=Disaster Relief+Ambulance, electric=Electricity Dept+Police
Return: {"summary":"brief analysis","severity":"high|medium|low","services":["service1"],"suggested_description":"description"}`;

  const apiKey = process.env.GEMINI_API_KEY;

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
          })
        }
      );

      if (response.status === 429) {
        console.log(`${model} rate limited, trying next...`);
        continue; // next model try karo
      }

      if (!response.ok) {
        const err = await response.text();
        console.log(`${model} error ${response.status}:`, err);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log(`Success with model: ${model}`);
      return parsed;

    } catch (err) {
      console.log(`${model} failed:`, err.message);
      continue;
    }
  }

  // Sab models fail — rule-based fallback
  console.log('All models failed, using rule-based fallback');
  return ruleBased(title);
}

// Rule-based fallback — koi API nahi chahiye
function ruleBased(title) {
  const t = title.toLowerCase();
  let services = [], severity = 'medium', summary = '';

  if (t.includes('fire') || t.includes('aag') || t.includes('burn')) {
    services = ['Fire Brigade', 'Ambulance'];
    severity = 'high';
    summary = 'Fire incident detected. Immediate fire brigade and medical response required. Evacuate the area.';
  } else if (t.includes('accident') || t.includes('crash') || t.includes('collision')) {
    services = ['Police', 'Ambulance'];
    severity = 'high';
    summary = 'Road accident detected. Police and ambulance required immediately. Secure the area.';
  } else if (t.includes('flood') || t.includes('water') || t.includes('baarish')) {
    services = ['Disaster Relief', 'Ambulance'];
    severity = 'medium';
    summary = 'Flooding incident detected. Disaster relief and evacuation assistance needed.';
  } else if (t.includes('electric') || t.includes('bijli') || t.includes('wire')) {
    services = ['Electricity Dept', 'Police'];
    severity = 'high';
    summary = 'Electrical hazard detected. Keep distance, electricity department needed urgently.';
  } else if (t.includes('fight') || t.includes('attack') || t.includes('crime')) {
    services = ['Police'];
    severity = 'high';
    summary = 'Security incident detected. Police response required immediately.';
  } else if (t.includes('medical') || t.includes('injury') || t.includes('hurt')) {
    services = ['Ambulance'];
    severity = 'medium';
    summary = 'Medical emergency detected. Ambulance required immediately.';
  } else {
    services = ['Police', 'Ambulance'];
    severity = 'medium';
    summary = 'Emergency incident reported. Police and medical services dispatched for assessment.';
  }

  return {
    summary,
    severity,
    services,
    suggested_description: `${title}. Emergency services have been notified. Please provide more details about the situation.`
  };
}

router.post('/analyze', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title required' });

  const cacheKey = title.toLowerCase().trim();
  if (cache.has(cacheKey)) {
    return res.json({ success: true, ...cache.get(cacheKey) });
  }

  try {
    const result = await callGemini(title);

    cache.set(cacheKey, result);
    setTimeout(() => cache.delete(cacheKey), 60 * 60 * 1000);

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Fatal error:', err.message);
    // Even on fatal error — rule based return karo
    const fallback = ruleBased(title);
    res.json({ success: true, ...fallback });
  }
});

module.exports = router;