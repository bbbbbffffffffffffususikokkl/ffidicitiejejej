import { Statement, Expression, Chunk } from './ast';
import { Parser } from './parser';
import { encryptString } from './stringencryption';
import { generateVM } from './vm';

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
                case 'While':
    const condStart = this.instructions.length;
    
    // Compile condition (result goes to baseReg)
    this.compileExpr(stat.condition, baseReg);
    
    // Jump FORWARD if condition is FALSE (skip loop body)
    // We'll use EQ opcode: if condition == false, skip body
    const falseConstIdx = this.addK(false);
    this.emit('LOADK', baseReg + 1, falseConstIdx);
    this.emit('EQ', baseReg, baseReg, baseReg + 1); // Skip if condition == false
    
    // Compile loop body
    this.compileBlock(stat.body);
    
    // Jump BACK to condition check
    // Calculate offset: we want to jump back to condStart
    const backOffset = condStart - this.instructions.length;
    this.emit('JMP', 0, backOffset);
    break;
                case 'CallStatement':
    this.compileExpr(stat.expression, baseReg);
    // Don't add extra CALL - compileExpr for Call already emits it
    break;
                case 'Function': {
                    // FIX 1: Add support for global function declarations
                    const gFuncName = (stat as any).name.name;
                    const tempReg = this.locals.length;

                    // 1. Compile the function body into a temporary register
                    this.compileExpr({
                        type: 'FunctionExpression',
                        params: (stat as any).params,
                        body: (stat as any).body
                    } as any, tempReg);

                    // 2. Assign that register to the Global variable
                    this.emit('SETGLOBAL', tempReg, this.addK(gFuncName));
                    break;
                }
                case 'Local':
                    stat.vars.forEach((vName, i) => {
                        const expr = stat.init[i];
                        if (expr) {
                            this.compileExpr(expr, baseReg + i);
                        } else {
                            this.emit('LOADK', baseReg + i, this.addK(null));
                        }
                        this.locals.push(vName);
                    });
                    break;
                case 'LocalFunction':
    const funcName = (stat as any).name.name;
    const reg = this.locals.length;
    
    // 1. Register the local variable name
    this.locals.push(funcName);

    // 2. Compile the function expression and store it in that register
    this.compileExpr({
        type: 'FunctionExpression',
        params: (stat as any).params,
        body: (stat as any).body
    } as any, reg);
    break;
                case 'Assignment':
                    const valStartReg = baseReg;
                    stat.init.forEach((expr, i) => {
                        this.compileExpr(expr, valStartReg + i);
                    });

                    stat.vars.forEach((target, i) => {
                        const sourceReg = valStartReg + i;
                        const hasSource = i < stat.init.length;

                        if (target.type === 'Identifier') {
                            const lIdx = this.locals.indexOf(target.name);
                            if (hasSource) {
                                if (lIdx !== -1) this.emit('MOVE', lIdx, sourceReg);
                                else this.emit('SETGLOBAL', sourceReg, this.addK(target.name));
                            } else {
                                const nilK = this.addK(null);
                                if (lIdx !== -1) this.emit('LOADK', lIdx, nilK);
                                else {
                                    this.emit('LOADK', sourceReg, nilK);
                                    this.emit('SETGLOBAL', sourceReg, nilK);
                                }
                            }
                        } else if (target.type === 'Member') {
                            const objReg = sourceReg + 1;
                            this.compileExpr(target.base, objReg);
                            const keyReg = sourceReg + 2;
                            this.compileExpr(target.identifier, keyReg);
                            
                            if (hasSource) {
                                this.emit('SETTABLE', objReg, keyReg, sourceReg);
                            } else {
                                const tempNil = sourceReg + 3;
                                this.emit('LOADK', tempNil, this.addK(null));
                                this.emit('SETTABLE', objReg, keyReg, tempNil);
                            }
                        }
                    });
                    break;
                case 'If':
                    stat.clauses.forEach((clause) => {
                        this.compileExpr(clause.condition, baseReg);
                        this.compileBlock(clause.body);
                    });
                    break;
                case 'ForGeneric':
                    stat.iterators.forEach((expr, i) => this.compileExpr(expr, baseReg + i));
                    const oldLocalsCount = this.locals.length;
                    stat.variables.forEach(vName => this.locals.push(vName));
                    this.compileBlock(stat.body);
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
            case 'FunctionExpression':
    const subCompiler = new Compiler(this.settings);
    subCompiler.compileBlock(e.body); 
    subCompiler.emit('RETURN', 0, 1);
    
    const subBytecode = { 
        code: subCompiler.instructions, 
        constants: subCompiler.constants 
    };

    // FIX: Make it a self-executing function that returns the actual function
    const subVM = `(function() 
        return function(...) 
            ${generateVM(subBytecode)} 
        end 
    end)()`;
    
    this.emit('LOADK', reg, this.addK(subVM));
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
                // FIX 2: Correct CALL Logic (Standard Lua 5.1)
                const isMethod = e.base.type === 'Member' && e.base.indexer === ':';
                this.compileExpr(e.base, reg); 
                
                const argOffset = isMethod ? 1 : 0;
                e.args.forEach((arg, i) => {
                    this.compileExpr(arg, reg + argOffset + i + 1);
                });

                // Standard Calculation:
                // B = Number of Arguments + 1 (Function Register + Args)
                // C = Number of Results + 1 (Assuming 1 result needed)
                const bCount = e.args.length + argOffset + 1;
                const cCount = 2; 

                this.emit('CALL', reg, bCount, cCount);
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