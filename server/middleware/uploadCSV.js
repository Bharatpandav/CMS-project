import multer from 'multer';

const storage = multer.memoryStorage();

const uploadCSV = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const isCSV =
            file.mimetype === 'text/csv' ||
            file.originalname.toLowerCase().endsWith('.csv');

        if (!isCSV) {
            return cb(
                new Error('Only CSV files are allowed')
            );
        }

        cb(null, true);
    }
});

export default uploadCSV;