const mongoose = require("mongoose");

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/english";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;

  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected at ${mongoUri}`);
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
};

module.exports = connectDB;
