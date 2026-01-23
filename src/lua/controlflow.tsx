// Control Flow Flattering
// By Vexile
import { genVar, obfNum } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    const count = 2000;
    if (preset === "Medium") count = 4000
    if (preset === "High" || preset === "Custom") count = 6000
    let junk = "";
    
    const tbl = genVar(8);
    junk += `local ${tbl} = {}; `;
    
    for (let i = 0; i < count; i++) {
        const op = Math.random();
        const idx = obfNum(i);
        
        if (op > 0.7) {
            const it = genVar(6);
            junk += `for ${it}=1, ${obfNum(Math.floor(Math.random() * 5) + 2)} do ${tbl}[${idx}] = ${it} * ${obfNum(2)} end; `;
        } else if (op > 0.3) {
            junk += `${tbl}[${idx}] = ${obfNum(Math.floor(Math.random() * 1000))}; `;
        } else {
            const fakeFunc = genVar(7);
            junk += `local function ${fakeFunc}() return ${obfNum(Math.floor(Math.random() * 100))} end; `;
        }
    }
    
    return junk;
}

export function getOpaquePredicate(): { condition: string, expected: boolean } {
    const val1 = Math.floor(Math.random() * 100);
    const val2 = Math.floor(Math.random() * 100);
    
    const condition = `(${obfNum(val1)} + ${obfNum(val2)} == ${obfNum(val1 + val2)})`;
    return { condition, expected: true };
}