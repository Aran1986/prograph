import { GoogleGenAI } from "@google/genai";
import { GraphNodeData, GraphEdgeData, Language, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const textModel = 'gemini-2.5-flash-image';
const imageModel = 'imagen-3.0-generate-001';

// --- Helpers ---

const decodeFileContent = (base64Content: string) => {
  try {
    return atob(base64Content.split(',')[1]);
  } catch (e) {
    return "[Error decoding file]";
  }
};

const getFileParts = (files: any[]) => {
  const parts: any[] = [];
  let descriptions = "";
  let fullTextContext = "";
  
  if (files && files.length > 0) {
    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const base64Data = file.content.split(',')[1];
        if (base64Data) {
          parts.push({
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          });
          descriptions += `Image #${index + 1} ID: "${file.id}" (Filename: ${file.name})\n`;
        }
      } else if (file.type.startsWith('text/')) {
         const textContent = decodeFileContent(file.content);
         const textPart = `\n\n--- START OF FILE: ${file.name} ---\n${textContent}\n--- END OF FILE ---\n`;
         parts.push({ text: textPart });
         fullTextContext += textPart;
      }
    });
  }
  return { parts, descriptions, fullTextContext };
};

const getDeepGlobalContext = (nodes: GraphNodeData[], edges: GraphEdgeData[]) => {
  let context = "GLOBAL KNOWLEDGE GRAPH (RAG DATA):\n\n";

  nodes.forEach(n => {
    context += `NODE [${n.label}]:\n`;
    context += `Summary: ${n.summary}\n`;
    context += `Full Content: ${n.fullContent}\n`;
    
    if (n.files && n.files.length > 0) {
      context += "ATTACHED DOCUMENTS:\n";
      n.files.forEach(f => {
        if (f.type.startsWith('text/')) {
           context += `File: ${f.name}\nContent: ${decodeFileContent(f.content).substring(0, 2000)}...\n`; 
        }
      });
    }
    context += "--------------------------------------------------\n";
  });

  edges.forEach(e => {
     const from = nodes.find(n => n.id === e.fromId)?.label;
     const to = nodes.find(n => n.id === e.toId)?.label;
     let dirText = "Bidirectional connection";
     if (e.direction === 'source-to-target') dirText = `${from} --> ${to}`;
     else if (e.direction === 'target-to-source') dirText = `${to} --> ${from}`;

     context += `EDGE [${e.label}] from ${from} to ${to}\n`;
     context += `Direction: ${dirText}\n`;
     context += `Summary: ${e.summary}\n`;
     context += "--------------------------------------------------\n";
  });

  return context;
};

// --- Image Generation ---

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateImages({
      model: imageModel,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    const base64EncodeString = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64EncodeString) {
      return `data:image/jpeg;base64,${base64EncodeString}`;
    }
    return null;
  } catch (e) {
    console.error("Image gen error:", e);
    return null;
  }
};

// --- Standard Presentation ---

export const generatePresentation = async (
  item: GraphNodeData | GraphEdgeData, 
  targetLanguage: Language
): Promise<string> => {
  try {
    const langName = targetLanguage === 'fa' ? 'Persian (Farsi)' : 'English';
    const direction = targetLanguage === 'fa' ? 'rtl' : 'ltr';
    const align = targetLanguage === 'fa' ? 'right' : 'left';
    
    const { parts, descriptions } = getFileParts(item.files);

    const promptText = `
      You are an expert business consultant. Create a HTML presentation.
      Output Language: ${langName}.
      
      Entity: ${item.label}
      Summary: ${item.summary}
      Full Content: ${item.fullContent}
      
      Available Images:
      ${descriptions}

      INSTRUCTIONS:
      - Clean HTML with inline CSS. Direction: ${direction}, Text-align: ${align}.
      - Use <img src="FILE_ID" class="ai-embedded-img" style="max-width:100%; border-radius:8px; margin: 10px 0;" /> to insert PROVIDED images visually.
      - **CRITICAL**: If you describe a section or concept (like a team, a roadmap, or a product feature) and there is NO provided image for it, you MUST insert a special generation tag:
        <ai-image-gen prompt="Detailed English prompt describing the scene for this section"></ai-image-gen>
        Place this tag where the image should appear.
    `;

    parts.unshift({ text: promptText });

    const response = await ai.models.generateContent({
      model: textModel,
      contents: { parts: parts }
    });

    return response.text || "<h2>Error</h2>";
  } catch (error) {
    console.error(error);
    return `<div style="color:red">Error: ${error instanceof Error ? error.message : 'Unknown'}</div>`;
  }
};

// --- Cake Presentation ---

