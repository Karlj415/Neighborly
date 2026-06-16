# Content Moderation System Testing Guide

## Overview
The anti-abuse system automatically filters and penalizes inappropriate content in community posts. Here's how to test all the features:

## 1. Test Banned Phrases (Will be blocked)
Try posting these messages in the Post tab:

**Real Estate Specific Bans:**
- "This slumlord never fixes anything"
- "We should sue them for this mess"
- "There's a roach infestation in my apartment"
- "Scam landlord taking advantage of tenants"

**General Profanity** (automatically detected by bad-words library):
- Posts with swear words will be automatically flagged

## 2. Test Clean Content (Will be allowed)
These should post successfully:

**Good Examples:**
- "Looking for roommate recommendations in Dallas"
- "Great neighborhood! Love the local restaurants"
- "Anyone know good moving companies in the area?"
- "Apartment hunting tips needed - first time renter"

## 3. Test Admin Panel Features

### Access Admin Panel:
1. Navigate to `/admin-panel` in your browser
2. Login with admin credentials (if prompted)

### Admin Panel Features:
- **Flagged Content Review**: See all blocked posts
- **User Penalties**: View point deductions and bans
- **Moderation Stats**: Overall system statistics
- **Content Actions**: Approve/decline flagged content

## 4. Test Penalty System

When inappropriate content is posted:
- **Profanity**: 10-25 point deduction
- **Banned Phrases**: 25-50 point deduction  
- **Hate Speech**: 50% of total points lost
- **Multiple Violations**: Automatic account suspension

## 5. Test User Experience

### For Regular Users:
1. Try posting inappropriate content → Should be blocked with message
2. Check your points in Rewards page → Should see deductions
3. View your content warnings → Should show violation history

### For Admins:
1. Review flagged content in admin panel
2. Approve legitimate content that was falsely flagged
3. Apply additional penalties for severe violations
4. View system-wide moderation statistics

## 6. Technical Testing Commands

You can test the system programmatically:

```bash
# Test blocked content
curl -X POST http://localhost:5000/api/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{"content": "This slumlord has roach infestation issues"}'

# Test allowed content  
curl -X POST http://localhost:5000/api/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat cookies.txt)" \
  -d '{"content": "Looking for apartment recommendations"}'

# Check flagged content (admin only)
curl -X GET http://localhost:5000/api/admin/flagged-content \
  -H "Cookie: $(cat cookies.txt)"
```

## Expected Results

### Blocked Content:
- Post creation fails
- User receives warning message
- Points are deducted from user account
- Content appears in admin flagged content list

### Allowed Content:
- Post appears in community feed
- No penalties applied
- Normal user experience continues

## System Status
- ✅ Bad-words library integration working
- ✅ Custom banned phrases active
- ✅ Penalty system functional  
- ✅ Admin panel accessible
- ✅ Database logging enabled

The content moderation system is now fully operational and ready for testing!