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

    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    const antiTamperSource = settings.antiTamper ? getAntiTamper(vVM, vReg) : "";

    const fullSource = `${antiTamperSource}\n${userCode}`;

    let finalContent = "";
    if (settings.vmCompiler) {
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource);
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
        
        if not ${vVM}.task then
            ${vVM}.task = {
                wait = function() end,
                defer = function(f) f() end,
                spawn = function(f) f() end
            }
        end

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