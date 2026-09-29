import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    const connection = await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected Successfully");
    console.log(`📦 Database: ${connection.connection.name}`);
    console.log(`🌐 Host: ${connection.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;