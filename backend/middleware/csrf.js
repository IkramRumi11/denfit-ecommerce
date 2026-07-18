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
        // Determine secure and sameSite based on environment and SSL availability.
        const hasSSLFiles = Boolean(process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH);
        const secureFlag = process.env.NODE_ENV === "production" || hasSSLFiles;
        const requestOrigin = String(req.headers.origin || req.headers.referer || '');
        const backendOrigin = `${req.protocol}://${req.headers.host}`;
        const isLocalhostRequest = /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/i.test(requestOrigin) || /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/i.test(backendOrigin);
        const isCrossOrigin = requestOrigin && requestOrigin !== backendOrigin && !isLocalhostRequest;
        const sameSiteSetting = isCrossOrigin ? "none" : (secureFlag ? "none" : "lax");

        if (isCrossOrigin && !secureFlag) {
          console.warn('[DEV] XSRF token cookie is being issued as SameSite=None without Secure.');
          console.warn('[DEV] This may fail in modern browsers unless using HTTPS or a same-site proxy.');
        }

        res.cookie("XSRF-TOKEN", cookieToken, {
          httpOnly: false, // readable by frontend JS
          secure: secureFlag && !isLocalhostRequest,
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
