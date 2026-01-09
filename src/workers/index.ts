import '../lib/env'; // Ensure env vars are loaded if you have a loader
// Import workers to start them
import './mrp.worker';

// Keep process alive
console.log('[Worker System] All workers initialized.');

process.on('SIGTERM', async () => {
    console.log('[Worker System] SIGTERM received. Shutting down...');
    process.exit(0);
});
