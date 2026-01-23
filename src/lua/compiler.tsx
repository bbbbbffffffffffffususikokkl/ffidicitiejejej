import { Statement, Expression, Chunk } from './ast';
import { Parser } from './parser';
import { encryptString } from './stringencryption';

export class Compiler {
    private instructions: any[] = [];
    private constants: any[] = [];
    private locals: string[] = [];
    private settings: any;
    
    // Hardcoded Opcode Map to ensure VM synchronization
    private opMap = {
        MOVE: 0, LOADK: 1, GETGLOBAL: 2, SETGLOBAL: 3, 
        GETTABLE: 4, SETTABLE: 5, CALL: 6, RETURN: 7,
        ADD: 8, SUB: 9, MUL: 10, DIV: 11, MOD: 12, POW: 13, UNM: 14,
        NOT: 15, LEN: 16, CONCAT: 17, JMP: 18, EQ: 19, LT: 20, LE: 21,
        NEWTABLE: 22, SETLIST: 23
    };

    constructor(settings: any) {
        this.settings = settings;
    }

    private addK(val: any) {
        if (this.settings.stringEncryption && typeof val === 'string') {
            val = encryptString(val);
        }
        const idx = this.constants.indexOf(val);
        if (idx !== -1) return idx;
        this.constants.push(val);
        return this.constants.length - 1;
    }

    private emit(op: keyof typeof this.opMap, a: number, b: number = 0, c: number = 0) {
        this.instructions.push({ op: this.opMap[op], a, b, c });
    }

    public compile(source: string) {
        const parser = new Parser(source);
        const ast = parser.parse();
        this.compileBlock(ast.body);
        this.emit('RETURN', 0, 1);
        return { code: this.instructions, constants: this.constants, opMap: this.opMap };
    }

    private compileBlock(stats: Statement[]) {
        stats.forEach(stat => {
            const baseReg = this.locals.length;
            switch (stat.type) {
                case 'Do':
                    this.compileBlock((stat as any).body);
                    break;
                case 'CallStatement':
                    this.compileExpr(stat.expression, baseReg);
                    break;
                case 'Local':
                    stat.init.forEach((expr, i) => {
                        this.compileExpr(expr, baseReg + i);
                        this.locals.push(stat.vars[i]);
                    });
                    break;
                case 'Assignment':
                    stat.init.forEach((expr, i) => {
                        const valReg = baseReg; 
                        this.compileExpr(expr, valReg);
                        const target = stat.vars[i];
                        if (target.type === 'Identifier') {
                            const lIdx = this.locals.indexOf(target.name);
                            if (lIdx !== -1) this.emit('MOVE', lIdx, valReg);
                            else this.emit('SETGLOBAL', valReg, this.addK(target.name));
                        } else if (target.type === 'Member') {
                            const objReg = baseReg + 1;
                            this.compileExpr(target.base, objReg);
                            const keyReg = baseReg + 2;
                            this.compileExpr(target.identifier, keyReg);
                            this.emit('SETTABLE', objReg, keyReg, valReg);
                        }
                    });
                    break;
                case 'If':
                    stat.clauses.forEach((clause) => {
                        this.compileExpr(clause.condition, baseReg);
                        // Logic for Jumps in If would go here
                        this.compileBlock(clause.body);
                    });
                    break;
                case 'ForGeneric':
    // 1. Compile the iterator (e.g., pairs(table))
    stat.iterators.forEach((expr, i) => this.compileExpr(expr, baseReg + i));
    
    // 2. Register the loop variables (e.g., k, v) into the local scope
    const oldLocalsCount = this.locals.length;
    stat.variables.forEach(vName => this.locals.push(vName));
    
    // 3. Compile the loop body
    this.compileBlock(stat.body);
    
    // 4. Pop the loop variables after the loop ends to prevent leaks
    this.locals.splice(oldLocalsCount);
    break;
                case 'Return':
                    stat.args.forEach((arg, i) => this.compileExpr(arg, baseReg + i));
                    this.emit('RETURN', baseReg, stat.args.length + 1);
                    break;
            }
        });
    }

    private compileExpr(e: Expression, reg: number) {
        switch (e.type) {
            case 'String':
            case 'Number':
            case 'Boolean':
                this.emit('LOADK', reg, this.addK(e.value));
                break;
            case 'Nil':
                this.emit('LOADK', reg, this.addK(null));
                break;
            case 'Identifier':
                const lIdx = this.locals.indexOf(e.name);
                if (lIdx !== -1) this.emit('MOVE', reg, lIdx);
                else this.emit('GETGLOBAL', reg, this.addK(e.name));
                break;
            case 'Unary':
                this.compileExpr(e.argument, reg);
                const uOps: Record<string, keyof typeof this.opMap> = { 'not': 'NOT', '#': 'LEN', '-': 'UNM' };
                if (uOps[e.operator]) this.emit(uOps[e.operator], reg, reg);
                break;
            case 'Binary':
                if (e.operator === 'and' || e.operator === 'or') {
                    this.compileExpr(e.left, reg);
                    const jumpIdx = this.instructions.length;
                    this.emit('JMP', 0, 0); 
                    this.compileExpr(e.right, reg);
                    this.instructions[jumpIdx].b = this.instructions.length - jumpIdx;
                } else {
                    this.compileExpr(e.left, reg);
                    this.compileExpr(e.right, reg + 1);
                    const bOps: Record<string, keyof typeof this.opMap> = {
                        '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', 
                        '%': 'MOD', '^': 'POW', '..': 'CONCAT',
                        '==': 'EQ', '<': 'LT', '<=': 'LE', '~=': 'EQ' 
                    };
                    if (bOps[e.operator]) this.emit(bOps[e.operator], reg, reg, reg + 1);
                }
                break;
            case 'Member':
                this.compileExpr(e.base, reg);
                const keyR = reg + 1;
                if (e.indexer === '[') {
                    this.compileExpr(e.identifier as any, keyR);
                } else {
                    const name = (e.identifier as any).name || (e.identifier as any).value;
                    this.emit('LOADK', keyR, this.addK(name));
                }
                if (e.indexer === ':') {
                    this.emit('MOVE', reg + 1, reg); 
                    this.emit('GETTABLE', reg, reg, keyR);
                } else {
                    this.emit('GETTABLE', reg, reg, keyR);
                }
                break;
                        case 'Call':
                const isMethod = e.base.type === 'Member' && e.base.indexer === ':';
                this.compileExpr(e.base, reg); 
                
                const argOffset = isMethod ? 1 : 0;
                // FIX: Ensure args are compiled into specific sequential registers
                // without being overwritten by temporary evaluations
                e.args.forEach((arg, i) => {
                    this.compileExpr(arg, reg + argOffset + i + 1);
                });
                
                // Opcode 6 (CALL): A = function reg, B = num args + 1, C = num returns
                this.emit('CALL', reg, e.args.length + 1 + argOffset, 1);
                break;
            case 'Table':
                this.emit('NEWTABLE', reg, 0, 0);
                e.fields.forEach((field, i) => {
                    const vR = reg + 1;
                    this.compileExpr(field.value, vR);
                    const kR = reg + 2;
                    if (field.key) {
                        this.compileExpr(field.key, kR);
                        this.emit('SETTABLE', reg, kR, vR);
                    } else {
                        this.emit('LOADK', kR, this.addK(i + 1));
                        this.emit('SETTABLE', reg, kR, vR);
                    }
                });
                break;
        }
    }
}
