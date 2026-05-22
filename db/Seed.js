require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./Order");

const sampleOrders = [
  {
    customer_name: "Krish Hedaoo",
    product_name: "iPhone 16",
    status: "delivered",
  },
  {
    customer_name: "Swayam Bhosale",
    product_name: "Samsumg S25",
    status: "shipped",
  },
  {
    customer_name: "Peter Parker",
    product_name: "Samsung Frame TV",
    status: "pending",
  },
  {
    customer_name: "Max Verstappen",
    product_name: "Playstation 5",
    status: "pending",
  },
  {
    customer_name: "Marc Marquez",
    product_name: "Bose Headphones",
    status: "shipped",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Order.deleteMany({});
    console.log("Cleared existing orders");

    const inserted = await Order.insertMany(sampleOrders);
    console.log(`Seeded ${inserted.length} orders`);

    await mongoose.disconnect();
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.log("Seed failed : ", err.message);
    process.exit(1);
  }
}

seed();
