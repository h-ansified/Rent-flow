import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency-utils";
import { Card } from "@/components/ui/card";
import type { Payment, User } from "@shared/schema";

interface InvoiceProps {
    payment: Payment & { tenantName: string; propertyName: string };
    user: User;
}

export function InvoiceTemplate({ payment, user }: InvoiceProps) {
    const balance = payment.amount - (payment.paidAmount || 0);
    const isPaid = payment.status === "paid";

    return (
        <div className="bg-white p-8 max-w-2xl mx-auto text-black font-sans print:p-0" id="invoice-content">
            {/* Header */}
            <div className="flex justify-between items-start mb-12 border-b pb-8">
                <div>
                    <h1 className="text-4xl font-bold text-primary mb-2">INVOICE</h1>
                    <p className="text-muted-foreground uppercase tracking-widest text-sm">#INV-{payment.id.toString().padStart(6, '0')}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold">{user.companyName || "RentFlow Management"}</h2>
                    <p className="text-sm text-muted-foreground">{user.businessAddress || "Property Management Services"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Bill To</h3>
                    <p className="font-bold text-lg">{payment.tenantName}</p>
                    <p className="text-sm text-muted-foreground">{payment.propertyName}</p>
                </div>
                <div className="text-right">
                    <div className="mb-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1 tracking-wider">Date Issued</h3>
                        <p className="font-medium">{format(new Date(), "MMMM dd, yyyy")}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1 tracking-wider">Due Date</h3>
                        <p className="font-medium text-destructive">{format(new Date(payment.dueDate), "MMMM dd, yyyy")}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="mb-12">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-primary/20 bg-muted/30">
                            <th className="py-4 px-2 text-xs font-bold uppercase tracking-wider">Description</th>
                            <th className="py-4 px-2 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="py-6 px-2">
                                <p className="font-bold">Rent Payment</p>
                                <p className="text-xs text-muted-foreground mt-1">Period: {format(new Date(payment.dueDate), "MMMM yyyy")}</p>
                            </td>
                            <td className="py-6 px-2 text-right font-medium">
                                {formatCurrency(payment.amount, user.currency ?? undefined)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(payment.amount, user.currency ?? undefined)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3 font-bold text-lg">
                        <span>Total Amount</span>
                        <span>{formatCurrency(payment.amount, user.currency ?? undefined)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                        <span className="text-sm">Paid to Date</span>
                        <span className="font-bold">-{formatCurrency(payment.paidAmount || 0, user.currency ?? undefined)}</span>
                    </div>
                    <div className="flex justify-between border-t-2 border-primary pt-3 font-extrabold text-xl">
                        <span>Balance Due</span>
                        <span className={balance > 0 ? "text-destructive" : "text-green-600"}>
                            {formatCurrency(balance, user.currency ?? undefined)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer & Status */}
            <div className="flex justify-between items-end border-t pt-8">
                <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Payment Status</h4>
                    <div className={`inline-flex px-4 py-2 rounded-full font-bold uppercase tracking-widest text-xs border-2 ${isPaid ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"
                        }`}>
                        {payment.status}
                    </div>
                    {payment.reference && (
                        <p className="text-xs text-muted-foreground mt-3">Ref: <span className="font-mono">{payment.reference}</span></p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold mb-1">Thank you for your business!</p>
                    <p className="text-xs text-muted-foreground">Generated via RentFlow Dashboard</p>
                </div>
            </div>

            {/* Hidden Stamp for Printing */}
            {isPaid && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none rotate-12 border-8 border-green-600 rounded-lg p-8 select-none scale-150">
                    <span className="text-8xl font-black text-green-600 uppercase">PAID</span>
                </div>
            )}
        </div>
    );
}
