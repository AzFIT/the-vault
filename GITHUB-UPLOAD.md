# Uploading The Vault to GitHub

This folder is a complete, verified-working copy of the project:

- **Full source** (`src/`, `public/`, configs) — build-tested, lint-clean
- **`dist/`** — the latest production build (ready to deploy as-is)
- **`docs/`** — the production build committed for GitHub Pages (deploy source: `main /docs`)
- **`project-docs/`** — wireframe workflow pack + original site research
- **`.gitignore`** — already set up (excludes `node_modules/`, `dist/`, `.env`)

> Note: `dist/` is gitignored by default. The live site is served from
> `docs/` instead — the "Build site to docs/" workflow rebuilds it
> automatically on every push to `main` and commits the result.
> Project documentation lives in `project-docs/` (moved out of `docs/`
> when the deploy source switched to the /docs folder).

## Option A — GitHub website (no command line)

1. Go to your repo: https://github.com/AzFIT/the-vault
2. Click **Add file → Upload files**
3. Drag this whole folder in (or select all files inside it)
4. Commit directly to `main`

GitHub's web upload skips files listed in `.gitignore` automatically.

## Option B — Command line (recommended, preserves everything)

```bash
cd the-vault-upload
git init -b main
git add -A
git commit -m "The Vault Fitness — full app (source + production build)"
git remote add origin https://github.com/AzFIT/the-vault.git
git push -u origin main
```

If the repo already has commits (e.g. a README created on GitHub), either
push with `--force` the first time, or `git pull origin main --rebase` first.

## Working on it afterwards

```bash
npm install     # first time only
npm run dev     # local dev server
npm run build   # production build → dist/
npm run lint    # code quality check
```

## Deploying the build (optional)

`dist/` is a static site — drop it on Netlify, Vercel, Cloudflare Pages,
or GitHub Pages. Because the app uses BrowserRouter, set an SPA fallback
(serve `index.html` for all routes).
