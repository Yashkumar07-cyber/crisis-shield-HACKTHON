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
      // Sirf incomplete alerts track karo
      const activeAlerts = await Alert.find({
        status: { $nin: ['RESOLVED'] }
      });

      for (const alert of activeAlerts) {
        const currentIdx = STATUS_PIPELINE.indexOf(alert.status);

        // Agar last status nahi hai toh next pe move karo
        if (currentIdx < STATUS_PIPELINE.length - 1) {
          const nextStatus = STATUS_PIPELINE[currentIdx + 1];

          await Alert.findByIdAndUpdate(alert._id, {
            status: nextStatus,
            lastAIUpdate: new Date(),
          });

          // Socket se frontend ko update bhejo
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
  }, 3 * 60 * 1000); // 3 minutes
};

// POST /api/alerts
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

// GET /api/alerts
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    return res.json({ success: true, alerts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

// PATCH /api/alerts/:id/status  (Manual update)
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

// PATCH /api/alerts/:id/resolve
const resolveAlert = async (req, res) => {
  req.body.status = 'RESOLVED';
  return updateStatus(req, res);
};

// PATCH /api/alerts/:id/location
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

module.exports = { createAlert, getAlerts, updateStatus, resolveAlert, updateLocation, startAITracker };