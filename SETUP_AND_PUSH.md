# PDF Generation Setup & GitHub Push Guide

## Step 1: Fix PowerShell Execution Policy

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Step 2: Install PDF Libraries

```bash
npm install jspdf jspdf-autotable
npm install --save-dev @types/jspdf-autotable
```

## Step 3: Run Database Migration

```bash
npm run db:push
```

## Step 4: Test the Application

```bash
npm run dev
```

Navigate to:
- `/expenses` - Test expense tracking
- `/payments` - Test invoice/receipt generation
- Test currency settings change
- Test revenue graph

## Step 5: Commit and Push to GitHub

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add expense tracking module and PDF generation

- Implemented complete expense tracking system for KPLC, water bills, etc.
- Added recurring expense support (monthly/quarterly/annually)
- Fixed currency settings persistence issue
- Enhanced revenue graph to use real expense data instead of estimates  
- Added PDF generation for invoices, receipts, property reports, and expense reports
- Created database migration for expenses table
- Added comprehensive expense management UI with payment tracking"

# Push to GitHub (replace 'main' with your branch name if different)
git push origin main
```

## Features Added

### 1. Expense Tracking Module
- Full CRUD operations for expenses
- Recurring expense support
- Payment tracking (partial/full)
- Category filtering (electricity, water, maintenance, insurance, tax, other)
- Property association (optional)
- Status management (pending, paid, overdue)

### 2. PDF Generation
- **Property Reports**: Revenue, expenses, and net income breakdown
- **Expense Reports**: Detailed expense listing with category summaries
- **Invoices**: Professional rent invoices for tenants
- **Receipts**: Payment confirmation receipts

### 3. Bug Fixes
- Currency settings now persist correctly
- Revenue graph uses actual expense data

## PDF Library Usage

The PDF generation uses `jsPDF` and `jspdf-autotable`:

```typescript
import { generatePropertyReportPDF, generateExpenseReportPDF, generateInvoicePDF, generateReceiptPDF } from "@/lib/pdf-generators";

// Example: Generate expense report
generateExpenseReportPDF(user, expenses, startDate, endDate);
```

All PDF functions are in:
- `client/src/lib/pdf-utils.ts` - Common utilities
- `client/src/lib/pdf-generators.ts` - Report templates

## Next Steps After Push

1. Create a Pull Request if using feature branches
2. Review changes in GitHub
3. Deploy to production/staging
4. Share with users for testing

## Troubleshooting

### npm command fails
- Ensure PowerShell execution policy is set (Step 1)
- Try running PowerShell as Administrator

### Git push rejected
- Pull latest changes first: `git pull origin main`
- Resolve any conflicts
- Try push again

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Check that migration was run successfully
