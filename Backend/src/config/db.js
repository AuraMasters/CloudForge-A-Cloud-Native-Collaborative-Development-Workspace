import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MongoDB connection URI is missing in environment variables (MONGO_URI or MONGODB_URI)");
      return false;
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    return false;
  }
};

export default connectDB;