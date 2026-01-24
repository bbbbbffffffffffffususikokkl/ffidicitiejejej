import { Compiler } from './lua/compiler';
import { generateVM } from './lua/vm';
import { getDeadCode } from './lua/controlflow';
import { getParserBomb, getAntiTamper, genVar } from './lua/antitamper';

/**
 * Interface defining the available protection layers.
 * [span_2](start_span)
 */
export interface ObfuscationSettings {
    stringEncryption: boolean;
    antiTamper: boolean;
    antiTamperPlus: boolean;
    deadCode: boolean;
    vmCompiler: boolean;
    parserBomb: boolean;
}

function getSettings(preset: string, custom: ObfuscationSettings): ObfuscationSettings {
    if (preset === 'Custom') return custom;
    if (preset === 'High') {
        return { 
            stringEncryption: true, 
            antiTamper: true, 
            antiTamperPlus: false, 
            deadCode: true, 
            vmCompiler: true, 
            parserBomb: true 
        };
    }
    // Default / Medium preset logic
    if (preset === 'Medium') {
        return { 
            stringEncryption: true, 
            antiTamper: true, 
            antiTamperPlus: false, 
            deadCode: true, 
            vmCompiler: true, 
            parserBomb: true 
        };
    }
    return { 
        stringEncryption: false, 
        antiTamper: true, 
        antiTamperPlus: false, 
        deadCode: true, 
        vmCompiler: true, 
        parserBomb: false 
    };
}
export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    let userCode = code.replace(/--.*$/gm, "").trim();
    
    const vReg = genVar(12);
    const vVM = genVar(12);

    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    const deadCode = settings.deadCode ? getDeadCode(preset) : "";
    
    const isPlus = settings.antiTamperPlus;
    const antiTamperSource = (isPlus || settings.antiTamper) ? `(function() ${getAntiTamper(vVM, vReg, preset)} end)();` : "";
    const tamperPlusLoop = isPlus ? "while task.wait(2) do end" : "";
    
    const fullSource = `${antiTamperSource}\n${deadCode}\n${tamperPlusLoop}\n${userCode}`;

    let finalContent = "";
    if (settings.vmCompiler) {
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource);
        let vmCode = generateVM(bytecode);
        
        finalContent = `
            local ${vVM} = ...;
            local pcall, unpack = ${vVM}.pcall, ${vVM}.unpack;
            setfenv(1, ${vVM});
            ${vmCode}
        `.trim();
    } else { 
        finalContent = fullSource; 
    }

    const coreExecution = `local success, err = pcall(${vReg}[1], ${vVM}) if not success then warn("Vexile Fatal: " .. tostring(err)) end`;

    return `--[[ Protected with Vexile v3.1.0 ]]
(function()
    ${parserBomb}
    local ${vReg}, ${vVM} = {}, {}
    local function bridge()
        local g = (typeof and getgenv and getgenv()) or _G or {}
        local e = getfenv(0)
        for k, v in pairs(g) do ${vVM}[k] = v end
        for k, v in pairs(e) do ${vVM}[k] = v end
        
        ${vVM}["pcall"] = pcall or g.pcall
        ${vVM}["unpack"] = unpack or (table and table.unpack) or g.unpack
        ${vVM}["debug"], ${vVM}["task"], ${vVM}["table"] = debug or g.debug, task or g.task, table or g.table
        ${vVM}["_G"] = g
    end
    bridge()
    ${vReg}[1] = function(...) ${finalContent} end
    ${coreExecution}
end)()`.trim();
}