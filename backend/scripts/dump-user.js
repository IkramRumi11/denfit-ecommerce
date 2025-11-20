#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../src/config/database.js';

const envPath = path.resolve(process.cwd(), 'backend', '.env');
dotenv.config({ path: envPath });

const run = async () => {
  try {
    await connectDB();
    const email = process.argv[2] || 'denfitdatabase@gmail.com';
    const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching user:', err);
    process.exit(1);
  }
};

run();
