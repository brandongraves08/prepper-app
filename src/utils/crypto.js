const crypto = require('crypto');

// AES-256-GCM symmetric encryption helper.
// Uses a passphrase from APP_PASSPHRASE env variable.
// If passphrase is not set, functions return plaintext for convenience.
const PASSPHRASE = process.env.APP_PASSPHRASE;
const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96-bit nonce per NIST

function getKey() {
  if (!PASSPHRASE) return null;
  return crypto.createHash('sha256').update(PASSPHRASE).digest();
}

function encrypt(plain) {
  const key = getKey();
  if (!key) return Buffer.from(plain).toString('base64'); // not encrypted but encoded
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(payload) {
  const key = getKey();
  const data = Buffer.from(payload, 'base64');
  if (!key) {
    return data.toString('utf8');
  }
  const iv = data.slice(0, IV_LEN);
  const tag = data.slice(IV_LEN, IV_LEN + 16);
  const enc = data.slice(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encrypt, decrypt };
