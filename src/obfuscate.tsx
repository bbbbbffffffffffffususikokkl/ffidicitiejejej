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
    let userCode = code.replace(/--.*$/gm, "").trim();
    const vReg = genVar(12);
    const vVM = genVar(12);
    const antiTamperCode = settings.antiTamper ? getAntiTamper(vVM, vReg) : "";
    const fullSource = `${antiTamperCode}\n${userCode}`;

    const compiler = new Compiler(settings);
    const bytecode = compiler.compile(fullSource);
    const vmScript = generateVM(bytecode);

    return `--[[ Protected with Vexile v3.0.0 ]]\n(function()
    local ${vReg} = {}
    local ${vVM} = {}
    
    for k, v in pairs(getgenv()) do ${vVM}[k] = v end
    for k, v in pairs(getfenv(0)) do ${vVM}[k] = v end

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