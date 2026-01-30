import { GoogleGenAI } from "@google/genai";
import { GraphNodeData, GraphEdgeData, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generatePresentation = async (
  item: GraphNodeData | GraphEdgeData, 
  targetLanguage: Language
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image'; 

    const langName = targetLanguage === 'fa' ? 'Persian (Farsi)' : 'English';
    const direction = targetLanguage === 'fa' ? 'rtl' : 'ltr';
    const align = targetLanguage === 'fa' ? 'right' : 'left';

    // 1. Prepare Image Mapping for the Prompt
    // We tell the AI the IDs of the images so it can embed them in the HTML
    let fileDescriptions = "";
    item.files.forEach((f, index) => {
      if (f.type.startsWith('image/')) {
        fileDescriptions += `Image #${index + 1} ID: "${f.id}" (Filename: ${f.name})\n`;
      }
    });

    let promptText = `
      You are an expert business consultant and presentation designer.
      
      **Task:** Create a professional HTML presentation for the following entity.
      **Output Language:** ${langName}.
      
      **Entity Data:**
      - Label: ${item.label}
      - Summary: ${item.summary}
      - Detailed Content: ${item.fullContent}
      
      **Available Images:**
      ${fileDescriptions}

      **CRITICAL INSTRUCTION FOR IMAGES:**
      I have provided images. You MUST include them visually in your HTML output where they make the most sense (e.g., next to the relevant paragraph, or in a gallery section).
      To display an image, use exactly this format: <img src="FILE_ID_GOES_HERE" class="ai-embedded-img" alt="description" />
      Replace "FILE_ID_GOES_HERE" with the actual IDs provided above.
      
      **HTML Styling Requirements:**
      - Use a clean, modern design.
      - Direction: ${direction}. Text-align: ${align}.
      - Use colors compatible with the entity color: ${item.color}.
      - Images should have 'max-width: 100%' and 'border-radius: 8px'.
      - Do NOT output Markdown code blocks. Output raw HTML only.
    `;

    const parts: any[] = [{ text: promptText }];

    // Add actual image data to the payload so Gemini can "see" them to describe them
    if (item.files && item.files.length > 0) {
      item.files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const base64Data = file.content.split(',')[1];
          if (base64Data) {
            parts.push({
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            });
          }
        } else if (file.type.startsWith('text/')) {
           try {
             const textContent = atob(file.content.split(',')[1]);
             parts.push({ text: `\n\n[Attached Text File: ${file.name}]\n${textContent}` });
           } catch (e) {
             console.warn("Could not decode text file", file.name);
           }
        }
      });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts }
    });

    return response.text || "<h2>Could not generate presentation.</h2>";

  } catch (error) {
    console.error("AI Generation Error:", error);
    return `
      <div style="color: red; padding: 20px; text-align: center;">
        <h2>Error Generating Presentation</h2>
        <p>Could not connect to AI service. Please ensure API Key is configured.</p>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    `;
  }
};