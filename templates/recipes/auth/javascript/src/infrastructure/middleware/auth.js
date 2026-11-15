const { assertSecret, InvalidTokenError, verifyToken } = require('../auth/jwt');

/**
 * Requires a valid "Authorization: Bearer <token>" header. The verified claims
 * are available to the next handlers in `res.locals.auth`.
 *
 *   router.post('/', authenticate(), controller.create);
 */
function authenticate(secret = process.env.JWT_SECRET) {
  const key = assertSecret(secret);
  return (req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      res.locals.auth = verifyToken(token, key);
      next();
    } catch (error) {
      if (!(error instanceof InvalidTokenError)) throw error;
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = { authenticate };
