#!/bin/sh
set -eu

HOST=${MONGO_HOST:-mongo}
PORT=${MONGO_PORT:-27017}

# Wait until MongoDB is ready
echo "Waiting for MongoDB at $HOST:$PORT..."

while true; do
  # Try mongosh first (preferred), fall back to legacy mongo shell
  if command -v mongosh >/dev/null 2>&1; then
    if mongosh --host "$HOST" --port "$PORT" --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      break
    fi
  else
    if mongo --host "$HOST" --port "$PORT" --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      break
    fi
  fi

  sleep 1
done

echo "MongoDB reachable at $HOST:$PORT"

# Check whether the replica set is already initialized
RS_STATUS=""

if command -v mongosh >/dev/null 2>&1; then
  RS_STATUS=$(
    mongosh --host "$HOST" --port "$PORT" --quiet \
      --eval "try { JSON.stringify(rs.status()) } catch(e) { e.message }" \
      2>/dev/null || true
  )
else
  RS_STATUS=$(
    mongo --host "$HOST" --port "$PORT" --quiet \
      --eval "try { JSON.stringify(rs.status()) } catch(e) { print(e.message) }" \
      2>/dev/null || true
  )
fi

if printf "%s" "$RS_STATUS" | grep -qi "not yet initialized" \
   || printf "%s" "$RS_STATUS" | grep -qi "no replset config has been received" \
   || [ -z "$RS_STATUS" ]; then

  echo "Replica set not initialized. Initiating rs0..."

  if command -v mongosh >/dev/null 2>&1; then
    mongosh --host "$HOST" --port "$PORT" <<'JS'
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "mongo:27017"
    }
  ]
});
printjson(rs.status());
JS
  else
    mongo --host "$HOST" --port "$PORT" <<'JS'
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "mongo:27017"
    }
  ]
});
printjson(rs.status());
JS
  fi

  echo "Replica set initiation attempted."
else
  echo "Replica set already initialized."
fi

exit 0