const twilio = require('twilio');

const sendSMSAlert = async ({ name, phone, lat, lng }) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('⚠️  Twilio credentials not set — skipping SMS');
    return;
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const body = `🚨 SOS ALERT from ${name} at ${lat.toFixed(5)},${lng.toFixed(5)}\n📍 ${mapsLink}`;

  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.ADMIN_PHONE_NUMBER,
    });
    console.log(`📱 SMS sent: ${message.sid}`);
  } catch (err) {
    console.error(`❌ Twilio error: ${err.message}`);
  }
};

module.exports = { sendSMSAlert };