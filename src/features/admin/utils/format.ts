/**
 * Format a number with commas as thousand separators
 */
export function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a date string to a more readable format
 */
export function formatDate(dateString: string): string {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Format a currency value
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Truncate a string to a specified length and add an ellipsis if needed
 */
export function truncateString(str: string, maxLength: number = 50): string {
    if (str.length <= maxLength) return str;
    return `${str.substring(0, maxLength)}...`;
}

/**
 * Format a phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');

    // Check if the number is valid
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    // Return the original if it doesn't match expected format
    return phoneNumber;
}
