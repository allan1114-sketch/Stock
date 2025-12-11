
/**
 * Extracts a numeric price from a string potentially containing currency symbols and text.
 * Example: "$150.25 (+1.2%)" -> 150.25
 */
export function parsePrice(priceText: string): number | null {
  if (!priceText) return null;
  // Remove commas (e.g., 1,200.50 -> 1200.50)
  const cleanText = priceText.replace(/,/g, '');
  
  // Match the first distinct number (integer or float), allow negative
  const match = cleanText.match(/(-?\d+\.\d+|-?\d+)/);
  
  if (match) {
    return parseFloat(match[0]);
  }
  return null;
}

/**
 * Parses metrics with suffixes like T, B, M, %, x
 */
export function parseMetric(text: string): number | null {
    if (!text || text === 'N/A' || text === '-' || text === '---') return null;
    let multiplier = 1;
    const t = text.toUpperCase();
    
    if (t.includes('T')) multiplier = 1e12;
    else if (t.includes('B')) multiplier = 1e9;
    else if (t.includes('M')) multiplier = 1e6;
    else if (t.includes('K')) multiplier = 1e3;
    
    // Remove non-numeric characters except dot and minus for parsing
    const num = parsePrice(text);
    return num !== null ? num * multiplier : null;
}
