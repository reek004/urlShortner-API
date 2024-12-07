const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Url = require('../../src/models/Url');

let mongoServer;
let token;
let apiKey;
let testUrlCode;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create test user
  const response = await request(app)
    .post('/auth/register')
    .send({
      email: 'test@example.com',
      password: 'password123'
    });

  token = response.body.token;
  apiKey = response.body.apiKey;
  
  // Create an initial URL for testing
  const urlResponse = await request(app)
    .post('/urls')
    .set('Authorization', `Bearer ${token}`)
    .send({
      longUrl: 'https://example.com',
      customAlias: 'test123'
    });

  testUrlCode = 'test123';

  // Verify the URL was created successfully
  if (urlResponse.status !== 200) {
    throw new Error('Failed to create test URL');
  }
});

// Add a beforeEach to clear the database except for the test user and initial URL
beforeEach(async () => {
  const urls = await Url.find({});
  if (urls.length > 1) {
    // Keep only the test URL
    await Url.deleteMany({ urlCode: { $ne: testUrlCode } });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('URL Shortener API', () => {
  // Test GET /urls (Get all URLs)
  describe('GET /urls', () => {
    it('should get all URLs for authenticated user with JWT token', async () => {
      const response = await request(app)
        .get('/urls')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get all URLs for authenticated user with API key', async () => {
      const response = await request(app)
        .get('/urls')
        .set('X-API-Key', apiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject unauthorized request', async () => {
      const response = await request(app)
        .get('/urls');

      expect(response.status).toBe(401);
    });
  });

  // Test POST /urls (Create short URL)
  describe('POST /urls', () => {
    it('should create a short URL with JWT token', async () => {
      const response = await request(app)
        .post('/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com',
          customAlias: 'test456'
        });

      expect(response.status).toBe(200);
      expect(response.body.shortUrl).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
      testUrlCode = 'test123'; // Save for later tests
    });

    it('should create a short URL with API key', async () => {
      const response = await request(app)
        .post('/urls')
        .set('X-API-Key', apiKey)
        .send({
          longUrl: 'https://example.com/api-key-test'
        });

      expect(response.status).toBe(200);
      expect(response.body.shortUrl).toBeDefined();
    });

    it('should create a short URL with expiration', async () => {
      const response = await request(app)
        .post('/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com/expiring',
          expiresIn: 3600 // 1 hour
        });

      expect(response.status).toBe(200);
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should reject invalid URLs', async () => {
      const response = await request(app)
        .post('/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'invalid-url'
        });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate custom aliases', async () => {
      const response = await request(app)
        .post('/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com',
          customAlias: 'test123'
        });

      expect(response.status).toBe(400);
    });
  });

  // Test POST /urls/bulk (Bulk URL creation)
  describe('POST /urls/bulk', () => {
    it('should create multiple URLs', async () => {
      const response = await request(app)
        .post('/urls/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          urls: [
            { longUrl: 'https://example1.com' },
            { longUrl: 'https://example2.com', customAlias: 'custom2' }
          ]
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should handle invalid URLs in bulk creation', async () => {
      const response = await request(app)
        .post('/urls/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          urls: [
            { longUrl: 'invalid-url' },
            { longUrl: 'https://valid-url.com' }
          ]
        });

      expect(response.status).toBe(400);
    });
  });

  // Test GET /:code (URL redirection)
  describe('GET /:code', () => {
    it('should redirect to long URL', async () => {
      const response = await request(app)
        .get(`/${testUrlCode}`)
        .send();

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('https://example.com');
    });

    it('should handle non-existent URLs', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .send();

      expect(response.status).toBe(404);
    });
  });

  // Test GET /urls/:code/stats (URL statistics)
  describe('GET /urls/:code/stats', () => {
    it('should return URL statistics', async () => {
      const createResponse = await request(app)
        .post('/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com',
          customAlias: 'statstest'
        });
      
      // Extract urlCode from shortUrl
      const urlCode = createResponse.body.shortUrl.split('/').pop();
      
      // Make test clicks with proper headers
      await request(app)
        .get(`/${urlCode}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/96.0.4664.110')
        .set('Referer', 'https://google.com');
        
      await request(app)
        .get(`/${urlCode}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/95.0')
        .set('Referer', 'https://github.com');
      
      // Add a small delay to ensure clicks are processed
      await new Promise(resolve => setTimeout(resolve, 100));
        

      const response = await request(app)
        .get(`/urls/${urlCode}/stats`)
        .set('Authorization', `Bearer ${token}`)
        .send();
      

      expect(response.status).toBe(200);
      expect(response.body.totalClicks).toBeDefined();
      expect(response.body.browserStats).toBeDefined();
      expect(response.body.referrerStats).toBeDefined();
      expect(response.body.clicksByDate).toBeDefined();
    });

    it('should handle non-existent URLs', async () => {
      const response = await request(app)
        .get('/urls/nonexistent/stats')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(404);
    });
  });

  // Test GET /urls/:code/qr (QR code)
  describe('GET /urls/:code/qr', () => {
    it('should return QR code information', async () => {
      const response = await request(app)
        .get(`/urls/${testUrlCode}/qr`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.shortUrl).toBeDefined();
    });

    it('should handle non-existent URLs', async () => {
      const response = await request(app)
        .get('/urls/nonexistent/qr')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(404);
    });
  });

  // Test DELETE /urls/:code (Delete URL)
  describe('DELETE /urls/:code', () => {
    let testUrl;

    beforeEach(async () => {
      // Create a test URL before each test
      const urlResponse = await request(app)
        .post('/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com/delete-test',
          customAlias: 'deletetest'
        });

      testUrl = urlResponse.body;
    });

    it('should successfully delete a URL', async () => {
      const response = await request(app)
        .delete('/urls/deletetest')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.message).toBe('URL deleted successfully');

      // Verify URL was actually deleted
      const deletedUrl = await Url.findOne({ urlCode: 'deletetest' });
      expect(deletedUrl).toBeNull();
    });

    it('should return 404 when URL does not exist', async () => {
      const response = await request(app)
        .delete('/urls/nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('CLIENT_ERROR');
      expect(response.body.message).toBe('No such URL');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete('/urls/deletetest');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 when trying to delete another user\'s URL', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'otheruser@example.com',
          password: 'password123'
        });

      // Add a small delay to ensure URL is properly saved
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .delete('/urls/deletetest')
        .set('Authorization', `Bearer ${otherUserResponse.body.token}`);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('AUTH_ERROR');
      expect(response.body.message).toBe('Authorization error');

      // Verify URL still exists
      const url = await Url.findOne({ urlCode: 'deletetest' });
      expect(url).not.toBeNull();
    });

    it('should accept API key authentication', async () => {
      const response = await request(app)
        .delete('/urls/deletetest')
        .set('X-API-Key', apiKey);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.message).toBe('URL deleted successfully');
    });

    it('should handle missing URL code parameter', async () => {
      const response = await request(app)
        .delete('/urls/')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
}); 

 // Test rate limiting
 describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    const requests = Array(101).fill().map(() => 
      request(app)
        .get(`/${testUrlCode}`)
        .send()
    );

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.some(r => r.status === 429);
    expect(tooManyRequests).toBe(true);
  });
});