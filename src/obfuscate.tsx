type EngineType = "LuaU" | "JavaScript (MCBE)";

function genVar(): string {
  const hex = "0123456789ABCDEF";
  let res = "_0x";
  for (let i = 0; i < 3; i++) res += hex[Math.floor(Math.random() * hex.length)];
  return res;
}

// Generates numbers like (5-2) or 0x3
function obfNum(n: number): string {
  const method = Math.floor(Math.random() * 3);
  if (method === 0) return `0x${n.toString(16)}`; 
  if (method === 1) { 
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

// MASSIVE DEAD CODE GENERATOR
function getDeadCode(preset: string): string {
  let blocksToGenerate = 20; 
  if (preset === "Medium") blocksToGenerate = 100;
  if (preset === "High") blocksToGenerate = 300; 

  let junk = "";
  const vTab = genVar();
  junk += `local ${vTab}={};`;
  
  for (let i = 0; i < blocksToGenerate; i++) {
    const vIdx = genVar();
    const vVal = genVar();
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
        junk += `for ${vIdx}=1,${obfNum(Math.floor(Math.random() * 10) + 1)} do ${vTab}[${vIdx}]=${obfNum(i)}*${obfNum(2)} end; `;
    } else if (type === 1) {
        junk += `local ${vVal}=${obfNum(Math.floor(Math.random() * 500))}; `;
        junk += `if ${vVal}>${obfNum(250)} then ${vTab}[${obfNum(i)}]=${vVal} else ${vTab}[${obfNum(i)}]=0 end; `;
    } else {
        junk += `${vTab}[${obfNum(i)}]=(${obfNum(i)}+${obfNum(1)})*${obfNum(3)}; `;
    }
  }
  return junk;
}

function encryptString(str: string, key: number): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const encryptedByte = (charCode + key + (i + 1)) % 256;
    result += "\\" + encryptedByte;
  }
  return result;
}

