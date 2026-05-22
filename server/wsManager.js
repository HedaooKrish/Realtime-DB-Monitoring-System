const WebSocket = require("ws");

const clients = new Set();

function addClient(ws) {
  clients.add(ws);
  console.log(`Client connected. Total: ${clients.size}`);
}

function removeClient(ws) {
  clients.delete(ws);
  console.log(`Client disconnected. Total: ${clients.size}`);
}

function broadcast(payload) {
  const message = JSON.stringify(payload);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = { addClient, removeClient, broadcast };
