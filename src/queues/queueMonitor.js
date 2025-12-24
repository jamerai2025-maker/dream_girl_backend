// src/queues/queueMonitor.js - Bull Board UI for Queue Monitoring

const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { imageGenerationQueue } = require('./imageGeneration.queue');
const { characterCreationQueue } = require('./characterCreation.queue');
const { imageGenerationQueue: mediaImageQueue, videoGenerationQueue } = require('./mediaGeneration.queue');

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [
        new BullAdapter(imageGenerationQueue),
        new BullAdapter(characterCreationQueue),
        new BullAdapter(mediaImageQueue),
        new BullAdapter(videoGenerationQueue)
    ],
    serverAdapter: serverAdapter
});

module.exports = {
    serverAdapter,
    addQueue,
    removeQueue
};
