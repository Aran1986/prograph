import { GoogleGenAI, Type } from "@google/genai";
import { GraphNodeData, GraphEdgeData, Language, ChatMessage, AIArchitectDefinitions, AISuggestion, AttachedFile, AIMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const textModel = 'gemini-3-flash-preview';
const reasoningModel = 'gemini-3-pro-preview'; 

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
    // Using gemini-2.5-flash-image which supports image generation via generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: [{ text: prompt }] }
    });

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Image gen error:", e);
    return null;
  }
};

// --- Multi-Mode Content Generation ---

export const generateModeContent = async (
  item: GraphNodeData | GraphEdgeData,
  mode: AIMode,
  targetLanguage: Language
): Promise<string> => {
  try {
    const langName = targetLanguage === 'fa' ? 'Persian (Farsi)' : 'English';
    const direction = targetLanguage === 'fa' ? 'rtl' : 'ltr';
    const { parts, descriptions } = getFileParts(item.files);

    let systemRole = "";
    let instructions = "";

    switch (mode) {
      case 'presentation':
        systemRole = "You are a Business Presentation Expert.";
        instructions = "Create a slide content for this entity. Include bullet points, key takeaways, and a professional tone.";
        break;
      case 'writing':
        systemRole = "You are a Novelist and Creative Writer.";
        instructions = "Analyze this node as a Story Element (Character, Place, Event). Write a Character Sheet or Scene Description. Focus on narrative depth, emotion, and sensory details.";
        break;
      case 'coding':
        systemRole = "You are a Senior Software Engineer.";
        instructions = "Treat this node as a Code Module or System Component. Provide Technical Documentation, Interface Definitions (TypeScript/Python), and usage examples.";
        break;
      case 'law':
        systemRole = "You are a Senior Legal Counsel.";
        instructions = "Treat this as a Legal Case, Contract Clause, or Evidence. Provide a Legal Analysis, Compliance Check, and potential risks.";
        break;
      case 'chemistry':
        systemRole = "You are a Chemistry Professor.";
        instructions = "Analyze this as a Chemical Element, Compound, or Reaction. Provide scientific properties, safety data, and molecular structure description.";
        break;
      case 'investigation':
        systemRole = "You are a Private Investigator / Detective.";
        instructions = "Analyze this node as a Suspect, Clue, or Timeline Event. Create an Investigative Report. Focus on motives, alibis, and connections to other crimes.";
        break;
      case 'journalism':
        systemRole = "You are an Investigative Journalist.";
        instructions = "Treat this as a News Story lead or Interview Subject. Draft a News Report or Article. Focus on the 5 Ws (Who, What, Where, When, Why) and objective reporting.";
        break;
      case 'genealogy':
        systemRole = "You are a Professional Genealogist.";
        instructions = "Analyze this node as a Family Member or Historical Record. Create a Biographical Entry. Focus on dates, relationships, lineage, and historical context.";
        break;
      case 'network':
        systemRole = "You are a Network Engineer.";
        instructions = "Treat this as a Network Device (Router, Switch, Server) or Subnet. Provide a Network Topology configuration, IP scheme, or security policy for this node.";
        break;
      case 'supplyChain':
        systemRole = "You are a Supply Chain Manager.";
        instructions = "Analyze this as a Logistics Node (Warehouse, Supplier, Transport). Provide a Logistics Report, Inventory Status, or Efficiency Analysis.";
        break;
      case 'seo':
        systemRole = "You are an SEO Strategist.";
        instructions = "Treat this as a Web Page or Keyword Cluster. Provide an SEO Audit, Keyword Strategy, and Content Optimization suggestions.";
        break;
      case 'financial':
        systemRole = "You are a Forensic Accountant.";
        instructions = "Analyze this as a Transaction, Account, or Entity. Provide a Financial Audit Report. Trace funds, identify irregularities, and summarize financial health.";
        break;
      case 'pkm':
        systemRole = "You are a Knowledge Management Expert.";
        instructions = "Treat this as a Zettelkasten Note or Knowledge Atom. connect it to broader concepts. Summarize key insights and 'atomic' ideas.";
        break;
      case 'mindMap':
        systemRole = "You are a Brainstorming Facilitator.";
        instructions = "Treat this as a Central Idea or Branch. Expand on it with related sub-concepts, creative associations, and lateral thinking ideas.";
        break;
      case 'gameDesign':
        systemRole = "You are a Lead Game Designer.";
        instructions = "Analyze this as a Game Mechanic, Level, or NPC. Write a Design Document (GDD) section. Focus on gameplay loops, player experience, and balance.";
        break;
      default:
        systemRole = "You are an AI Assistant.";
        instructions = "Provide a detailed summary and analysis of this item.";
    }

    const promptText = `
      ${systemRole}
      Output Language: ${langName}.
      
      Target Entity: ${item.label}
      Summary: ${item.summary}
      Full Content: ${item.fullContent}
      
      Attached Context (Images/Files):
      ${descriptions}

      TASK:
      ${instructions}

      FORMATTING:
      - Clean HTML with inline CSS. Direction: ${direction}.
      - Use <img src="FILE_ID" class="ai-embedded-img" style="max-width:100%; border-radius:8px; margin: 10px 0;" /> for provided images.
      - If visual concepts are described but no image exists, use <ai-image-gen prompt="..."></ai-image-gen>.
    `;

    parts.unshift({ text: promptText });

    const response = await ai.models.generateContent({
      model: textModel,
      contents: { parts: parts }
    });

    return response.text || "<h2>Error generating content</h2>";

  } catch (e) {
    return `<div style="color:red">Error: ${e instanceof Error ? e.message : 'Unknown'}</div>`;
  }
};

