const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Define upload directory
const uploadDir = path.join(__dirname, '..', 'public/images/about/carousel');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        if (!file.originalname) {
            return cb(new Error('Invalid file name'), null);
        }
        cb(null, Date.now() + '-' + file.originalname); // Ensures unique filenames
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Upload image route
router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({ message: 'Image uploaded successfully!', filePath: `/images/about/carousel/${req.file.filename}` });
});

// Delete image route
router.delete('/delete-image', (req, res) => {
    const imagePath = req.body.imagePath;
    const fullPath = path.join(__dirname, '..', 'public', imagePath);

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'Image not found' });
    }

    fs.unlink(fullPath, err => {
        if (err) {
            console.error('Error deleting image:', err);
        return res.status(500).json({ error: 'Failed to delete image' });
        }
        res.json({ message: 'Image deleted successfully!' });
    });
});

// Get carousel images route
router.get('/carousel-images', (req, res) => {
    const carouselFolder = path.join(__dirname, '..', 'public/images/about/carousel');

    // Check if the folder exists before reading files
    if (!fs.existsSync(carouselFolder)) {
        return res.status(404).json({ error: 'Carousel folder not found' });
    }

    fs.readdir(carouselFolder, (err, files) => {
        if (err) {
            console.error('Error reading carousel folder:', err);
            return res.status(500).json({ error: 'Failed to load images' });
        }

        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
        const imagePaths = imageFiles.map(file => `/images/about/carousel/${file}`);

        res.json(imagePaths);
    });
});

module.exports = router;
