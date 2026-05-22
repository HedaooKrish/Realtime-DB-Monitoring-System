require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../db/Order");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

function watchOrders(onEvent) {
  const changeStream = Order.watch([], { fullDocument: "updateLookup" });

  changeStream.on("change", (change) => {
    const operationType = change.operationType;

    if (operationType === "insert") {
      onEvent({
        operation: "insert",
        data: change.fullDocument,
      });
    }

    if (operationType === "update") {
      onEvent({
        operation: "update",
        data: change.fullDocument,
      });
    }

    if (operationType === "delete") {
      onEvent({
        operation: "delete",
        data: { _id: change.documentKey._id },
      });
    }
  });

  changeStream.on("error", (err) => {
    console.error("Change stream error:", err.message);
  });

  console.log("Watching orders collection for changes...");
}

module.exports = { connectDB, watchOrders };
