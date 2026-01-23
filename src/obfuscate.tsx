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

/**
 * Handles preset logic and custom setting overrides.
 *[span_2](end_span)
 */
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
    
    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    
    const isPlus = settings.antiTamperPlus;
    const antiTamperSource = (isPlus || settings.antiTamper) ? `(function() ${getAntiTamper(vVM, vReg, preset)} end)();` : "";
    const tamperPlusLoop = isPlus ? "\nwhile task.wait(2) do end" : "";
    
    const fullSource = `${antiTamperSource}\n${deadCode1}\n${tamperPlusLoop}\n${userCode}`;
    let finalContent = "";
    
    if (settings.vmCompiler) {
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource);
        let vmCode = generateVM(bytecode);
        finalContent = `local ${vVM} = ...; local pcall, unpack = ${vVM}.pcall, ${vVM}.unpack; ${vmCode.replace(/getfenv\(\)/g, vVM)}`;
    } else { 
        finalContent = fullSource; 
    }
    const coreExecution = `setfenv(${vReg}[1], ${vVM}) local success, err = pcall(${vReg}[1], ${vVM}) if not success and err then warn("Vexile Fatal: " .. tostring(err)) end`;
    
    return `--[[ Protected with Vexile v1.0 ]]
${isPlus ? "task.defer(function()" : "(function()"}
    ${parserBomb}
    local ${vReg}, ${vVM} = {}, {}
    local function bridge()
        local env, globals = getfenv(0), (typeof and getgenv and getgenv()) or _G or {}
        for k, v in pairs(globals) do ${vVM}[k] = v end
        for k, v in pairs(env) do ${vVM}[k] = v end
        ${vVM}["table"], ${vVM}["task"], ${vVM}["debug"] = table or globals.table, task or globals.task, debug or globals.debug
        ${vVM}["unpack"] = unpack or (table and table.unpack) or globals.unpack
        ${vVM}["bit32"], ${vVM}["getfenv"], ${vVM}["setfenv"] = bit32 or globals.bit32, getfenv or env.getfenv, setfenv or env.setfenv
        ${vVM}["pairs"], ${vVM}["string"], ${vVM}["setmetatable"] = pairs or globals.pairs, string or globals.string, setmetatable or globals.setmetatable
        ${vVM}["type"], ${vVM}["typeof"], ${vVM}["print"] = type, typeof, print or globals.print
        ${vVM}["warn"], ${vVM}["tostring"], ${vVM}["pcall"], ${vVM}["error"] = warn or globals.warn, tostring or globals.tostring, pcall or globals.pcall, error or globals.error
        ${vVM}["${vVM}"] = ${vVM}
    end
    bridge()
    ${vReg}[1] = function(...) ${finalContent} end
    ${coreExecution}
${isPlus ? "end)" : "end)()"}
`.trim();
}