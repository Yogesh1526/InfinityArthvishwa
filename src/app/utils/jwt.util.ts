/**
 * JWT Utility Functions
 * Helper functions for decoding and extracting data from JWT tokens
 */

export interface JwtPayload {
  sub?: string;
  username?: string;
  email?: string;
  roles?: string[];
  role?: string;
  authorities?: string[];
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decode JWT token without verification
 * Note: This only decodes the token, it does NOT verify the signature
 */
export function decodeJwtToken(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Base64 URL decode
    const decoded = base64UrlDecode(payload);
    
    // Parse JSON
    return JSON.parse(decoded) as JwtPayload;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Base64 URL decode
 * JWT uses base64url encoding (URL-safe base64)
 */
function base64UrlDecode(str: string): string {
  // Replace URL-safe characters with standard base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  
  try {
    // Decode base64
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (error) {
    // Fallback for browsers that don't support atob
    return atob(base64);
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtToken(token);
  if (!payload || !payload.exp) {
    return false; // If no expiration, assume not expired
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();

  return currentTime >= expirationTime;
}

/**
 * Get roles from JWT token
 */
export function getRolesFromToken(token: string): string[] {
  const payload = decodeJwtToken(token);
  if (!payload) {
    return [];
  }

  // Try different possible role fields
  if (Array.isArray(payload.roles)) {
    return payload.roles;
  }
  
  if (Array.isArray(payload.authorities)) {
    return payload.authorities;
  }
  
  if (payload.role && typeof payload.role === 'string') {
    return [payload.role];
  }
  
  if (Array.isArray(payload.role)) {
    return payload.role;
  }

  // Check for common variations
  if (payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
    const roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return Array.isArray(roles) ? roles : [roles];
  }

  return [];
}

/**
 * Get username from JWT token
 */
export function getUsernameFromToken(token: string): string | undefined {
  const payload = decodeJwtToken(token);
  if (!payload) {
    return undefined;
  }

  return payload.username || payload.sub || payload['preferred_username'] || undefined;
}

/**
 * Get email from JWT token
 */
export function getEmailFromToken(token: string): string | undefined {
  const payload = decodeJwtToken(token);
  if (!payload) {
    return undefined;
  }

  return payload.email || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || undefined;
}

/**
 * Get all user info from JWT token
 */
export function getUserInfoFromToken(token: string): {
  username?: string;
  email?: string;
  roles?: string[];
  [key: string]: any;
} | null {
  const payload = decodeJwtToken(token);
  if (!payload) {
    return null;
  }

  return {
    username: getUsernameFromToken(token),
    email: getEmailFromToken(token),
    roles: getRolesFromToken(token),
    ...payload
  };
}

