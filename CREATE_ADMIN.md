# Quick Guide: Create Admin User

## Quick Method (Using Seed Script)

### 1. Set up your .env file

In `backend/.env`, make sure you have:
```env
ALLOW_DEV_BACKDOORS=true
MONGODB_URI=your_mongodb_connection_string
SEED_ADMIN_EMAIL=denfitdatabase@gmail.com
SEED_ADMIN_PASSWORD=Admin123!
```

### 2. Run the seed script

```bash
cd backend
node scripts/seed-admin.js
```

### 3. Login and Access Admin

1. Start your servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend  
   cd frontend
   npm run dev
   ```

2. Go to: `http://localhost:3000/auth`
3. Login with:
   - Email: `denfitdatabase@gmail.com`
   - Password: `Admin123!`

4. After login, go to: `http://localhost:3000/admin`

## Alternative: Create Admin via MongoDB

If you have MongoDB access, run this in MongoDB Shell or Compass:

```javascript
// Switch to your database
use your_database_name

// Create admin user
db.users.insertOne({
  name: "Admin User",
  email: "denfitdatabase@gmail.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYxrO4UJ1S6", // Admin123!
  role: "admin",
  emailVerified: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Then login with:
- Email: `denfitdatabase@gmail.com`
- Password: `Admin123!`

## Update Existing User to Admin

If you already have a user account:

```javascript
// In MongoDB
db.users.updateOne(
  { email: "your-existing-email@example.com" },
  { $set: { role: "admin" } }
)
```

Then login with your existing credentials and go to `/admin`.

