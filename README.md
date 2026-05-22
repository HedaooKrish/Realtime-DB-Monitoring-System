# Realtime Orders — Live Database Change Propagation

A backend system that pushes database changes to all connected browser clients the moment data changes — no polling, no page refresh.

Open two browser tabs. Change a document in Compass. Watch both tabs update simultaneously.

---

## Approach

The core challenge is getting database changes to clients instantly without polling.

**Polling is the wrong answer** — at 100 clients asking every second, that's 100 wasted DB queries per second even when nothing changed. The right approach is push — the database tells you when something changes, you forward it.

This system uses **MongoDB Change Streams** — a native CDC (Change Data Capture) mechanism that watches MongoDB's internal oplog. The moment any write commits to the `orders` collection, a change event fires regardless of who made the change — REST API, Compass, mongosh, or any external script.

```
MongoDB Change Stream → Node.js → WebSocket → Browser
INSERT / UPDATE / DELETE caught at DB level, pushed to all clients instantly
```

### Why this stack

- **MongoDB Change Streams** — native push, zero polling, `operationType` built in (`insert`/`update`/`delete`)
- **WebSockets** — persistent connection, server pushes without client asking
- **Mongoose** — handles `updated_at` timestamps automatically, enum validation on status field
- **Express** — serves the REST API and static client from the same port

---

## Project Structure

```
realtime-orders/
├── db/
│   ├── Order.js        # Mongoose schema — fields, validation, auto timestamps
│   └── seed.js         # Populates sample orders
├── server/
│   ├── index.js        # Entry point — wires DB, HTTP, WebSocket together
│   ├── db.js           # MongoDB connection + Change Stream watcher
│   └── wsManager.js    # WebSocket client registry + broadcast
├── client/
│   └── index.html      # Browser client — live orders table, no framework
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```
---

## Running with Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone <your-repo-url>
cd realtime-orders
docker-compose up --build
```

Opens at `http://localhost:3000`

Docker handles MongoDB replica set init, waits for it to be healthy, then starts the Node app. No manual setup needed.

---

## Running Locally

**Prerequisites:** Node.js 18+, MongoDB 7

```bash
git clone <your-repo-url>
cd realtime-orders
npm install
cp .env.example .env

# Start MongoDB as a replica set (required for Change Streams)
mongod --replSet rs0 --dbpath ~/data/db --port 27017

# New terminal — initiate replica set (one time only)
mongosh
> rs.initiate()

# Seed and start
node db/seed.js
node server/index.js
```

Opens at `http://localhost:3000`

---
## UI

!(/ui_page.png)

--
## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | Fetch all orders |
| POST | `/orders` | Create a new order |
| PATCH | `/orders/:id` | Update order status |
| DELETE | `/orders/:id` | Delete an order |

```bash
# Create
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Krish","product_name":"iPhone 16","status":"pending"}'

# Update
curl -X PATCH http://localhost:3000/orders/<_id> \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'

# Delete
curl -X DELETE http://localhost:3000/orders/<_id>
```

Valid status values: `pending` `shipped` `delivered`

---

## Testing Live Updates

Open `http://localhost:3000` in two browser tabs side by side.

Use the curl commands above or make changes directly in Compass — both tabs will react to every change regardless of source.

- New row appears with a **green flash** on INSERT
- Row updates in-place with an **amber flash** on UPDATE  
- Row removes itself with a **red flash** on DELETE

---

## Scalability

The current system runs on a single Node.js instance — appropriate for this scope and handles thousands of concurrent WebSocket connections comfortably.

**The problem at scale:** if you horizontally scale to multiple Node.js instances, each has its own Change Stream and its own pool of WebSocket clients. A change picked up by instance 1 only reaches instance 1's clients — instance 2's clients miss it.

**The fix — Redis Pub/Sub:**

```
MongoDB Change Stream
        │
        ▼
Any Node.js instance → Redis PUBLISH
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Instance 1      Instance 2      Instance 3
         SUBSCRIBE        SUBSCRIBE       SUBSCRIBE
              │               │               │
         broadcast to    broadcast to    broadcast to
         own WS clients  own WS clients  own WS clients
```

Every instance subscribes to a Redis channel. One publishes, all receive, all broadcast. No client misses an update.

For production, also consider MongoDB Change Stream **resume tokens** — if the Node process restarts, the stream resumes from where it left off with no missed events.

---

## Why not polling

| Approach | Problem |
|---|---|
| Client polls DB every N seconds | Wastes resources, not truly real-time |
| MySQL triggers + events table | Still polling under the hood |
| Postgres LISTEN/NOTIFY | Valid — but requires trigger setup to encode operation type manually |
| MongoDB Change Streams | Native push, operationType built in, zero polling |