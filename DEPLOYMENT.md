# Deployment Checklist

## Pre-Deployment

### 1. Verify the Build

```bash
npm run build
```

Expected output:
```
[11ty] Copied 26 Wrote 15 files in 0.06 seconds
```

### 2. Test Locally

```bash
npm run dev
```

Visit these URLs and verify they work:
- [ ] `http://localhost:8080/` (English homepage)
- [ ] `http://localhost:8080/es/` (Spanish homepage)
- [ ] Navbar renders correctly (all links present)
- [ ] Footer renders correctly (contact info, social links)
- [ ] Language switcher works (Español/English links)
- [ ] Sticky quote bar appears correctly

### 3. Check Generated Files

```bash
ls -la _site/
```

Should see:
- [ ] `index.html`
- [ ] `es/index.html`
- [ ] `assets/` directory with CSS/JS
- [ ] `css/` directory
- [ ] `CNAME` file
- [ ] Logo and favicon files

### 4. Verify Meta Tags

Open `_site/index.html` and check for:
- [ ] Correct `<title>` tag
- [ ] `<meta name="description">` present
- [ ] `<meta property="og:title">` present
- [ ] `<link rel="alternate" hreflang="en">` present
- [ ] `<link rel="alternate" hreflang="es">` present

Do the same for `_site/es/index.html` with Spanish content.

## GitHub Setup

### 1. Configure GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - ✅ This replaces the old "Deploy from branch" method

### 2. Verify GitHub Actions is Enabled

1. Go to **Settings** → **Actions** → **General**
2. Ensure "Allow all actions and reusable workflows" is selected
3. Ensure "Read and write permissions" is selected under "Workflow permissions"

## First Deployment

### 1. Commit and Push

```bash
git add .
git status
# Review the changes
git commit -m "Migrate to Eleventy with bilingual support"
git push origin main
```

### 2. Monitor the Deployment

1. Go to the **Actions** tab on GitHub
2. You should see a workflow run called "Build & Deploy to GitHub Pages"
3. Click on it to see the progress
4. Wait for both "build" and "deploy" jobs to complete (green checkmarks)

### 3. Verify Live Site

After deployment completes (usually 1-2 minutes):

Visit your live site:
- [ ] `https://maloonservices.com/` (or your custom domain)
- [ ] `https://maloonservices.com/es/`

Test:
- [ ] Page loads without errors
- [ ] Styles load correctly (CSS applied)
- [ ] Images load (logo, favicon)
- [ ] Navigation works
- [ ] Language switcher works
- [ ] Forms work (if applicable)

## Ongoing Deployments

Every time you push to the `main` branch, the site will automatically rebuild and redeploy.

### Workflow:

1. Make changes locally (edit templates, update data in `en.json`/`es.json`)
2. Test locally with `npm run dev`
3. Build with `npm run build` to verify no errors
4. Commit and push to GitHub
5. GitHub Actions automatically builds and deploys

### Check Deployment Status

- Go to **Actions** tab
- See recent workflow runs
- Green checkmark = successful deployment
- Red X = build failed (check logs for errors)

## Troubleshooting

### Build Fails on GitHub

**Check the logs:**
1. Go to **Actions** tab
2. Click on the failed workflow
3. Click on the "build" job
4. Expand the "Build with Eleventy" step
5. Read the error message

**Common issues:**
- Missing data in `en.json` or `es.json`
- Syntax error in a `.njk` template
- Missing file referenced in template

**Fix:**
1. Fix the issue locally
2. Test with `npm run build`
3. Push the fix to GitHub

### Site Not Updating

**Clear your browser cache:**
- Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or use incognito mode

**Check GitHub Pages status:**
- Settings → Pages → should show the deployment URL

### Custom Domain Not Working

**Verify CNAME file:**
```bash
cat src/CNAME
# Should contain: maloonservices.com
```

**Check DNS settings** (at your domain registrar):
- A records should point to GitHub Pages IPs:
  - 185.199.108.153
  - 185.199.109.153
  - 185.199.110.153
  - 185.199.111.153
- Or CNAME record: `yourusername.github.io`

## Rollback (if needed)

If something goes wrong with a deployment:

1. Go to the **Actions** tab
2. Find the last successful deployment
3. Click on it, then click "Re-run all jobs"
4. This will redeploy the previous working version

Or:

```bash
git revert HEAD
git push origin main
```

## Performance

After deployment, test site speed:
- https://pagespeed.web.dev/
- Enter your URL
- Get performance score and suggestions

## Next Steps

Once the initial deployment is working:

1. Migrate the remaining pages (see `MIGRATION_GUIDE.md`)
2. Update navigation to include all pages
3. Clean up old HTML files from the root directory
4. Optimize images and assets
5. Consider adding a sitemap.xml

## Support

If you encounter issues:
- Check the GitHub Actions logs
- Review the `README.md` for usage examples
- Review the `MIGRATION_GUIDE.md` for template patterns
