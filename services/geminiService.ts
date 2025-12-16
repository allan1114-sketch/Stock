import { GoogleGenAI, Type } from "@google/genai";
import { 
  GeminiResponse, 
  ChartResponse, 
  ChartDataPoint, 
  StockInfo, 
  SummaryResponse, 
  SentimentData,
  PredictionResponse,
  PredictionData,
  ExtendedQuote,
  TechIndicators,
  AnalystRating,
  NewsResponse,
  CompanyMetrics,
  Language
} from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Centralized Error Handler
 */
function handleGeminiError(error: any): never {
  console.error("Gemini API Error:", error);
  const msg = error?.message || error?.toString() || "";
  
  if (msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("resource exhausted")) {
    throw new Error("QUOTA_EXCEEDED");
  }
  throw new Error("API_ERROR");
}

/**
 * Generic function to fetch content from Gemini with Google Search Grounding.
 */
async function fetchFromGemini(prompt: string, systemInstruction: string, model: string = MODEL_NAME): Promise<GeminiResponse> {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction,
      },
    });

    const text = response.text || "No valid response";
    
    // Extract grounding chunks for sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = groundingChunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title)
      .map((web: any) => ({
        uri: web.uri,
        title: web.title,
      }));

    // Deduplicate sources based on URI
    const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

    return {
      text,
      sources: uniqueSources.slice(0, 3), // Limit to top 3 sources
    };
  } catch (error) {
    handleGeminiError(error);
  }
}

/**
 * Helper to safely parse JSON from markdown code blocks
 */
function cleanAndParseJSON(text: string): any {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1) {
    return JSON.parse(cleaned.substring(firstOpen, lastClose + 1));
  }
  return JSON.parse(cleaned);
}

