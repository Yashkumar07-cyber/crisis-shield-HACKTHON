const express = require('express');
const router = express.Router();
const {
  createAlert,
  getAlerts,
  updateStatus,
  resolveAlert,
  updateLocation,
  analyzeIncident,
} = require('../controllers/alertController');

router.post('/analyze', analyzeIncident);
router.post('/', createAlert);
router.get('/', getAlerts);
router.patch('/:id/status', updateStatus);
router.patch('/:id/resolve', resolveAlert);
router.patch('/:id/location', updateLocation);

module.exports = router;