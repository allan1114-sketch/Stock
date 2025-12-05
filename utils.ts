/**
 * Extracts a numeric price from a string potentially containing currency symbols and text.
 * Example: "$150.25 (+1.2%)" -> 150.25
 */
export function parsePrice(priceText: string): number | null {
  // Remove commas (e.g., 1,200.50 -> 1200.50)
  const cleanText = priceText.replace(/,/g, '');
  
  // Match the first distinct number (integer or float)
  const match = cleanText.match(/(\d+\.\d+|\d+)/);
  
  if (match) {
    return parseFloat(match[0]);
  }
  return null;
}