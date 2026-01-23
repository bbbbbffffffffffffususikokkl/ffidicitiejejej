// Control Flow Flattering
// By Vexile
import { genVar, obfNum } from './antitamper';

import { genVar, obfNum } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    let count = 1000
    if (preset === "Medium") count = 1500
    if (preset === "High" || preset === "Custom") count = 100
    const g = "_G." + genVar(8);
    let junk = `${g} = {}; `;
    
    for (let i = 0; i < count; i++) {
        const k = Math.floor(Math.random() * 500);
        const v = Math.floor(Math.random() * 1000);
        
        junk += `${g}[${obfNum(k)}] = (${g}[${obfNum(k)}] or ${obfNum(0)}) + ${obfNum(v)}; `;
        
        if (i % 20 === 0) junk += "\n";
    }
    
    return junk;
}

export function getOpaquePredicate(): { condition: string, expected: boolean } {
    const val1 = Math.floor(Math.random() * 100);
    const val2 = Math.floor(Math.random() * 100);
    const condition = `(${obfNum(val1)} + ${obfNum(val2)} == ${obfNum(val1 + val2)})`;
    return { condition, expected: true };
}