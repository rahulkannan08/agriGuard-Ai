import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAnalysisHistory extends Document {
  user: Types.ObjectId;
  imageBuffer: Buffer;
  previewBuffer: Buffer;
  imageMimeType: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  imageMetadata?: Record<string, unknown>;
  prediction?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  recommendations?: Record<string, unknown>;
  warning?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisHistorySchema = new Schema<IAnalysisHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    imageBuffer: {
      type: Buffer,
      required: true,
    },
    previewBuffer: {
      type: Buffer,
      required: true,
    },
    imageMimeType: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
    imageMetadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    prediction: {
      type: Schema.Types.Mixed,
      default: null,
    },
    validation: {
      type: Schema.Types.Mixed,
      default: null,
    },
    recommendations: {
      type: Schema.Types.Mixed,
      default: null,
    },
    warning: {
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

AnalysisHistorySchema.index({ user: 1, createdAt: -1 });
AnalysisHistorySchema.index({ 'location.latitude': 1, 'location.longitude': 1, createdAt: -1 });

export const AnalysisHistory = mongoose.model<IAnalysisHistory>('AnalysisHistory', AnalysisHistorySchema);
