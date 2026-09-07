# 🚀 Postaway — Social Media Web Application & REST API

Postaway is a full-featured, secure, and production-ready social media application built using **Node.js**, **Express**, **MongoDB**, and **EJS view templates**. It allows users to register, log in, manage their profiles, upload posts (images and videos), leave comments, and like posts in real time.

---

## ✨ Features

### 🔐 Authentication & Authorization
* Password hashing using `bcrypt`.
* Cookie-based session handling with `cookie-parser`.
* Protected route middleware guards (`ensureAuthenticated`).
* Rate-limiting on sensitive auth routes to prevent brute-force attacks.

### 📸 Post & Media Management
* Support for single image and video uploads.
* Modular file upload handling via `Multer`.
* Dynamic mime-type checking and file-size constraints.
* Automatic directory initialization and file naming collision prevention with UUIDs.

### ❤️ Atomic Likes & Comments System
* Multi-document transactional integrity powered by **MongoDB Sessions/Transactions**.
* Prevents race conditions and guarantees accurate counts (`likeCount`, `commentCount`).
* Instant user feedback for likes, unlike actions, and comment management.

### 🧹 Cascading Data Cleanup
* Automated deletion of dependent document relationships (deleting a post cleanly removes associated likes and comments).

### 🛡️ Security Measures
* Configured **Helmet CSP directives** for standard content security.
* Input sanitization via `express-mongo-sanitize` to mitigate NoSQL injection risks.
* Granular request payload body parsing limits (`10kb`).

---

## 🛠️ Tech Stack

* **Backend Environment:** Node.js (ES Modules)
* **Framework:** Express.js
* **Database:** MongoDB with Mongoose ODM
* **Templating Engine:** EJS (`express-ejs-layouts`)
* **Security & Utilities:** Helmet, Express-Rate-Limit, Express-Mongo-Sanitize, Cookie-Parser, Multer

---

## 📁 Project Structure

```text
Postaway/
├── assets/                  # Static assets (CSS, JS, logos)
├── config/                  # Environment and database configuration
├── controllers/             # Express route controllers
├── errors/                  # Custom error classes (NotFoundError, ValidationError, etc.)
├── middlewares/             # Custom Express middlewares (Auth, Uploads, Error Handler)
├── models/                  # Mongoose schemas & models (User, Post, Like, Comment)
├── routes/                  # Express route definitions
├── services/                # Business logic & database operations
├── uploads/                 # Storage destination for user uploaded files
│   ├── posts/
│   └── profilePictures/
├── utils/                   # Helper utilities (Flash messages, Cookie options, File cleanup)
├── views/                   # EJS templates and layout files
├── index.js                 # Application entry point
├── package.json             # Dependencies and scripts
└── README.md                # Project documentation
```

⚙️ Environment Variables Setup
* Create a .env file in the root directory of your project and populate it with your environment variables:

# Code snippet
* PORT=8000
* MONGO_URI=mongodb://127.0.0.1:27017/postaway
* JWT_SECRET=your_jwt_secret_key
* NODE_ENV=development

🚀 Getting Started
* Prerequisites
* Node.js (v18.0.0 or higher)
* MongoDB running locally or a MongoDB Atlas connection string.
  
Installation
1. Clone or download the project repository:
 * Bash
   * git clone https://github.com/YOUR_USERNAME/Postaway.git
   * cd Postaway
    
2. Install project dependencies:
  * Bash
    * npm install
      
3. Start MongoDB:
  * Ensure your local MongoDB server is running or provide a valid remote cluster URI in .env.

4. Run the server:
  * Bash
   * Development mode with auto-reload
   * npm run dev
     
  * Production mode
   * npm start

5. Access the application:
  * Open your browser and navigate to http://localhost:8000.

🔗 API Endpoints Summary
🔑 Authentication Routes
Method     Endpoint      Description
GET        /signup       Render signup page
POST       /signup       Register a new user
GET        /signin       Render signin page
POST       /signin       Authenticate user
POST       /logout       Log out user and clear session cookie

👤 Profile Routes
Method     Endpoint                 Description
GET        /profileRender           authenticated user profile
GET        /editprofileRender       edit profile form
PUT        /editprofileUpdate       user profile details
POST       /uploadsUpload           profile picture
DELETE     /removeProfilePicture    Remove profile picture

📝 Post Routes
Method     Endpoint              Description
GET        /posts                Retrieve and render post feed
POST       /postUpload           Create a new post with image/video attachment
POST       /updatePost/:postId   Edit existing post details
DELETE     /deletePost/:postId   Delete post and cascade remove likes/comments

❤️ Like Routes
Method     Endpoint         Description
GET        /likes/:postId   Get all likes for a post
PATCH      /toggle/:postId  Toggle like/unlike state on a post

💬 Comment Routes
Method     Endpoint                    Description
GET        /comments/:postId           Fetch all comments for a post
POST       /comment/:postId            Add a new comment to a post
PUT        /updateComment/:commentId   Update comment text
DELETE     /deleteComment/:commentId   Delete a comment

📜License
Distributed under the MIT License. See LICENSE for more information.
