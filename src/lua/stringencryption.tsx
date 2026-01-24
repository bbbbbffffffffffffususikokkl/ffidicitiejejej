import { genVar, obfNum } from './antitamper';

export function encryptString(str: string): string {
    const key = Math.floor(Math.random() * 254) + 1;
    const bytes = Array.from(str).map(char => char.charCodeAt(0) ^ key);
    const byteTable = "{" + bytes.map(b => obfNum(b)).join(",") + "}";
    
    const d = genVar(8); const k = genVar(8); const r = genVar(8);
    const i = genVar(8); const v = genVar(8);

    return `(function() 
        local b32 = bit32; 
        local s = string; 
        local ${d},${k},${r}=${byteTable},${obfNum(key)},""; 
        for ${i},${v} in pairs(${d}) do 
            ${r}=${r}..s.char(b32.bxor(${v},${k})) 
        end 
        return ${r} 
    end)()`;
}