export const GeminiService = {
  async fetchPrice(entityName: string, lang: Language): Promise<GeminiResponse> {
    const query = lang === 'en' 
      ? `Get current price for ${entityName} (include % change and +/- sign).`
      : `查詢 ${entityName} 的最新價位（包括漲跌幅和+/-符號）。`;
    
    const systemPrompt = lang === 'en'
      ? "You are a financial assistant. Return only the price and percentage change. No pleasantries."
      : "你是一個專業的金融數據助理。請提供指定公司或指數的最新價位，必須包含 +/- 符號和百分比漲跌幅，只需返回代號和價格，不得包含任何額外解釋或寒暄。";
      
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchMA50(entityName: string, lang: Language): Promise<GeminiResponse> {
    const query = `Get 50-day moving average for ${entityName}.`;
    const systemPrompt = "Return only the numeric value for 50-day MA. No text.";
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchTradingVolume(entityName: string, lang: Language): Promise<GeminiResponse> {
    const query = lang === 'en'
      ? `Get latest trading volume and average volume for ${entityName}.`
      : `查詢 ${entityName} 的最新交易量 (Volume) 與平均交易量。`;
    
    const systemPrompt = lang === 'en'
      ? "Return data like '25.4M (Avg: 22.1M)'. No extra text."
      : "請簡潔回報最新交易量與平均交易量 (例如: '25.4M (均量: 22.1M)')。只需返回數據，不需寒暄。";
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchCompanyMetrics(entityName: string): Promise<CompanyMetrics> {
    const query = `Get the Market Cap, P/E Ratio (TTM), and Dividend Yield (TTM) for ${entityName}.
    Output strictly raw JSON.
    Format: {"marketCap": "string (e.g. 2.5T)", "peRatio": "string (e.g. 30.5x)", "dividendYield": "string (e.g. 1.5% or N/A)"}`;
    
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
      });
      if (response.text) {
        return cleanAndParseJSON(response.text) as CompanyMetrics;
      }
      return { marketCap: "N/A", peRatio: "N/A", dividendYield: "N/A" };
    } catch(e) {
      handleGeminiError(e);
    }
  },

  async fetchTechnicalIndicators(entityName: string): Promise<TechIndicators> {
    const query = `Find the latest Relative Strength Index (RSI 14) value and MACD (Line/Signal/Hist) status for ${entityName}.
    Output strictly raw JSON. Format: {"rsi": number, "macd": "string"}`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
      });
      if (response.text) {
        const data = cleanAndParseJSON(response.text);
        
        // Safety check for RSI
        if (data && typeof data.rsi === 'object') {
            data.rsi = data.rsi.value || JSON.stringify(data.rsi);
        }

        // Safety check for MACD
        if (data && typeof data.macd === 'object') {
            const m = data.macd;
            if (m.status && typeof m.status === 'string') {
                data.macd = m.status;
            } else if (m.line !== undefined) {
                data.macd = `L: ${m.line} / S: ${m.signal}`;
            } else {
                data.macd = JSON.stringify(m);
            }
        }
        
        // Final type enforcement
        if (typeof data.macd !== 'string') data.macd = String(data.macd || 'N/A');

        return data as TechIndicators;
      }
      throw new Error("No data");
    } catch(e) {
      handleGeminiError(e);
    }
  },

  async fetchExtendedQuote(entityName: string): Promise<ExtendedQuote> {
    const query = `Get the current price, daily percentage change, and 200-day moving average for ${entityName}.
    Output strictly raw JSON. Format: {"price": number, "changePercent": number, "ma200": number}`;
    
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
      });
      if (response.text) return cleanAndParseJSON(response.text) as ExtendedQuote;
      throw new Error("No data");
    } catch (e) {
      handleGeminiError(e);
    }
  },

  async fetchStockSummary(companyName: string, lang: Language): Promise<SummaryResponse> {
    const query = lang === 'en'
      ? `Provide a detailed financial analysis summary for ${companyName}. Requirements: 1. Primary driver. 2. Recent news. 3. Outlook. Output JSON.`
      : `提供 ${companyName} 的最新財經新聞摘要，並分析其市場情緒分數。要求: 1. 主要驅動因素 2. 近期新聞 3. 展望。 Output JSON.`;
      
    const format = `Format: {"summary": "string (use bullet points)", "sentiment": "positive"|"negative"|"neutral", "score": number}`;
    
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query + format,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: lang === 'en' ? "You are a financial analyst. Output JSON only." : "你是一個專業的財經分析師。Output JSON only.",
        }
      });

      // Extract sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web && web.uri && web.title).map((web: any) => ({ uri: web.uri, title: web.title }));
      const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

      if (response.text) {
        let data = cleanAndParseJSON(response.text);

        // Fix for summary format
        if (data && typeof data.summary === 'object') {
             data.summary = Object.entries(data.summary)
                .map(([key, val]) => `• ${key}: ${val}`)
                .join('\n');
        } 
        else if (data && typeof data === 'object' && !data.summary) {
             const summaryKeys = ['主要驅動因素', '近期新聞', '展望', 'Primary driver', 'Recent news', 'Outlook'];
             const hasSummaryKeys = Object.keys(data).some(k => summaryKeys.some(sk => k.includes(sk)));
             
             if (hasSummaryKeys) {
                 const summaryText = Object.entries(data)
                    .filter(([k]) => k !== 'sentiment' && k !== 'score')
                    .map(([key, val]) => `• ${key}: ${val}`)
                    .join('\n');
                 
                 data = {
                     summary: summaryText,
                     sentiment: data.sentiment || 'neutral',
                     score: data.score || 50
                 };
             }
        }
        
        if (data && typeof data.summary !== 'string') {
            data.summary = JSON.stringify(data.summary || "");
        }

        return { data: data as SentimentData, sources: uniqueSources.slice(0, 3) };
      }
      throw new Error("Empty response");
    } catch (e) {
      handleGeminiError(e);
    }
  },

  async fetchCompanyNews(companyName: string, lang: Language): Promise<NewsResponse> {
    const query = `Find 5 recent important financial news articles for ${companyName}.
    Output strictly raw JSON. Format: {"news": [{"title": "string", "link": "string", "source": "string", "date": "string"}]}`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
      });
      if (response.text) return cleanAndParseJSON(response.text) as NewsResponse;
      throw new Error("No news data");
    } catch (e) {
       handleGeminiError(e);
    }
  },

  async fetchAnalystRatings(companyName: string): Promise<AnalystRating | null> {
    const query = `Get the latest analyst consensus ratings for ${companyName}. Output JSON. Format: {"consensus": "Buy"|"Hold"|"Sell", "buyCount": number, "holdCount": number, "sellCount": number}`;
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
      });
      if (response.text) return cleanAndParseJSON(response.text) as AnalystRating;
      return null;
    } catch (e) {
      handleGeminiError(e);
    }
  },

  async fetchPricePrediction(companyName: string, lang: Language): Promise<PredictionResponse> {
    const query = `Perform a technical prediction for ${companyName} stock price for the next 7 days based on recent market news and trends. 
    This is a simulation.
    Output a single JSON object. 
    Format: {"predictedPrice": number, "confidenceScore": number, "timeframe": "7 days", "reasoning": "short explanation"}
    Example: {"predictedPrice": 150.25, "confidenceScore": 85, "timeframe": "7 days", "reasoning": "Strong earnings report"}
    Do not add any markdown formatting or explanations outside the JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: query,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "You are a financial AI. Output strictly valid JSON.",
            }
        });
        
        // ... sources logic ...
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web && web.uri && web.title).map((web: any) => ({ uri: web.uri, title: web.title }));
        const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

        if (response.text) {
            const data = cleanAndParseJSON(response.text) as any;
            
            // Runtime type coercion to ensure numbers are not strings
            if (data) {
                if (typeof data.predictedPrice === 'string') {
                    // Extract number from string like "$150.00"
                    const num = parseFloat(data.predictedPrice.replace(/[^0-9.-]/g, ''));
                    data.predictedPrice = isNaN(num) ? 0 : num;
                }
                if (typeof data.confidenceScore === 'string') {
                    const num = parseFloat(data.confidenceScore.replace(/[^0-9.-]/g, ''));
                    data.confidenceScore = isNaN(num) ? 50 : num;
                }
            }
            
            return { data: data as PredictionData, sources: uniqueSources.slice(0, 3) };
        }
        throw new Error("Prediction failed: No text in response");
    } catch (e) {
        handleGeminiError(e);
    }
  },

  async fetchInvestmentView(companyName: string, lang: Language): Promise<GeminiResponse> {
    const query = lang === 'en'
      ? `Provide investment pros and cons for ${companyName}.`
      : `請提供關於 ${companyName} 最近的投資觀點分析，包括正面與負面因素。`;
    
    const systemPrompt = lang === 'en'
      ? "You are a portfolio manager. Provide Pros and Cons with bullet points."
      : "你是一個專業的投資組合經理。內容必須包含**正面因素 (Pros)**和**負面因素 (Cons)**兩個標題。";
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchOverallMarketView(lang: Language): Promise<GeminiResponse> {
    const query = lang === 'en' 
    ? `Act as a Wall Street Strategist. Analyze US Market (Yields, VIX, Indices, Inflation, Fed, Geopolitics). Use Markdown.`
    : `請扮演華爾街首席宏觀策略師，對當前美國市場進行深度分析 (公債, VIX, 通脹, Fed, 地緣政治)。`;

    const systemPrompt = lang === 'en'
    ? "You are a top-tier Macro Strategist. Provide data-heavy analysis. Cite specific numbers."
    : "You are a top-tier Wall Street Macro Strategist. Provide a data-heavy, professional market analysis. Use Traditional Chinese.";
    
    return fetchFromGemini(query, systemPrompt, MODEL_NAME);
  },

  async fetchStockHistory(companyName: string, range: '1D' | '1W' | '1M' | '3M'): Promise<ChartResponse> {
    const rangePrompt = {
      '1D': 'intraday (past 24h)',
      '1W': 'past week (daily close)',
      '1M': 'past month (daily close)',
      '3M': 'past 3 months (weekly close)'
    }[range];

    const query = `Task: Generate a JSON dataset for the price history of "${companyName}" for the "${rangePrompt}".
    Steps: 1. Search current price/trend. 2. Generate JSON array. 
    Format: [{"time": "string (HH:MM or MM-DD)", "open": number, "high": number, "low": number, "close": number}]`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are a financial data engine. Output JSON only. Ensure you provide Open, High, Low, Close data for a candlestick chart. If exact OHLC is unavailable, estimate realistic intraday volatility.",
        },
      });

      let jsonText = response.text || "[]";
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      const arrayMatch = jsonText.match(/\[.*\]/s);
      if (arrayMatch) jsonText = arrayMatch[0];

      let data: ChartDataPoint[] = [];
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
            data = parsed.map((item: any) => ({
                time: String(item.time || ''),
                price: parseFloat(item.close || item.price), // Fallback to price if close missing
                open: parseFloat(item.open || item.price),
                high: parseFloat(item.high || item.price),
                low: parseFloat(item.low || item.price),
                close: parseFloat(item.close || item.price)
            })).filter(item => item.time && !isNaN(item.price));
        }
      } catch (e) { console.warn("JSON Parse failed", e); }

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks.map((chunk: any) => chunk.web).filter((web: any) => web && web.uri && web.title).map((web: any) => ({ uri: web.uri, title: web.title }));
      const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

      return { data, sources: uniqueSources.slice(0, 3) };
    } catch (error) {
      handleGeminiError(error);
    }
  },

  async fetchComparisonChart(name1: string, name2: string): Promise<any[]> {
    const query = `Generate a JSON dataset comparing the daily percentage change of "${name1}" (s1) and "${name2}" (s2) over the past 5 trading days.
    Output strictly raw JSON.
    Format: [{"day": "string (e.g. M-D)", "s1": number, "s2": number}]`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
      });
      if (response.text) {
        return cleanAndParseJSON(response.text);
      }
      return [];
    } catch (e) {
      console.error("Comparison chart failed", e);
      return [];
    }
  },

  async resolveStockQuery(userQuery: string): Promise<StockInfo | null> {
    const prompt = `Identify public company/index for: "${userQuery}".
    Return JSON: {"name": "Full Name (Ticker)", "symbol": "TICKER", "description": "Short Industry Desc", "queryName": "Search Optimized Name"}.
    If invalid, set symbol to "NOT_FOUND".`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        symbol: { type: Type.STRING },
                        description: { type: Type.STRING },
                        queryName: { type: Type.STRING }
                    },
                    required: ["name", "symbol", "description", "queryName"]
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text) as StockInfo;
            if (data.symbol === 'NOT_FOUND') return null;
            return data;
        }
        return null;
    } catch (e) {
        return null;
    }
  },

  async generateLogo(companyName: string): Promise<string> {
    const prompt = `A modern, minimalist, vector-style logo for the company "${companyName}". White background.`;
    try {
       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        }
      });
      // Iterate to find image part
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return '';
    } catch (e) {
      console.error("Logo generation failed", e);
      return '';
    }
  }
};