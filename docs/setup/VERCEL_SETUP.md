# Vercel Deployment Setup - Wait for CI

## 🎯 Goal
Prevent Vercel from deploying to production if GitHub Actions CI fails.

---

## ✅ **ACTIVE: Using Vercel's GitHub Checks**

This project is configured to use Vercel's native "Wait for Checks to Pass" feature.

### Steps:

1. **Go to Vercel Dashboard**
   - Navigate to your project: https://vercel.com/dashboard
   - Click on your TavernKeep project

2. **Open Settings**
   - Click **Settings** tab
   - Navigate to **Git** section

3. **Configure Deployment Protection**
   - Scroll to **"Deployment Protection"** or **"Checks"**
   - Enable **"Wait for Checks to Pass"**
   - Select your CI workflow: `CI` (from `.github/workflows/ci.yml`)

4. **Configure for Production Only** (Optional)
   - Under **"Production Branch"**, ensure `main` is set
   - Under **"Preview Branches"**, you can choose to skip checks for previews

### What This Does:

✅ Vercel will wait for GitHub Actions to complete  
✅ If CI fails, Vercel deployment is blocked  
✅ If CI passes, Vercel proceeds with deployment  
✅ Works automatically with no code changes  

---

## 🎉 **Current Configuration**

✅ **Enabled:** "Wait for Checks to Pass" in Vercel dashboard  
✅ **Workflow:** CI (from `.github/workflows/ci.yml`)  
✅ **Branch:** `main` (production deployments)  

### How It Works:

1. You push code to `main` branch
2. GitHub Actions runs CI workflow (lint, type-check, build, tests)
3. Vercel waits for CI to complete
4. **If CI passes** → Vercel deploys to production ✅
5. **If CI fails** → Vercel blocks deployment ❌

---

## 📋 Current CI Workflow

Your GitHub Actions workflow has 3 jobs:

1. **lint-and-type-check** - TypeScript & ESLint
2. **build** - Next.js build test
3. **test** - Security & architecture tests

All must pass for CI to be marked as successful.

---

## 🧪 Testing the Setup

### Test 1: CI Passes
1. Make a small change (e.g., update README)
2. Commit and push to `main`
3. Wait for GitHub Actions to complete
4. Verify Vercel deployment starts AFTER CI passes

### Test 2: CI Fails
1. Introduce a TypeScript error
2. Commit and push to `main`
3. Wait for GitHub Actions to fail
4. Verify Vercel deployment is blocked

### Test 3: Preview Deployments
1. Create a PR or push to a feature branch
2. Verify preview deployments work as expected
3. (Optional) Configure if previews should also wait for CI

---

## 🔍 Troubleshooting

### Issue: Vercel still deploys when CI fails
**Solution:** 
- Check that "Wait for Checks to Pass" is enabled
- Verify the correct workflow is selected
- Check Vercel deployment logs

### Issue: Vercel never deploys
**Solution:**
- Check GitHub Actions is completing (not stuck)
- Verify workflow name matches exactly
- Check Vercel project is connected to correct repo

### Issue: Custom script not working
**Solution:**
- Verify `GITHUB_TOKEN` is set in Vercel
- Check script has executable permissions
- Review Vercel build logs for script output

---

## 📚 Additional Resources

- [Vercel Git Integration Docs](https://vercel.com/docs/deployments/git)
- [Vercel Ignored Build Step](https://vercel.com/docs/deployments/configure-a-build#ignored-build-step)
- [GitHub Checks API](https://docs.github.com/en/rest/checks)

---

## ✅ Next Steps

1. ✅ **GitHub Checks enabled in Vercel** (DONE)
2. **Test with a commit** - Verify it waits for CI before deploying
3. **Monitor first few deployments** - Ensure everything works as expected
4. **Update team** - Let everyone know about the new protection

---

**Status:** ✅ Configured and active! Vercel will now wait for CI to pass before deploying to production.
