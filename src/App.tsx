import { useState, useRef } from 'react';
import { Shield, Sword, Zap, Copy, Check, Download, Upload, Settings } from 'lucide-react'; 
import { obfuscateCode } from './obfuscate';

const PRESETS = {
  Test: {
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    description: "Testing obfuscations without anti-tampers.",
    stats: { time: "Very Fast (1ms~)", size: "200%", security: "Unknown" },
    color: "text-emerald-400"
  },
  High: {
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    description: "Best obfuscation for maximum security. Best for sensitive scripts.",
    stats: { time: "Very Fast (<100ms)", size: "2750-3000%", security: "High" },
    color: "text-emerald-400"
  },
  Medium: {
    icon: <Sword className="w-5 h-5 text-amber-400" />,
    description: "Moderate obfuscation with good performance. Recommended for most users.",
    stats: { time: "Very Fast (<100ms)", size: "1500-2000%", security: "Medium" },
    color: "text-amber-400"
  },
  Fast: {
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    description: "Minimal obfuscation for fast processing. Ideal for testing and development.",
    stats: { time: "Very Fast (<100ms)", size: "800-1000%", security: "Low" },
    color: "text-blue-400"
  },
  Custom: {
    icon: <Settings className="w-5 h-5 text-indigo-400" />,
    description: "Configure individual protection layers manually.",
    stats: { time: "Very Fast (<100ms)", size: "Depends", security: "Depends" },
    color: "text-indigo-400"
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
  
  const [customSettings, setCustomSettings] = useState({
    stringEncryption: true,
    antiTamper: true,
    antiTamperPlus: false,
    deadCode: true,
    vmCompiler: true,
    parserBomb: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholderText = engine === "LuaU" 
    ? 'print("Hello, World!")' 
    : 'console.log("Hello, World!")';

  const toggleSetting = (key: keyof typeof customSettings) => {
    setCustomSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleObfuscate = () => {
    if (!inputCode) return;
    setTimeout(() => {
        try {
            const result = obfuscateCode(inputCode, engine, preset, customSettings);
            setOutputCode(result); 
            setShowResult(true);
        } catch (e) {
            alert("Error obfuscating: " + e);
        }
    }, 10); 
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!outputCode) return;
    const blob = new Blob([outputCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'obfuscated.lua';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setInputCode(text);
        if (showResult) setShowResult(false);
      }
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 flex flex-col items-center font-sans selection:bg-indigo-500/30">
      
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1">Protection Preset</label>
            <div className="relative">
              <select 
                value={preset}
                onChange={(e) => setPreset(e.target.value as PresetType)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:border-neutral-700 transition-colors"
              >
                <option value="Test">🔥 Test</option>
                <option value="High">🛡️ High</option>
                <option value="Medium">🗡️ Medium</option>
                <option value="Fast">⚡️ Fast</option>
                <option value="Custom">⚙️ Custom</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-3 mb-3">
            {PRESETS[preset].icon}
            <h3 className={`font-bold ${PRESETS[preset].color}`}>{preset} Protection</h3>
          </div>

          {preset === 'Custom' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              {[
                { id: 'stringEncryption', label: 'String Encryption' },
                { id: 'antiTamper', label: 'Anti Tamper' },
                { id: 'antiTamperPlus', label: 'Anti Tamper+' },
                { id: 'deadCode', label: 'Dead Code' },
                { id: 'vmCompiler', label: 'Virtual Machine Compiler' },
                { id: 'parserBomb', label: 'Parser Bomb' },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                  <div 
                    onClick={() => toggleSetting(item.id as keyof typeof customSettings)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      customSettings[item.id as keyof typeof customSettings] 
                        ? 'bg-indigo-600 border-indigo-500' 
                        : 'border-neutral-700 bg-neutral-800'
                    }`}
                  >
                    {customSettings[item.id as keyof typeof customSettings] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">{item.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
             <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Input Code</label>
             
             <input 
               type="file" 
               ref={fileInputRef}
               onChange={handleFileUpload}
               className="hidden"
               accept=".lua,.txt,.js"
             />
             
             <button 
                onClick={triggerFileUpload}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-indigo-400 transition-colors"
             >
                <Upload className="w-3 h-3" />
                Upload File
             </button>
          </div>
          
          <textarea
            value={inputCode}
            onChange={(e) => {
              setInputCode(e.target.value);
              if (showResult) setShowResult(false);
            }}
            placeholder={placeholderText}
            className="w-full h-48 bg-neutral-900 border border-neutral-800 rounded-xl p-4 font-mono text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-700 resize-none"
            spellCheck={false}
          />
        </div>

        <button
          onClick={handleObfuscate}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-[0.99] shadow-lg shadow-indigo-900/20"
        >
          Obfuscate Code
        </button>

        {showResult && (
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-500">Obfuscated Result</label>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-indigo-400 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download File
                </button>

                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {isCopied ? "Copied!" : "Copy to Clipboard"}
                </button>
              </div>

            </div>
            <div className="relative group">
              <textarea
                readOnly
                value={outputCode}
                className="w-full h-48 bg-neutral-950 border border-emerald-900/30 rounded-xl p-4 font-mono text-sm text-emerald-100/80 outline-none resize-none focus:ring-1 focus:ring-emerald-500/50"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
