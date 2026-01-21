type EngineType = "LuaU" | "JavaScript (MCBE)";

function genVar(): string {
  const patterns = [
    () => {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      let res = chars[Math.floor(Math.random() * chars.length)];
      const len = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < len; i++) {
        if (Math.random() > 0.6) res += chars[Math.floor(Math.random() * chars.length)];
        else res += Math.floor(Math.random() * 10);
      }
      return res;
    },
    () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let res = chars[Math.floor(Math.random() * chars.length)];
      const len = 4 + Math.floor(Math.random() * 6);
      for (let i = 0; i < len; i++) {
        if (Math.random() > 0.5) res += chars[Math.floor(Math.random() * chars.length)];
        else res += Math.floor(Math.random() * 10);
      }
      return res;
    },
    () => {
      const hex = "0123456789abcdef";
      let res = "_x";
      for (let i = 0; i < (5 + Math.floor(Math.random() * 4)); i++) 
        res += hex[Math.floor(Math.random() * hex.length)];
      return res;
    },
    () => {
      const prefixes = ["l_", "I_", "O_", "var_", "tmp_", "fn_"];
      const hex = "0123456789abcdef";
      let res = prefixes[Math.floor(Math.random() * prefixes.length)];
      for (let i = 0; i < (4 + Math.floor(Math.random() * 3)); i++) 
        res += hex[Math.floor(Math.random() * hex.length)];
      return res;
    },
    () => {
      const words = ["math", "hash", "calc", "val", "temp", "data", "func", "exec", "proc"];
      const word = words[Math.floor(Math.random() * words.length)];
      const num = Math.floor(Math.random() * 9999);
      return `${word}${num}`;
    }
  ];
  return patterns[Math.floor(Math.random() * patterns.length)]();
}

function obfNum(n: number): string {
  const method = Math.floor(Math.random() * 6);
  
  if (method === 0) {
    return `0x${n.toString(16)}`;
  } 
  if (method === 1) {
    const p1 = Math.floor(Math.random() * Math.max(1, n));
    return `(${p1}+${n - p1})`;
  }
  if (method === 2) {
    const mask = Math.floor(Math.random() * 255) + 1;
    return `(bit32.bxor(${n ^ mask},${mask}))`;
  }
  if (method === 3) {
    const factor = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
    return `(${n * factor}/${factor})`;
  }
  if (method === 4) {
    const a = Math.floor(Math.random() * 50) + 1;
    const b = Math.floor(Math.random() * 50) + 1;
    const sum = a + b;
    return `((${a}+${b})*${Math.floor(n / sum)}+${n % sum})`;
  }
  const shift = Math.floor(Math.random() * 3) + 1;
  return `(bit32.rshift(${n << shift},${shift}))`;
}

function encryptString(str: string, key: number, xorKey: number): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    let encrypted = charCode ^ xorKey;
    encrypted = (encrypted + key + (i + 1)) % 256;
    encrypted = ((encrypted << 3) | (encrypted >> 5)) & 0xFF;
    result += "\\" + encrypted;
  }
  return result;
}

function getDeadCode(preset: string): string {
  let blocksToGenerate = 100;
  if (preset === "Medium") blocksToGenerate = 200;
  if (preset === "High") blocksToGenerate = 400;

  let junk = "";
  const vTab = genVar();
  const vControl = genVar();
  
  junk += `local ${vTab}={};local ${vControl}=${obfNum(0)};`;
  
  for (let i = 0; i < blocksToGenerate; i++) {
    const vIdx = genVar();
    const vVal = genVar();
    const vCheck = genVar();
    const type = Math.floor(Math.random() * 5);

    if (type === 0) {
      junk += `local ${vCheck}=(${obfNum(i * 2)}%${obfNum(2)}==${obfNum(0)});`;
      junk += `if ${vCheck} then for ${vIdx}=1,${obfNum(3)} do ${vTab}[${vIdx}]=${obfNum(i)}*${obfNum(2)};${vControl}=${vControl}+${obfNum(0)} end else ${vControl}=${vControl}+${obfNum(1)} end;`;
    } else if (type === 1) {
      const rand = Math.floor(Math.random() * 500);
      junk += `local ${vVal}=${obfNum(rand)};`;
      junk += `if(${vVal}>${obfNum(rand - 1)})then ${vTab}[${obfNum(i)}]=${vVal};${vControl}=bit32.bxor(${vControl},${obfNum(0)})else ${vTab}[${obfNum(i)}]=0;${vControl}=bit32.bxor(${vControl},${obfNum(0)})end;`;
    } else if (type === 2) {
      junk += `${vTab}[${obfNum(i)}]=bit32.band((${obfNum(i)}+${obfNum(1)})*${obfNum(3)},${obfNum(255)});`;
      junk += `${vControl}=bit32.bor(${vControl},bit32.band(${vTab}[${obfNum(i)}],${obfNum(0)}));`;
    } else if (type === 3) {
      junk += `if(#${vTab}<${obfNum(100)})then ${vTab}[#${vTab}+1]=${obfNum(i)} end;`;
      junk += `${vControl}=(${vControl}+#${vTab})%${obfNum(1)};`;
    } else {
      const fakeStr = String.fromCharCode(65 + (i % 26));
      junk += `local ${vVal}="${fakeStr}";`;
      junk += `if(#${vVal}>${obfNum(0)})then ${vControl}=${vControl}+string.byte(${vVal})*${obfNum(0)} end;`;
    }
  }
  
  return junk;
}

