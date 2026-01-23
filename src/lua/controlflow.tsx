// Control Flow Flattering
// By Vexile
import { genVar, obfNum } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    let count = 2000;
    if (preset === "Medium") count = 3000;
    if (preset === "High" || preset === "Custom") count = 4000;
    
    const globalJunk = "_G." + genVar(8);
    let junk = `${globalJunk} = {};\n`;
    
    for (let i = 0; i < count; i++) {
        const op = Math.random();
        const key = obfNum(Math.floor(Math.random() * 500));
        const val = obfNum(Math.floor(Math.random() * 1000));
        
        if (op > 0.6) {
            junk += `${globalJunk}[${key}] = (${globalJunk}[${key}] or 0) + ${val}; `;
        } else if (op > 0.3) {
            junk += `if ${globalJunk}[${key}] == nil then ${globalJunk}[${key}] = ${val} end; `;
        } else {
            junk += `local _ = ${globalJunk}[${key}]; `; // This single '_' is reused
        }

        if (i % 15 === 0) junk += "\n";
    }
    
    return junk;
}

export function getOpaquePredicate(): { condition: string, expected: boolean } {
    const val1 = Math.floor(Math.random() * 100);
    const val2 = Math.floor(Math.random() * 100);
    const condition = `(${obfNum(val1)} + ${obfNum(val2)} == ${obfNum(val1 + val2)})`;
    return { condition, expected: true };
}