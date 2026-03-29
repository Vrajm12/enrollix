# ✔️ MANUAL TESTING CHECKLIST (PRINT THIS)

> Sit with laptop. Follow this. Record issues.

---

## Pre-Test Setup ⚙️

**Checklist:**
- [ ] Backend running (http://localhost:4000)
- [ ] Frontend running (http://localhost:3000)
- [ ] Can login with counselor1@crm.com
- [ ] Dashboard shows 40+ leads
- [ ] Notepad ready to write issues
- [ ] Phone ready to take screenshots

**Time:** ~5 min

---

## Dashboard Assessment 📊

**What you see:**
- [ ] Follow-up counts visible (Red/Orange/Green)
- [ ] Lead pipeline with stages
- [ ] Recent activities list
- [ ] Lead count and metrics

**Questions:**
1. Is it clear what to do first? YES / NO / CONFUSING
2. Can you locate "Add Lead" button? YES / NO / HARD TO FIND
3. Is the overdue highlighting obvious? YES / NO / UNCLEAR
4. Any buttons that confuse you? DESCRIBE:

**Time:** ~5 min

---

## Create Lead Test 📝

**Tasks:**
1. Click [Add Lead]
   - Form appears? YES / NO
   - Time to appear: _____ seconds
   - Is it confusing? YES / NO / SOMEWHAT

2. Fill form:
   ```
   Name: Shreya Patel
   Phone: +919999888877
   Email: shreya@test.com
   ```
   - Easy to fill? YES / NO
   - Any validation errors? YES / NO
   - If yes, describe:

3. Click [Create]
   - Appears immediately in list? YES / NO
   - Takes how long? _____ seconds
   - Any notification? YES / NO / UNCLEAR

**Issues found:**
- [ ] Form confusing
- [ ] Validation not clear
- [ ] Slow to save
- [ ] Doesn't appear instantly

**Time:** ~5 min

---

## Add Activity Test 📞

**Find:** "Priya Singh" lead (first one in list)

**Tasks:**
1. Click lead name
   - Detail page opens? YES / NO
   - Time taken: _____ seconds
   - Clear layout? YES / NO

2. Look for "Add Activity" button
   - Found it? YES / NO / HARD TO FIND
   - Where was it? (Top/Bottom/Side)

3. Click "Add Activity"
   - Modal/form appears? YES / NO
   - Time: _____ seconds

4. Select activity type: "CALL"
   - Easy to select? YES / NO
   - Can you see all types? YES / NO

5. Add description: "Discussed course options"
   - Text field is responsive? YES / NO
   - Any lag? YES / NO

6. **🔴 CRITICAL TEST:** Try to save WITHOUT setting follow-up date
   - Does system prevent you? YES ✓ / NO ✗
   - Error message clear? YES / NO / DIDN'T SEE ONE
   - **If saved without date = CRITICAL ISSUE**

7. Set follow-up date to tomorrow
   - Date picker works? YES / NO
   - Date selectable? YES / NO
   - Clear what date is selected? YES / NO

8. Click [Add Activity]
   - Saves immediately? YES / NO
   - Confirmation shown? YES / NO
   - Appears in activity list? YES / NO
   - Time to appear: _____ seconds

**Issues found:**
- [ ] Can add activity without follow-up (CRITICAL)
- [ ] Follow-up date field hidden or confusing
- [ ] Activity doesn't save
- [ ] Lag when saving
- [ ] Date picker is confusing
- [ ] No confirmation message

**Time:** ~10 min

---

## Activity Timeline Check ⏱️

**Still on "Priya Singh" detail page**

**Tasks:**
1. Scroll to activity history
   - Can see activities? YES / NO
   - How many shown? _____
   - Can scroll for more? YES / NO

2. **Timeline order test:**
   - Activities in reverse order (newest first)? YES / NO
   - Activities in normal order (oldest first)? YES / NO
   - Order is RANDOM/STRANGE? YES / NO

3. Do activity timestamps make sense?
   - All in same day? YES / NO
   - Spread across days? YES / NO
   - Order matches dates? YES / NO

4. Can you see all activity types?
   - CALL ✓
   - EMAIL ✓
   - NOTE ✓
   - WHATSAPP ✓
   - (All 4 types visible somewhere on dashboard)

**Issues found:**
- [ ] Activities not in order
- [ ] Can't see activity history
- [ ] Missing activity types
- [ ] Timestamps confusing
- [ ] Can't scroll/see all

**Time:** ~5 min

---

## Pipeline Movement Test 🔄

**Tasks:**
1. Look at current status (should be "LEAD")
   
2. Find way to move stage
   - Button visible? YES / NO / WHERE:
   - Status name clickable? YES / NO
   - Drag option? YES / NO
   - Menu option? YES / NO

3. Change to "CONTACTED"
   - Moves immediately? YES / NO
   - Time taken: _____ seconds
   - Status updates on detail page? YES / NO
   - Updates on dashboard too? YES / NO
   - Confirmation message? YES / NO

4. Move again to "INTERESTED"
   - Same speed? YES / NO / SLOWER
   - Any lag? YES / NO

**Issues found:**
- [ ] Can't find how to move
- [ ] Moving is slow
- [ ] Doesn't update everywhere
- [ ] Confusing workflow
- [ ] No feedback on success

**Time:** ~5 min

---

## Follow-up Overdue Check 🔴

**Tasks:**
1. Go back to dashboard
   - Red (OVERDUE) count shown? YES / NO / HOW MANY: ___

2. Click on red/overdue box
   - Filters to overdue leads? YES / NO
   - Clearly marked as overdue? YES / NO
   - How many shown? _____

3. Open an overdue lead
   - Overdue status visible on detail? YES / NO
   - Alert/warning shown? YES / NO
   - Red highlighting? YES / NO
   - How obvious is it? (1-10): ___

4. Try to reschedule
   - Can you update follow-up date? YES / NO
   - Easy to do? YES / NO

**Issues found:**
- [ ] Overdue not obvious
- [ ] No filtering by overdue
- [ ] Highlighting not clear
- [ ] Can't reschedule
- [ ] Too subtle

**Time:** ~5 min

---

## Performance Check ⚡

While doing above, note:

**Page Load Times:**
- Dashboard: _____ sec (target: <1 sec)
- Lead detail: _____ sec (target: <1 sec)
- Add activity: _____ sec (target: <0.5 sec)

**Responsiveness:**
- Clicking buttons: smooth / slight delay / laggy
- Filling forms: smooth / slight delay / laggy
- Filtering/searching: smooth / slight delay / laggy

**Issues:**
- [ ] Dashboard takes >2 seconds
- [ ] Any page takes >2 seconds
- [ ] UI feels sluggish
- [ ] Typing has lag
- [ ] Buttons don't respond immediately

**Time:** ~5 min  

---

## Searching/Filtering Test 🔍

**Tasks:**
1. Find filter/search on dashboard
   - Visible? YES / NO / WHERE:
   - Clear what it does? YES / NO

2. Try filtering by:
   - Status = "CONTACTED"
     - Works? YES / NO
     - Speed: _____ sec
   
   - Priority = "HOT"
     - Works? YES / NO
     - Speed: _____ sec
   
   - Search by name?
     - Can search? YES / NO
     - Works correctly? YES / NO

3. Any results found?
   - Shows relevant leads? YES / NO
   - Count accurate? YES / NO

**Issues found:**
- [ ] No filter/search found
- [ ] Doesn't work correctly
- [ ] Too slow
- [ ] Results wrong
- [ ] Confusing how to use

**Time:** ~5 min

---

## Overall UX Assessment 🎯

**Rate each (1-10 scale):**

1. **Clarity** - Could you understand what to do?
   Rating: ☐1 ☐2 ☐3 ☐4 ☐5 ☐6 ☐7 ☐8 ☐9 ☐10

2. **Speed** - Did anything feel slow?
   Rating: ☐1 ☐2 ☐3 ☐4 ☐5 ☐6 ☐7 ☐8 ☐9 ☐10
   (10 = very fast, 1 = very slow)

3. **Ease** - Was it easy to learn?
   Rating: ☐1 ☐2 ☐3 ☐4 ☐5 ☐6 ☐7 ☐8 ☐9 ☐10

4. **Confidence** - Did you feel in control?
   Rating: ☐1 ☐2 ☐3 ☐4 ☐5 ☐6 ☐7 ☐8 ☐9 ☐10

5. **Would Use** - Would you use this daily if you had to?
   Rating: ☐1 ☐2 ☐3 ☐4 ☐5 ☐6 ☐7 ☐8 ☐9 ☐10

**Average Score:** (Add all 5, divide by 5) = _____/10

---

## Critical Issues Found ❌

Check if ANY of these happened:

- [ ] Can add activity WITHOUT follow-up date
- [ ] Activities NOT in chronological order
- [ ] Cannot save data
- [ ] Page crashes
- [ ] JavaScript errors in console
- [ ] Cannot login or logout
- [ ] Data not persistor (refresh loses data)
- [ ] Cannot move lead between stages

**If ANY are checked: SYSTEM NOT READY - FIX FIRST**

---

## Issue Summary 📋

**CRITICAL (Fix immediately):**
1. 
2. 
3. 

**HIGH (Fix this sprint):**
1. 
2. 
3. 

**MEDIUM (Backlog):**
1. 
2. 
3. 

**WORKING WELL:**
1. 
2. 
3. 

---

## Final Decision 🚦

Based on this test:

- [ ] **🟢 READY TO DEPLOY** - No critical issues, good UX
- [ ] **🟡 DEPLOY WITH FIXES** - Some high priority issues to fix first
- [ ] **🔴 NOT READY** - Critical issues or poor performance

**Recommendation:**

---

## Tester Info 👤

**Date:** __________
**Tester Name:** __________
**Time Spent:** __________
**Session Quality:** Good ☐ / OK ☐ / Interrupted ☐

---

## Next Steps

- [ ] Fix critical issues (if any)
- [ ] Schedule real user test
- [ ] Share feedback with team
- [ ] Plan next sprint

---

## Questions?

See full guides:
- REAL_WORLD_UX_TESTING.md (detailed version of this checklist)
- SYSTEM_READY.md (overview)
- SHIP_TO_USER_GUIDE.md (deployment)

**Total Testing Time:** ~50 minutes

Print this. Use it. Document everything.

The system is ready for humans to test.

Time to find the truth. 🚀
