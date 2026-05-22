const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered"],
      default: "pending",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

module.exports = mongoose.model("Order", orderSchema);
