# 📱 CRM Counselor Quick Start

> Give this to your first real users. Keep it simple.

## First Login

1. Go to http://localhost:3000/login
2. Username: `counselor1@crm.com`
3. Password: `password123`

## Dashboard Overview

When you log in, you see:

**Top: Follow-up Status**
- 🔴 **Overdue**: Follow-ups you missed (act on these first!)
- 🟠 **Today**: Follow-ups due today (do these now)
- 🟢 **Upcoming**: Scheduled for future

**Middle: Lead Pipeline**
Shows all leads grouped by stage:
- LEAD → just added
- CONTACTED → called them
- INTERESTED → showed interest
- QUALIFIED → ready to apply
- APPLIED → submitted application
- ENROLLED → admitted

**Bottom: Recent Activities**
All calls, emails, notes in order

## Daily Workflow

### Morning

1. **Check Overdue** (red box)
   - Click on each overdue lead
   - Make the follow-up call
   - Add a NOTE with outcome
   - Set next follow-up date

2. **Check Today** (orange box)
   - Same process
   - Try to complete by end of day

### Throughout Day

3. **Add Activities**
   - Click a lead name
   - Click "Add Activity"
   - Pick type: CALL, EMAIL, NOTE, WHATSAPP
   - Add description
   - **Set follow-up date** (mandatory!)
   - Save

4. **Move Leads**
   - When they take an action, move them:
   - Showed interest → INTERESTED
   - Got them to apply → APPLIED
   - Admitted → ENROLLED

### What's Mandatory

⚠️ **Always set a follow-up date**
- Every time you add an activity, you MUST set when to follow up
- Can't save without it
- This is how you don't forget leads

## Common Tasks

### Creating a New Lead

```
1. Dashboard → [Add Lead] button (top right)
2. Enter:
   - Name
   - Phone number (starts with +91)
   - Email
3. Click [Create]
4. Lead appears in pipeline as LEAD stage
```

### Logging a Call

```
1. Click the lead name
2. Click [Add Activity]
3. Select "CALL"
4. Add notes (what you discussed)
5. Pick follow-up date:
   - Today? → use "Set for Today"
   - Tomorrow? → use the date picker
   - Next week? → pick the date
6. Click [Add Activity]
```

### Adding a Note

```
Same as CALL, but type "NOTE"
- Use for things that aren't calls
- "Spoke with parent", "Updated resume", etc.
- Still set a follow-up date
```

### Moving to Next Stage

```
1. Click lead
2. Click stage name at top
3. Choose new stage
4. Confirm
5. Lead moves, activities stay visible
```

### Finding Leads

**By Pipeline Stage:**
- Click stage name in dashboard

**By Priority:**
- Cold (new leads)
- Warm (interested)
- Hot (very interested)

**By Name:**
- Use search box (if available)

**By Overdue Status:**
- Red box on dashboard

## Performance Tips

**Fast:**
- Don't obsess with perfect notes
- Quick calls update
- Quick stage moves
- System should feel snappy

**Slow:**
- Takes >2 seconds to load lead? Report it
- Filter takes forever? Report it
- Page lags when clicking? Report it

## Issues to Report

If you see any of these:
- 🔴 Lead page crashes
- 🔴 Can't add activity
- 🔴 Can't set follow-up date
- 🟠 System very slow
- 🟠 Confusing button location
- 🟡 Missing information
- 🟡 Typos/formatting issues

**Tell us immediately with:**
- What you were trying to do
- What happened instead
- Screenshot if possible
- What time it happened

## Tips & Tricks

✓ **Check overdue first thing**
- These are leads you might lose
- Your most urgent task

✓ **Set follow-up before you forget**
- Do it immediately after activity
- It's easy to forget later

✓ **Keep notes brief but useful**
- "Interested but needs parent approval" ✓
- "ok" ✗

✓ **Update pipeline as you go**
- Don't batch updates at end of day
- Keep stage current
- Helps teammates see status

✓ **Look for patterns**
- Which stage converts best? (INTERESTED → APPLIED)
- Which activity type works? (Call vs Email)
- Learn what works for you

## Keyboard Shortcuts

**Coming soon** (not implemented yet)

Common tasks will get keyboard shortcuts:
- `Ctrl+A` → Add Lead
- `Ctrl+F` → Search
- `Ctrl+I` → Add Activity

## What NOT to Do

❌ Don't leave follow-ups blank
- System won't let you anyway
- Forces you to plan

❌ Don't forget to save
- Everything saves immediately
- No "save" button needed

❌ Don't add activities by phone number
- Use lead names
- More reliable

❌ Don't delete leads by mistake
- Can't undo permanent deletions
- Just move to different stage if not interested

## Need Help?

- Can't login? Check your username/password
- Forgot counselor email? Ask your supervisor
- System seems broken? Check if backend is running (ask tech)
- Want a feature? Tell your team lead

---

**Questions?** Ask your supervisor or technical support.

**Feedback?** We want to know what makes this hard or confusing.

Let us know and we'll fix it! 🚀
