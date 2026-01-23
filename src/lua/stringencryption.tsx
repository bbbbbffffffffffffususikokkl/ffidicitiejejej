// String Encryptor
// By Vexile
export function encryptString(str: string): string {
    const key = Math.floor(Math.random() * 255) + 1;
    const encryptedBytes = str.split('').map(char => char.charCodeAt(0) + key);
    const bytesList = encryptedBytes.join(',');
    
    const strVar = "s";
    const byteVar = "b";
    
    return `(function() local ${strVar} = "" for _, ${byteVar} in pairs({${bytesList}}) do ${strVar} = ${strVar} .. string.char(${byteVar} - ${key}) end return ${strVar} end)()`;
}

export function encryptNumber(num: number): string {
    const offset = Math.floor(Math.random() * 1000);
    return `((${num + offset}) - ${offset})`;
}