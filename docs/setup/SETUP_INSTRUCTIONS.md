# TavernKeep Setup Instructions

## 🔴 CRITICAL: Run These SQL Commands in Supabase

You need to run these migrations in your Supabase SQL Editor for the app to work properly:

### 1. Add Currency Column to Campaigns
```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'gp';
```

### 2. Create Cart Items Table (if not exists)
```sql
-- Run the entire migration file: supabase/migrations/20260409_phase3_shopping_cart.sql
-- This creates the cart_items table and all RLS policies
```

### 3. Update Your Campaign Currency
```sql
UPDATE campaigns
SET currency = 'sh'
WHERE id = 'ee954fca-a326-4f78-9d06-5e742015bcd5';
```

## ✅ What's Been Fixed

- ✅ Renamed "Cart" to "Bag" with Backpack icon
- ✅ Made player shop header sticky
- ✅ Added DM Pending Transactions panel with **real-time updates**
- ✅ Fixed shopping bag to use correct database columns
- ✅ Added price modifier display on shop page (shows "-10% prices" etc.)
- ✅ Currency now displays based on campaign setting

## 🔧 Still TODO

### 1. Items Not Adding to Bag
**Issue**: The cart_items table might not exist in production yet.
**Fix**: Run migration #2 above

### 2. AI Items Using Wrong Currency
**Issue**: AI item generation still hardcodes "gp"
**Fix**: Need to update AI prompts to use campaign currency

## 📝 How to Test

1. Run all SQL commands above
2. Refresh the player shop page
3. Try adding an item to the bag
4. Check the DM shop page - you should see pending transactions appear in real-time
5. Verify prices show with "sh" instead of "gp"

## 🐛 Debugging

If items still won't add to bag:
1. Open browser console (F12)
2. Try adding an item
3. Check for errors in console
4. Check Network tab for failed API calls
5. Share any error messages

