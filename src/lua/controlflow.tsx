// Control Flow Flattering
// By Vexile
import { genVar, obfNum } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    let count = 1000;
    if (preset === "Medium") count = 1500;
    if (preset === "High" || preset === "Custom") count = 2000;

    const junkTable = genVar(8);
    let junk = `local ${junkTable} = {}; `;
    
    for (let i = 0; i < count; i++) {
        const k = Math.floor(Math.random() * 500);
        const v = Math.floor(Math.random() * 1000);

        junk += `${junkTable}[${obfNum(k)}] = (${junkTable}[${obfNum(k)}] or ${obfNum(0)}) + ${obfNum(v)}; `;
        
        if (i % 20 === 0) junk += "\n";
    }
    
    return junk;
}