function hideString(str: string, charFuncVar: string): string {
  let args = [];
  for(let i=0; i<str.length; i++) args.push(obfNum(str.charCodeAt(i)));
  return `${charFuncVar}(${args.join(',')})`;
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

  if (!isLua) return `/* This file is protected with Vexile 1.0.0 */ ${processedCode}`;

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
  let xorKey = Math.floor(Math.random() * 255) + 1;
  
  if (preset === "Medium") {
    encryptKey = Math.floor(Math.random() * 150) + 50;
    xorKey = Math.floor(Math.random() * 255) + 100;
  }
  if (preset === "High") {
    encryptKey = Math.floor(Math.random() * 200) + 55;
    xorKey = Math.floor(Math.random() * 255) + 150;
  }

  const kKey = obfNum(encryptKey);
  const kXor = obfNum(xorKey);
  const k256 = obfNum(256);
  const k3 = obfNum(3);
  const k5 = obfNum(5);
  
  let constantsList: string[] = [];
  
  const decryptLogic = `
    function(s)
      local r={}
      for i=1,#s do
        local b=${vReg}[${IDX_BYTE}](s,i)
        b=bit32.bor(bit32.rshift(b,${k3}),bit32.lshift(bit32.band(b,7),${k5}))
        b=(b-i-${kKey})%${k256}
        b=bit32.bxor(b,${kXor})
        ${vReg}[${IDX_INSERT}](r,${vReg}[${IDX_CHAR}](b))
      end
      return ${vReg}[${IDX_CONCAT}](r)
    end
  `.replace(/\n/g, ' ').trim();

  if (!isTest) {
    processedCode = processedCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1, p2) => {
        const raw = p1 || p2 || "";
        if (raw.length === 0) return match;
        
        const encrypted = encryptString(raw, encryptKey, xorKey);
        constantsList.push(encrypted);
        const idx = constantsList.length; 
        
        return `${vReg}[${IDX_DECRYPT}](${vReg}[${IDX_CONSTANTS}][${idx}])`;
    });
  }

  const chunkSize = 10;
  let constantChunks: string[] = [];
  for (let i = 0; i < constantsList.length; i += chunkSize) {
    constantChunks.push("{" + constantsList.slice(i, i + chunkSize).map(s => `"${s}"`).join(',') + "}");
  }
  
  const vTempChunks = genVar();
  const vTempI = genVar();
  const vTempJ = genVar();
  const constantsSetup = constantChunks.length > 1 
    ? `local ${vTempChunks}={${constantChunks.join(',')}};${vReg}[${IDX_CONSTANTS}]={};for ${vTempI}=1,#${vTempChunks} do for ${vTempJ}=1,#${vTempChunks}[${vTempI}]do ${vReg}[${IDX_INSERT}](${vReg}[${IDX_CONSTANTS}],${vTempChunks}[${vTempI}][${vTempJ}])end end`
    : `${vReg}[${IDX_CONSTANTS}]=${constantChunks[0] || "{}"}`;

  const vVM = genVar();
  const vOp = genVar();
  
  const strWhat = hideString("what", `${vReg}[${IDX_CHAR}]`);
  const strC = hideString("C", `${vReg}[${IDX_CHAR}]`); 
  const strWait = hideString("wait", `${vReg}[${IDX_CHAR}]`);
  const strCheckIndex = hideString("CHECKINDEX", `${vReg}[${IDX_CHAR}]`);

  const vCheck1 = genVar();
  const vCheck2 = genVar();
  const vCheck3 = genVar();
  
  let crashLogic = `function()local ${vCheck1}=${obfNum(0)};while ${vCheck1}<${obfNum(10000)} do ${vCheck1}=${vCheck1}+${obfNum(1)};(function()return(function()end)()end)()end end`;
  if (isTest) crashLogic = `function() end`;

  const antiTamperChecks = isTest ? "" : `
    local ${vCheck2}=${obfNum(0)};
    local ${vCheck3}=function()
      if(getfenv and getfenv()[${strCheckIndex}])then ${vReg}[${IDX_CRASH}]()end;
      if(${vReg}[${IDX_GETINFO}](${vReg}[${IDX_TASK}][${strWait}])[${strWhat}]~=${strC})then ${vReg}[${IDX_CRASH}]()end;
      ${vCheck2}=${vCheck2}+${obfNum(1)};
      if ${vCheck2}>${obfNum(5)} then return true end;
      return false;
    end;
  `;

  let vmMetatable = `
    setmetatable(${vVM}, {
      __index = function(t, k)
        if k == ${obfNum(1)} then
           ${antiTamperChecks}
           if not ${vCheck3}() then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(2)};
        elseif k == ${obfNum(2)} then
           if (${vReg}[${IDX_GETINFO}](${vReg}[${IDX_TASK}][${strWait}])[${strWhat}] ~= ${strC}) then ${vReg}[${IDX_CRASH}]() end;
           return ${obfNum(0)};
        end
        return getfenv(0)[k];
      end,
      __newindex = function(t, k, v)
        if ${vCheck3} and not ${vCheck3}() then ${vReg}[${IDX_CRASH}]() end;
        getfenv(0)[k] = v;
      end,
      __metatable = "Locked"
    })
  `;
  if (isTest) vmMetatable = `setmetatable(${vVM}, { __index = function(t,k) return getfenv(0)[k] end, __newindex = function(t,k,v) getfenv(0)[k]=v end })`;

  const deadBlock1 = getDeadCode(preset);
  const deadBlock2 = getDeadCode(preset);
  const deadBlock3 = getDeadCode(preset);
  
  let parserBomb = "";
  if (preset === "High" || preset == "Medium") {
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

  const headerStart = isLua ? "--[[" : "/*";
  const headerEnd = isLua ? "]]" : "*/";
  const watermark = `${headerStart} Luraph ${headerEnd}`;

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
      
      ${constantsSetup};

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
      
      ${deadBlock3}
    end)()
  `;

  let minifiedScript = rawScript.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return `${watermark}\n${minifiedScript}`;
}
