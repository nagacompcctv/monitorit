import { GoogleGenAI } from "@google/genai";

export async function summarizePerformance(logs: string) {
  try {
    const customKey = localStorage.getItem('gemini_api_key');
    const ai = new GoogleGenAI({ apiKey: customKey || process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analisis aktivitas log staf IT berikut dan berikan ringkasan profesional 1 kalimat untuk laporan kinerja dalam Bahasa Indonesia. BERIKAN HANYA HASIL RINGKASANNYA, TANPA TEKS LAINNYA:\n\n${logs}`,
    });
    
    return response.text || "Performance metrics stable.";
  } catch (error) {
    console.error("Gemini summary failed", error);
    return "Analisis AI tidak tersedia. Pastikan Key Gemini AI di menu Pengaturan sudah benar.";
  }
}
