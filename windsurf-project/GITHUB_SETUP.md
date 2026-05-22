# GitHub Setup Instructions

## Initialize Git Repository

If you haven't already initialized a git repository, run:

```bash
git init
```

## Add All Files

```bash
git add .
```

## Create Initial Commit

```bash
git commit -m "Initial commit: Boblox game platform"
```

## Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Give your repository a name (e.g., "boblox")
5. Choose whether to make it public or private
6. Click "Create repository"

## Link Local Repository to GitHub

Copy the repository URL from GitHub (it will look like `https://github.com/yourusername/boblox.git`)

```bash
git remote add origin https://github.com/yourusername/boblox.git
```

Replace `yourusername` with your actual GitHub username and `boblox` with your repository name.

## Push to GitHub

```bash
git branch -M main
git push -u origin main
```

## Future Changes

After making changes to your code:

```bash
git add .
git commit -m "Your commit message here"
git push
```

## Common Git Commands

- `git status` - Check status of files
- `git log` - View commit history
- `git pull` - Pull latest changes from GitHub
- `git branch` - List all branches
- `git checkout -b branch-name` - Create and switch to new branch

## .gitignore

The project already has a `.gitignore` file that excludes:
- `node_modules/`
- `.env` files
- Build output
- IDE-specific files
- Log files

This ensures sensitive files and dependencies aren't committed to GitHub.
