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
    return { stringEncryption: true, antiTamper: true, deadCode: false, vmCompiler: true, parserBomb: false };
}

export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    
    let processedCode = code.replace(/--.*$/gm, "").trim();

    let vmScript = "";
    if (settings.vmCompiler) {
        // Pass the settings into the compiler instance
        const compiler = new Compiler(settings); 
        const bytecode = compiler.compile(processedCode);
        vmScript = generateVM(bytecode);
    } else {
        vmScript = processedCode;
    }

    const vReg = genVar(8);
    const vVM = genVar(8);
    
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const antiTamper = settings.antiTamper ? getAntiTamper(vVM, vReg) : "";

    return `--[[ Protected with Vexile v3.0.0 ]]\n(function()
    ${parserBomb}
    ${deadCode1}
    local ${vReg} = {}
    local ${vVM} = {}
    ${antiTamper}
    ${vReg}[1] = function()
        ${vmScript}
    end
    setfenv(${vReg}[1], ${vVM})
    local success, err = pcall(${vReg}[1])
    if not success and err then print("Vexile Error: " .. tostring(err)) end
end)()`.trim();
}