// --- Finalization Feature ---

export const generateFinalProjectArtifact = async (
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  mode: AIMode,
  targetLanguage: Language
): Promise<string> => {
  try {
    const langName = targetLanguage === 'fa' ? 'Persian (Farsi)' : 'English';
    const globalContext = getDeepGlobalContext(nodes, edges);
    
    let instructions = "";
    switch(mode) {
      case 'writing':
         instructions = "Compile the entire graph into a Final Story / Novel Draft. Ensure narrative flow, character consistency, and plot resolution.";
         break;
      case 'law':
         instructions = "Compile the graph into a Final Legal Defense Strategy or Comprehensive Case File. Structure it with arguments, evidence, and conclusion.";
         break;
      case 'journalism':
         instructions = "Compile a Final Investigative Report for publication. Synthesize all interviews, facts, and timelines into a coherent article.";
         break;
      case 'gameDesign':
         instructions = "Compile a complete Game Design Document (GDD). Organize mechanics, characters, and levels into a final specification.";
         break;
      case 'investigation':
         instructions = "Create a Final Detective's Case Solved Report. Who did it? How? Why? Summarize the evidence trail.";
         break;
      default:
         instructions = "Create a comprehensive Final Project Report based on the graph data. Structure it logically with Introduction, Body, and Conclusion.";
    }

    const prompt = `
      You are an expert AI specialized in ${mode}.
      Output Language: ${langName}.
      
      TASK:
      ${instructions}
      
      SOURCE DATA (GRAPH):
      ${globalContext}
      
      OUTPUT:
      - Return formatted HTML (Direction: ${targetLanguage === 'fa' ? 'rtl' : 'ltr'}).
      - Use <h1>, <h2>, <p>, <ul> etc.
    `;

    const response = await ai.models.generateContent({
      model: reasoningModel,
      contents: { parts: [{ text: prompt }] }
    });

    return response.text || "Error generating final artifact.";

  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : 'Unknown'}`;
  }
};


// --- Legacy exports kept for compatibility if needed, but generateModeContent supersedes them ---
export const generatePresentation = async (item: any, lang: any) => generateModeContent(item, 'presentation', lang);
export const generateCakePresentation = async (item: GraphNodeData | GraphEdgeData, targetLanguage: Language) => {
    // Keeping specific implementation for Cake as requested in previous iterations, simplified here to call main logic or custom
     // Re-implementing strictly for "Cake" structure consistency
    try {
        const langName = targetLanguage === 'fa' ? 'Persian' : 'English';
        const { parts, descriptions } = getFileParts(item.files);
        const prompt = `Create a 'Cake Business Presentation' (9 slices: Problem, Solution, Market, Competitors, Business Model, Roadmap, Team, Exit, Ecosystem). Lang: ${langName}. Entity: ${item.label}. Content: ${item.fullContent}. Images: ${descriptions}. Output HTML.`;
        parts.unshift({ text: prompt });
        const res = await ai.models.generateContent({ model: textModel, contents: { parts }});
        return res.text || "Error";
    } catch(e) { return "Error"; }
};

export const generateSmartGuide = async (item: any, nodes: any, edges: any, lang: any) => {
    // Re-implementing simplified Smart Guide
    try {
        const langName = lang === 'fa' ? 'Persian' : 'English';
        const prompt = `Explain the role of '${item.label}' in the network topology. Context: Connected to ${edges.length} items. Lang: ${langName}. Output HTML.`;
        const res = await ai.models.generateContent({ model: textModel, contents: { parts: [{ text: prompt }] }});
        return res.text || "Error";
    } catch(e) { return "Error"; }
};

export const chatWithAI = async (message: string, history: ChatMessage[], currentItem: any, allNodes: any[], allEdges: any[], targetLanguage: Language) => {
    // Same as before
    try {
        const langName = targetLanguage === 'fa' ? 'Persian' : 'English';
        const context = getDeepGlobalContext(allNodes, allEdges);
        const prompt = `Assistant for ${langName}. Context: ${context}. User: ${message}`;
        const res = await ai.models.generateContent({ model: textModel, contents: { parts: [{ text: prompt }] }});
        return res.text || "Error";
    } catch(e) { return "Error"; }
};

export const generateGraphFromFiles = async (files: AttachedFile[], defs: AIArchitectDefinitions, lang: Language): Promise<{ nodes: any[], edges: any[] }> => {
    // Keep existing architect logic
     try {
        let fileContext = "";
        files.forEach(f => {
           if (f.type.startsWith('text/') || f.name.match(/\.(js|ts|txt|md)$/)) {
             fileContext += `\nFILE: ${f.name}\n${decodeFileContent(f.content).substring(0, 10000)}\n`;
           }
        });
        const prompt = `Architect Task. Defs: ${defs.nodeDefinition}, ${defs.edgeDefinition}. files: ${fileContext}. Return JSON {nodes:[{label, summary, fullContent, color, size}], edges:[{fromLabel, toLabel, label}]}.`;
        const response = await ai.models.generateContent({
            model: reasoningModel,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return { nodes: [], edges: [] }; }
};

export const getBrainstormSuggestions = async (nodes: any[], edges: any[], defs: any, feedback: string): Promise<AISuggestion[]> => {
    // Keep existing logic
    try {
        const context = getDeepGlobalContext(nodes, edges);
        const prompt = `Brainstorm. Context: ${context}. Feedback: ${feedback}. Return JSON array of suggestions.`;
        const response = await ai.models.generateContent({
             model: reasoningModel,
             contents: { parts: [{ text: prompt }] },
             config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const autoCompleteProject = async (nodes: any[], edges: any[], defs: any): Promise<any> => {
     // Keep existing logic
     try {
        const context = getDeepGlobalContext(nodes, edges);
        const prompt = `Auto-complete project. Context: ${context}. Return JSON {modifiedNodes:[], newNodes:[], newEdges:[]}`;
        const response = await ai.models.generateContent({
             model: reasoningModel,
             contents: { parts: [{ text: prompt }] },
             config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
     } catch (e) { return { modifiedNodes: [], newNodes: [], newEdges: [] }; }
}