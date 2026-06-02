/**
 * Generates a secure random password.
 * Format: 3 uppercase + 3 lowercase + 3 digits + 2 special chars = 11 chars
 */
function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$%&!';

  const pick = (charset, n) =>
    Array.from({ length: n }, () =>
      charset[Math.floor(Math.random() * charset.length)]
    ).join('');

  const raw =
    pick(upper, 3) +
    pick(lower, 3) +
    pick(digits, 3) +
    pick(special, 2);

  // Shuffle
  return raw
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

module.exports = { generatePassword };
