interface OTPStorage {
  otp: string;
  expiresAt: number;
  attempts: number;
}

export class OTPService {
  private storagePrefix = 'otp_';
  private expiryMinutes = 10;
  private maxAttempts = 3;

  generateOTP(): string {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  storeOTP(email: string, otp: string): void {
    const expiresAt = Date.now() + this.expiryMinutes * 60 * 1000;
    const storage: OTPStorage = {
      otp,
      expiresAt,
      attempts: 0,
    };
    
    // Store in localStorage (in production, this should be in a database)
    localStorage.setItem(
      `${this.storagePrefix}${email}`,
      JSON.stringify(storage)
    );
  }

  verifyOTP(email: string, otp: string): boolean {
    const storageKey = `${this.storagePrefix}${email}`;
    const storageData = localStorage.getItem(storageKey);
    
    if (!storageData) {
      return false;
    }

    const storage: OTPStorage = JSON.parse(storageData);

    // Check if OTP has expired
    if (Date.now() > storage.expiresAt) {
      localStorage.removeItem(storageKey);
      return false;
    }

    // Check max attempts
    if (storage.attempts >= this.maxAttempts) {
      localStorage.removeItem(storageKey);
      return false;
    }

    // Verify OTP
    if (storage.otp === otp) {
      localStorage.removeItem(storageKey);
      return true;
    }

    // Increment attempts
    storage.attempts++;
    localStorage.setItem(storageKey, JSON.stringify(storage));
    
    return false;
  }

  getRemainingAttempts(email: string): number {
    const storageKey = `${this.storagePrefix}${email}`;
    const storageData = localStorage.getItem(storageKey);
    
    if (!storageData) {
      return this.maxAttempts;
    }

    const storage: OTPStorage = JSON.parse(storageData);
    return this.maxAttempts - storage.attempts;
  }

  getExpiryTime(email: string): number | null {
    const storageKey = `${this.storagePrefix}${email}`;
    const storageData = localStorage.getItem(storageKey);
    
    if (!storageData) {
      return null;
    }

    const storage: OTPStorage = JSON.parse(storageData);
    return storage.expiresAt;
  }

  clearOTP(email: string): void {
    localStorage.removeItem(`${this.storagePrefix}${email}`);
  }
}

export const otpService = new OTPService();
