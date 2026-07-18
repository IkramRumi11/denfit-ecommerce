import mongoose from 'mongoose';

export const supportsTransactions = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ hello: 1 });
    return !!info.setName;
  } catch (e) {
    try {
      const admin = mongoose.connection.db.admin();
      const info = await admin.command({ isMaster: 1 });
      return !!info.setName;
    } catch (e2) {
      return false;
    }
  }
};

export default { supportsTransactions };
