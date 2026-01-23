// String Encryptor
// By Vexile
import { genVar, obfNum } from './antitamper';

export function encryptString(str: string): string {
    const key = Math.floor(Math.random() * 254) + 1;
    const bytes = Array.from(str).map(char => char.charCodeAt(0) ^ key);
    
    const byteTable = "{" + bytes.map(b => obfNum(b)).join(",") + "}";
    const dataVar = genVar(8);
    const keyVar = genVar(8);
    const resVar = genVar(8);
    const iVar = genVar(8);
    const vVar = genVar(8);

    return `(function() 
        local ${dataVar} = ${byteTable}
        local ${keyVar} = ${obfNum(key)}
        local ${resVar} = ""
        for ${iVar}, ${vVar} in pairs(${dataVar}) do
            ${resVar} = ${resVar} .. string.char(bit32.bxor(${vVar}, ${keyVar}))
        end
        return ${resVar}
    end)()`;
}