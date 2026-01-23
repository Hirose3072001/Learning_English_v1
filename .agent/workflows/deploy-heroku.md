---
description: How to deploy the Learn English app to Heroku
---

// turbo-all
# Deployment Workflow

Follow these steps to deploy your application to Heroku safely.

## Prerequisites
1. [Install Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Log in to Heroku: `heroku login`

## Deployment Steps

1. **Create Heroku App** (if not already created):
   ```powershell
   heroku create learning-english-app
   ```
   *(Note: Replace `learning-english-app` with your preferred unique name)*

2. **Configure Environment Variables**:
   Set your Supabase credentials in Heroku (DO NOT commit `.env` file):
   ```powershell
   heroku config:set VITE_SUPABASE_URL="your-supabase-url"
   heroku config:set VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
   ```

3. **Initialize Git** (if not already initialized):
   ```powershell
   git init
   git add .
   git commit -m "Prepare for Heroku deployment"
   ```

4. **Deploy Code**:
   ```powershell
   git push heroku main
   ```

5. **Open App**:
   ```powershell
   heroku open
   ```
