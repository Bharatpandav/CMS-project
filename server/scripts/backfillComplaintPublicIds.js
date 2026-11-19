import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Complaint from '../models/complaintModel.js';
import User from '../models/userModel.js';
import { backfillComplaintPublicIds } from '../utils/complaintPublicId.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error('MONGO_URI is not set');
    process.exit(1);
}

await mongoose.connect(mongoUri);

try {
    const result = await backfillComplaintPublicIds(Complaint, User);
    if (!result.ok) {
        console.error('Complaint ID backfill stopped before writing.');
        for (const issue of result.issues) {
            console.error(JSON.stringify(issue));
        }
        process.exitCode = 1;
    } else {
        console.log(
            `Complaint ID backfill complete. Scanned ${result.scanned}, updated ${result.updated}.`
        );
    }
} finally {
    await mongoose.disconnect();
}
