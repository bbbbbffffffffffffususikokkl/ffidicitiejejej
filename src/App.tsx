import { useState } from 'react';
import { Shield, Sword, Zap, Copy, Check } from 'lucide-react'; // Ensure you install lucide-react

// Preset Data Configuration
const PRESETS = {
  High: {
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    description: "Aggressive obfuscation for maximum security. Best for sensitive scripts.",
    stats: { time: "Moderate (500ms-2s)", size: "100-200%", security: "High" },
    color: "text-emerald-400"
  },
  Medium: {
    icon: <Sword className="w-5 h-5 text-amber-400" />,
    description: "Moderate obfuscation with good performance. Recommended for most users.",
    stats: { time: "Fast (100-500ms)", size: "30-50%", security: "Medium" },
    color: "text-amber-400"
  },
  Fast: {
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    description: "Minimal obfuscation for fast processing. Ideal for testing and development.",
    stats: { time: "Very Fast (<100ms)", size: "10-20%", security: "Low" },
    color: "text-blue-400"
  }
};

type EngineType = "LuaU" | "JavaScript (MCBE)";
type PresetType = keyof typeof PRESETS;

export default function App() {
  const [engine, setEngine] = useState<EngineType>("LuaU");
  const [preset, setPreset] = useState<PresetType>("High");
  const [inputCode, setInputCode] = useState("");
  const [outputCode, setOutputCode] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Dynamic Placeholder based on Engine
  const placeholderText = engine === "LuaU" 
    ? 'print("hello, world!")' 
    : 'console.log("hello, world!")';

  const handleObfuscate = () => {
    if (!inputCode) return;
    
    // SIMULATION: In a real app, you would call your tRPC backend here.
    // For now, we just act like it worked so you can test the UI.
    setTimeout(() => {
      setOutputCode(`-- Obfuscated by Vexile (${preset} Mode)\n-- Engine: ${engine}\n\n${btoa(inputCode)}`); 
      setShowResult(true);
    }, 600); // Fake delay for realism
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 flex flex-col items-center font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <div className="w-full max-w-3xl text-center mb-10 space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter text-white">
          Vexile <span className="text-indigo-500">Obfuscator</span>
        </h1>
        <div className="flex items-center justify-center gap-3 text-sm font-medium">
          <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 text-neutral-400">V1.0</span>
          <a href="https://discord.gg/vexile" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            discord.gg/vexile
          </a>
        </div>
      </div>

      <div className="w-full max-w-3xl space-y-8">
        
        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Engine Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1">Select Engine</label>
            <div className="relative">
              <select 
                value={engine}
                onChange={(e) => setEngine(e.target.value as EngineType)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:border-neutral-700 transition-colors"
              >
                <option value="LuaU">LuaU</option>
                <option value="JavaScript (MCBE)">JavaScript (MCBE)</option>
              </select>
              {/* Custom arrow for styling */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
            </div>
          </div>

          {/* Preset Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1">Protection Preset</label>
            <div className="relative">
              <select 
                value={preset}
                onChange={(e) => setPreset(e.target.value as PresetType)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:border-neutral-700 transition-colors"
              >
                <option value="High">High (Shield)</option>
                <option value="Medium">Medium (Sword)</option>
                <option value="Fast">Fast (Lightning)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
            </div>
          </div>
        </div>

        {/* Dynamic Description Card */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-3 mb-3">
            {PRESETS[preset].icon}
            <h3 className={`font-bold ${PRESETS[preset].color}`}>{preset} Protection</h3>
          </div>
          <p className="text-neutral-400 text-sm mb-4">
            {PRESETS[preset].description}
          </p>
          <div className="grid grid-cols-3 gap-4 border-t border-neutral-800 pt-4">
            <div>
              <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Processing</div>
              <div className="text-sm font-medium">{PRESETS[preset].stats.time}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Size Increase</div>
              <div className="text-sm font-medium">{PRESETS[preset].stats.size}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Security</div>
              <div className={`text-sm font-medium ${PRESETS[preset].color}`}>{PRESETS[preset].stats.security}</div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1">Input Code</label>
          <textarea
            value={inputCode}
            onChange={(e) => {
              setInputCode(e.target.value);
              if (showResult) setShowResult(false); // Hide result if user edits code
            }}
            placeholder={placeholderText}
            className="w-full h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-4 font-mono text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-700 resize-none"
            spellCheck={false}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleObfuscate}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-[0.99] shadow-lg shadow-indigo-900/20"
        >
          Obfuscate Code
        </button>

        {/* Output Area - Conditionally Rendered */}
        {showResult && (
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-500">Obfuscated Result</label>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {isCopied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
            <div className="relative group">
              <textarea
                readOnly
                value={outputCode}
                className="w-full h-48 bg-neutral-950 border border-emerald-900/30 rounded-xl p-4 font-mono text-sm text-emerald-100/80 outline-none resize-none focus:ring-1 focus:ring-emerald-500/50"
              />
              {/* Visual glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
