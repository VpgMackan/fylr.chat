/**
 * Validates a gift card code format and checksum.
 * Format: FYLR-XXXX-XXXX-XXXX-XX(X)
 *
 * @param code - The gift card code to validate
 * @returns true if the format is correct and the checksum matches
 */
export function validateGiftCardCode(code: string): boolean {
  try {
    const parts = code.split('-');

    // Check basic format: FYLR-XXXX-XXXX-XXXX-XX(X)
    if (parts.length !== 5 || parts[0] !== 'FYLR') {
      return false;
    }

    const [, block1, block2, block3, checksum] = parts;

    // Validate block lengths
    if (
      block1.length !== 4 ||
      block2.length !== 4 ||
      block3.length !== 4 ||
      (checksum.length !== 2 && checksum.length !== 3)
    ) {
      return false;
    }

    // Calculate checksum
    const combined = block1 + block2 + block3;
    const checksumLength = checksum.length;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let checksumValue = 0;
    for (const char of combined) {
      checksumValue += char.charCodeAt(0);
    }
    checksumValue = checksumValue % Math.pow(36, checksumLength);

    // Build calculated checksum
    let calculatedChecksum = '';
    let tempValue = checksumValue;
    for (let i = 0; i < checksumLength; i++) {
      calculatedChecksum = chars[tempValue % 36] + calculatedChecksum;
      tempValue = Math.floor(tempValue / 36);
    }

    return calculatedChecksum === checksum;
  } catch {
    return false;
  }
}
