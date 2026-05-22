require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const { connectDB, watchOrders, disconnectDB } = require("./db");
const { addClient, removeClient, broadcast } = require("./wsManager");
const Order = require("../db/Order");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { customer_name, product_name, status } = req.body;
    const order = await Order.create({ customer_name, product_name, status });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Order deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/orders/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

wss.on("connection", (ws) => {
  addClient(ws);
  ws.on("close", () => removeClient(ws));
  ws.on("error", (err) => console.error("WebSocket error:", err.message));
});

async function start() {
  await connectDB();
  watchOrders(broadcast);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await disconnectDB();
  server.close();
  process.exit(0);
});

start();
