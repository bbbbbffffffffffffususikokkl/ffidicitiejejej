import { genVar, obfNum } from './antitamper';

export function getDeadCode(preset: string): string {
    if (preset === "Test") return "";
    
    let count = 1000;
    if (preset === "Medium") count = 1500;
    if (preset === "High" || preset === "Custom") count = 2000;

    const junkTable = genVar(8);
    const junkVar1 = genVar(8);
    const junkVar2 = genVar(8);
    
    let junk = `local ${junkTable} = {}
    local ${junkVar1}, ${junkVar2}\n`;
    
    for (let i = 0; i < count; i++) {
        const pattern = Math.floor(Math.random() * 4);
        switch(pattern) {
            case 0:
                junk += `${junkTable}[${obfNum(Math.floor(Math.random() * 500))}] = ${obfNum(Math.floor(Math.random() * 1000))}; `;
                break;
            case 1:
                // String concatenation (safe)
                junk += `${junkVar1} = "${genVar(5)}"; ${junkVar2} = "${genVar(5)}"; _ = ${junkVar1} .. ${junkVar2}; `;
                break;
            case 2:
                // Boolean operations (safe)
                junk += `${junkVar1} = ${Math.random() > 0.5}; ${junkVar2} = not ${junkVar1}; `;
                break;
            case 3:
                // Function calls that do nothing
                junk += `(function() return ${obfNum(Math.floor(Math.random() * 1000))} end)(); `;
                break;
        }
        
        if (i % 25 === 0) junk += "\n";
    }
    
    return junk;
}