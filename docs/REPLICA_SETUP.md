Replica Set for Local Development

This repository provides a one-shot initializer to enable a single-node MongoDB replica set for local development so Mongoose transactions work.

How it works

- `docker-compose.yml` starts `mongo` with `--replSet rs0`.
- `docker/mongo-init/init-replica.sh` is a small script that waits for Mongo and runs `rs.initiate()` if the replica set is not initialized.

Usage (development only)

1. Start mongo:

```bash
docker compose up -d mongo
```

2. Run the initializer once:

```bash
docker compose run --rm mongo-init
```

3. Confirm replica set:

```bash
docker run --rm --network denfit-net mongo:6 mongosh --host mongo --port 27017 --eval "printjson(db.adminCommand({hello:1}))"
```

Notes

- `mongo-init` is intended for local development. Do not use this pattern in production — use managed MongoDB or a proper orchestration mechanism (StatefulSet, etc.).
- The init script is idempotent and safe to re-run.
