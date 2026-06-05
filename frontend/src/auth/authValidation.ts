export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const validateEmail = (value: string) => {
  if (!value) return 'Email is required.';
  if (value.length > 254) return 'Email is too long.';

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(value)) return 'Enter a valid email address.';

  return null;
};

export const validatePassword = (value: string) => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.';
  if (!/[0-9]/.test(value)) return 'Password must include a number.';

  return null;
};

export const getSafeAuthErrorMessage = (error: unknown, mode: 'login' | 'register') => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Please wait and try again.';
  }

  if (mode === 'login') {
    return 'Email or password is incorrect.';
  }

  if (message.includes('already registered') || message.includes('already exists')) {
    return 'This email is already registered.';
  }

  return 'Registration failed. Please check your details and try again.';
};
