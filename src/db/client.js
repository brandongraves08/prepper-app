const { PrismaClient } = require('@prisma/client');
const { encrypt, decrypt } = require('../utils/crypto');

const prisma = new PrismaClient();

// Map of models and fields to encrypt
const ENCRYPT_MAP = {
  FoodItem: ['notes'],
  Supply: ['notes'],
  Stock: ['notes'],
  Person: ['dietaryRestrictions'],
};

// Attach encryption middleware only if supported (Prisma <5.0)
if (typeof prisma.$use === 'function') {
  prisma.$use(async (params, next) => {
  const fields = ENCRYPT_MAP[params.model] || [];

  // Encrypt on write-like operations
  if (['create', 'update', 'upsert'].includes(params.action) && params.args?.data) {
    for (const field of fields) {
      if (params.args.data[field] !== undefined && params.args.data[field] !== null) {
        params.args.data[field] = encrypt(String(params.args.data[field]));
      }
    }
  }

  const result = await next(params);

  // Helper to decrypt a single record
  const decryptRecord = (rec) => {
    if (!rec) return rec;
    for (const field of fields) {
      if (rec[field]) {
        try {
          rec[field] = decrypt(rec[field]);
        } catch (_) {
          // if not encrypted or failed, leave as is
        }
      }
    }
    return rec;
  };

  // Decrypt on read
  if (Array.isArray(result)) {
    return result.map(decryptRecord);
  }
  return decryptRecord(result);
  });
}

module.exports = prisma;
