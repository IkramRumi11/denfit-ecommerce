# Admin Access Guide

## How to Access Admin Panel

### Step 1: Create an Admin User

You have three options to create an admin user:

#### Option A: Use the Seed Script (Recommended for Development)

1. Open your `.env` file in the `backend` folder and add:
   ```env
   ALLOW_DEV_BACKDOORS=true
   MONGODB_URI=your_mongodb_connection_string
   ```

2. Run the seed script from the backend directory:
   ```bash
   cd backend
   node scripts/seed-admin.js
   ```

   This will create an admin user with:
   - **Email**: `denfitdatabase@gmail.com` (or set `SEED_ADMIN_EMAIL` in .env)
   - **Password**: `Admin123!` (or set `SEED_ADMIN_PASSWORD` in .env)

#### Option B: Create Admin via MongoDB Directly

If you have MongoDB Compass or MongoDB Shell access:

```javascript
// Connect to your MongoDB database
use your_database_name

// Create admin user (password will be hashed automatically by the app)
db.users.insertOne({
  name: "System Administrator",
  email: "denfitdatabase@gmail.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYxrO4UJ1S6", // Hash of "Admin123!"
  role: "admin",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Note**: The password hash above is for "Admin123!" - you should generate your own hash using bcrypt.

#### Option C: Update Existing User to Admin

If you already have a user account, you can update it to admin:

```javascript
// In MongoDB
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### Step 2: Login as Admin

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start your frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to the login page: `http://localhost:3000/auth` (or your frontend URL)

4. Login with your admin credentials:
   - Email: `denfitdatabase@gmail.com` (or the email you set)
   - Password: `Admin123!` (or the password you set)

### Step 3: Access Admin Panel

After logging in as an admin:

1. Navigate to: `http://localhost:3000/admin`
2. You should see the Admin Dashboard

Or click on any admin link if available in the navigation.

## Admin Features Available

Once logged in as admin, you can:

- **Dashboard**: View statistics, sales, orders, and analytics
- **Users**: Manage users, ban/unban, delete accounts
- **Products**: 
  - View all products
  - Create new products
  - Edit existing products (price, inventory, ratings, images, etc.)
  - Delete products
  - Quick edit from product list
- **Orders**: View and manage orders, update status, tracking, refunds
- **Audits**: View system audit logs

## Troubleshooting

### "Access Denied" or Redirected to Home

- Make sure you're logged in
- Verify your user has `role: "admin"` in the database
- Check browser console for errors
- Ensure backend authentication is working

### Can't Create Admin User

- Make sure `MONGODB_URI` is set in your `.env` file
- Ensure `ALLOW_DEV_BACKDOORS=true` is set for the seed script
- Check MongoDB connection
- Verify the User model is properly imported

### Login Not Working

- Check backend server is running
- Verify JWT_SECRET is set in backend `.env`
- Check browser console for API errors
- Ensure cookies are enabled in your browser

## Security Notes

⚠️ **Important**: 
- Change the default admin password immediately after first login
- Never commit `.env` files with `ALLOW_DEV_BACKDOORS=true` to production
- Use strong passwords for admin accounts
- Regularly audit admin user accounts

## Quick Reference

**Default Admin Credentials (if using seed script):**
- Email: `denfitdatabase@gmail.com`
- Password: `Admin123!`

**Admin Panel URL:**
- Local: `http://localhost:3000/admin`
- Production: `https://your-domain.com/admin`

**Seed Script Location:**
- `backend/scripts/seed-admin.js`

**Admin Route Protection:**
- Frontend: `frontend/src/components/admin/AdminRoute.tsx`
- Backend: `backend/middleware/auth.js` (authorize middleware)

