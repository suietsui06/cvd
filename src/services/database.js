const mongoose = require('mongoose');
const config = require('../config/config');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      console.log('📦 Connecting to MongoDB...');

      this.connection = await mongoose.connect(
        config.mongodb.uri,
        config.mongodb.options
      );

      console.log('✅ MongoDB connected successfully');

      // Connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('📦 MongoDB disconnected');
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return { status: 'disconnected', healthy: false };
      }

      // Test query
      await mongoose.connection.db.admin().ping();

      return {
        status: 'connected',
        healthy: true,
        host: mongoose.connection.host,
        db: mongoose.connection.name,
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message,
      };
    }
  }
}

module.exports = new Database();