export const generateCakePresentation = async (
  item: GraphNodeData | GraphEdgeData,
  targetLanguage: Language
): Promise<string> => {
  try {
    const langName = targetLanguage === 'fa' ? 'Persian (Farsi)' : 'English';
    const direction = targetLanguage === 'fa' ? 'rtl' : 'ltr';
    const { parts, descriptions } = getFileParts(item.files);

    const cakeRules = `
    1- Initial presentation of the work
    2- Problem solution
    3- Cake size for both the global market and Dubai
    4- Competitors, their brand value, strengths, and weaknesses
    5- Our income outlook, market share, and how profit is obtained
    6- Our roadmap
    7- Team
    8- Exit strategy
    9- Its fit within our ecosystem
    `;

    const promptText = `
      You are a strict presentation generator. Follow the "Cake Presentation" format.
      Output Language: ${langName}.
      
      Entity: ${item.label}
      Provided Content: ${item.fullContent}
      
      Structure: ${cakeRules}
      
      Images: ${descriptions}
      
      Output: HTML (${direction}). 
      - Use <img src="FILE_ID" ... /> for existing images.
      - **CRITICAL**: For any of the 9 sections, if an image is missing, insert:
        <ai-image-gen prompt="High quality business illustration for [Section Name]: [Details]"></ai-image-gen>
    `;

    parts.unshift({ text: promptText });

    const response = await ai.models.generateContent({
      model: textModel,
      contents: { parts: parts }
    });

    return response.text || "<h2>Error generating Cake Presentation</h2>";
  } catch (e) {
    return `<div style="color:red">Error: ${e instanceof Error ? e.message : 'Unknown'}</div>`;
  }
};

// --- Smart Guide (Topology Aware) ---

export const generateSmartGuide = async (
  item: GraphNodeData | GraphEdgeData,
  allNodes: GraphNodeData[],
  allEdges: GraphEdgeData[],
  targetLanguage: Language
): Promise<string> => {
  try {
    const langName = targetLanguage === 'fa' ? 'Persian (Farsi)' : 'English';
    const direction = targetLanguage === 'fa' ? 'rtl' : 'ltr';
    const { parts, descriptions } = getFileParts(item.files);

    // Analyze Topology with Direction
    let topologyContext = "";
    if ('position' in item) {
      // It's a node
      const incoming = allEdges.filter(e => {
        if (e.toId === item.id && (e.direction === 'source-to-target' || e.direction === 'bidirectional')) return true;
        if (e.fromId === item.id && e.direction === 'target-to-source') return true;
        return false;
      }).map(e => {
        const otherId = e.toId === item.id ? e.fromId : e.toId;
        const source = allNodes.find(n => n.id === otherId);
        return `- Receives input from "${source?.label}" via edge "${e.label}"`;
      }).join('\n');

      const outgoing = allEdges.filter(e => {
         if (e.fromId === item.id && (e.direction === 'source-to-target' || e.direction === 'bidirectional')) return true;
         if (e.toId === item.id && e.direction === 'target-to-source') return true;
         return false;
      }).map(e => {
        const otherId = e.fromId === item.id ? e.toId : e.fromId;
        const target = allNodes.find(n => n.id === otherId);
        return `- Sends output to "${target?.label}" via edge "${e.label}"`;
      }).join('\n');

      topologyContext = `
        TOPOLOGY ANALYSIS:
        This node (${item.label}) fits into the ecosystem as follows:
        Incoming Connections (Services Received):
        ${incoming || "None"}
        
        Outgoing Connections (Services Provided):
        ${outgoing || "None"}
      `;
    } else {
      // It's an edge
      const source = allNodes.find(n => n.id === item.fromId);
      const target = allNodes.find(n => n.id === item.toId);
      let flow = "Mutual exchange (Bidirectional)";
      if (item.direction === 'source-to-target') flow = `One way: ${source?.label} -> ${target?.label}`;
      if (item.direction === 'target-to-source') flow = `One way: ${target?.label} -> ${source?.label}`;

      topologyContext = `
        TOPOLOGY ANALYSIS:
        This connection (${item.label}) facilitates flow between "${source?.label}" and "${target?.label}".
        Flow Direction: ${flow}.
      `;
    }

    const promptText = `
      You are a Smart Guide AI. Explain the entity's role based on the TOPOLOGY.
      Output Language: ${langName}.
      
      Entity: ${item.label}
      ${topologyContext}
      
      Content: ${item.fullContent}
      
      Output: HTML format (${direction}).
      Use <ai-image-gen prompt="..."> if images are missing for key concepts.
    `;

    parts.unshift({ text: promptText });

    const response = await ai.models.generateContent({
      model: textModel,
      contents: { parts: parts }
    });

    return response.text || "<h2>Error generating Smart Guide</h2>";
  } catch (e) {
    return `<div style="color:red">Error: ${e instanceof Error ? e.message : 'Unknown'}</div>`;
  }
};

// --- Context Aware Chat ---

export const chatWithAI = async (
  message: string,
  history: ChatMessage[],
  currentItem: GraphNodeData | GraphEdgeData,
  allNodes: GraphNodeData[],
  allEdges: GraphEdgeData[],
  targetLanguage: Language
): Promise<string> => {
  try {
    const langName = targetLanguage === 'fa' ? 'Persian' : 'English';
    const globalContext = getDeepGlobalContext(allNodes, allEdges);
    const historyText = history.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    const { fullTextContext } = getFileParts(currentItem.files);

    const prompt = `
      You are a highly intelligent AI assistant for a Graph Visualization Tool.
      USER LANGUAGE: ${langName}.
      
      === CURRENT SELECTED ITEM ===
      Label: ${currentItem.label}
      Full Description: ${currentItem.fullContent}
      FILES: ${fullTextContext}
      
      === GLOBAL KNOWLEDGE BASE ===
      ${globalContext}
      
      === CHAT HISTORY ===
      ${historyText}
      
      === QUESTION ===
      "${message}"
      
      Answer professionally.
    `;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: { parts: [{ text: prompt }] }
    });

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (e) {
    return "Error connecting to AI.";
  }
};