export function obfuscateCode(code: string, engine: EngineType, preset: string): string {
  const isLua = engine === "LuaU";
  const isTest = preset === "Test"; 

  let processedCode = code;
  if (isLua) {
    processedCode = processedCode
      .replace(/--\[\[(?! This file is protected with Vexile)[\s\S]*?\]\]/g, "")
      .replace(/--(?![\[])(?!.*Vexile).*$/gm, ""); 
  } else {
    processedCode = processedCode
      .replace(/\/\*(?! This file is protected with Vexile)[\s\S]*?\*\//g, "") 
      .replace(/\/\/(?!.*Vexile).*$/gm, ""); 
  }
  processedCode = processedCode.split('\n').map(line => line.trim()).filter(l => l.length > 0).join(' ');

  if (!isLua) return `/* Vexile Protected */ ${processedCode}`;

  const vReg = genVar(); 
  const IDX_STRING = 1;
  const IDX_CHAR = 2;
  const IDX_BYTE = 3;
  const IDX_TABLE = 4;
  const IDX_INSERT = 5;
  const IDX_CONCAT = 6;
  const IDX_DEBUG = 7;
  const IDX_GETINFO = 8;
  const IDX_TASK = 9;
  const IDX_CONSTANTS = 10; 
  const IDX_DECRYPT = 11;
  const IDX_CRASH = 12;
  const IDX_MAIN = 13;

  let encryptKey = Math.floor(Math.random() * 50) + 1; 
  if (preset === "Medium") encryptKey = Math.floor(Math.random() * 150) + 50; 
  if (preset === "High")   encryptKey = Math.floor(Math.random() * 200) + 55; 

  const kKey = obfNum(encryptKey);
  const k256 = obfNum(256);
  
  let constantsList: string[] = [];
  
  const decryptLogic = `
    function(s)
      local r={}
      for i=1,#s do
        local b=${vReg}[${IDX_BYTE}](s,i)
        ${vReg}[${IDX_INSERT}](r,${vReg}[${IDX_CHAR}]((b-i-${kKey})%${k256}))
      end
      return ${vReg}[${IDX_CONCAT}](r)
    end
  `.replace(/\n/g, ' ').trim();

  // --- MEMBER EXPRESSION HIDING (Optional but Recommended) ---
  // Converts .Name to ["Name"] so the string gets encrypted
  // This helps achieve the "gameobfuscated:getserviceobfuscated" effect
  if (!isTest) {
      processedCode = processedCode.replace(/\.([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, p1) => {
          // Skip keywords or numbers
          if (["local", "function", "end", "if", "then", "else", "return", "true", "false", "nil"].includes(p1)) return match;
          return `["${p1}"]`;
      });
  }

  // --- STRING ENCRYPTION & REPLACEMENT ---
  if (!isTest) {
    processedCode = processedCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1, p2) => {
        const raw = p1 || p2 || "";
        if (raw.length === 0) return match;
        
        const encrypted = encryptString(raw, encryptKey);
        constantsList.push(encrypted);
        const idx = constantsList.length; // 1-based index
        
        // REPLACED WITH: Table Lookup with Math Key
        // Example: _0x[ (5-2) ]
        return `${vReg}[${IDX_CONSTANTS}][${obfNum(idx)}]`;
    });
  }

  // --- GENERATE CONSTANTS TABLE WITH MATH KEYS ---
  // We don't use a simple { "a", "b" }. We use assignments to break decompilers.
  let constantsTableBlock = `${vReg}[${IDX_CONSTANTS}] = {}; `;
  constantsList.forEach((str, index) => {
      // Index is 0-based in array, but 1-based in Lua logic above
      const luaIndex = index + 1;
      
      // DECRYPTION WRAPPER:
      // We store the ENCRYPTED string, then decrypt it immediately upon assignment
      // _0x[10][ (1+0) ] = _0x[11]("encrypted...")
      constantsTableBlock += `${vReg}[${IDX_CONSTANTS}][${obfNum(luaIndex)}] = ${vReg}[${IDX_DECRYPT}]("${str}"); `;
  });

  const vVM = genVar();
  const vOp = genVar();
  const strWhat = hideString("what", `${vReg}[${IDX_CHAR}]`);
  const strC = hideString("C", `${vReg}[${IDX_CHAR}]`); 
  const strWait = hideString("wait", `${vReg}[${IDX_CHAR}]`);
  const strCheckIndex = hideString("CHECKINDEX", `${vReg}[${IDX_CHAR}]`);
  const strName = hideString("name", `${vReg}[${IDX_CHAR}]`);

  let crashLogic = `function() while true do end end`; 
  if (isTest) crashLogic = `function() end`;

  // --- PROMETHEUS STYLE EXECUTION ---
  let vmMetatable = `
    setmetatable(${vVM}, {
      __index = function(t, k)
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
  if (isTest) vmMetatable = `setmetatable(${vVM}, { __index = function(t,k) return getfenv(0)[k] end, __newindex = function(t,k,v) getfenv(0)[k]=v end })`;

  const deadBlock1 = getDeadCode(preset);
  const deadBlock2 = getDeadCode(preset);
  
  // --- PARSER BOMB (Math Stack Overflow) ---
  let parserBomb = "";
  if (preset === "High") {
     const bombDepth = 300; 
     let bombStr = `0x${Math.floor(Math.random() * 10000).toString(16)}`;
     for (let i = 0; i < bombDepth; i++) {
        if (Math.random() > 0.5) {
            bombStr = `(${bombStr}+${obfNum(Math.floor(Math.random() * 100))})`;
        } else {
            bombStr = `(${obfNum(Math.floor(Math.random() * 100))}+${bombStr})`;
        }
     }
     parserBomb = `local ${genVar()}=${bombStr};`;
  }

  const watermark = `--[[ This file is protected with Vexile v1.0.0 (discord.gg/vexile) ]]`;

  let rawScript = `
    (function()
      ${parserBomb}
      
      local ${vReg} = {}
      ${vReg}[${IDX_STRING}] = string;
      ${vReg}[${IDX_CHAR}] = ${vReg}[${IDX_STRING}].char;
      ${vReg}[${IDX_BYTE}] = ${vReg}[${IDX_STRING}].byte;
      ${vReg}[${IDX_TABLE}] = table;
      ${vReg}[${IDX_INSERT}] = ${vReg}[${IDX_TABLE}].insert;
      ${vReg}[${IDX_CONCAT}] = ${vReg}[${IDX_TABLE}].concat;
      ${vReg}[${IDX_DEBUG}] = debug;
      ${vReg}[${IDX_GETINFO}] = ${vReg}[${IDX_DEBUG}].getinfo;
      ${vReg}[${IDX_TASK}] = task;
      ${vReg}[${IDX_CRASH}] = ${crashLogic};
      ${vReg}[${IDX_DECRYPT}] = ${decryptLogic};
      
      ${constantsTableBlock}

      ${deadBlock1}

      local ${vVM} = {}
      ${vmMetatable}
      
      local ${vOp} = ${obfNum(1)};
      ${vOp} = ${vVM}[${vOp}]; 
      ${vOp} = ${vVM}[${vOp}]; 

      ${deadBlock2}

      ${vReg}[${IDX_MAIN}] = function()
         ${processedCode}
      end;

      setfenv(${vReg}[${IDX_MAIN}], ${vVM});
      ${vReg}[${IDX_MAIN}]();
      
    end)()
  `;

  let minifiedScript = rawScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return `${watermark}\n${minifiedScript}`;
}