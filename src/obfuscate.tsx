import { Compiler } from './lua/compiler';
import { generateVM } from './lua/vm';
import { getDeadCode } from './lua/controlflow';
import { getParserBomb, getAntiTamper, genVar } from './lua/antitamper';

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
    if (preset === 'High') return { stringEncryption: true, antiTamper: true, antiTamperPlus: true, deadCode: true, vmCompiler: true, parserBomb: true };
    return { stringEncryption: false, antiTamper: true, antiTamperPlus: false, deadCode: true, vmCompiler: true, parserBomb: true };
}

export function obfuscateCode(code: string, engine: string, preset: string, customSettings: ObfuscationSettings): string {
    const settings = getSettings(preset, customSettings);
    let userCode = code.replace(/--.*$/gm, "").trim();
    
    const vReg = genVar(12);
    const vVM = genVar(12);

    const deadCode1 = settings.deadCode ? getDeadCode(preset) : "";
    const parserBomb = settings.parserBomb ? getParserBomb(preset) : "";
    const isPlus = settings.antiTamperPlus;
    const antiTamperSource = (isPlus || settings.antiTamper) ? getAntiTamper(vVM, vReg, preset) : "";

    const tamperPlusLoop = isPlus ? "\nwhile task.wait(2) do end" : "";
    const fullSource = `${antiTamperSource}\n${deadCode1}\n${tamperPlusLoop}\n${userCode}`;

    let finalContent = "";
    if (settings.vmCompiler) {
        const compiler = new Compiler(settings);
        const bytecode = compiler.compile(fullSource);
        let vmCode = generateVM(bytecode);

        // We use standard 'pcall' and 'unpack' without underscores
        // We replace getfenv() with the bridge table variable directly
        finalContent = `
        local pcall, unpack = pcall, table.unpack or unpack;
        ${vmCode.replace(/getfenv\(\)/g, vVM)}
        `.trim();
    } else {
        finalContent = fullSource;
    }

    // Fixed the execution wrapper to handle the function reference correctly
    const innerExecution = `
    local function execute()
        local success, err = pcall(${vReg}[1])
        if not success and err then 
            warn("Vexile Fatal: " .. tostring(err)) 
        end
    end
    if task and task.defer and ${isPlus ? "true" : "false"} then
        task.defer(execute)
    else
        execute()
    end
    `.trim();

    return `--[[ Protected with Vexile v3.0.0 ]]
(function()
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

    ${vReg}[1] = function()
        ${finalContent}
    end
    
    setfenv(${vReg}[1], ${vVM})
    ${innerExecution}
end)()`.trim();
}