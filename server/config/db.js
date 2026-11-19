import mongoose from 'mongoose';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/ucms';
const MAX_ATTEMPTS = 3;
const RETRY_MS = 2500;

function resolveMongoUri() {
    return (
        process.env.MONGO_URI?.trim() ||
        process.env.MONGODB_URI?.trim() ||
        ''
    );
}

function localFallbackUri() {
    if (process.env.MONGO_FALLBACK_URI?.trim()) {
        return process.env.MONGO_FALLBACK_URI.trim();
    }
    if (process.env.USE_LOCAL_MONGO_FALLBACK === 'true') {
        return DEFAULT_LOCAL_URI;
    }
    if (process.env.NODE_ENV !== 'production') {
        return DEFAULT_LOCAL_URI;
    }
    return null;
}

function isAtlasUri(uri) {
    return typeof uri === 'string' && uri.includes('mongodb.net');
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function tryConnect(uri) {
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000
    });
}

const connectDB = async () => {
    const primaryUri = resolveMongoUri();

    if (!primaryUri) {
        const fallbackOnly = localFallbackUri();
        if (fallbackOnly) {
            console.warn(
                'MONGO_URI is not set — connecting to local database for development.'
            );
            await tryConnect(fallbackOnly);
            console.log('MongoDB connected (local fallback)');
            return;
        }
        console.error(
            'MONGO_URI (or MONGODB_URI) is required. Copy server/.env.example to server/.env.'
        );
        process.exit(1);
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            await tryConnect(primaryUri);
            console.log('MongoDB connected');
            return;
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS) {
                console.warn(
                    `MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS} failed; retrying…`
                );
                await mongoose.disconnect().catch(() => {});
                await sleep(RETRY_MS);
            }
        }
    }

    const fallbackUri = localFallbackUri();

    if (fallbackUri && fallbackUri !== primaryUri) {
        console.error('Error connecting to MongoDB:', lastError?.message || lastError);
        if (isAtlasUri(primaryUri)) {
            console.warn(
                'Atlas could not be reached (often IP whitelist or network). ' +
                    'Trying local MongoDB instead. Add your IP in Atlas → Network Access to use the cloud database.'
            );
        }
        try {
            await mongoose.disconnect().catch(() => {});
            await tryConnect(fallbackUri);
            console.log(`MongoDB connected (local fallback: ${fallbackUri})`);
            console.warn(
                'Run `npm run seed:dev` or `npm run seed:fresh` if this local database is empty.'
            );
            return;
        } catch (fallbackError) {
            console.error('Local MongoDB fallback also failed:', fallbackError.message);
        }
    }

    console.error('Error connecting to MongoDB:', lastError);
    if (isAtlasUri(primaryUri)) {
        console.error(
            '\nAtlas fix: MongoDB Atlas → Network Access → Add IP Address → Add Current IP Address, then restart the server.\n'
        );
    }
    process.exit(1);
};

export default connectDB;