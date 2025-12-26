// src/routes/sse.routes.js - Server-Sent Events Routes for Real-time Job Updates

const express = require('express');
const router = express.Router();
const sseService = require('../services/sse.service');
const { authenticate } = require('../middleware/auth.middleware');
const CharacterJob = require('../models/CharacterJob.model');
const MediaGenerationJob = require('../models/MediaGenerationJob.model');
const logger = require('../utils/logger');

/**
 * SSE endpoint for character creation job status
 * @route GET /api/v1/sse/jobs/character/:jobId
 */
router.get('/jobs/character/:jobId', authenticate, async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user._id.toString();

        // Verify user owns this job
        const job = await CharacterJob.findOne({ jobId, userId });
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or access denied'
            });
        }

        // Subscribe to job updates
        sseService.subscribeToJob(jobId, res, userId);

        // Send initial job status
        const initialStatus = {
            jobId: job.jobId,
            status: job.status,
            progress: job.progress || 0,
            result: job.result,
            failedReason: job.failedReason,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt
        };

        sseService.sendToClient(res, {
            type: 'initial_status',
            ...initialStatus
        });

    } catch (error) {
        logger.error('SSE connection error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to establish SSE connection'
            });
        }
    }
});

/**
 * SSE endpoint for media generation job status
 * @route GET /api/v1/sse/jobs/media/:jobId
 */
router.get('/jobs/media/:jobId', authenticate, async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user._id.toString();

        // Verify user owns this job
        const job = await MediaGenerationJob.findOne({ jobId, userId });
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or access denied'
            });
        }

        // Subscribe to job updates
        sseService.subscribeToJob(jobId, res, userId);

        // Send initial job status
        const initialStatus = {
            jobId: job.jobId,
            status: job.status,
            progress: job.progress || 0,
            type: job.type,
            result: job.result,
            failedReason: job.failedReason,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt
        };

        sseService.sendToClient(res, {
            type: 'initial_status',
            ...initialStatus
        });

    } catch (error) {
        logger.error('SSE connection error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to establish SSE connection'
            });
        }
    }
});

/**
 * SSE endpoint for all user's jobs (multiple jobs)
 * @route GET /api/v1/sse/jobs/my
 */
router.get('/jobs/my', authenticate, async (req, res) => {
    try {
        const userId = req.user._id.toString();

        // Subscribe to all user's job updates
        sseService.subscribeToJob(`user:${userId}`, res, userId);

        // Send initial message
        sseService.sendToClient(res, {
            type: 'connected',
            message: 'Connected to your jobs stream',
            userId: userId
        });

    } catch (error) {
        logger.error('SSE connection error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to establish SSE connection'
            });
        }
    }
});

/**
 * Get SSE connection statistics (admin only)
 * @route GET /api/v1/sse/stats
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const stats = sseService.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting SSE stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get SSE statistics'
        });
    }
});

module.exports = router;

