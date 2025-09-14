import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    // Check for JWT token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError.message);
      }
    }
    
    // Fallback to session-based auth
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }
    
    return res.status(401).json({ message: "Not authenticated" });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export default authMiddleware;