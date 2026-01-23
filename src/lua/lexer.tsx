import { Token, TokenType } from './ast';

const KEYWORDS = new Set(['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while']);
const OP_CHARS = new Set(['+', '-', '*', '/', '%', '^', '#', '=', '~', '<', '>', '(', ')', '{', '}', '[', ']', ';', ':', ',', '.']);

export class Lexer {
    private pos = 0;
    private line = 1;
    constructor(private code: string) {}

    tokenize(): Token[] {
        const tokens: Token[] = [];
        while (this.pos < this.code.length) {
            const char = this.code[this.pos];

            if (/\s/.test(char)) {
                if (char === '\n') this.line++;
                this.pos++;
                continue;
            }

            if (char === '-' && this.code[this.pos + 1] === '-') {
                this.pos += 2;
                while (this.pos < this.code.length && this.code[this.pos] !== '\n') this.pos++;
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                let val = '';
                while (this.pos < this.code.length && /[a-zA-Z0-9_]/.test(this.code[this.pos])) {
                    val += this.code[this.pos++];
                }
                tokens.push({
                    type: KEYWORDS.has(val) ? TokenType.Keyword : TokenType.Identifier,
                    value: val,
                    line: this.line
                });
                continue;
            }

            if (/[0-9]/.test(char)) {
                let val = '';
                if (char === '0' && (this.code[this.pos+1] === 'x' || this.code[this.pos+1] === 'X')) {
                    val += '0x'; this.pos += 2;
                }
                while (this.pos < this.code.length && /[0-9a-fA-F\.]/.test(this.code[this.pos])) {
                    val += this.code[this.pos++];
                }
                tokens.push({ type: TokenType.Number, value: val, line: this.line });
                continue;
            }

            if (char === '"' || char === "'") {
                const quote = char;
                let val = '';
                this.pos++;
                while (this.pos < this.code.length) {
                    const c = this.code[this.pos];
                    if (c === '\\') { this.pos++; val += this.code[this.pos++]; } 
                    else if (c === quote) { this.pos++; break; } 
                    else { val += c; this.pos++; }
                }
                tokens.push({ type: TokenType.String, value: val, line: this.line });
                continue;
            }

            if (OP_CHARS.has(char)) {
                let val = char;
                this.pos++;
                const next = this.code[this.pos];
                if ((char === '=' && next === '=') || (char === '~' && next === '=') ||
                    (char === '<' && next === '=') || (char === '>' && next === '=') ||
                    (char === '.' && next === '.') || (char === '.' && next === '.' && this.code[this.pos+1] === '.')) {
                    val += next;
                    this.pos++;
                    if (val === '..' && this.code[this.pos] === '.') { val += '.'; this.pos++; }
                }
                tokens.push({ type: TokenType.Operator, value: val, line: this.line });
                continue;
            }
            this.pos++;
        }
        tokens.push({ type: TokenType.EOF, value: '<eof>', line: this.line });
        return tokens;
    }
}
