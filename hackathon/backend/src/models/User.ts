import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, trim: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  area: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'municipality_official'], default: 'farmer' }
}, {
  timestamps: true
});

UserSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

UserSchema.methods.matchPassword = async function(enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', UserSchema);