const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Authentication API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      expect(response.body.apiKey).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Create initial user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should normalize email addresses', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: ' TEST@example.COM ',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email format');
    });

    it('should require password minimum length', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 8 characters long');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
    });

    it('should login existing user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.apiKey).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Token Validation', () => {
    let validToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      validToken = response.body.token;
    });

    it('should accept valid token', async () => {
      const response = await request(app)
        .get('/urls')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject malformed token', async () => {
      const response = await request(app)
        .get('/urls')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid authentication');
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/urls');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('API Key Validation', () => {
    let validApiKey;
    let validToken;

    beforeEach(async () => {
      // Clear users before each test
      await User.deleteMany({});
      
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Add delay to ensure user is created
      await new Promise(resolve => setTimeout(resolve, 100));
      
      validApiKey = response.body.apiKey;
      validToken = response.body.token;
    });

    it('should accept valid API key', async () => {
      const response = await request(app)
        .get('/urls')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/urls')
        .set('X-API-Key', 'invalid-api-key');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should refresh API key', async () => {
      const response = await request(app)
        .post('/auth/refresh-api-key')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.apiKey).not.toBe(validApiKey);

      // Verify old key is invalid
      const oldKeyResponse = await request(app)
        .get('/urls')
        .set('X-API-Key', validApiKey);
      expect(oldKeyResponse.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await User.deleteMany({});
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should limit registration attempts', async () => {
      const attempts = Array(20).fill().map((_, i) => 
        request(app)
          .post('/auth/register')
          .send({
            email: `user${i}@example.com`,
            password: 'password123'
          })
      );

      // Add small delay between batches of requests
      const batchSize = 5;
      const responses = [];
      for (let i = 0; i < attempts.length; i += batchSize) {
        const batch = attempts.slice(i, i + batchSize);
        const batchResponses = await Promise.all(batch);
        responses.push(...batchResponses);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const hasRateLimit = responses.some(r => r.status === 429);
      expect(hasRateLimit).toBe(true);
    });

    it('should limit login attempts', async () => {
      // Create test user first
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      await new Promise(resolve => setTimeout(resolve, 100));

      const attempts = Array(20).fill().map(() => 
        request(app)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      // Add small delay between batches of requests
      const batchSize = 5;
      const responses = [];
      for (let i = 0; i < attempts.length; i += batchSize) {
        const batch = attempts.slice(i, i + batchSize);
        const batchResponses = await Promise.all(batch);
        responses.push(...batchResponses);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const hasRateLimit = responses.some(r => r.status === 429);
      expect(hasRateLimit).toBe(true);
    });
  });
}); 