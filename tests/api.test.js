process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/index');

// Mock Prisma so tests don't touch real DB
jest.mock('@prisma/client', () => {
  const people = [];
  const food = [];
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      person: {
        findMany: jest.fn(async () => people),
        create: jest.fn(async ({ data }) => {
          const newPerson = { id: people.length + 1, ...data };
          people.push(newPerson);
          return newPerson;
        })
      },
      foodItem: {
        findMany: jest.fn(async () => food)
      }
    }))
  };
});

describe('People API', () => {
  it('GET /api/people returns empty array initially', async () => {
    const res = await request(app).get('/api/people');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/people creates a person', async () => {
    const payload = { name: 'Alice', age: 30, dailyConsumption: 2000 };
    const res = await request(app).post('/api/people').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject(payload);

    const res2 = await request(app).get('/api/people');
    expect(res2.body.length).toBe(1);
  });
});
