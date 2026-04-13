# Vercel Deployment Setup - Wait for CI

## 🎯 Goal
Prevent Vercel from deploying to production if GitHub Actions CI fails.

---

## ✅ **Recommended Solution: Use Vercel's GitHub Checks**

This is the **easiest and most reliable** method.

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

## 🔧 **Alternative: Custom Ignore Build Script** (More Control)

If you need more control, use the files I created:

### Files Created:
- `vercel.json` - Vercel configuration
- `vercel-ignore-build.sh` - Custom build check script

### Additional Setup Required:

1. **Add GitHub Token to Vercel**
   - Go to Vercel Project Settings → Environment Variables
   - Add: `GITHUB_TOKEN` = `your_github_personal_access_token`
   - Scope: Production only
   - Get token from: https://github.com/settings/tokens
   - Required scopes: `repo:status`, `repo:commit_status`

2. **Make Script Executable**
   ```bash
   chmod +x vercel-ignore-build.sh
   git add vercel-ignore-build.sh
   git commit -m "chore: add executable permissions to vercel ignore script"
   ```

3. **Test Locally**
   ```bash
   VERCEL_GIT_COMMIT_REF=main VERCEL_ENV=production ./vercel-ignore-build.sh
   ```

### How It Works:

1. Vercel runs `vercel-ignore-build.sh` before building
2. Script checks GitHub API for CI status
3. If CI failed → Script exits 0 → Vercel skips build
4. If CI passed → Script exits 1 → Vercel proceeds with build

**Note:** Exit codes are inverted in Vercel's ignore scripts:
- Exit 0 = Skip build
- Exit 1 = Proceed with build

---

## 🚀 **Recommended Approach**

**Use Option 1 (GitHub Checks)** because:

✅ No code changes needed  
✅ No GitHub token management  
✅ Native Vercel feature  
✅ More reliable  
✅ Easier to maintain  

**Use Option 2 (Custom Script)** only if:
- You need custom logic
- You want to check multiple conditions
- You need to integrate with other services

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

## ✅ Recommended Next Steps

1. **Enable GitHub Checks in Vercel** (5 minutes)
2. **Test with a dummy commit** (verify it works)
3. **Remove custom script files if not needed** (optional cleanup)
4. **Update team documentation** (so everyone knows the process)

---

**Status:** Ready to configure! Choose your preferred method and follow the steps above.
