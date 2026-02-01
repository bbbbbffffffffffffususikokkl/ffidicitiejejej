import { genVar } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    let count = 1000;
    if (preset === "Medium") count = 1500;
    if (preset === "High" || preset === "Custom") count = 2000;

    const junkTable = genVar(8);
    let junk = `local ${junkTable} = {};\n`;
    
    for (let i = 0; i < Math.min(100, count); i++) {
        const k = Math.floor(Math.random() * 500);
        junk += `${junkTable}[${obfNum(k)}] = ${obfNum(0)};\n`;
    }
    
    for (let i = 0; i < count; i++) {
        const k = Math.floor(Math.random() * 500);
        const v = Math.floor(Math.random() * 1000);
        
        if (Math.random() > 0.5) {
            junk += `${junkTable}[${obfNum(k)}] = ${obfNum(v)}; `;
        } else {
            junk += `if ${junkTable}[${obfNum(k)}] then ${junkTable}[${obfNum(k)}] = ${junkTable}[${obfNum(k)}] + ${obfNum(v)} else ${junkTable}[${obfNum(k)}] = ${obfNum(v)} end; `;
        }
        
        if (i % 20 === 0) junk += "\n";
    }
    
    return junk;
}