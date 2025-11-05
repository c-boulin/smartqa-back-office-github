/**
 * Date utility functions for test plan management
 */

/**
 * Convert Date object to MySQL date format (YYYY-MM-DD)
 */
export const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert MySQL date format (YYYY-MM-DD) to Date object
 */
export const parseDateFromAPI = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  const date = new Date(dateString + 'T00:00:00');
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Format date for display in input[type="date"]
 */
export const formatDateForInput = (date: Date): string => {
  return formatDateForAPI(date);
};

/**
 * Parse date from input[type="date"] value
 */
export const parseDateFromInput = (inputValue: string): Date | null => {
  if (!inputValue) return null;
  
  const date = new Date(inputValue + 'T00:00:00');
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Validate that end date is not before start date
 */
export const validateDateRange = (startDate: Date | null, endDate: Date | null): string | null => {
  if (!startDate || !endDate) return null;

  if (endDate < startDate) {
    return 'End date cannot be before start date';
  }

  return null;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayForInput = (): string => {
  return formatDateForAPI(new Date());
};