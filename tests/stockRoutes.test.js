/**
 * Integration smoke tests for /stock routes
 */
process.env.NODE_ENV = 'test';


const request = require('supertest');

// Mock Prisma client methods used in stockRoutes
jest.mock('../src/db/client', () => ({
  stock: {
    findMany: jest.fn().mockResolvedValue([]),
  },
}));

const app = require('../src/server');

describe('GET /stock', () => {
  it('should respond with 200 status', async () => {
    const res = await request(app).get('/stock');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<h1>Food Stock');
  });
});
