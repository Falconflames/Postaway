/**
 * Time unit multipliers expressed in milliseconds.
 *
 * @readonly
 */
const MULTIPLIERS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Converts a duration string into milliseconds.
 *
 * Supported units are:
 * - s (seconds)
 * - m (minutes)
 * - h (hours)
 * - d (days)
 *
 * Examples:
 * - "30s" → 30000
 * - "15m" → 900000
 * - "2h" → 7200000
 * - "7d" → 604800000
 *
 * @param {string} duration - Duration string in the format "<number><unit>".
 * @throws {Error} If the duration format is invalid.
 * @returns {number} The duration in milliseconds.
 */
export const durationToMs = (duration) => {
  const match = /^(\d+)([smhd])$/i.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const [, value, unit] = match;

  return Number(value) * MULTIPLIERS[unit.toLowerCase()];
};