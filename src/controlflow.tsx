// Control Flow Flattering
// By Vexile
import { genVar, obfNum } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    let count = 2000;
    if (preset === "Medium") count = 3000;
    if (preset === "High" || preset === "Custom") count = 4000;
    
    const gName = "_G." + genVar(8);
    let junk = `${gName} = {}; `;
    
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * 100);
        const val = Math.floor(Math.random() * 1000);
        
        const op = Math.random();
        if (op > 0.6) {
            junk += `${gName}[${obfNum(idx)}] = (${gName}[${obfNum(idx)}] or 0) + ${obfNum(val)}; `;
        } else if (op > 0.3) {
            junk += `if ${gName}[${obfNum(idx)}] == nil then ${gName}[${obfNum(idx)}] = ${obfNum(val)} end; `;
        } else {
            junk += `local _ = ${gName}[${obfNum(idx)}]; `;
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
