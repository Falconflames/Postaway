// Dependencies
import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Ensures a user can like a post only once and
 * optimizes lookups by post and user.
 */
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

/**
 * Optimizes queries that retrieve all posts liked by a user.
 */
likeSchema.index({ userId: 1 });

const Like = mongoose.model("Like", likeSchema);

export default Like;
