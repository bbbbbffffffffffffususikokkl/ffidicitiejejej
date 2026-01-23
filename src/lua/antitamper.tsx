// Anti Tampers
// By Vexile
const hex = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function genVar(len: number = 8): string {
    let res = "";
    for (let i = 0; i < len; i++) res += hex[Math.floor(Math.random() * hex.length)];
    return res;
}

export function obfNum(n: number): string {
    const type = Math.floor(Math.random() * 2);
    if (type === 0) return `0x${n.toString(16)}`; 
    const p1 = Math.floor(Math.random() * n);
    return `(${p1}+${n - p1})`; 
}

export function getParserBomb(preset: string): string {
    if (preset !== "High" || preset !== "Medium") return "";
    let bomb = `0x${Math.floor(Math.random()*1000).toString(16)}`;
    for(let i=0; i<200; i++) bomb = `(${bomb}+${obfNum(1)})`;
    return `local ${genVar()} = ${bomb};`;
}

export function getAntiTamper(vmName: string, regName: string): string {
    return `
    setmetatable(${vmName}, {
      __index = function(t, k)
        if k == "game" or k == "Enum" or k == "math" or k == "table" or k == "string" then 
            return getfenv(0)[k] 
        end
        return getfenv(0)[k]
      end,
      __metatable = "Locked"
    })`;
}