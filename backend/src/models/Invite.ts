import mongoose, { Schema, Document } from 'mongoose';

export interface IInvite extends Document {
  code: string;
  createdBy: mongoose.Types.ObjectId;
  used: boolean;
  usedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const InviteSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  used: { type: Boolean, default: false },
  usedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IInvite>('Invite', InviteSchema);
