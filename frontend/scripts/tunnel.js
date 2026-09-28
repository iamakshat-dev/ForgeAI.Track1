const ngrok = require('@ngrok/ngrok');

const authtoken = process.env.NGROK_AUTHTOKEN || process.argv[2];

if (!authtoken) {
  console.error('Error: Please provide your ngrok authtoken.');
  console.error('Usage: node scripts/tunnel.js <YOUR_NGROK_AUTHTOKEN>');
  console.error('Or set: export NGROK_AUTHTOKEN=your_token');
  process.exit(1);
}

(async () => {
  try {
    const listener = await ngrok.forward({
      addr: 3000,
      authtoken,
    });
    console.log('\n======================================================');
    console.log(`🚀 NGROK PUBLIC URL: ${listener.url()}`);
    console.log('Forwarding to: http://localhost:3000');
    console.log('======================================================\n');

    // Keep process alive indefinitely
    setInterval(() => {}, 1000 * 60 * 60);

    process.on('SIGINT', async () => {
      console.log('Stopping ngrok tunnel...');
      await listener.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start ngrok tunnel:', err.message);
    process.exit(1);
  }
})();
