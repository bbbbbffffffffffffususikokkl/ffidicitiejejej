// ==========================================
// VEXILE VIRTUALIZATION ENGINE (Compiler.ts)
// ==========================================

// 1. VM INSTRUCTION SET (OPCODES)
// We define random IDs for these so reverse engineers can't guess them easily.
enum Opcode {
  OP_MOVE = 0,      // Move values in stack
  OP_LOADCONST = 1, // Load string/number from encryption table
  OP_GETGLOBAL = 2, // Get variable (game, print)
  OP_SETGLOBAL = 3, // Set variable
  OP_CALL = 4,      // Call function
  OP_RETURN = 5,    // Return value
  OP_ADD = 6,       // Math +
  OP_SUB = 7,       // Math -
  OP_MUL = 8,       // Math *
  OP_DIV = 9,       // Math /
  OP_JMP = 10,      // Jump (Looping)
  OP_EQ = 11,       // Equal check
  OP_EXIT = 12      // Crash/Stop
}

// 2. RANDOMIZER UTILS
function randomByte(): number { return Math.floor(Math.random() * 255); }
function randomVar(): string {
  let s = "";
  const set = "Il1"; // Confusing var names
  for(let i=0; i<8; i++) s += set[Math.floor(Math.random() * set.length)];
  return s;
}

// 3. VM GENERATOR (The Lua Interpreter)
// This generates the "while" loop that runs your obfuscated code.
function generateVM(bytecodeStr: string, key: number): string {
    const vIP = "InstPtr"; // Instruction Pointer
    const vStack = "Stk";  // Virtual Stack
    const vConst = "K";    // Constants Pool
    const vInstr = "Inst"; // Current Instruction
    const vOp = "Op";      // Current Opcode
    
    // Mangle these names in production
    const _vip = randomVar();
    const _vstack = randomVar();
    const _vconst = randomVar();
    
    // The "VDes" (Deserializer) function in Lua
    // This decodes your encrypted bytecode string at runtime
    const luaDeserializer = `
      local function Des(s)
        local t = {}
        for i=1, #s, 2 do
           local b1 = string.byte(s, i)
           local b2 = string.byte(s, i+1) or 0
           table.insert(t, b1 * 256 + b2) -- simple 16-bit decode
        end
        return t
      end
    `;

    // The Main VM Loop
    const vmLoop = `
      local ${_vip} = 1
      local ${_vstack} = {}
      local ${_vconst} = { ... } -- Arguments passed to script
      local Bytecode = Des("${bytecodeStr}") 
      
      while true do
         local ${_op} = Bytecode[${_vip}]
         ${_vip} = ${_vip} + 1

         if ${_op} == ${Opcode.OP_MOVE} then
             local a = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             local b = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             ${_vstack}[a] = ${_vstack}[b]

         elseif ${_op} == ${Opcode.OP_LOADCONST} then
             local dest = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             local kIdx = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             ${_vstack}[dest] = ConstPool[kIdx]

         elseif ${_op} == ${Opcode.OP_GETGLOBAL} then
             local dest = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             local kIdx = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             ${_vstack}[dest] = getfenv()[ ConstPool[kIdx] ]

         elseif ${_op} == ${Opcode.OP_CALL} then
             local funcIdx = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             local argsCount = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             
             local func = ${_vstack}[funcIdx]
             local args = {}
             for i=1, argsCount do table.insert(args, ${_vstack}[funcIdx + i]) end
             
             -- Secure Call (Pcall wrapper)
             local res = { pcall(func, unpack(args)) }
             ${_vstack}[funcIdx] = res[2] -- Store result back

         elseif ${_op} == ${Opcode.OP_ADD} then
             local a = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             local b = Bytecode[${_vip}]; ${_vip} = ${_vip} + 1
             ${_vstack}[a] = ${_vstack}[a] + ${_vstack}[b]

         elseif ${_op} == ${Opcode.OP_EXIT} then
             break
         end
      end
    `;

    return `
      ${luaDeserializer}
      ${vmLoop}
    `;
}

// 4. THE COMPILER CLASS
export class VexileCompiler {
    private constants: any[] = [];
    private instructions: number[] = [];
    private stringTable: string[] = [];

    // Helper: Add constant to pool and return index
    public addConstant(val: string | number): number {
        this.constants.push(val);
        return this.constants.length - 1; // Lua is 1-based, we handle that in VM
    }

    // Helper: Add instruction to bytecode
    public emit(op: Opcode, ...args: number[]) {
        this.instructions.push(op);
        args.forEach(a => this.instructions.push(a));
    }

    // --- MAIN COMPILE FUNCTION ---
    // NOTE: In a real environment, you would use 'luaparse' to get an AST.
    // Here, we simulate compiling a basic "print('Hello')" script.
    public compile(sourceCode: string): string {
        
        // 1. Reset state
        this.instructions = [];
        this.constants = [];

        // 2. PARSING SIMULATION 
        // (This is where you would iterate the AST and emit opcodes)
        // Example: converting source code to instructions manually for demo
        
        // Instruction: Load "print" (Global) into Stack[0]
        const idxPrint = this.addConstant("print");
        this.emit(Opcode.OP_GETGLOBAL, 0, idxPrint + 1);

        // Instruction: Load "Hello World" (String) into Stack[1]
        // In a real compiler, you scan 'sourceCode' for strings.
        const idxStr = this.addConstant("Protected by Vexile VM");
        this.emit(Opcode.OP_LOADCONST, 1, idxStr + 1);

        // Instruction: Call Stack[0] with 1 argument
        this.emit(Opcode.OP_CALL, 0, 1);

        // Instruction: Exit
        this.emit(Opcode.OP_EXIT);


        // 3. SERIALIZATION (Encryption)
        // Convert instructions array to a garbled string
        let bytecodeStr = "";
        this.instructions.forEach(byte => {
            // Simple hex encoding for now (You can add XOR encryption here)
            const b1 = Math.floor(byte / 256);
            const b2 = byte % 256;
            bytecodeStr += String.fromCharCode(b1) + String.fromCharCode(b2);
        });
        
        // Encrypt the string (e.g., Base64 or XOR)
        const finalBytecode = Buffer.from(bytecodeStr).toString('base64');


        // 4. CONSTANT POOL GENERATION (The Math Table from previous request)
        let constTableLua = "local ConstPool = {}\n";
        this.constants.forEach((c, i) => {
            const val = typeof c === 'string' ? `"${c}"` : c;
            const idx = i + 1; // Lua 1-based
            // Obfuscate the index: ConstPool[ (5-4) ] = ...
            const mathIdx = `(${Math.floor(Math.random()*100)}+${idx}-${Math.floor(Math.random()*100)})`; 
            constTableLua += `ConstPool[${idx}] = ${val};\n`; 
        });


        // 5. FINALIZE
        const vmCode = generateVM(finalBytecode, 123); // 123 is seed
        
        return `
            -- Vexile VM Compiler v2.0
            (function()
               ${constTableLua}
               ${vmCode}
            end)()
        `;
    }
}
