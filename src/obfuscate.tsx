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
    return { stringEncryption: false, antiTamper: true, deadCode: true, vmCompiler: true, parserBomb: false };
}

export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    
    let userCode = code.replace(/--.*$/gm, "").trim();
    const vReg = genVar(12);
    const vVM = genVar(12); 
    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";

    const antiTamperSource = settings.antiTamper ? getAntiTamper(vVM, vReg) : "";
    const fullSource = `${antiTamperSource}\n${userCode}`;

    let vmScript = "";
    if (settings.vmCompiler) {
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource);
        vmScript = generateVM(bytecode);
    } else {
        // Fallback if VM is off
        vmScript = fullSource;
    }

    // 5. Build Final Protected Script
    return `--[[ Protected with Vexile v3.0.0 ]]
(function()
    ${parserBomb}
    ${deadCode1}
    
    local ${vReg} = {}
    local ${vVM} = {}

    local real = getfenv(0)
    for k, v in pairs(getgenv()) do ${vVM}[k] = v end
    for k, v in pairs(real) do ${vVM}[k] = v end

    ${vReg}[1] = function()
        ${vmScript}
    end
    
    setfenv(${vReg}[1], ${vVM})
    local success, err = pcall(${vReg}[1])
    
    if not success and err then 
        warn("Vexile Fatal: " .. tostring(err)) 
    end
end)()`.trim();
}
