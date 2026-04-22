const Alert = require('../models/Alert');
const { sendSMSAlert } = require('../services/twilioService');

// ============================================================
// AI AUTO TRACKER - Har 3 min mein status auto update karta hai
// ============================================================
const STATUS_PIPELINE = ['PENDING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'];

const startAITracker = (io) => {
  console.log('🤖 AI Tracker started - updating every 3 minutes');

  setInterval(async () => {
    try {
      const activeAlerts = await Alert.find({
        status: { $nin: ['RESOLVED'] }
      });

      for (const alert of activeAlerts) {
        const currentIdx = STATUS_PIPELINE.indexOf(alert.status);

        if (currentIdx < STATUS_PIPELINE.length - 1) {
          const nextStatus = STATUS_PIPELINE[currentIdx + 1];

          await Alert.findByIdAndUpdate(alert._id, {
            status: nextStatus,
            lastAIUpdate: new Date(),
          });

          if (io) {
            const updatedAlert = await Alert.findById(alert._id);
            io.emit('alert_updated', updatedAlert);
            io.emit('ai_status_update', {
              id: alert._id,
              title: alert.title || alert.name,
              oldStatus: alert.status,
              newStatus: nextStatus,
              updatedAt: new Date(),
            });
          }

          console.log(`🤖 AI Updated: ${alert.title || alert.name} → ${nextStatus}`);
        }
      }
    } catch (err) {
      console.error('AI Tracker error:', err);
    }
  }, 3 * 60 * 1000);
};

// ============================================================
// POST /api/alerts/analyze — Gemini AI Incident Analyzer
// ============================================================
const analyzeIncident = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'Gemini API key missing in .env' });

    const prompt = `
You are an emergency response AI for India. Analyze this incident and respond ONLY in this exact JSON format, no extra text, no markdown:
{
  "services": ["Police", "Ambulance"],
  "severity": "high",
  "suggested_description": "2-3 line description of what happened and what responders should know",
  "summary": "one line summary of the incident"
}

Rules:
- services must only be chosen from: ["Police", "Fire Brigade", "Ambulance", "Disaster Relief", "Electricity Dept", "Coast Guard"]
- severity must be exactly one of: "low", "medium", "high"
- For fire incidents: always include "Fire Brigade" and "Ambulance"
- For accidents/road crashes: always include "Police" and "Ambulance"
- For electrical issues: include "Electricity Dept" and possibly "Ambulance"
- For floods/earthquakes/building collapse: include "Disaster Relief" and "Ambulance"
- For drowning/boat incidents: include "Coast Guard" and "Ambulance"
- suggested_description should be practical and helpful for responders
- summary should be short and clear

Incident title: "${title}"
${description ? `Additional details: "${description}"` : ''}
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 400
          }
        })
      }
    );

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.json({ success: true, ...parsed });
  } catch (err) {
    console.error('analyzeIncident error:', err);
    return res.status(500).json({ error: 'AI analysis failed' });
  }
};

// ============================================================
// POST /api/alerts
// ============================================================
const createAlert = async (req, res) => {
  try {
    const { name, phone, title, description, severity, services, photo, location } = req.body;

    if (!name || !location?.lat || !location?.lng) {
      return res.status(400).json({ error: 'name, location.lat, and location.lng are required' });
    }

    const alert = await Alert.create({
      name, phone, title, description, severity, services, photo, location
    });

    const io = req.app.get('io');
    if (io) io.emit('new_alert', alert);

    sendSMSAlert({ name, phone, lat: location.lat, lng: location.lng });

    return res.status(201).json({ success: true, alert });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create alert' });
  }
};

// ============================================================
// GET /api/alerts
// ============================================================
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    return res.json({ success: true, alerts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

// ============================================================
// PATCH /api/alerts/:id/status
// ============================================================
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['PENDING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status, manualUpdate: true },
      { new: true }
    );

    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const io = req.app.get('io');
    if (io) io.emit('alert_updated', alert);

    return res.json({ success: true, alert });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status' });
  }
};

// ============================================================
// PATCH /api/alerts/:id/resolve
// ============================================================
const resolveAlert = async (req, res) => {
  req.body.status = 'RESOLVED';
  return updateStatus(req, res);
};

// ============================================================
// PATCH /api/alerts/:id/location
// ============================================================
const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { 'location.lat': lat, 'location.lng': lng },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.emit('location_updated', { id: req.params.id, lat, lng });

    return res.json({ success: true, alert });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update location' });
  }
};

module.exports = {
  createAlert,
  getAlerts,
  updateStatus,
  resolveAlert,
  updateLocation,
  startAITracker,
  analyzeIncident,
};