// Control Flow Flattering
// By Vexile
import { genVar, obfNum } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    let count = 2000;
    if (preset === "Medium") count = 3000;
    if (preset === "High" || preset === "Custom") count = 4000;
    
    let junk = "";
    const storageTbl = genVar(8);
    junk += `local ${storageTbl} = {}; `;
    
    for (let i = 0; i < count; i++) {
        const op = Math.random();
        const idx = obfNum(i);
        const secondaryIdx = obfNum(i + 1);
        
        if (op > 0.7) {
            const it = genVar(6);
            junk += `for ${it}=1, ${obfNum(Math.floor(Math.random() * 5) + 2)} do ${storageTbl}[${idx}] = (${it} * ${obfNum(2)}) + (${storageTbl}[${secondaryIdx}] or 0) end; `;
        } else if (op > 0.3) {
            junk += `${storageTbl}[${idx}] = ${obfNum(Math.floor(Math.random() * 1000))}; `;
        } else {
            const fakeFunc = genVar(7);
            junk += `local function ${fakeFunc}() return ${storageTbl}[${idx}] or ${obfNum(0)} end; ${storageTbl}[${secondaryIdx}] = ${fakeFunc}(); `;
        }
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