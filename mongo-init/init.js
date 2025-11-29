// mongo-init/init.js - MongoDB Initialization Script
// This runs when MongoDB container starts for the first time

db = db.getSiblingDB('myapp');

// Create application user
db.createUser({
  user: 'appuser',
  pwd: 'apppassword123',
  roles: [
    { role: 'readWrite', db: 'myapp' }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ email: 1, isActive: 1 });
db.users.createIndex({ role: 1, isActive: 1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ name: 'text', email: 'text' });

// Insert sample admin user (password: Admin@123)
db.users.insertOne({
  email: 'admin@example.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.E4wzjN8.ZdqnHi',
  name: 'Admin User',
  role: 'admin',
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');
