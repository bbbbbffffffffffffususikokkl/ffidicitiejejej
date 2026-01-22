import { VexileCompiler } from './compile';

type EngineType = "LuaU" | "JavaScript (MCBE)";

// --- [HELPER FUNCTIONS] ---

function genVar(): string {
  // Metamorphic variable names (Length 6-8)
  const hex = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let res = "";
  const len = Math.floor(Math.random() * 3) + 6;
  for (let i = 0; i < len; i++) res += hex[Math.floor(Math.random() * hex.length)];
  return res;
}

function obfNum(n: number): string {
  // Metamorphic numbers: 10 -> (5 + 5) or 0xA or (20 / 2)
  const type = Math.floor(Math.random() * 3);
  if (type === 0) return `0x${n.toString(16)}`; 
  if (type === 1) { 
      const p1 = Math.floor(Math.random() * n);
      return `(${p1}+${n - p1})`; 
  }
  return `(${n})`; 
}

function hideString(str: string, charFuncVar: string): string {
  // Encrypts "Hello" -> string.char(72, 101, ...)
  let args = [];
  for(let i=0; i<str.length; i++) args.push(obfNum(str.charCodeAt(i)));
  return `${charFuncVar}(${args.join(',')})`;
}

function cleanLuaU(code: string): string {
    return code
        // Safe replacements only
        .replace(/:\s*GetService\s*\(\s*(["'])([^"']+)\1\s*\)/g, '["$2"]')
        .replace(/:\s*HttpGet\s*\(\s*(["'])([^"']+)\1\s*\)/g, '["$2"]')
        
        .replace(/([a-zA-Z0-9_\]])\s*\+=\s*([^;\r\n]+)/g, "$1 = $1 + ($2)")
        .replace(/([a-zA-Z0-9_\]])\s*\-=\s*([^;\r\n]+)/g, "$1 = $1 - ($2)")
        .replace(/\bcontinue\b/g, " ")
        .replace(/export\s+type\s+[a-zA-Z0-9_]+\s*=.+$/gm, "") 
        .replace(/type\s+[a-zA-Z0-9_]+\s*=.+$/gm, "")
        .replace(/^\s*[\r\n]/gm, "");
}

function getDeadCode(preset: string): string {
  if (preset === "Test" || preset === "Fast") return "";
  
  // Generates randomized junk logic
  let blocks = preset === "High" ? 30 : 10;
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

// --- [MAIN OBFUSCATOR] ---

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";
  if (!isLua) return "-- Vexile currently only supports LuaU.";

  // 1. Pre-Process
  let processedCode = code
      .replace(/--\[\[(?! This file is protected with Vexile)[\s\S]*?\]\]/g, "")
      .replace(/--(?![\[])(?!.*Vexile).*$/gm, "");
  
  processedCode = cleanLuaU(processedCode);
  processedCode = processedCode.split('\n').map(line => line.trim()).filter(l => l.length > 0).join(' ');

  // 2. Generate Random Variables (Metamorphism)
  const vReg = genVar(); 
  const vVM = genVar();
  const vOp = genVar(); // Not used directly in new VM, but good for junk
  const IDX_STRING = 1;
  const IDX_CHAR = 2;
  const IDX_DEBUG = 7;
  const IDX_GETINFO = 8;
  const IDX_TASK = 9;
  const IDX_CRASH = 12;
  const IDX_MAIN = 13;

  // 3. Compile Code using Polymorphic Engine
  const varNames = {
      bytecode: genVar(),
      stack: genVar(),
      ip: genVar(),
      env: genVar(),
      null: genVar(),
      k: genVar(),
      ops: genVar()
  };

  let vmScript = "";
  try {
      const compiler = new VexileCompiler();
      vmScript = compiler.compile(processedCode, { varNames });
  } catch (e: any) {
      return `error("Vexile Compiler Error: ${e.message ? e.message.replace(/"/g, "'") : "Unknown"}")`;
  }

  // 4. Security Modules
  const strWhat = hideString("what", `${vReg}[${IDX_CHAR}]`);
  const strC = hideString("C", `${vReg}[${IDX_CHAR}]`); 
  const strWait = hideString("wait", `${vReg}[${IDX_CHAR}]`);
  const strCheckIndex = hideString("CHECK_INDEX", `${vReg}[${IDX_CHAR}]`); // Trap key
  
  let crashLogic = `function() local function c() return c() end; return c() end`; 
  if (preset === "Test") crashLogic = `function() end`;

  let parserBomb = "";
  if (preset === "High" || preset === "Medium") {
     const bombDepth = preset === "High" ? 300 : 200; 
     let bombStr = `0x${Math.floor(Math.random() * 10000).toString(16)}`;
     for (let i = 0; i < bombDepth; i++) {
        if (Math.random() > 0.5) bombStr = `(${bombStr}+${obfNum(Math.floor(Math.random() * 100))})`;
        else bombStr = `(${obfNum(Math.floor(Math.random() * 100))}+${bombStr})`;
     }
     parserBomb = `local ${genVar()}=${bombStr};`;
  }

  let vmMetatable = "";
  if (preset !== "Test") {
      vmMetatable = `
        setmetatable(${vVM}, {
          __index = function(t, k)
            if k == "game" or k == "Enum" or k == "math" or k == "workspace" or k == "table" or k == "string" or k == "getfenv" then
                return getfenv(0)[k]
            end
            
            if k == ${obfNum(1)} then
               if (getfenv and getfenv()[${strCheckIndex}]) then ${vReg}[${IDX_CRASH}]() end;
               return ${obfNum(2)};
            
            elseif k == ${obfNum(2)} then
               if (${vReg}[${IDX_GETINFO}](${vReg}[${IDX_TASK}][${strWait}])[${strWhat}] ~= ${strC}) then ${vReg}[${IDX_CRASH}]() end;
               return ${obfNum(0)};
            end

            return getfenv(0)[k];
          end,
          
          __newindex = function(t, k, v)
            getfenv(0)[k] = v;
          end,

          __metatable = "Locked"
        })
      `;
  } else {
      vmMetatable = `setmetatable(${vVM}, { __index = function(t,k) return getfenv(0)[k] end })`;
  }

  const deadBlock1 = getDeadCode(preset);
  const deadBlock2 = getDeadCode(preset);
  const deadBlock3 = getDeadCode(preset);
  
  const watermark = `--[[ This file is protected with Vexile v1.0.0 (discord.gg/vexile) ]]`;

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
      
      local ${vOp} = ${obfNum(1)};
      ${vOp} = ${vVM}[${vOp}]; 
      ${vOp} = ${vVM}[${vOp}]; 

      ${deadBlock2}

      ${vReg}[${IDX_MAIN}] = function()
         ${vmScript}
      end;

      ${deadBlock3}

      setfenv(${vReg}[${IDX_MAIN}], ${vVM});
      
      local s, e = pcall(${vReg}[${IDX_MAIN}])
      if not s then 
      print("erroree")
      end
      
    end)()
  `;

  let minifiedScript = rawScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return `${watermark}\n${minifiedScript}`;
}
