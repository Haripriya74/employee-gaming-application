const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const { MongoMemoryServer } = require("mongodb-memory-server");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

function configureApp() {
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../client")));
  app.use("/admin", express.static(path.join(__dirname, "../admin")));

  app.use("/api/admin", (req, res, next) => {
    console.log(`[ADMIN API] ${req.method} ${req.originalUrl}`);
    next();
  });
  app.use("/api/admin", adminRoutes);

  app.get("/api", (req, res) => {
    res.send("Employee Gaming Portal API Running");
  });
}

async function connectDatabase() {
  let connected = false;

  const tryConnect = async (uri) => {
    try {
      await mongoose.connect(uri);
      console.log("MongoDB Connected");
      connected = true;
    } catch (err) {
      console.error("MongoDB Error:", err.message || err);
    }
  };

  if (process.env.MONGO_URI) {
    await tryConnect(process.env.MONGO_URI);
  }

  if (!connected) {
    console.log("Starting in-memory MongoDB instance for development...");
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await tryConnect(memUri);
    if (!connected) {
      console.error("Failed to start in-memory MongoDB. The application may not function correctly.");
    }
  }
}

async function startServer() {
  configureApp();
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Startup error:", err);
});
