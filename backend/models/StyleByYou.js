import mongoose from 'mongoose';

const styleImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String },
  // optional linked product (admin can link an image to a product)
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  // position for plus-icon (optional): { x: Number, y: Number } normalized 0-1
  position: {
    x: { type: Number, min: 0, max: 1 },
    y: { type: Number, min: 0, max: 1 }
  },
  order: { type: Number, default: 0 }
});

const styleByYouSchema = new mongoose.Schema({
  title: { type: String, default: 'Styled by You' },
  description: { type: String },
  images: [styleImageSchema],
  published: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('StyleByYou', styleByYouSchema);
