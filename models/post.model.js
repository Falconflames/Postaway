// Dependencies
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postData: {
      path: { type: String, required: true },
      type: { type: String, required: true, enum: ["image", "video"] },
      caption: { type: String, default: "", trim: true, maxlength: 300 },
    },

    likeCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Index to optimize queries that retrieve posts by user.
 */
postSchema.index({
  userId: 1,
});

/**
 * Virtual relationship for populating comments associated with the post.
 *
 * Does not persist data in MongoDB. Used with `populate("comments")`.
 */
postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "postId",
});

/**
 * Virtual relationship for populating likes associated with the post.
 *
 * Does not persist data in MongoDB. Used with `populate("likes")`.
 */
postSchema.virtual("likes", {
  ref: "Like",
  localField: "_id",
  foreignField: "postId", // Match this to the field name in your Like schema (e.g., 'postId' or 'post')
});

const Post = mongoose.model("Post", postSchema);
export default Post;
