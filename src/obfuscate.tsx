import { VexileCompiler } from './compile';

type EngineType = "LuaU" | "JavaScript (MCBE)";

function genVar(): string {
  // Generate random variable names
  const hex = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let res = "";
  for (let i = 0; i < 8; i++) res += hex[Math.floor(Math.random() * hex.length)];
  return res;
}

function obfNum(n: number): string {
  // Polymorphic number generation
  const type = Math.floor(Math.random() * 3);
  if (type === 0) return `0x${n.toString(16)}`; 
  if (type === 1) { 
      const p1 = Math.floor(Math.random() * n);
      return `(${p1}+${n - p1})`; 
  }
  return `(${n})`; 
}

function hideString(str: string, charFuncVar: string): string {
  let args = [];
  for(let i=0; i<str.length; i++) args.push(obfNum(str.charCodeAt(i)));
  return `${charFuncVar}(${args.join(',')})`;
}

function cleanLuaU(code: string): string {
    return code
        // [FIX] REMOVE EM-DASH AND COMMENTS TO PREVENT <eof> ERRORS
        .replace(/—.*$/gm, "") 
        .replace(/--.*$/gm, "")
        
        // Auto-fix common issues
        .replace(/:\s*GetService\s*\(\s*(["'])([^"']+)\1\s*\)/g, '["$2"]')
        .replace(/:\s*HttpGet\s*\(\s*(["'])([^"']+)\1\s*\)/g, '["$2"]')
        
        // Syntax cleaners
        .replace(/([a-zA-Z0-9_\]])\s*\+=\s*([^;\r\n]+)/g, "$1 = $1 + ($2)")
        .replace(/\bcontinue\b/g, " ")
        .replace(/export\s+type\s+[a-zA-Z0-9_]+\s*=.+$/gm, "") 
        .replace(/^\s*[\r\n]/gm, "");
}

function getDeadCode(preset: string): string {
  if (preset === "Test") return "";
  
  let blocks = 2000
  if (preset == "Medium") blocks = 3000
  if (preset == "High") blocks = 4000
  let junk = "";
  const vTab = genVar();
  junk += `local ${vTab}={};`;
  
  for (let i = 0; i < blocks; i++) {
    const vIdx = genVar();
    const type = Math.floor(Math.random() * 3);
    if (type === 0) junk += `for ${vIdx}=1,${obfNum(Math.floor(Math.random() * 5) + 1)} do ${vTab}[${vIdx}]=${obfNum(i)}*${obfNum(2)} end; `;
    else junk += `${vTab}[${obfNum(i)}]=(${obfNum(i)}+${obfNum(1)})*${obfNum(3)}; `;
  }
  return junk;
}

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";
  if (!isLua) return "-- Vexile currently only supports LuaU.";

  // 1. Clean Code
  let processedCode = cleanLuaU(code);
  processedCode = processedCode.split('\n').map(l => l.trim()).filter(l => l).join(' ');

  // 2. Metamorphic Variable Names
  const varNames = {
      bytecode: genVar(), stack: genVar(), ip: genVar(),
      env: genVar(), null: genVar(), k: genVar(), ops: genVar()
  };

  // 3. Compile
  let vmScript = "";
  try {
      const compiler = new VexileCompiler();
      vmScript = compiler.compile(processedCode, { varNames });
  } catch (e: any) {
      return `error("Vexile Error: ${e.message.replace(/"/g, "'")}")`;
  }

  // 4. Security Modules
  const vReg = genVar(); 
  const vVM = genVar();
  const IDX_STRING = 1;
  const IDX_CHAR = 2;
  const IDX_DEBUG = 7;
  const IDX_GETINFO = 8;
  const IDX_TASK = 9;
  const IDX_CRASH = 12;
  const IDX_MAIN = 13;

  const strWhat = hideString("what", `${vReg}[${IDX_CHAR}]`);
  const strC = hideString("C", `${vReg}[${IDX_CHAR}]`); 
  const strWait = hideString("wait", `${vReg}[${IDX_CHAR}]`);
  const strCheckIndex = hideString("CHECK_INDEX", `${vReg}[${IDX_CHAR}]`);
  
  let crashLogic = `function() while true do end end`; 
  if (preset === "Test") crashLogic = `function() end`;

  let parserBomb = "";
  if (preset === "High" || preset === "Medium") {
     const bombDepth = preset === "High" ? 150 : 50; 
     let bombStr = `0x${Math.floor(Math.random() * 10000).toString(16)}`;
     for (let i = 0; i < bombDepth; i++) {
        if (Math.random() > 0.5) bombStr = `(${bombStr}+${obfNum(Math.floor(Math.random() * 100))})`;
        else bombStr = `(${obfNum(Math.floor(Math.random() * 100))}+${bombStr})`;
     }
     parserBomb = `local ${genVar()}=${bombStr};`;
  }

  // Anti-Tamper Metatable
  let vmMetatable = "";
  if (preset !== "Test") {
      vmMetatable = `
        setmetatable(${vVM}, {
          __index = function(t, k)
            if k == "game" or k == "Enum" or k == "math" or k == "table" or k == "string" then return getfenv(0)[k] end
            if k == ${obfNum(1)} then
               if (getfenv and getfenv()[${strCheckIndex}]) then ${vReg}[${IDX_CRASH}]() end;
               return ${obfNum(2)};
            elseif k == ${obfNum(2)} then
               if (${vReg}[${IDX_GETINFO}](${vReg}[${IDX_TASK}][${strWait}])[${strWhat}] ~= ${strC}) then ${vReg}[${IDX_CRASH}]() end;
               return ${obfNum(0)};
            end
            return getfenv(0)[k];
          end,
          __newindex = function(t, k, v) getfenv(0)[k] = v; end,
          __metatable = "Locked"
        })
      `;
  } else {
      vmMetatable = `setmetatable(${vVM}, { __index = function(t,k) return getfenv(0)[k] end })`;
  }

  const deadBlock1 = getDeadCode(preset);
  const deadBlock2 = getDeadCode(preset);
  
  const watermark = `--[[ Protected with Vexile v2.0 (Polymorphic) ]]`;

  let rawScript = `
    (function()
      ${parserBomb}
      local ${vReg} = {}
      ${vReg}[${IDX_STRING}] = string;
      ${vReg}[${IDX_CHAR}] = ${vReg}[${IDX_STRING}].char;
      ${vReg}[${IDX_DEBUG}] = debug;
      ${vReg}[${IDX_GETINFO}] = ${vReg}[${IDX_DEBUG}].getinfo;
      ${vReg}[${IDX_TASK}] = task;
      ${vReg}[${IDX_CRASH}] = ${crashLogic};

      ${deadBlock1}

      local ${vVM} = {}
      ${vmMetatable}
      
      if ${vVM}[${obfNum(1)}] == ${obfNum(1)} then end

      ${deadBlock2}

      ${vReg}[${IDX_MAIN}] = function()
         ${vmScript}
      end;

      setfenv(${vReg}[${IDX_MAIN}], ${vVM});
      
      local s, e = pcall(${vReg}[${IDX_MAIN}])
      if not s then 
      end
    end)()
  `;
  
  return `${watermark}\n${rawScript}`;
  // .replace(/\n/g, ' ').replace(/\s+/g, ' ')
}
