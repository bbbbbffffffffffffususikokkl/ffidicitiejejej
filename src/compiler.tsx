// Compiler
// By Vexile
import { Statement, Expression, Chunk } from './ast';
import { Parser } from './parser';
import { encryptString } from './stringencryption';

export class Compiler {
    private instructions: any[] = [];
    private constants: any[] = [];
    private locals: string[] = [];
    private settings: any;
    private opMap = {
        MOVE: 0, LOADK: 1, GETGLOBAL: 2, SETGLOBAL: 3, 
        GETTABLE: 4, SETTABLE: 5, CALL: 6, RETURN: 7,
        ADD: 8, SUB: 9, MUL: 10, DIV: 11, MOD: 12, POW: 13, UNM: 14,
        NOT: 15, LEN: 16, CONCAT: 17, JMP: 18, EQ: 19, LT: 20, LE: 21,
        NEWTABLE: 22, SETLIST: 23, FORLOOP: 24, FORPREP: 25
    };

    constructor(settings: any) {
        this.settings = settings;
        const vals = Array.from({length: 26}, (_, i) => i).sort(() => Math.random() - 0.5);
        let i = 0;
        for (const k in this.opMap) { (this.opMap as any)[k] = vals[i++]; }
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
                        const valReg = baseReg + 1;
                        this.compileExpr(expr, valReg);
                        const target = stat.vars[i];
                        if (target.type === 'Identifier') {
                            const lIdx = this.locals.indexOf(target.name);
                            if (lIdx !== -1) this.emit('MOVE', lIdx, valReg);
                            else this.emit('SETGLOBAL', valReg, this.addK(target.name));
                        } else if (target.type === 'Member') {
                            const objReg = baseReg + 2;
                            this.compileExpr(target.base, objReg);
                            const keyReg = baseReg + 3;
                            this.compileExpr(target.identifier, keyReg);
                            this.emit('SETTABLE', objReg, keyReg, valReg);
                        }
                    });
                    break;
                case 'If':
                    stat.clauses.forEach((clause) => {
                        this.compileExpr(clause.condition, baseReg);
                        this.compileBlock(clause.body);
                    });
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
            case 'Binary':
                this.compileExpr(e.left, reg);
                this.compileExpr(e.right, reg + 1);
                const ops: Record<string, keyof typeof this.opMap> = {
                    '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', 
                    '%': 'MOD', '^': 'POW', '..': 'CONCAT',
                    '==': 'EQ', '<': 'LT', '<=': 'LE'
                };
                if (ops[e.operator]) this.emit(ops[e.operator], reg, reg, reg + 1);
                break;
            case 'Member':
                this.compileExpr(e.base, reg);
                const keyReg = reg + 1;
                if (e.identifier.type === 'Identifier') {
                    this.emit('LOADK', keyReg, this.addK(e.identifier.name));
                } else {
                    this.compileExpr(e.identifier, keyReg);
                }
                if (e.indexer === ':') {
                    this.emit('MOVE', reg + 1, reg); 
                    this.emit('GETTABLE', reg, reg, keyReg);
                } else {
                    this.emit('GETTABLE', reg, reg, keyReg);
                }
                break;
            case 'Call':
                const isMethod = e.base.type === 'Member' && e.base.indexer === ':';
                this.compileExpr(e.base, reg);
                const argStart = isMethod ? 1 : 0;
                e.args.forEach((arg, i) => {
                    this.compileExpr(arg, reg + argStart + i + 1);
                });
                this.emit('CALL', reg, e.args.length + 1 + argStart, 1);
                break;
            case 'Table':
                this.emit('NEWTABLE', reg, 0, 0);
                e.fields.forEach((field, i) => {
                    const vReg = reg + 1;
                    this.compileExpr(field.value, vReg);
                    const kReg = reg + 2;
                    if (field.key) {
                        this.compileExpr(field.key, kReg);
                        this.emit('SETTABLE', reg, kReg, vReg);
                    } else {
                        this.emit('LOADK', kReg, this.addK(i + 1));
                        this.emit('SETTABLE', reg, kReg, vReg);
                    }
                });
                break;
        }
    }
}
