# 🚀 SHIP TO REAL USER - DEPLOYMENT CHECKLIST

> The truthtest: Give it to a real counselor and watch.

## Pre-Launch Checklist

Before handing to a counselor:

### ✅ System Running
```bash
# Backend must be running
Terminal 1: cd backend && npx tsx watch src/index.ts
# Check: http://localhost:4000 returns API response

# Frontend must be running  
Terminal 2: cd frontend && npm run dev
# Check: http://localhost:3000 loads dashboard
```

### ✅ Test Data Loaded
```bash
# Run once to populate database
npx tsx src/scripts/demo-workflow.ts

# Verify in dashboard:
- 40+ leads visible
- 5+ marked as OVERDUE (red)
- Mix of statuses (LEAD, CONTACTED, INTERESTED, QUALIFIED)
- Activities showing in timeline
```

### ✅ User Account Created
```bash
# Make sure they have login credentials
Email: counselor1@crm.com (or similar)
Password: (set in your system)
Role: COUNSELOR

# Test login works:
1. Go to http://localhost:3000/login
2. Verify they can log in
3. Verify dashboard loads
```

### ✅ Devices Ready
- [ ] Laptop/Desktop with 1920x1080+ screen
- [ ] Headset if they'll take test calls
- [ ] Notepad for observations
- [ ] Camera/phone to record screen (optional but helpful)

---

## The Test Session (1 hour)

### Setup (5 min)

**When they arrive:**
1. Seat them at computer
2. Open http://localhost:3000
3. Ask: "Have you used a CRM before?" (helps calibrate their feedback)
4. Say: "I won't help you - if you get stuck, that's what I need to know about"
5. Give them a copy of `COUNSELOR_QUICK_START.md`

**Don't explain:**
- ❌ "Click here to..." 
- ❌ "This button does..."
- ❌ "Try using..."

**Do observe:**
- Where they look first
- How fast they find things
- Moments of hesitation
- Moments of confusion

### Workflow (40 min)

Let them naturally use the system. If they ask "what do I do?", just say "what would you do?" and let them figure it out.

