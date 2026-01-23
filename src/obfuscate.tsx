import { Compiler } from './lua/compiler';
import { generateVM } from './lua/vm';
import { getDeadCode } from './lua/controlflow';
import { getParserBomb, getAntiTamper, genVar } from './lua/antitamper';

export interface ObfuscationSettings {
    stringEncryption: boolean;
    antiTamper: boolean;
    deadCode: boolean;
    vmCompiler: boolean;
    parserBomb: boolean;
}

function getSettings(preset: string, custom: ObfuscationSettings): ObfuscationSettings {
    if (preset === 'Custom') return custom;
    if (preset === 'High') return { stringEncryption: true, antiTamper: true, deadCode: true, vmCompiler: true, parserBomb: true };
    if (preset === 'Medium') return { stringEncryption: true, antiTamper: true, deadCode: true, vmCompiler: true, parserBomb: false };
    // Fixed logic for standard/low preset
    return { stringEncryption: true, antiTamper: true, deadCode: false, vmCompiler: true, parserBomb: false };
}
// Obfuscate.tsx
export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    let userCode = code.replace(/--.*$/gm, "").trim();
    
    // Generate the variable names
    const vReg = genVar(12);
    const vVM = genVar(12);

    // 1. Generate Security Layers
    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    
    // Pass the actual variable name of the environment table to the Anti-Tamper
    const antiTamperSource = settings.antiTamper ? getAntiTamper(vVM, vReg) : "";

    const fullSource = `${antiTamperSource}\n${userCode}`;

    let finalContent = "";
    if (settings.vmCompiler) {
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource); // Anti-tamper is virtualized here
        finalContent = generateVM(bytecode);
    } else {
        finalContent = fullSource;
    }

    return `--[[ Protected with Vexile v3.0.0 ]]
(function()
    ${parserBomb}
    ${deadCode1}
    
    local ${vReg} = {}
    local ${vVM} = {}
    
    local function bridge()
        local env = getfenv(0)
        local globals = (typeof and getgenv and getgenv()) or _G or {}
        for k, v in pairs(globals) do ${vVM}[k] = v end
        for k, v in pairs(env) do ${vVM}[k] = v end

        ${vVM}["${vVM}"] = ${vVM}
    end
    bridge()

    ${vReg}[1] = function()
        ${finalContent}
    end
    
    setfenv(${vReg}[1], ${vVM})
    local success, err = pcall(${vReg}[1])
    
    if not success and err then 
        warn("Vexile Fatal: " .. tostring(err)) 
    end
end)()`.trim();
}