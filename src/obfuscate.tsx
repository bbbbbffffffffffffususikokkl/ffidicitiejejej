import { Compiler } from './lua/compiler';
import { generateVM } from './lua/vm';
import { getDeadCode } from './lua/controlflow';
import { getParserBomb, getAntiTamper, genVar } from './lua/antitamper';

type EngineType = "LuaU" | "JavaScript (MCBE)";

function preProcess(source: string): string {
    return source
        .replace(/—/g, "--")
        .replace(/--.*$/gm, "")
        .replace(/:\s*GetService\s*\(\s*(["'])([^"']+)\1\s*\)/g, '["$2"]')
        .replace(/:\s*HttpGet\s*\(\s*(["'])([^"']+)\1\s*\)/g, '["$2"]')
        .replace(/^\s*[\r\n]/gm, "");
}

export function obfuscateCode(source: string, engine: EngineType, preset: string): string {
    if (engine !== "LuaU") return "";
    if (!source || source.trim().length === 0) return "";

    const cleanSource = preProcess(source);

    let vmScript = "";
    try {
        const compiler = new Compiler();
        const bytecode = compiler.compile(cleanSource);
        vmScript = generateVM(bytecode);
    } catch (e: any) {
        return "";
    }

    const vReg = genVar(8);
    const vVM = genVar(8);
    
    const deadCode1 = getDeadCode(preset);
    const deadCode2 = getDeadCode(preset);
    const parserBomb = getParserBomb(preset);
    const antiTamper = getAntiTamper(vVM, vReg);

    const watermark = `--[[ Protected with Vexile 1.0 ]]\n`;

    return `${watermark}
    (function()
    ${parserBomb}
    ${deadCode1}
    
    local ${vReg} = {}
    local ${vVM} = {}
    
    ${antiTamper}
    
    ${vReg}[1] = function()
        ${vmScript}
    end
    
    ${deadCode2}
    
    setfenv(${vReg}[1], ${vVM})
    local success, err = pcall(${vReg}[1])
end)()
    `.trim();
}
