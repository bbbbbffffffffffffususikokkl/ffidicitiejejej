// Abstract Syntax Tree
// By Vexile
export enum TokenType {
    Keyword,
    Identifier,
    String,
    Number,
    Operator,
    Punctuation,
    EOF
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
}

export interface ASTNode {
    type: string;
}

export interface Chunk extends ASTNode {
    type: 'Chunk';
    body: Statement[];
}

export type Statement = 
    | { type: 'Assignment', vars: Expression[], init: Expression[] }
    | { type: 'Local', vars: string[], init: Expression[] }
    | { type: 'CallStatement', expression: Expression }
    | { type: 'Function', name: Expression, params: string[], body: Statement[], isLocal: boolean }
    | { type: 'If', clauses: IfClause[], elseBody?: Statement[] }
    | { type: 'While', condition: Expression, body: Statement[] }
    | { type: 'Repeat', condition: Expression, body: Statement[] }
    | { type: 'ForNumeric', variable: string, start: Expression, end: Expression, step?: Expression, body: Statement[] }
    | { type: 'ForGeneric', variables: string[], iterators: Expression[], body: Statement[] }
    | { type: 'Return', args: Expression[] }
    | { type: 'Break' };

export interface IfClause {
    condition: Expression;
    body: Statement[];
}

export type Expression = 
    | { type: 'Identifier', name: string }
    | { type: 'String', value: string }
    | { type: 'Number', value: number }
    | { type: 'Boolean', value: boolean }
    | { type: 'Nil' }
    | { type: 'Vararg' }
    | { type: 'Binary', left: Expression, operator: string, right: Expression }
    | { type: 'Unary', operator: string, argument: Expression }
    | { type: 'Call', base: Expression, args: Expression[] }
    | { type: 'Table', fields: TableField[] }
    | { type: 'Member', base: Expression, indexer: string, identifier: Expression }
    | { type: 'FunctionExpression', params: string[], body: Statement[] };

export interface TableField {
    type: 'TableKey' | 'TableKeyString' | 'TableValue';
    key?: Expression;
    value: Expression;
}