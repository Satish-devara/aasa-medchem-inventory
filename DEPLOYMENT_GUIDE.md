# Deployment & GitHub Push Guide

This guide describes how to push the local MERN inventory application to GitHub and deploy it on Vercel.

---

## 1. Push to GitHub

Since pushing to GitHub requires authentication to your account, you will need to link your local Git repository to a GitHub repository.

### Step 1: Create a Repository on GitHub
1. Open your browser and go to [github.com](https://github.com/).
2. Create a new repository named `aasa-medchem-inventory` (or any name you prefer).
3. **Important**: Leave it completely empty (do **not** check "Add a README", "Add .gitignore", or choose a license).

### Step 2: Push Your Local Code
Open your terminal in the project directory (`/Users/jimin/Documents/aasa`) and run the following commands (replace `YOUR_GITHUB_USERNAME` and `REPO_NAME` with your actual username and repository name):

```bash
# Rename the default branch to 'main'
git branch -M main

# Add the remote GitHub repository link
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/REPO_NAME.git

# Push the code to GitHub
git push -u origin main
```

---

## 2. Deploy to Vercel

The project is fully prepared for Vercel deployment with the root-level `vercel.json` and a serverless backend wrapper.

### Step 1: Set up MongoDB Atlas (Cloud Database)
Since local MongoDB (`mongodb://127.0.0.1:27017`) is only accessible on your local machine, you need a cloud-hosted MongoDB database for the live Vercel deployment.
1. Sign up/log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster.
3. In **Network Access**, add IP address `0.0.0.0/0` (allow access from anywhere) so Vercel serverless functions can connect to it.
4. Create a database user and copy your connection string (it looks like `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`).

### Step 2: Import Project on Vercel
1. Go to [vercel.com](https://vercel.com/) and log in.
2. Click **Add New...** -> **Project**.
3. Import the GitHub repository you pushed in the previous section.
4. Leave the default settings (Vercel will automatically detect `vercel.json` at the root and build the frontend/backend).

### Step 3: Add Environment Variables
Before clicking "Deploy", expand the **Environment Variables** section and add the following keys:

1. `MONGODB_URI`: *Your MongoDB Atlas connection string from Step 1.*
2. `JWT_SECRET`: `aasa_medchem_jwt_secret_key_12345` *(or any secure random string)*

### Step 4: Click Deploy 🚀
Vercel will:
1. Compile your React frontend into static assets.
2. Build your Express backend as serverless functions.
3. Provide a live URL where the application is accessible!
