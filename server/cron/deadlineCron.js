import cron from 'node-cron';
import { handleTimeouts } from '../controllers/complaintController.js';

// Har din raat 12 baje chalega
cron.schedule('0 0 * * *', async () => {
    console.log('Running complaint deadline check...');
    await handleTimeouts();
});