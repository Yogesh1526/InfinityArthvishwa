/**
 * Security Utility Functions
 * Provides input sanitization, XSS protection, and validation helpers
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters and patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize HTML content (for display purposes only)
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Basic HTML sanitization - in production, use a library like DOMPurify
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div'];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  
  return html.replace(tagPattern, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      return match;
    }
    return '';
  });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number (Indian format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Indian phone number: 10 digits starting with 6-9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // Username: 3-30 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username.trim());
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
} {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
    return { isValid: false, strength, errors };
  }

  if (password.length < 8) {
    errors.push('Password should be at least 8 characters for better security');
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score < 3) {
    strength = 'weak';
    errors.push('Password is too weak. Include uppercase, lowercase, numbers, and special characters');
  } else if (score < 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0 || score >= 3,
    strength,
    errors
  };
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token (for CSRF protection)
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a string contains potentially malicious content
 */
export function containsMaliciousContent(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
}

