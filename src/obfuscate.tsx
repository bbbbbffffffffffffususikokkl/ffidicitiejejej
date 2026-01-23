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

export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    
    // 1. Clean the source code
    let userCode = code.replace(/--.*$/gm, "").trim();

    // 2. Generate security variable names
    const vReg = genVar(12);
    const vVM = genVar(12);

    // 3. Generate Security Layers based on settings
    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    
    // Anti-Tamper is generated to be bundled with user code
    const antiTamperSource = settings.antiTamper ? getAntiTamper(vVM, vReg) : "";

    // 4. Merge Anti-Tamper with User Code
    const fullSource = `${antiTamperSource}\n${userCode}`;

    let finalContent = "";
    if (settings.vmCompiler) {
        // Path A: Compile combined source into virtualized bytecode
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource);
        finalContent = generateVM(bytecode);
    } else {
        // Path B: Keep as raw Luau source but wrapped for environment protection
        finalContent = fullSource;
    }

    // 5. Final Assembly of the protected wrapper
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
