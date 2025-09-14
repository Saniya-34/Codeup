import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, displayName, role } = req.body;
  
  
  if (!email || !password || !displayName) {
    return res.status(400).json({ 
      message: "Please provide email, password, and display name" 
    });
  }

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      email,
      password: hashedPassword,
      displayName,
      role: role || "student",
      isVerified: true,
    });

    await user.save();
    
    const userData = { 
      id: user._id, 
      role: user.role, 
      email: user.email, 
      displayName: user.displayName 
    };
    
    // Create JWT token
    const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Also set session for backward compatibility
    req.session.user = userData;
    
    res.status(201).json({ 
      message: "User registered successfully", 
      user: userData,
      token: token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const userData = { id: user._id, role: user.role, email: user.email, displayName: user.displayName };
    
    // Create JWT token
    const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Also set session for backward compatibility
    req.session.user = userData;
    
    res.json({ 
      message: "Logged in", 
      user: userData,
      token: token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie("connect.sid"); 
    res.json({ message: "Logged out" });
  });
});


router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.post("/liveblocks-auth", authMiddleware, (req, res) => {
  const user = req.user;
  res.json({
    id: user.id, 
    info: { name: user.displayName, email: user.email }, 
  });
});

export default router;