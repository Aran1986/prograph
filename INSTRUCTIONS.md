# Graph Pro Studio - Installation Instructions

## Prerequisites
- Node.js (version 18 or higher recommended)
- Access to a command line interface (Terminal, CMD, PowerShell)

## Step 1: Create the Project Scaffolding
Run the following command to create a basic Vite + React + TypeScript project:

```bash
npm create vite@latest graph-pro-studio -- --template react-ts
```

## Step 2: Navigate to Project Directory
```bash
cd graph-pro-studio
```

## Step 3: Install Dependencies
Install the required libraries for 3D rendering, AI, and UI icons:

```bash
npm install three @types/three @react-three/fiber @react-three/drei lucide-react @google/genai
```

**Crucial for Desktop App:**
You must also install the Electron dependencies if they aren't already installed:

```bash
npm install --save-dev electron electron-builder concurrently cross-env wait-on
```

## Step 4: Add Application Files
Copy all the `.tsx`, `.ts`, `.json`, and `.js` files provided in this chat into your project.
- `src/` files go into the `src/` folder.
- `electron/` folder should be in the root.
- `package.json`, `vite.config.ts`, `tsconfig.json` overwrite the existing ones in the root.

## Step 5: Configure AI API Key (Important!)
The AI features require a Google Gemini API Key.

1. Go to [Google AI Studio](https://aistudio.google.com/) and create a free API Key.
2. In the root of your project, create a file named `.env`.
3. Add the following line to the `.env` file:

```
VITE_API_KEY=your_api_key_here
```

**Note for .exe Build:** When you build the executable, this key will be baked into the application. Ensure this file exists before building!

## Step 6: Run the Application

### Option A: Development Mode (Web Browser)
To run quickly in your browser while editing code:
```bash
npm run dev
```

### Option B: Development Mode (Desktop App)
To test the desktop window logic without building:
```bash
npm run electron:dev
```

### Option C: Build Windows Executable (.exe)
To create the standalone installer that you can send to other computers:

1. Ensure all dependencies are installed (`npm install`).
2. Run the build command:
   ```bash
   npm run electron:build
   ```
3. Wait for the process to finish. It may take a few minutes.
4. Once finished, a new folder named `release` will appear in your project.
5. Inside `release`, you will find an installer file (e.g., `Graph Pro Studio Setup 1.0.0.exe`).
6. **You can copy this file to any Windows computer and install it.** No dependencies needed on the target machine.

---

## Troubleshooting
- **Build Error: Icon not found?** If the build complains about `public/icon.ico` missing, either place an `.ico` file there or remove the `"icon": "public/icon.ico"` line from `package.json`.
- **AI not working in .exe?** Check if you had the `.env` file with the correct API KEY present *when you ran the build command*. The app reads the key at build time.
