import { Compiler } from './lua/compiler';
import { generateVM } from './lua/vm';
import { getDeadCode } from './lua/controlflow';
import { getParserBomb, getAntiTamper, genVar } from './lua/antitamper';

export interface ObfuscationSettings {
    stringEncryption: boolean;
    antiTamper: boolean;
    antiTamperPlus: boolean; // New setting
    deadCode: boolean;
    vmCompiler: boolean;
    parserBomb: boolean;
}

// Updated settings logic: antiTamperPlus overrides standard antiTamper if both are on
function getSettings(preset: string, custom: ObfuscationSettings): ObfuscationSettings {
    if (preset === 'Custom') return custom;
    if (preset === 'High') return { stringEncryption: true, antiTamper: true, antiTamperPlus: false, deadCode: true, vmCompiler: true, parserBomb: true };
    return { stringEncryption: false, antiTamper: true, antiTamperPlus: false, deadCode: true, vmCompiler: true, parserBomb: true };
}

export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    let userCode = code.replace(/--.*$/gm, "").trim();
    
    const vReg = genVar(12);
    const vVM = genVar(12);

    // 1. Generate Security Layers
    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    
    // antiTamperPlus overrides standard antiTamper logic
    const isPlus = settings.antiTamperPlus;
    const antiTamperSource = (isPlus || settings.antiTamper) ? getAntiTamper(vVM, vReg, preset) : "";

    // 2. Build the Source
    // Logic: [Anti-Tamper] -> [Dead Code] -> [Plus Infinite Loop] -> [User Code]
    const tamperPlusLoop = isPlus ? "\nwhile task.wait(2) do end" : "";
    const fullSource = `${antiTamperSource}\n${deadCode1}\n${tamperPlusLoop}\n${userCode}`;

    let finalContent = "";
    if (settings.vmCompiler) {
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource);
        finalContent = generateVM(bytecode);
    } else {
        finalContent = fullSource;
    }

    const innerExecution = `
    local function execute()
        local success, err = pcall(${vReg}[1])
        if not success and err then 
            warn("Vexile Fatal: " .. tostring(err)) 
        end
    end
    ${isPlus ? "task.defer(execute)" : "execute()"}
    `.trim();

    return `--[[ Protected with Vexile v3.0.0 ]]
(function()
    ${parserBomb}
    
    local ${vReg} = {}
    local ${vVM} = {}
    
    local function bridge()
        local env = getfenv(0)
        local globals = (typeof and getgenv and getgenv()) or _G or {}
        for k, v in pairs(globals) do ${vVM}[k] = v end
        for k, v in pairs(env) do ${vVM}[k] = v end
        
        ${vVM}["getfenv"] = getfenv or env.getfenv
        ${vVM}["setfenv"] = setfenv or env.setfenv
        ${vVM}["pairs"] = pairs or globals.pairs
        ${vVM}["bit32"] = bit32 or globals.bit32
        ${vVM}["string"] = string or globals.string
        ${vVM}["setmetatable"] = setmetatable or globals.setmetatable

        ${vVM}["${vVM}"] = ${vVM}
    end
    bridge()

    ${vReg}[1] = function()
        ${finalContent}
    end
    
    setfenv(${vReg}[1], ${vVM})
    ${innerExecution}
end)()`.trim();
}