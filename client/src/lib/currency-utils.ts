export const currencyConfig: Record<string, { symbol: string; label: string }> = {
    KES: { symbol: "Ksh", label: "Kenyan Shilling" },
    USD: { symbol: "$", label: "US Dollar" },
    EUR: { symbol: "€", label: "Euro" },
    GBP: { symbol: "£", label: "British Pound" },
};

export function formatCurrency(amount: number | string, currencyCode: string = "KES"): string {
    const code = currencyCode.toUpperCase();
    const config = currencyConfig[code] || currencyConfig.KES;
    const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) return `${config.symbol} 0.00`;

    return `${config.symbol} ${numericAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function getCurrencySymbol(currencyCode: string = "KES"): string {
    const code = currencyCode.toUpperCase();
    return currencyConfig[code]?.symbol || "Ksh";
}
