import { useState, useRef } from 'react';
import { Shield, Sword, Zap, Copy, Check, Download, Upload, Settings } from 'lucide-react'; 
import { obfuscateCode } from './obfuscate';

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
    description: "Minimal obfuscation for fast processing. Ideal for development.",
    stats: { time: "Very Fast (<100ms)", size: "10-20%", security: "Low" },
    color: "text-blue-400"
  },
  Custom: {
    icon: <Settings className="w-5 h-5 text-indigo-400" />,
    description: "Configure individual protection layers manually.",
    stats: { time: "Variable", size: "Variable", security: "Custom" },
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

  // Custom Settings State
  const [customSettings, setCustomSettings] = useState({
    stringEncryption: true,
    antiTamper: true,
    deadCode: true,
    vmCompiler: true,
  });

  const toggleSetting = (key: keyof typeof customSettings) => {
    setCustomSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleObfuscate = () => {
    if (!inputCode) return;
    setTimeout(() => {
      try {
        // Pass either the preset name or the custom settings object
        const result = obfuscateCode(inputCode, engine, preset, customSettings);
        setOutputCode(result); 
        setShowResult(true);
      } catch (e) {
        alert("Error obfuscating: " + e);
      }
    }, 10); 
  };

  // Rest of handlers (handleCopy, handleDownload, etc.) same as before...

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 flex flex-col items-center font-sans selection:bg-indigo-500/30">
      {/* Header same as before... */}
      
      <div className="w-full max-w-3xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Engine Select same as before... */}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1">Protection Preset</label>
            <div className="relative">
              <select 
                value={preset}
                onChange={(e) => setPreset(e.target.value as PresetType)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:border-neutral-700 transition-colors"
              >
                <option value="High">🛡️ High</option>
                <option value="Medium">🗡️ Medium</option>
                <option value="Fast">⚡️ Fast</option>
                <option value="Custom">⚙️ Custom</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
            </div>
          </div>
        </div>

        {/* Preset Description / Custom Settings Panel */}
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
                { id: 'deadCode', label: 'Dead Code' },
                { id: 'vmCompiler', label: 'Virtual Machine Compiler' },
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
            <p className="text-neutral-400 text-sm mb-4">{PRESETS[preset].description}</p>
          )}

          {preset !== 'Custom' && (
            <div className="grid grid-cols-3 gap-4 border-t border-neutral-800 pt-4">
              {/* Stats same as before... */}
            </div>
          )}
        </div>

        {/* Action Button & Areas same as before... */}
      </div>
    </div>
  );
}