**Tasks to complete** (don't dictate order):
1. Find the dashboard
2. Identify overdue follow-ups
3. Open a lead detail
4. Add a call activity
5. Try to save without setting follow-up
6. Set follow-up and save
7. Move a lead to different stage
8. Check if they would use this daily

**Don't interrupt.** Let them struggle if they do.

### Observation Notes (5 min)

Watch for:

**🔴 CRITICAL ISSUES:**
- [ ] They clicked wrong button 3+ times
- [ ] They said "I don't know how to..."
- [ ] They said "This is broken"
- [ ] They couldn't find a button
- [ ] System crashed/error

**🟠 HIGH FRICTION:**
- [ ] They hesitated (paused >3 seconds)
- [ ] They opened wrong page
- [ ] They said "This is confusing"
- [ ] They looked for a feature that doesn't exist
- [ ] They expected something different

**🟡 NICE TO IMPROVE:**
- [ ] They asked "Can this do X?"
- [ ] They expected keyboard shortcut
- [ ] They said "this would be better if..."
- [ ] They took longer than expected

**✅ WORKING WELL:**
- [ ] They completed task smoothly
- [ ] They said "Oh, that's easy"
- [ ] They knew where to click
- [ ] They smiled
- [ ] They said they'd use it

---

## Interview (15 min)

After they use it for 40 minutes, ask these questions:

### First Impression
- **"What was your first reaction when you saw the dashboard?"**
  - Listen for: Confusing? Clear? Missing info?

- **"Without looking, what would you say are the 3 main things you can do?"**
  - Listen for: Do they understand the purpose?

### Pain Points
- **"What felt annoying or confusing?"**
  - Listen for: Specific complaints about UX

- **"If you had to do this 20 times a day, what would drive you crazy?"**
  - Listen for: Repetitive friction points

- **"Where did you get stuck?"**
  - Listen for: Missing features or unclear navigation

### Follow-up Validation (CRITICAL)
- **"How clear was the follow-up date requirement?"**
  - Listen for: Did they understand it was mandatory?

- **"Did you almost forget to set a follow-up date?"**
  - Listen for: If yes = design has too little friction

### Pipeline & Status
- **"Was it obvious how to move leads between stages?"**
  - Listen for: Drag? Button? Dropdown?

- **"Did you understand what each stage means?"**
  - Listen for: Are stage names clear?

### Performance
- **"Did anything feel slow or laggy?"**
  - Listen for: Dashboard load? Activity log? Filtering?

- **"Would you use this on mobile?"**
  - Listen for: Mobile not ready? Good to know.

### Overall  
- **"On a scale of 1-10, how likely are you to use this daily?"**
  - 1-3: Major problems
  - 4-6: Works but needs improvement
  - 7-8: Good, some friction
  - 9-10: Would use immediately

- **"If you could change ONE thing, what would it be?"**
  - Listen for: Their single biggest pain point

- **"What would make it a 10?"**
  - Listen for: Core missing feature vs. nice-to-have

---

## During the Session: Red Flags to Stop For

If you see ANY of these, ask follow-up questions:

### 🔴 BLOCKER ISSUES
If they:
- Can't figure out how to log an activity (after 2+ minutes)
- Try to save activity without follow-up and it works (should fail!)
- Activities appear in wrong order
- System crashes or shows 500 error
- Dashboard takes >5 seconds to load

**Ask:** "What were you expecting to happen?"

### 🟠 HIGH FRICTION
If they:
- Right-click looking for options
- Check Help/About section
- Go back to dashboard not sure what happened
- Don't notice the OVERDUE indicator

**Ask:** "How did that feel?"

---

## After They Leave

### Capture Feedback

**Immediately after (while fresh):**
1. Write down your observations
2. Note any errors/confusion with exact steps
3. Record their SUS score (System Usability Scale)

**SUS Scoring:**
Rate each statement 1-5 (1=Strongly Disagree, 5=Strongly Agree):
1. I would like to use this system frequently
2. The system is unnecessarily complex
3. The system was easy to use
4. I needed technical support to use this system
5. The functions were well integrated
6. There was too much inconsistency
7. I would expect most people to learn this quickly
8. The system was cumbersome to use
9. I felt confident using the system
10. I needed to learn many things before using it

**Calculate SUS = [(Q1+Q3+Q5+Q7+Q9-5) + (25-Q2-Q4-Q6-Q8-Q10)] × 2.5**
- 85+: Excellent
- 70-84: Good
- 50-69: Acceptable  
- <50: Poor (needs major fix)

### Create Issues

For each problem found:

```
Title: [CRITICAL/HIGH/MEDIUM] Brief description

What happened:
- Specific steps they took
- What they expected
- What actually happened

Severity:
- CRITICAL: System broken or unusable
- HIGH: Affects daily workflow
- MEDIUM: Annoying but workaround exists

Impact:
- Blocks launch? YES/NO
- Affects data integrity? YES/NO
- Performance issue? YES/NO
```

### Schedule Follow-up

If major issues found:
- [ ] Fix priority issues
- [ ] Re-test with same user (or different user)
- [ ] Get sign-off before full launch

If good feedback:
- [ ] Roll out to 2-3 more counselors
- [ ] Stage 2: Roll out to team
- [ ] Stage 3: Full deployment

---

## Success Criteria ✅

All of these must be TRUE before launching:

```
☐ Can create lead quickly (<1 min)
☐ Can add activity with follow-up (<2 min)
☐ Cannot save activity without follow-up
☐ Activities display in chronological order
☐ Overdue status is clearly visible
☐ Can move lead through pipeline steps
☐ Performance: Dashboard <1 sec, filters <500ms
☐ No critical errors or crashes
☐ SUS score >= 60
☐ User would use it daily (8+/10)
```

If ANY criterion fails:
- **STOP**
- **FIX before next user test**
- **Re-test with same user**

---

## Deployment Scenarios

### Scenario A: All Tests Pass 🟢
```
→ Roll out to full team next week
→ Schedule training session
→ Create escalation guide
→ Monitor error logs daily for first week
```

### Scenario B: Few Quick Fixes 🟡
```
→ Fix high-priority issues (1-2 days)
→ Re-test with same user
→ Quick fix review
→ Move to deployment
```

### Scenario C: Major Issues Found 🔴
```
→ Schedule follow-up meeting
→ Prioritize fixes
→ Create updated roadmap
→ Re-test before relaunch
→ Get buy-in from stakeholder
```

---

## Real-World Edge Cases They'll Find

Watch for these:

**The Accidental Delete**
- They click something and lose data
- → Need confirmation dialogs

**The Batch Update Need**
- "Can I do this for 5 leads at once?"
- → Missing bulk operations feature

**The Mobile Moment**
- "Can I access from my phone while talking to a lead?"
- → Mobile support critical

**The Reporting Ask**
- "Can I see who has the most admissions?"
- → Analytics missing

**The Integration Question**
- "Can this sync with [their existing tool]?"
- → Need API/integrations

---

## Template: Test Results Summary

```
CRM USER TEST RESULTS
=====================

Date: [DATE]
Tester: [NAME]
Duration: [60 min]
SUS Score: [__/100]

CRITICAL ISSUES:
- [Issue 1]
- [Issue 2]

HIGH PRIORITY:
- [Issue 1]
- [Issue 2]

POSITIVE FEEDBACK:
- [What worked well]
- [What was intuitive]

RECOMMENDATIONS:
1. [Fix X before launch]
2. [Improve Y]
3. [Consider Z in Sprint 2]

READY TO DEPLOY?
[ ] YES - all criteria met
[ ] NO - need fixes first
[ ] MAYBE - conditional on X

Next Steps:
- [ ] Fix tier-1 issues
- [ ] Re-test
- [ ] Get stakeholder sign-off
```

---

## The Golden Question

At the very end, ask:

**"If I told you this system was live next week and you HAD to use it for your job, what would worry you?"**

Their answer = your priorities for next sprint.

---

**Remember:** The best test isn't perfect code. It's a real human using the system and telling you the truth about what's broken.

🎯 **Good luck. Pay attention. The truth is in what they DON'T say.**
