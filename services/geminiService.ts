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
  ExtendedQuote
} from "../types";

// Initialize Gemini Client
// CRITICAL: The API key must be obtained exclusively from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

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

    const text = response.text || "無有效回應";
    
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
    console.error("Gemini API Error:", error);
    throw new Error("API請求失敗，請稍後再試。");
  }
}

/**
 * Helper to safely parse JSON from markdown code blocks
 */
function cleanAndParseJSON(text: string): any {
  // Remove markdown code blocks if present
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  // Attempt to find the first '{' and last '}' to handle potential preamble text
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1) {
    return JSON.parse(cleaned.substring(firstOpen, lastClose + 1));
  }
  return JSON.parse(cleaned);
}

export const GeminiService = {
  async fetchPrice(entityName: string): Promise<GeminiResponse> {
    const query = `查詢 ${entityName} 的最新價位（包括漲跌幅和+/-符號）。`;
    const systemPrompt = "你是一個專業的金融數據助理。請提供指定公司或指數的最新價位，必須包含 +/- 符號和百分比漲跌幅，只需返回代號和價格，不得包含任何額外解釋或寒暄。請使用繁體中文回應。";
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchMA50(entityName: string): Promise<GeminiResponse> {
    const query = `查詢 ${entityName} 的 50 天移動平均線 (50-day moving average) 價位。`;
    const systemPrompt = "你是一個專業的金融數據助理。請提供指定公司或指數的 50 天移動平均線價位，只需返回價位數字，不得包含任何額外解釋、代號或寒暄。請使用繁體中文回應。";
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchTradingVolume(entityName: string): Promise<GeminiResponse> {
    const query = `查詢 ${entityName} 的最新交易量 (Volume) 與平均交易量。`;
    const systemPrompt = "你是一個專業的金融數據助理。請簡潔回報最新交易量與平均交易量 (例如: '25.4M (均量: 22.1M)')。只需返回數據，不需寒暄。請使用繁體中文。";
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchExtendedQuote(entityName: string): Promise<ExtendedQuote> {
    const query = `Get the current price, daily percentage change, and 200-day moving average for ${entityName}.
    
    Output strictly raw JSON with no markdown formatting.
    Format:
    {
      "price": number,
      "changePercent": number,
      "ma200": number
    }`;
    
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
          // responseMimeType cannot be used with googleSearch
        }
      });
      
      if (response.text) {
        return cleanAndParseJSON(response.text) as ExtendedQuote;
      }
      throw new Error("No data");
    } catch (e) {
      console.error("Extended Quote Error", e);
      throw new Error("無法獲取進階報價數據");
    }
  },

  async fetchStockSummary(companyName: string): Promise<SummaryResponse> {
    const query = `Provide a rich, detailed financial analysis summary for ${companyName}.
    
    Requirements:
    1. Identify the *primary* driver of recent price action (e.g. Earnings, Product Launch, Macro, Analyst upgrade).
    2. Mention any significant recent news or rumors.
    3. Provide a brief outlook or sentiment context.
    
    Output strictly raw JSON with no markdown formatting.
    Format:
    {
      "summary": "string (Rich text in Traditional Chinese, approx 200-300 characters. Use bullet points '•' to separate key points for readability)",
      "sentiment": "positive" | "negative" | "neutral",
      "score": number (0-100)
    }`;
    
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "你是一個專業的財經分析師。請搜尋最新資訊。Output JSON only.",
          // responseMimeType cannot be used with googleSearch
        }
      });

      // Extract sources similar to generic fetch
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri && web.title)
        .map((web: any) => ({ uri: web.uri, title: web.title }));
       const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

      if (response.text) {
        const data = cleanAndParseJSON(response.text) as SentimentData;
        return { data, sources: uniqueSources.slice(0, 3) };
      }
      throw new Error("Empty response");
    } catch (e) {
      console.error("Summary Error", e);
      throw new Error("無法獲取摘要");
    }
  },

  async fetchPricePrediction(companyName: string): Promise<PredictionResponse> {
    const query = `Analyze the historical data and recent news for ${companyName} to predict its price trend for the next 7 days. Provide a specific target price.
    
    Output strictly raw JSON with no markdown formatting.
    Format:
    {
      "predictedPrice": number,
      "confidenceScore": number (0-100),
      "timeframe": "string",
      "reasoning": "string"
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Use Pro for reasoning
            contents: query,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "You are an AI market simulator. Output JSON only.",
                // responseMimeType cannot be used with googleSearch
            }
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
          .map((chunk: any) => chunk.web)
          .filter((web: any) => web && web.uri && web.title)
          .map((web: any) => ({ uri: web.uri, title: web.title }));
        const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

        if (response.text) {
            const data = cleanAndParseJSON(response.text) as PredictionData;
            return { data, sources: uniqueSources.slice(0, 3) };
        }
        throw new Error("Prediction failed");
    } catch (e) {
        console.error("Prediction Error", e);
        throw new Error("無法生成預測");
    }
  },

  async fetchInvestmentView(companyName: string): Promise<GeminiResponse> {
    const query = `請提供關於 ${companyName} 最近的投資觀點分析，包括正面與負面因素。`;
    const systemPrompt = "你是一個專業的投資組合經理。請根據 Google 搜尋的最新資訊，為指定的公司提供一份簡短的投資觀點分析。內容必須包含**正面因素 (Pros)**和**負面因素 (Cons)**兩個標題，每個標題下列出至少 3 點使用破折號 (-) 開頭的列表項目。請使用繁體中文回應。";
    return fetchFromGemini(query, systemPrompt);
  },

  async fetchOverallMarketView(): Promise<GeminiResponse> {
    // Using gemini-3-pro-preview for complex macro reasoning and data synthesis
    const query = `請扮演華爾街首席宏觀策略師，對當前美國市場進行深度分析。
    請務必使用 Google Search 搜尋並包含以下【具體數據】：

    1. **關鍵市場指標**：
       - 美國 10 年期公債殖利率 (10-Year Treasury Yield)
       - VIX 恐慌指數
       - 三大指數 (S&P 500, Nasdaq, DJI) 最新趨勢
    
    2. **通脹與 Fed 政策**：
       - 最新的 CPI 或 PCE 通脹率年增率 (%)
       - 聯準會 (Fed) 的利率預期 (FOMC 會議/降息機率)

    3. **地緣政治與能源**：
       - 原油價格 (WTI/Brent)
       - 影響市場的關鍵地緣政治風險 (如中東、俄烏或貿易戰)

    4. **投資策略結論**：
       - 基於上述數據的短期 (Tactical) 與中期 (Strategic) 觀點。

    【格式要求】：
    - 請使用 Markdown 標題 (###) 或 【標題】 來區分區塊。
    - 關鍵數據請使用 **粗體** 標示。
    - 請使用繁體中文，語氣專業、客觀。`;

    const systemPrompt = "You are a top-tier Wall Street Macro Strategist. Provide a data-heavy, professional market analysis. Always cite specific numbers (percentages, yields, price levels) found via search. Use Traditional Chinese.";
    
    return fetchFromGemini(query, systemPrompt, 'gemini-3-pro-preview');
  },

  async fetchStockHistory(companyName: string, range: '1D' | '1W' | '1M' | '3M'): Promise<ChartResponse> {
    const rangePrompt = {
      '1D': 'intraday (past 24h)',
      '1W': 'past week (daily close)',
      '1M': 'past month (daily close)',
      '3M': 'past 3 months (weekly close)'
    }[range];

    // Refined prompt to ensure data generation even if explicit table is missing in search snippets
    const query = `Task: Generate a JSON dataset for the price history of "${companyName}" for the "${rangePrompt}".
    
    Steps:
    1. Use Google Search to find the *current* real-time price and the general trend (up/down/volatile) for the requested range.
    2. Based on the found current price and trend, generate a valid JSON array of roughly 15-20 data points that visually represent this trend.
    3. The *last* data point must match the identified current real-time price.
    4. Ensure the timestamps are sequential and appropriate for the range (e.g., "HH:MM" for 1D, "MM-DD" for 1W/1M/3M).
    
    Output Requirement:
    - Return strictly the raw JSON array.
    - Format: [{"time": "string", "price": number}]
    - Do NOT wrap in markdown code blocks.
    - Do NOT include any text before or after the JSON.
    
    (Context ID: ${Date.now()})`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are a financial data engine. Search for the specific price info and generate the requested JSON dataset. Do not apologize or explain, just output JSON.",
        },
      });

      let jsonText = response.text || "[]";
      
      // Clean up potential Markdown code blocks (e.g., ```json ... ```)
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

      // Attempt to find array if there's extra text
      const arrayMatch = jsonText.match(/\[.*\]/s);
      if (arrayMatch) {
          jsonText = arrayMatch[0];
      }

      let data: ChartDataPoint[] = [];
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
            // Validate and sanitize data
            data = parsed.map((item: any) => ({
                time: String(item.time || ''),
                price: parseFloat(item.price)
            })).filter(item => item.time && !isNaN(item.price));
        }
      } catch (e) {
        console.warn("JSON Parse failed", e);
      }

       // Extract grounding chunks for sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri && web.title)
        .map((web: any) => ({
          uri: web.uri,
          title: web.title,
        }));
      const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

      return { data, sources: uniqueSources.slice(0, 3) };
    } catch (error) {
      console.error("Chart Data Error:", error);
      throw new Error("無法獲取圖表數據");
    }
  },

  async resolveStockQuery(userQuery: string): Promise<StockInfo | null> {
    const prompt = `Identify the public company or stock index for: "${userQuery}".
    Return a JSON object with:
    - name: The full company name followed by ticker (e.g. "Tesla (TSLA)").
    - symbol: The ticker symbol (e.g. "TSLA").
    - description: A very short 3-5 word description of the company's industry (in Traditional Chinese).
    - queryName: A string optimized for search queries (e.g. "Tesla TSLA").
    
    If the company is invalid, obscure or cannot be confidently identified, set symbol to "NOT_FOUND".`;

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
        console.error("Stock Resolution Error:", e);
        return null;
    }
  }
};