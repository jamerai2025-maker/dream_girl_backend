// src/config/database.js - MongoDB Connection with Connection Pooling
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const options = {
      // Connection Pool Settings (Important for Scalability)
      maxPoolSize: 10,           // Maximum number of connections in pool
      minPoolSize: 5,            // Minimum number of connections in pool
      maxIdleTimeMS: 30000,      // Close connections idle for 30 seconds
      
      // Timeouts
      serverSelectionTimeoutMS: 5000,  // Timeout for server selection
      socketTimeoutMS: 45000,          // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 10000,         // Timeout for initial connection
      
      // Retry Settings
      retryWrites: true,
      retryReads: true,
      
      // Write Concern (for data safety)
      w: 'majority',
      
      // Read Preference (for scaling reads)
      readPreference: 'primaryPreferred'
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Connection Events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;

  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;
