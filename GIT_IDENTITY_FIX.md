# Git Identity Fix Guide

## 🔍 Current Issue

**Local Git Identity:** `eternalId` (109483809+eternalId@users.noreply.github.com)  
**GitHub Organization:** `AlchemieAid`  
**Repository:** `AlchemieAid/tavernkeep`

This mismatch can cause confusion in commit history and attribution.

---

## ✅ Solution: Update Git Identity

### Option 1: Update for This Repository Only (Recommended)

Run these commands in the project directory:

```bash
# Set your name (choose one)
git config user.name "AlchemieAid"
# OR use your personal name
git config user.name "Your Name"

# Set your email (use your GitHub email)
git config user.email "your-email@example.com"
# OR use GitHub's no-reply email
git config user.email "your-github-id+AlchemieAid@users.noreply.github.com"
```

### Option 2: Update Globally (All Repositories)

```bash
# Set globally
git config --global user.name "AlchemieAid"
git config --global user.email "your-email@example.com"
```

---

## 🔧 Quick Fix Commands

**For this project only:**

```bash
cd "c:\Users\cscol\OneDrive\Desktop\Projects\ShopKeeper"

# Update to match GitHub organization
git config user.name "AlchemieAid"
git config user.email "109483809+AlchemieAid@users.noreply.github.com"

# Verify
git config user.name
git config user.email
```

---

## 📝 Fixing Past Commits (Optional)

If you want to update the author on recent commits:

```bash
# Rewrite last commit author
git commit --amend --author="AlchemieAid <109483809+AlchemieAid@users.noreply.github.com>" --no-edit

# Force push (CAUTION: only if you're the only one working on this branch)
git push --force-with-lease
```

**⚠️ Warning:** Only force push if you're certain no one else has pulled these commits.

---

## 🎯 Recommended Action

1. **Update your Git config** (Option 1 above)
2. **Don't worry about past commits** - they're already pushed
3. **Future commits will use the correct identity**

---

## ✅ Verification

After updating, make a test commit:

```bash
# Make a small change
echo "# Test" >> README.md

# Commit
git add README.md
git commit -m "test: verify git identity"

# Check the commit author
git log -1 --pretty=format:"%an <%ae>"

# If correct, push
git push origin main

# If not correct, undo
git reset HEAD~1
```

---

## 📚 Understanding Git Identities

- **user.name**: Display name in commits
- **user.email**: Email in commits (used for GitHub attribution)
- **Local config**: Only affects this repository
- **Global config**: Affects all repositories on your machine

---

**Current Status:**
- ❌ Local: `eternalId`
- ✅ Should be: `AlchemieAid` (or your preferred name)
