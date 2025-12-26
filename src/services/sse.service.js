// src/services/sse.service.js - Server-Sent Events Service for Real-time Job Updates

const logger = require('../utils/logger');

/**
 * SSE Connection Manager
 * Manages active SSE connections for real-time job status updates
 */
class SSEService {
    constructor() {
        // Map of jobId -> Set of response objects (clients)
        this.connections = new Map();
        
        // Map of userId -> Set of response objects (for user-specific updates)
        this.userConnections = new Map();
    }

    /**
     * Add a client connection for a specific job
     * @param {string} jobId - Job ID to subscribe to
     * @param {Object} res - Express response object
     * @param {string} userId - User ID (optional, for user-specific updates)
     */
    subscribeToJob(jobId, res, userId = null) {
        // Initialize Set for this job if it doesn't exist
        if (!this.connections.has(jobId)) {
            this.connections.set(jobId, new Set());
        }

        // Add this client to the job's connection set
        this.connections.get(jobId).add(res);

        // Also track by user if userId provided
        if (userId) {
            if (!this.userConnections.has(userId)) {
                this.userConnections.set(userId, new Set());
            }
            this.userConnections.get(userId).add(res);
        }

        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true'
        });

        // Send initial connection message
        this.sendToClient(res, {
            type: 'connected',
            jobId: jobId,
            message: 'Connected to job status stream'
        });

        // Handle client disconnect
        res.on('close', () => {
            this.unsubscribeFromJob(jobId, res, userId);
            logger.info(`SSE connection closed for job ${jobId}`);
        });

        // Send keepalive every 30 seconds
        const keepalive = setInterval(() => {
            if (!res.destroyed) {
                res.write(': keepalive\n\n');
            } else {
                clearInterval(keepalive);
            }
        }, 30000);

        res.on('close', () => clearInterval(keepalive));

        logger.info(`SSE client subscribed to job ${jobId}`, {
            jobId,
            userId,
            totalConnections: this.connections.get(jobId).size
        });
    }

    /**
     * Remove a client connection
     * @param {string} jobId - Job ID
     * @param {Object} res - Express response object
     * @param {string} userId - User ID (optional)
     */
    unsubscribeFromJob(jobId, res, userId = null) {
        if (this.connections.has(jobId)) {
            this.connections.get(jobId).delete(res);
            
            // Clean up empty sets
            if (this.connections.get(jobId).size === 0) {
                this.connections.delete(jobId);
            }
        }

        if (userId && this.userConnections.has(userId)) {
            this.userConnections.get(userId).delete(res);
            
            if (this.userConnections.get(userId).size === 0) {
                this.userConnections.delete(userId);
            }
        }
    }

    /**
     * Send update to all clients subscribed to a job
     * @param {string} jobId - Job ID
     * @param {Object} data - Data to send
     */
    broadcastJobUpdate(jobId, data) {
        if (!this.connections.has(jobId)) {
            return; // No subscribers
        }

        const clients = this.connections.get(jobId);
        const message = {
            type: 'job_update',
            jobId: jobId,
            timestamp: new Date().toISOString(),
            ...data
        };

        let sentCount = 0;
        let errorCount = 0;

        clients.forEach((res) => {
            try {
                if (!res.destroyed) {
                    this.sendToClient(res, message);
                    sentCount++;
                } else {
                    // Remove destroyed connections
                    clients.delete(res);
                    errorCount++;
                }
            } catch (error) {
                logger.error(`Error sending SSE update to client:`, error);
                clients.delete(res);
                errorCount++;
            }
        });

        if (sentCount > 0) {
            logger.debug(`Broadcasted job update to ${sentCount} clients for job ${jobId}`);
        }

        // Clean up if no more clients
        if (clients.size === 0) {
            this.connections.delete(jobId);
        }
    }

    /**
     * Send update to all clients for a specific user
     * @param {string} userId - User ID
     * @param {Object} data - Data to send
     */
    broadcastUserUpdate(userId, data) {
        if (!this.userConnections.has(userId)) {
            return; // No subscribers
        }

        const clients = this.userConnections.get(userId);
        const message = {
            type: 'user_update',
            userId: userId,
            timestamp: new Date().toISOString(),
            ...data
        };

        clients.forEach((res) => {
            try {
                if (!res.destroyed) {
                    this.sendToClient(res, message);
                } else {
                    clients.delete(res);
                }
            } catch (error) {
                logger.error(`Error sending SSE update to user client:`, error);
                clients.delete(res);
            }
        });
    }

    /**
     * Send data to a single client
     * @param {Object} res - Express response object
     * @param {Object} data - Data to send
     */
    sendToClient(res, data) {
        if (res.destroyed) {
            return;
        }

        try {
            const jsonData = JSON.stringify(data);
            res.write(`data: ${jsonData}\n\n`);
        } catch (error) {
            logger.error(`Error writing SSE data:`, error);
        }
    }

    /**
     * Get connection statistics
     * @returns {Object} Stats about active connections
     */
    getStats() {
        return {
            totalJobs: this.connections.size,
            totalConnections: Array.from(this.connections.values())
                .reduce((sum, set) => sum + set.size, 0),
            totalUsers: this.userConnections.size,
            jobs: Array.from(this.connections.entries()).map(([jobId, clients]) => ({
                jobId,
                connections: clients.size
            }))
        };
    }
}

// Singleton instance
const sseService = new SSEService();

module.exports = sseService;

