// src/config/cloudinary.js - Cloudinary Configuration

const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Verify Cloudinary configuration
 * @returns {boolean} - True if configured, false otherwise
 */
const isConfigured = () => {
    const { cloud_name, api_key, api_secret } = cloudinary.config();

    if (!cloud_name || !api_key || !api_secret) {
        logger.warn('⚠️  Cloudinary not configured. Missing environment variables.');
        return false;
    }

    logger.info('✅ Cloudinary configured successfully');
    return true;
};

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64Image - Base64 encoded image
 * @param {string} publicId - Public ID for the image
 * @param {string} folder - Folder path in Cloudinary
 * @returns {Promise<Object>} - Upload result with secure_url
 */
const uploadBase64Image = async (base64Image, publicId, folder = 'nova-ai/characters') => {
    try {
        if (!isConfigured()) {
            throw new Error('Cloudinary is not configured');
        }

        // Format base64 string for Cloudinary
        const base64Data = `data:image/png;base64,${base64Image}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Data, {
            public_id: publicId,
            folder: folder,
            resource_type: 'image',
            format: 'png',
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        });

        logger.info(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);

        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };

    } catch (error) {
        logger.error('❌ Cloudinary upload failed:', error.message);
        throw error;
    }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (publicId) => {
    try {
        if (!isConfigured()) {
            throw new Error('Cloudinary is not configured');
        }

        const result = await cloudinary.uploader.destroy(publicId);
        logger.info(`🗑️  Image deleted from Cloudinary: ${publicId}`);

        return result;

    } catch (error) {
        logger.error('❌ Cloudinary delete failed:', error.message);
        throw error;
    }
};

module.exports = {
    cloudinary,
    isConfigured,
    uploadBase64Image,
    deleteImage
};
