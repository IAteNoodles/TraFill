# Quick Reference Guide - Validation Rules

## 🚫 What Gets BLOCKED (Cannot Submit)

### 1. Duplicate Contact Information
If **ANY** of these already exist in the database, your entry will be **BLOCKED**:

- ✉️ **Email address**
- 📱 **Phone number**  
- 💼 **LinkedIn profile URL**

**What you'll see:**
```
❌ DUPLICATE ENTRY BLOCKED!

This contact information (email) already exists in the database:
Company: TechCorp
Added by: Jane Doe
Status: In Progress
Date: 2025-10-10
```

**What to do:** Change the contact details or don't submit.

---

### 2. Financial Services Companies

If the company name OR opportunity type contains **financial/banking/fintech/insurance** keywords, your entry will be **BLOCKED**:

**What you'll see:**
```
❌ FINANCIAL COMPANY BLOCKED!

"FinTech Solutions" appears to be a 
financial/banking/fintech/insurance company.

We DO NOT accept entries from financial services companies.
```

OR

```
❌ FINANCIAL OPPORTUNITY BLOCKED!

Opportunity type "Finance Internship" contains 
financial keywords.

We DO NOT accept entries related to financial services.
```

**What to do:** 
- Change to a non-financial company
- Use a non-financial opportunity type (e.g., "Software Development" instead of "Finance Internship")

**See full list:** Check `BLOCKED_FINANCIAL_TERMS.md` for 100+ blocked keywords including:
- Banking: fintech, finance, bank, banking, nbfc, neobank
- Insurance: insurance, assurance, reinsurance
- Investment: investment, trading, securities, hedge fund, mutual fund
- Credit: loan, lending, mortgage, credit, bnpl
- Payments: payment gateway, wallet, upi, remittance
- Crypto: cryptocurrency, crypto exchange, defi
- Wealth: wealth management, asset management
- Stock: stock market, brokerage, trading platform
- And 80+ more terms...

---

## ⚠️ What Gets WARNED (Can Override)

### Company Already Exists

If the **company name** already exists, you'll see:

```
⚠️ COMPANY ALREADY IN DATABASE

"Google Inc" has already been contacted 2 time(s).

Previous entry:
• Added by: John Smith
• Status: Requested on LinkedIn
• Date: 2025-10-12

Are you contacting a DIFFERENT person at this company?
```

**Options:**
- **Cancel** - Don't submit (recommended if same contact)
- **OK** - Submit anyway (if different contact person)

---

## ✅ Submission Checklist

Before clicking submit, ensure:

1. ✓ At least ONE contact method filled (email OR phone OR LinkedIn)
2. ✓ Company is NOT a financial/banking/fintech/insurance company
3. ✓ Contact info (email/phone/LinkedIn) is unique and not already in database
4. ✓ If company exists, you're contacting a DIFFERENT person

---

## 💡 Tips

### Avoid Duplicates
- Check existing entries before adding new ones
- Use unique contact information for each entry
- Coordinate with team members

### Company Names
- Use consistent naming (e.g., "Google Inc" not "Google" or "Google LLC")
- Check warnings about existing companies
- Different contacts at same company = OK

### Financial Companies
- Generally avoid: banks, fintech, insurance, investment firms
- Override only if genuinely relevant (e.g., tech role at a bank)
- Focus on target industries instead

### Contact Information
- Provide accurate, verified contact details
- Use professional email addresses
- Include LinkedIn for better tracking

---

## 🆘 Common Scenarios

### "I need to add another contact at the same company"
✅ **Allowed** - Click OK when warned about company existing

### "The email already exists but it's a typo"
❌ **Blocked** - Delete the old entry first, then create new one

### "Company is flagged as financial but it's a tech company"
✅ **Allowed** - Click OK to override (e.g., "Paytm" for tech role)

### "I want to track multiple contacts at one company"
✅ **Allowed** - Each entry must have different contact info

### "Same company, same contact, different opportunity"
❌ **Not Recommended** - Update existing entry's status instead

---

## 🔍 Financial Keywords (Auto-Detected)

The system flags companies with these terms:

**Banking:** bank, banking, fintech, nbfc  
**Finance:** finance, financing, financial, capital, fund  
**Insurance:** insurance, insure  
**Investment:** investment, securities, trading, equity  
**Credit:** credit, loan, lending, mortgage  
**Payments:** payment gateway, crypto wallet  
**Wealth:** wealth management, asset management  

---

## 📞 Support

If you believe a validation is incorrect:
1. Review this guide
2. Check with team lead
3. Request keyword/rule adjustment if needed

---

**Remember:** These validations help maintain data quality and prevent duplicate work! 🎯
