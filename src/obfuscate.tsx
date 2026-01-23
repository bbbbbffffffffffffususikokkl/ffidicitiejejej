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
    // Standard/Low preset
    return { stringEncryption: true, antiTamper: true, deadCode: false, vmCompiler: true, parserBomb: false };
}

/**
 * Main obfuscation entry point for Vexile.
 * Integrates multi-layer security: Parser Bombs, Dead Code, and VM Virtualization.
 */
export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    
    // 1. Clean the source: Remove comments to prevent leakage of logic
    let userCode = code.replace(/--.*$/gm, "").trim();
    
    // 2. Generate randomized variable names for the register and environment tables
    const vReg = genVar(12);
    const vVM = genVar(12);

    // 3. Generate Security Layers based on user settings
    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    
    // The Anti-Tamper source is generated to be bundled with the user code
    const antiTamperSource = settings.antiTamper ? getAntiTamper(vVM, vReg) : "";

    // 4. Combine Anti-Tamper and User Code
    // Placing Anti-Tamper at the top ensures it runs before the main script logic
    const fullSource = `${antiTamperSource}\n${userCode}`;

    let finalContent = "";
    if (settings.vmCompiler) {
        // Path A: Virtualization
        // Code is compiled into custom bytecode and run through the Vexile VM
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource); 
        finalContent = generateVM(bytecode);
    } else {
        // Path B: Basic Obfuscation
        // Raw code is kept but remains wrapped in the environment-protected closure
        finalContent = fullSource;
    }

    // 5. Final Assembly
    // Assembly includes the bridge logic to connect the isolated VM to Roblox globals
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
