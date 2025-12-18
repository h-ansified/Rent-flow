import type { Payment, Tenant, Property, User, Expense } from "@shared/schema";
import { createPDFDocument, addPDFHeader, addPDFFooter, savePDF } from "./pdf-utils";
import { formatCurrency } from "./currency-utils";
import autoTable from "jspdf-autotable";

/**
 * Generate Property Report PDF
 * Includes payments, expenses, and net income for a property
 */
export function generatePropertyReportPDF(
    user: User,
    property: Property,
    payments: Payment[],
    expenses: Expense[],
    startDate?: string,
    endDate?: string
) {
    const doc = createPDFDocument();
    let yPos = addPDFHeader(doc, user, "PROPERTY REPORT");

    // Property Details Section
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Property Information", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${property.name}`, 20, yPos);
    yPos += 5;
    doc.text(`Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}`, 20, yPos);
    yPos += 5;
    doc.text(`Type: ${property.type} | Units: ${property.occupiedUnits}/${property.units}`, 20, yPos);

    if (startDate && endDate) {
        yPos += 5;
        doc.text(`Report Period: ${startDate} to ${endDate}`, 20, yPos);
    }

    // Payments Section
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Payments Received", 20, yPos);

    yPos += 5;
    const paymentData = payments.map(p => [
        p.dueDate,
        formatCurrency(p.amount, user.currency || undefined),
        formatCurrency(p.paidAmount, user.currency || undefined),
        p.status,
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [["Due Date", "Amount", "Paid", "Status"]],
        body: paymentData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Expenses Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses", 20, yPos);

    yPos += 5;
    const expenseData = expenses.map(e => [
        e.title,
        e.category,
        formatCurrency(e.amount, user.currency || undefined),
        formatCurrency(e.paidAmount, user.currency || undefined),
        e.status,
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [["Description", "Category", "Amount", "Paid", "Status"]],
        body: expenseData,
        theme: "striped",
        headStyles: { fillColor: [239, 68, 68] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Financial Summary
    const totalRevenue = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.paidAmount, 0);
    const netIncome = totalRevenue - totalExpenses;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Summary", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Total Revenue: ${formatCurrency(totalRevenue, user.currency || undefined)}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Expenses: ${formatCurrency(totalExpenses, user.currency || undefined)}`, 20, yPos);
    yPos += 6;
    doc.setFontSize(12);
    doc.text(`Net Income: ${formatCurrency(netIncome, user.currency || undefined)}`, 20, yPos);

    // Footer
    addPDFFooter(doc, 1, 1);

    // Save
    savePDF(doc, `Property_Report_${property.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Generate Expense Report PDF
 * Detailed expense breakdown with totals by category
 */
export function generateExpenseReportPDF(
    user: User,
    expenses: Expense[],
    startDate?: string,
    endDate?: string
) {
    const doc = createPDFDocument();
    let yPos = addPDFHeader(doc, user, "EXPENSE REPORT");

    // Report Period
    if (startDate && endDate) {
        yPos += 5;
        doc.setFontSize(10);
        doc.text(`Report Period: ${startDate} to ${endDate}`, 20, yPos);
        yPos += 5;
    }

    // Expenses Table
    yPos += 10;
    const expenseData = expenses.map(e => [
        e.dueDate,
        e.title,
        e.category,
        formatCurrency(e.amount, user.currency || undefined),
        formatCurrency(e.paidAmount, user.currency || undefined),
        formatCurrency(e.amount - e.paidAmount, user.currency || undefined),
        e.status,
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [["Date", "Description", "Category", "Amount", "Paid", "Balance", "Status"]],
        body: expenseData,
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68] },
        columnStyles: {
            1: { cellWidth: 40 },
        },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Summary by Category
    const categoryTotals = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.paidAmount;
        return acc;
    }, {} as Record<string, number>);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary by Category", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    Object.entries(categoryTotals).forEach(([category, total]) => {
        doc.text(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${formatCurrency(total, user.currency || undefined)}`, 20, yPos);
        yPos += 6;
    });

    // Total
    yPos += 5;
    const totalPaid = expenses.reduce((sum, e) => sum + e.paidAmount, 0);
    const totalDue = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBalance = totalDue - totalPaid;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Expenses Paid: ${formatCurrency(totalPaid, user.currency || undefined)}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Balance Due: ${formatCurrency(totalBalance, user.currency || undefined)}`, 20, yPos);

    // Footer
    addPDFFooter(doc, 1, 1);

    // Save
    savePDF(doc, `Expense_Report_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Generate Invoice PDF
 */
export function generateInvoicePDF(
    user: User,
    payment: Payment & { tenantName: string; propertyName: string }
) {
    const doc = createPDFDocument();
    let yPos = addPDFHeader(doc, user, "INVOICE");

    // Invoice Details
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice #: INV-${payment.id.slice(0, 8).toUpperCase()}`, 20, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 6;
    doc.text(`Due Date: ${payment.dueDate}`, 20, yPos);

    // Tenant Information
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(payment.tenantName, 20, yPos);
    yPos += 5;
    doc.text(payment.propertyName, 20, yPos);

    // Invoice Items
    yPos += 15;
    autoTable(doc, {
        startY: yPos,
        head: [["Description", "Amount"]],
        body: [
            ["Monthly Rent", formatCurrency(payment.amount, user.currency || undefined)],
        ],
        theme: "plain",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Payment Summary
    const balance = payment.amount - payment.paidAmount;
    doc.setFontSize(10);
    doc.text(`Amount Paid: ${formatCurrency(payment.paidAmount, user.currency || undefined)}`, 20, yPos);
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Balance Due: ${formatCurrency(balance, user.currency || undefined)}`, 20, yPos);

    // Footer
    addPDFFooter(doc, 1, 1);

    // Save
    savePDF(doc, `Invoice_${payment.tenantName.replace(/\s+/g, '_')}_${payment.dueDate}`);
}

/**
 * Generate Receipt PDF  
 */
export function generateReceiptPDF(
    user: User,
    payment: Payment & { tenantName: string; propertyName: string }
) {
    const doc = createPDFDocument();
    let yPos = addPDFHeader(doc, user, "PAYMENT RECEIPT");

    // Receipt Details
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Receipt #: REC-${payment.id.slice(0, 8).toUpperCase()}`, 20, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${payment.paidDate || new Date().toLocaleDateString()}`, 20, yPos);

    // Tenant Information
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Received From:", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(payment.tenantName, 20, yPos);
    yPos += 5;
    doc.text(payment.propertyName, 20, yPos);

    // Payment Details
    yPos += 15;
    autoTable(doc, {
        startY: yPos,
        head: [["Description", "Amount"]],
        body: [
            ["Rent Payment", formatCurrency(payment.paidAmount, user.currency || undefined)],
            ["Payment Method", payment.method || "N/A"],
            ["Reference", payment.reference || "N/A"],
        ],
        theme: "plain",
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Total in box
    doc.setFillColor(34, 197, 94);
    doc.setTextColor(255);
    doc.rect(20, yPos - 5, 170, 15, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount Paid: ${formatCurrency(payment.paidAmount, user.currency || undefined)}`, 25, yPos + 5);
    doc.setTextColor(0);

    // Footer  
    addPDFFooter(doc, 1, 1);

    // Save
    savePDF(doc, `Receipt_${payment.tenantName.replace(/\s+/g, '_')}_${payment.paidDate || new Date().toISOString().split('T')[0]}`);
}
