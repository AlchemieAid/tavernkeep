# AI Generation Testing Guide

## ✅ Implementation Complete

All code changes are complete and TypeScript is passing. Ready for manual testing!

---

## 🧪 Testing Checklist

### 1. **Campaign Generation** (Existing Flow - Verify Still Works)

**What to test:**
- Full campaign generation with cascading hierarchy

**Steps:**
1. Go to `/dm/campaigns`
2. Click "Generate Campaign with AI"
3. Enter prompt: "A dark fantasy campaign in a cursed kingdom"
4. Wait for generation (~30-60 seconds)
5. Verify campaign page loads with:
   - ✅ Campaign details
   - ✅ 2-4 towns listed
   - ✅ Each town has shops
   - ✅ Each town has notable people

**Expected Result:**
- Campaign created successfully
- Towns, shops, people, and items all generated
- No errors in console

---

### 2. **Town Generation** (NEW CASCADING BEHAVIOR - Main Test!)

**What to test:**
- Town generation now creates shops, people, AND items

**Steps:**
1. Go to an existing campaign page
2. Scroll to "Towns" section
3. Click "Generate Town with AI"
4. Enter prompt: "A bustling coastal trading port"
5. Watch progress indicators:
   - ✅ Generating town with AI...
   - ✅ Creating shops...
   - ✅ Summoning notable people...
   - ✅ Stocking shops with items...
6. Wait for generation (~15-30 seconds)
7. Verify town page loads with:
   - ✅ Town details
   - ✅ **3-5 shops listed** (THIS IS NEW!)
   - ✅ 3-5 notable people listed
   - ✅ Click into a shop and verify **items exist** (THIS IS NEW!)

**Expected Result:**
- Town created successfully
- **Shops are automatically created** (this is the key new feature!)
- **Items are automatically created in shops** (this is the key new feature!)
- Notable people created
- No errors in console

**What Changed:**
- **Before:** Only created town + people
- **After:** Creates town + shops + people + items

---

### 3. **Shop Generation** (Improved - Verify Still Works)

**What to test:**
- Shop generation creates shopkeeper and items

**Steps:**
1. Go to an existing town page
2. Scroll to "Shops" section
3. Click "Generate Shop with AI"
4. Enter prompt: "A mysterious apothecary selling rare potions"
5. Watch progress indicators:
   - ✅ Generating shop with AI...
   - ✅ Creating shopkeeper...
   - ✅ Stocking shop with items...
6. Wait for generation (~5-10 seconds)
7. Verify shop page loads with:
   - ✅ Shop details
   - ✅ Shopkeeper in notable people
   - ✅ 5-10 items listed

**Expected Result:**
- Shop created successfully
- Shopkeeper created as notable person
- Items created and visible
- No errors in console

---

### 4. **Error Handling**

**Test invalid inputs:**

**Test 4a: Invalid Campaign ID**
1. Manually navigate to `/api/dm/generate-town` with invalid campaignId
2. Expected: 404 error with "Campaign not found"

**Test 4b: Invalid Town ID**
1. Manually navigate to `/api/dm/generate-shop` with invalid townId
2. Expected: 404 error with "Town not found"

**Test 4c: Missing OpenAI Key** (skip if key is configured)
1. Temporarily remove `OPENAI_API_KEY` from environment
2. Try to generate anything
3. Expected: 500 error with "AI service not configured"

---

## 🔍 What to Look For

### Success Indicators
- ✅ Progress indicators show all steps
- ✅ "Complete" message appears
- ✅ Redirects to new entity page
- ✅ All expected entities are visible
- ✅ No console errors

### Failure Indicators
- ❌ Generation hangs or times out
- ❌ Error messages appear
- ❌ Missing shops/items after town generation
- ❌ Console errors (check browser DevTools)
- ❌ Database errors in server logs

---

## 🐛 Common Issues & Solutions

### Issue: Town generates but no shops appear
**Cause:** Orchestrator might have failed silently  
**Check:** Server logs for errors  
**Solution:** Check database for shops with matching town_id

### Issue: Items not appearing in shops
**Cause:** Item library/catalog might be empty  
**Check:** Database `item_library` and `item_catalog` tables  
**Solution:** Verify at least some items exist in catalog

### Issue: Generation takes too long
**Cause:** Multiple AI calls for shops and items  
**Expected:** Town generation now takes 15-30 seconds (was 5-10s)  
**Solution:** This is normal - more entities = more time

### Issue: TypeScript errors in IDE
**Cause:** IDE might not have picked up changes  
**Solution:** Restart TypeScript server or reload window

---

## 📊 Performance Benchmarks

### Expected Generation Times

| Entry Point | AI Calls | Time | Cost |
|-------------|----------|------|------|
| Campaign | 1 + (N towns × M shops) | 30-60s | $0.05-0.10 |
| **Town** | 1 + M shops | **15-30s** | **$0.02-0.04** |
| Shop | 1 | 5-10s | $0.01-0.02 |

**Note:** Town generation is now slower but provides much more value!

---

## 🎯 Key Features to Verify

### Feature 1: Cascading Generation
- [x] Campaign → Towns → Shops → People → Items
- [x] **Town → Shops → People → Items** (NEW!)
- [x] Shop → Items

### Feature 2: Context Awareness
- [x] Shops match town's theme
- [x] Items match shop type
- [x] Notable people fit the setting

### Feature 3: Progress Indicators
- [x] Campaign wizard shows all steps
- [x] Town generator shows 4 steps
- [x] Shop generator shows 3 steps

### Feature 4: Consistent Behavior
- [x] All use same orchestrator
- [x] All use same context building
- [x] All use same item sourcing (library → catalog)

---

## 📝 Test Results Template

Copy this and fill it out after testing:

```markdown
## Test Results - [Date]

### Campaign Generation
- Status: ✅ Pass / ❌ Fail
- Notes: 

### Town Generation (NEW CASCADING)
- Status: ✅ Pass / ❌ Fail
- Shops Created: Yes / No
- Items Created: Yes / No
- Notes:

### Shop Generation
- Status: ✅ Pass / ❌ Fail
- Notes:

### Error Handling
- Invalid Campaign ID: ✅ Pass / ❌ Fail
- Invalid Town ID: ✅ Pass / ❌ Fail
- Notes:

### Overall Assessment
- Ready for Production: Yes / No
- Issues Found: [List any issues]
- Recommendations: [Any suggestions]
```

---

## 🚀 Next Steps After Testing

1. **If all tests pass:**
   - ✅ Mark refactor as complete
   - ✅ Update user documentation
   - ✅ Deploy to production
   - ✅ Monitor for issues

2. **If issues found:**
   - 🐛 Document the issue
   - 🔧 Create fix
   - 🧪 Re-test
   - ✅ Deploy when stable

3. **Future enhancements:**
   - Add configuration options (shop count, item count)
   - Add real-time progress with SSE
   - Add batch operations
   - Add generation presets

---

## 📞 Support

If you encounter issues during testing:

1. **Check server logs** - Look for error messages
2. **Check browser console** - Look for client-side errors
3. **Check database** - Verify entities were created
4. **Check GitHub Actions** - Ensure CI is passing
5. **Review commit history** - See what changed recently

---

**Testing Priority:** Focus on **Town Generation** first - this is the main new feature!

Good luck with testing! 🎉
