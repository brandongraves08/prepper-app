const { encrypt, decrypt } = require('../utils/crypto');

describe('crypto helper', () => {
  const secret = 'hunter2';
  const prev = process.env.APP_PASSPHRASE;

  beforeAll(() => {
    process.env.APP_PASSPHRASE = 'test-pass';
  });

  afterAll(() => {
    process.env.APP_PASSPHRASE = prev;
  });

  it('round-trip encrypt/decrypt', () => {
    const enc = encrypt(secret);
    expect(enc).not.toBe(secret);
    const dec = decrypt(enc);
    expect(dec).toBe(secret);
  });
});
