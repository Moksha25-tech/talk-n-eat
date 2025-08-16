// backend/server.js - Express.js server to handle audio recordings
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Create directories for storing recordings and logs
const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const LOGS_DIR = path.join(__dirname, 'logs');

// Ensure directories exist
const ensureDirectoriesExist = async () => {
    try {
        await fs.mkdir(RECORDINGS_DIR, { recursive: true });
        await fs.mkdir(LOGS_DIR, { recursive: true });
        console.log('Storage directories created/verified');
    } catch (error) {
        console.error('Error creating directories:', error);
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, RECORDINGS_DIR);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = path.extname(file.originalname);
        cb(null, `recording_${timestamp}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

// Initialize directories on server start
ensureDirectoriesExist();

// API endpoint to upload recordings
app.post('/api/upload-recording', upload.single('audio'), async (req, res) => {
    try {
        console.log('Received recording upload request');

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const { timestamp, duration, transcript, cartItems } = req.body;

        // Parse cart items if provided
        let parsedCartItems = [];
        try {
            parsedCartItems = cartItems ? JSON.parse(cartItems) : [];
        } catch (error) {
            console.warn('Error parsing cart items:', error);
        }

        // Create recording metadata
        const recordingData = {
            id: Date.now(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            timestamp: timestamp || new Date().toISOString(),
            duration: parseInt(duration) || 0,
            transcript: transcript || '',
            cartItems: parsedCartItems,
            uploadedAt: new Date().toISOString()
        };

        // Save recording metadata to log file
        const logFileName = `recording_log_${new Date().toISOString().split('T')[0]}.json`;
        const logFilePath = path.join(LOGS_DIR, logFileName);

        try {
            // Try to read existing log file
            let existingLogs = [];
            try {
                const existingData = await fs.readFile(logFilePath, 'utf8');
                existingLogs = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist or is empty, start with empty array
                existingLogs = [];
            }

            // Add new recording data
            existingLogs.push(recordingData);

            // Write updated logs back to file
            await fs.writeFile(logFilePath, JSON.stringify(existingLogs, null, 2));
            console.log(`Recording metadata saved to ${logFileName}`);
        } catch (error) {
            console.error('Error saving recording metadata:', error);
        }

        // Send success response
        res.json({
            success: true,
            message: 'Recording uploaded successfully',
            recordingId: recordingData.id,
            filename: req.file.filename,
            size: req.file.size,
            duration: recordingData.duration,
            transcript: recordingData.transcript,
            cartItemsCount: parsedCartItems.length
        });

        console.log(`Recording saved: ${req.file.filename} (${req.file.size} bytes)`);

    } catch (error) {
        console.error('Error uploading recording:', error);
        res.status(500).json({
            error: 'Failed to upload recording',
            message: error.message
        });
    }
});

// API endpoint to get recordings list
app.get('/api/recordings', async (req, res) => {
    try {
        const files = await fs.readdir(RECORDINGS_DIR);
        const recordings = [];

        for (const file of files) {
            if (file.endsWith('.webm') || file.endsWith('.wav') || file.endsWith('.mp3')) {
                const filePath = path.join(RECORDINGS_DIR, file);
                const stats = await fs.stat(filePath);

                recordings.push({
                    filename: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                });
            }
        }

        // Sort by creation date (newest first)
        recordings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            count: recordings.length,
            recordings: recordings
        });

    } catch (error) {
        console.error('Error fetching recordings:', error);
        res.status(500).json({
            error: 'Failed to fetch recordings',
            message: error.message
        });
    }
});

// API endpoint to get recording logs
app.get('/api/recording-logs', async (req, res) => {
    try {
        const { date } = req.query;
        let logFileName;

        if (date) {
            logFileName = `recording_log_${date}.json`;
        } else {
            // Get today's log file
            logFileName = `recording_log_${new Date().toISOString().split('T')[0]}.json`;
        }

        const logFilePath = path.join(LOGS_DIR, logFileName);

        try {
            const logData = await fs.readFile(logFilePath, 'utf8');
            const logs = JSON.parse(logData);

            res.json({
                success: true,
                date: date || new Date().toISOString().split('T')[0],
                count: logs.length,
                logs: logs
            });
        } catch (error) {
            // Log file doesn't exist
            res.json({
                success: true,
                date: date || new Date().toISOString().split('T')[0],
                count: 0,
                logs: [],
                message: 'No recordings found for this date'
            });
        }

    } catch (error) {
        console.error('Error fetching recording logs:', error);
        res.status(500).json({
            error: 'Failed to fetch recording logs',
            message: error.message
        });
    }
});

// API endpoint to download a specific recording
app.get('/api/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(RECORDINGS_DIR, filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Stream the file
        const fileStream = require('fs').createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading recording:', error);
        res.status(500).json({
            error: 'Failed to download recording',
            message: error.message
        });
    }
});

// API endpoint to delete a recording
app.delete('/api/recordings/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(RECORDINGS_DIR, filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        // Delete the file
        await fs.unlink(filePath);

        res.json({
            success: true,
            message: `Recording ${filename} deleted successfully`
        });

        console.log(`Recording deleted: ${filename}`);

    } catch (error) {
        console.error('Error deleting recording:', error);
        res.status(500).json({
            error: 'Failed to delete recording',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Voice Assistant Recording API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'Audio file size exceeds the 50MB limit'
            });
        }
    }

    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Voice Assistant Recording API server running on port ${PORT}`);
    console.log(`Recordings will be saved to: ${RECORDINGS_DIR}`);
    console.log(`Logs will be saved to: ${LOGS_DIR}`);
});

module.exports = app;