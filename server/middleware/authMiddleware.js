const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    //1. Taking token from headers Request
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token is required",
      });
    }

    // 2. token after Bearer 
    const token = authHeader.split(" ")[1];

    // 3. JWT verify 
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 4. finding user by token's user ID
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    // 5. Attach user with request
    req.user = user;

    // 6. Go To Next middleware/controller 
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = authMiddleware;