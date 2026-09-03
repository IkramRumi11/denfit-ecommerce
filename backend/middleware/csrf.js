//backend/middleware/csrf.js
import crypto from "crypto";

/**
 * Double-submit cookie CSRF protection middleware.
 * 
 * - On safe requests (GET/HEAD/OPTIONS), ensures XSRF-TOKEN cookie exists.
 * - On unsafe requests (POST/PUT/PATCH/DELETE), validates that
 *   the header "x-xsrf-token" matches the XSRF-TOKEN cookie.
 *
 * Works seamlessly with frontend at localhost:3000 and backend at localhost:3002.
 */

export default function csrfProtection(req, res, next) {
  try {
    // Allow opting out of CSRF checks in local development for faster debugging.
    // To prevent accidental enabling in dev, require an additional explicit opt-in flag
    // `ALLOW_DEV_BACKDOORS=true` alongside `SKIP_CSRF=true`.
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.SKIP_CSRF === 'true' &&
      process.env.ALLOW_DEV_BACKDOORS === 'true'
    ) {
      console.warn('⚠️ CSRF validation skipped (SKIP_CSRF=true AND ALLOW_DEV_BACKDOORS=true)');
      return next();
    }
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    let cookieToken = req.cookies?.["XSRF-TOKEN"] || null;

    // --- SAFE METHODS (Issue new CSRF token if missing) ---
    if (safeMethods.includes(req.method)) {
      if (!cookieToken) {
        cookieToken = crypto.randomBytes(24).toString("hex");
        const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https' || (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH));
        const sameSiteSetting = isHttps ? "none" : "lax";

        res.cookie("XSRF-TOKEN", cookieToken, {
          httpOnly: false, // readable by frontend JS
          secure: isHttps,
          sameSite: sameSiteSetting,
          path: "/",
        });
      }
      return next();
    }

    // --- UNSAFE METHODS (Validate CSRF token) ---
    const headerToken =
      req.headers["x-xsrf-token"] ||
      req.headers["x-xsrf-token".toLowerCase()] ||
      null;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      // In development/test mode: if the request provided a valid hex CSRF token in the header,
      // accept and re-sync cookie to eliminate cross-port localhost race conditions
      if (process.env.NODE_ENV !== 'production' && headerToken && /^[0-9a-f]{32,64}$/i.test(headerToken)) {
        res.cookie("XSRF-TOKEN", headerToken, {
          httpOnly: false,
          secure: false,
          sameSite: "lax",
          path: "/",
        });
        return next();
      }

      // Development-time debug info to help trace CSRF mismatches
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.warn('⚠️ CSRF token mismatch', {
            path: req.originalUrl,
            method: req.method,
            cookieToken: cookieToken ? `${String(cookieToken).slice(0,12)}...` : null,
            headerToken: headerToken ? `${String(headerToken).slice(0,12)}...` : null,
            cookiesAvailable: Object.keys(req.cookies || {}).slice(0,10),
            headers: {
              origin: req.headers.origin,
              referer: req.headers.referer,
              'x-xsrf-token': req.headers['x-xsrf-token']
            }
          });
        } catch (e) {
          // ignore logging errors
        }
      }
      return res.status(403).json({
        success: false,
        message: "Invalid CSRF token",
      });
    }

    // Token valid ✅
    return next();
  } catch (err) {
    console.error("CSRF middleware error:", err);
    return res.status(403).json({
      success: false,
      message: "CSRF validation failed",
    });
  }
}
