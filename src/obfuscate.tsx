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

        finalContent = `
        local ${vVM} = ...;
        local pcall, unpack = ${vVM}.pcall, ${vVM}.unpack;
        ${vmCode.replace(/getfenv\(\)/g, vVM)}
        `.trim();
    } else {
        finalContent = fullSource;
    }

    const coreExecution = `
    setfenv(${vReg}[1], ${vVM})
    local success, err = pcall(${vReg}[1], ${vVM})
    if not success and err then 
        warn("Vexile VM Fatal: " .. tostring(err)) 
    end
    `.trim();
    
    return `--[[ Protected with Vexile v3.0.0 ]]
${isPlus ? "task.defer(function()" : "(function()"}
    ${parserBomb}
    local ${vReg} = {}
    local ${vVM} = {}
    
    local function bridge()
        local env = getfenv(0)
        local globals = (typeof and getgenv and getgenv()) or _G or {}
        
        for k, v in pairs(globals) do ${vVM}[k] = v end
        for k, v in pairs(env) do ${vVM}[k] = v end
        
        ${vVM}["table"] = table or globals.table
        ${vVM}["unpack"] = unpack or (table and table.unpack) or globals.unpack
        ${vVM}["task"] = task or globals.task
        ${vVM}["bit32"] = bit32 or globals.bit32
        ${vVM}["getfenv"] = getfenv or env.getfenv
        ${vVM}["setfenv"] = setfenv or env.setfenv
        ${vVM}["pairs"] = pairs or globals.pairs
        ${vVM}["string"] = string or globals.string
        ${vVM}["setmetatable"] = setmetatable or globals.setmetatable
        ${vVM}["type"] = type
        ${vVM}["typeof"] = typeof
        ${vVM}["print"] = print or globals.print
        ${vVM}["warn"] = warn or globals.warn
        ${vVM}["tostring"] = tostring or globals.tostring
        ${vVM}["pcall"] = pcall or globals.pcall
        ${vVM}["error"] = error or globals.error

        ${vVM}["${vVM}"] = ${vVM}
    end
    bridge()

    ${vReg}[1] = function(...)
        ${finalContent}
    end
    
    ${coreExecution}
${isPlus ? "end)" : "end)()"}
`.trim();
}