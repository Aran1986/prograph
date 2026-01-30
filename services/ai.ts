import { GoogleGenAI } from "@google/genai";
import { GraphNodeData, GraphEdgeData, Language, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const modelName = 'gemini-2.5-flash-image';

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
  // RAG: Iterate ALL nodes and edges, extract their summaries AND their text file contents.
  let context = "GLOBAL KNOWLEDGE GRAPH (RAG DATA):\n\n";

  nodes.forEach(n => {
    context += `NODE [${n.label}]:\n`;
    context += `Summary: ${n.summary}\n`;
    context += `Full Content: ${n.fullContent}\n`;
    
    // Extract text files attached to this node
    if (n.files && n.files.length > 0) {
      context += "ATTACHED DOCUMENTS:\n";
      n.files.forEach(f => {
        if (f.type.startsWith('text/')) {
           context += `File: ${f.name}\nContent: ${decodeFileContent(f.content).substring(0, 2000)}...\n`; // Limit per file to avoid context overflow if huge
        }
      });
    }
    context += "--------------------------------------------------\n";
  });

  edges.forEach(e => {
     const from = nodes.find(n => n.id === e.fromId)?.label;
     const to = nodes.find(n => n.id === e.toId)?.label;
     context += `EDGE [${e.label}] from ${from} to ${to}\n`;
     context += `Summary: ${e.summary}\n`;
     context += "--------------------------------------------------\n";
  });

  return context;
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
      - Use <img src="FILE_ID" class="ai-embedded-img" style="max-width:100%; border-radius:8px; margin: 10px 0;" /> to insert images visually.
    `;

    parts.unshift({ text: promptText });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: parts }
    });

    return response.text || "<h2>Error</h2>";
  } catch (error) {
    console.error(error);
    return `<div style="color:red">Error: ${error instanceof Error ? error.message : 'Unknown'}</div>`;
  }
};

// --- Cake Presentation (Special Request) ---

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
    7- Team (including top-notch salaries for the US, Eastern Europe, India, and Iran) + when I say team I also mean all things that we need to pay, meaning also servers and etc and I need a total payment for each month for team and these things
    8- Exit strategy
    9- Its fit within our ecosystem
    
    Constraint: If there is info about a "Dubai trip", mention it separately before or after the list. Do not mix it.
    Constraint: Do NOT hallucinate data. If data is missing in the files or content provided, state "Data not provided".
    `;

    const promptText = `
      You are a strict presentation generator. You MUST follow the "Cake Presentation" format.
      Output Language: ${langName}.
      
      Entity: ${item.label}
      Provided Content: ${item.fullContent}
      
      Structure Required:
      ${cakeRules}

      Images:
      ${descriptions}
      
      Output: HTML with inline CSS (${direction}). Use <img src="FILE_ID" ... /> for images.
    `;

    parts.unshift({ text: promptText });

    const response = await ai.models.generateContent({
      model: modelName,
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

    // Analyze Topology
    let topologyContext = "";
    if ('position' in item) {
      // It's a node
      const incoming = allEdges.filter(e => e.toId === item.id).map(e => {
        const source = allNodes.find(n => n.id === e.fromId);
        return `- Receives input from "${source?.label}" via edge "${e.label}"`;
      }).join('\n');

      const outgoing = allEdges.filter(e => e.fromId === item.id).map(e => {
        const target = allNodes.find(n => n.id === e.toId);
        return `- Sends output to "${target?.label}" via edge "${e.label}"`;
      }).join('\n');

      topologyContext = `
        TOPOLOGY ANALYSIS:
        This node (${item.label}) fits into the ecosystem as follows:
        Incoming Connections:
        ${incoming || "None"}
        
        Outgoing Connections:
        ${outgoing || "None"}
      `;
    } else {
      // It's an edge
      const source = allNodes.find(n => n.id === item.fromId);
      const target = allNodes.find(n => n.id === item.toId);
      topologyContext = `
        TOPOLOGY ANALYSIS:
        This is a connection (${item.label}) that facilitates flow from "${source?.label}" to "${target?.label}".
      `;
    }

    const promptText = `
      You are a Smart Guide AI. Your job is to explain this specific entity's role in the larger system.
      Output Language: ${langName}.
      
      Focus heavily on the RELATIONSHIPS and CONNECTIONS provided in the "TOPOLOGY ANALYSIS" below.
      Explain how this entity provides services to others or receives services.
      
      Entity: ${item.label}
      ${topologyContext}
      
      Content: ${item.fullContent}

      Images: ${descriptions}

      Output: HTML format (${direction}).
    `;

    parts.unshift({ text: promptText });

    const response = await ai.models.generateContent({
      model: modelName,
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
    
    // 1. Build Deep Global Context (Reads text files from all nodes)
    const globalContext = getDeepGlobalContext(allNodes, allEdges);
    
    // 2. Build History Text
    const historyText = history.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');

    // 3. Current Item Context (with decoded files)
    const { fullTextContext } = getFileParts(currentItem.files);

    const prompt = `
      You are a highly intelligent AI assistant for a Graph Visualization Tool.
      Your goal is to answer the user's questions by synthesizing information from the entire knowledge graph.
      
      USER LANGUAGE: ${langName}.
      
      === CURRENT SELECTED ITEM ===
      Label: ${currentItem.label}
      Summary: ${currentItem.summary}
      Full Description: ${currentItem.fullContent}
      ATTACHED FILE CONTENTS FOR THIS ITEM:
      ${fullTextContext}
      
      === GLOBAL KNOWLEDGE BASE (RAG) ===
      ${globalContext}
      
      === CHAT HISTORY ===
      ${historyText}
      
      === USER QUESTION ===
      "${message}"
      
      === INSTRUCTIONS ===
      1. Use the provided "Global Knowledge Base" and "Attached File Contents" as your primary source of truth.
      2. If the user asks about scientific validity, use your own internal knowledge + the provided data to verify.
      3. If the user asks about connections, explicitly reference the "Edge" information in the global context.
      4. Be professional, detailed, and analytical.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] }
    });

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (e) {
    console.error(e);
    return "Error connecting to AI.";
  }
};