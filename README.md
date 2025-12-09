# FPL League Dashboard

This project automates your FPL league reporting.

## How it works

1.  **GitHub Actions** runs a Python script every 6 hours.
2.  The script fetches data from the FPL API and saves it to `src/data/fpl_data.json`.
3.  The Action commits this file back to the repository.
4.  **Vercel** detects the commit and rebuilds your website with the new data.

## Setup Instructions

### 1. Push to GitHub
Initialize a git repository and push this code to GitHub.

```bash
git init
git add .
git commit -m "Initial commit"
# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 2. Configure GitHub Actions
The workflow is already set up in `.github/workflows/update_data.yml`.
It needs permission to write to your repository.
1.  Go to your Repository Settings on GitHub.
2.  Go to **Actions** > **General**.
3.  Scroll to **Workflow permissions**.
4.  Select **Read and write permissions**.
5.  Click **Save**.

### 3. Deploy to Vercel
1.  Go to [Vercel](https://vercel.com) and sign up/login.
2.  Click **Add New...** > **Project**.
3.  Import your GitHub repository.
4.  Vercel will detect it's a Next.js project.
5.  Click **Deploy**.

### 4. First Run
The initial data on the site will be empty.
1.  Go to the **Actions** tab in your GitHub repository.
2.  Select **Update FPL Data** on the left.
3.  Click **Run workflow** to trigger it manually for the first time.
4.  Once finished, Vercel will automatically rebuild your site (this might take a minute).

## Customization
- **League ID**: Edit `scripts/fetch_data.py` and change `LEAGUE_ID`.
- **Schedule**: Edit `.github/workflows/update_data.yml` to change the cron schedule.
