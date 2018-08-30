import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { TextMatch } from 'core/bot_api/text_match';
import { fixMultiline, repeatString } from 'core/util/misc';
import { ok } from 'assert';
import { Injectable } from 'core/di/injector';
import { logger } from 'core/logging/logger';

type TokenType = 'number' | 'op' | 'openP' | 'closeP';

interface Token {
  type: TokenType;
  position: number;
  numValue?: number;
  strValue?: string;
}

type NodeType = 'number' | 'paren' | 'binary' | 'unary';

interface Node {
  type: NodeType;
  tokens: Token[];
  values: Node[];
}

@Injectable
export class CalcPlugin implements BotPlugin {
  readonly name: string = 'Calculator';

  constructor(
    private readonly input: Input,
    private readonly api: TgApi
  ) { }

  init(): void {
    this.input.onText(/^[0-9\s\(\)\+\-\/\*\^\.]+$/, this.handle, (msg) => this.api.reply(msg, 'Поделила на ноль!'));
  }

  handle = ({ message, match }: TextMatch) => {
    const source = match[0];
    if (source.trim().length <= 3 || !/[\+\-\/\*\^]/.test(source)) {
      return Promise.resolve();
    }
    const [tokens, tokenError] = tokenize(source);
    if (tokens != null && tokens.length <= 2) {
      return Promise.resolve();
    }
    if (tokenError != null) {
      return this.api.reply(message, tokenError, { parse_mode: 'HTML' });
    }
    logger.debug('Tokens:', tokens);
    const [ast, parseError] = makeAst(source, tokens!);
    if (parseError != null) {
      return this.api.reply(message, parseError, { parse_mode: 'HTML' });
    }
    logger.debug('AST:', ast);
    return this.api.reply(message, `${show(ast!)} = ${evaluate(ast!)}`);
  }
}

function tokenize(s: string): [Token[] | null, string | null] {
  let pos = 0;
  let len = s.length;
  let result: Token[] = [];
  let buf = '';
  let bufPos = 0;

  function addBuf(c: string): void {
    if (buf === '') {
      bufPos = pos;
    }
    buf += c;
  }

  function flushBuf(): void {
    if (buf !== '') {
      result.push({ type: 'number', position: bufPos, numValue: parseFloat(buf), strValue: s.substring(bufPos, pos) });
    }
    buf = '';
  }

  function makePosError(msg: string, pos: number): string {
    return fixMultiline(`
        Ошибка в позиции ${pos + 1}: ${msg}
        <code>${s}</code>
        <code>${repeatString(' ', pos)}^</code>
      `);
  }

  for (; pos < len; ++pos) {
    let c = s.charAt(pos);
    switch (c) {
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        addBuf(c);
        break;
      case '.':
        if (buf === '' || buf.includes('.')) {
          return [null, makePosError('Неожиданный символ \'.\'', pos)];
        }
        addBuf('.');
        break;
      case '+':
      case '-':
      case '/':
      case '*':
      case '^':
        flushBuf();
        result.push({ type: 'op', position: pos, strValue: c });
        break;
      case '(':
        flushBuf();
        result.push({ type: 'openP', position: pos, strValue: c });
        break;
      case ')':
        flushBuf();
        result.push({ type: 'closeP', position: pos, strValue: c });
        break;
      default:
        if (!/\s/.test(c)) {
          return [null, makePosError(`Неожиданный символ '${c}'`, pos)];
        }
        flushBuf();
    }
  }
  flushBuf();
  const errNum = result.find(t => t.type === 'number' && isNaN(t.numValue!));
  if (errNum != null) {
    return [null, makePosError(`'${errNum.strValue!}' не является числом`, errNum.position)];
  }
  return [result, null];
}

function makeAst(s: string, tokens: Token[]): [Node | null, string | null] {
  let pos = 0, len = tokens.length;

  function makePosError(msg: string, pos: number): string {
    return fixMultiline(`
        Ошибка в позиции ${pos + 1}: ${msg}
        <code>${s}</code>
        <code>${repeatString(' ', pos)}^</code>
      `);
  }

  function showToken(token: Token): string {
    return token.strValue!;
  }

  function needOp(token: Token): string {
    return makePosError(`Ожидался оператор, а найдено '${showToken(token)}'`, token.position);
  }

  function needExp(token: Token): string {
    return makePosError(`Ожидалось выражение, а найдено '${showToken(token)}'`, token.position);
  }

  function priority(op: Node): number {
    ok(op.type === 'binary');
    switch (op.tokens[0].strValue) {
      case '+':
      case '-':
        return 1;
      case '*':
      case '/':
        return 2;
      case '^':
        return 3;
      default:
        throw new Error(`Invalid binary op: ${JSON.stringify(op)}`);
    }
  }

  function compose(operators: Node[], operands: Node[]): Node {
    function composeWithMinPriority(leftIndex: number, rightIndex: number, minPriority: number): Node {
      if (leftIndex > rightIndex) {
        return operands[leftIndex];
      }
      let tempMin = 9999;
      let prevMin = tempMin;
      let tempIx = null;
      for (let i = rightIndex; i >= leftIndex; i--) {
        const op = operators[i];
        const prio = priority(op);
        ok(prio >= minPriority);
        if (prio === minPriority) {
          const left = composeWithMinPriority(leftIndex, i - 1, minPriority);
          const right = composeWithMinPriority(i + 1, rightIndex, tempMin);
          return { type: op.type, tokens: op.tokens, values: [left, right] };
        }
        if (tempIx == null || prio < tempMin) {
          tempIx = i;
          prevMin = tempMin;
          tempMin = prio;
        }
      }
      const left = composeWithMinPriority(leftIndex, tempIx! - 1, tempMin);
      const right = composeWithMinPriority(tempIx! + 1, rightIndex, prevMin);
      const op = operators[tempIx!];
      return { type: op.type, tokens: op.tokens, values: [left, right] };
    }

    if (operators.length > 0 && operators[0].type === 'unary') {
      ok(operators.length === operands.length);
      const unaryOp = operators.shift()!;
      unaryOp.values.push(operands.shift()!);
      operands.unshift(unaryOp);
    }
    ok(operators.length + 1 === operands.length);
    return composeWithMinPriority(0, operators.length - 1, 1);
  }

  function parse(openParen?: Token): [Node | null, string | null] {
    let operands: Node[] = [];
    let operators: Node[] = [];
    let mode: 'left' | 'op' | 'right' = 'left';

    while (pos < len) {
      let node: Node;
      let token = tokens[pos];
      switch (token.type) {
        case 'number':
          node = { type: 'number', tokens: [token], values: [] };
          switch (mode) {
            case 'left':
            case 'right':
              operands.push(node);
              mode = 'op';
              ++pos;
              break;
            case 'op':
              return [null, needOp(token)];
          }
          break;
        case 'op':
          node = { type: 'binary', tokens: [token], values: [] };
          switch (mode) {
            case 'left':
              if (token.strValue === '-') {
                node.type = 'unary';
                operators.push(node);
                mode = 'right';
                ++pos;
                break;
              } else {
                return [null, needExp(token)]
              }
            case 'right':
              return [null, needExp(token)];
            case 'op':
              operators.push(node);
              mode = 'right';
              ++pos;
              break;
          }
          break;
        case 'openP':
          node = { type: 'paren', tokens: [token], values: [] };
          switch (mode) {
            case 'left':
            case 'right':
              ++pos;
              const [subNode, err] = parse(token);
              if (err != null) {
                return [null, err];
              }
              node.tokens.push(tokens[pos]);
              node.values.push(subNode!);
              operands.push(node);
              mode = 'op';
              ++pos;
              break;
            case 'op':
              return [null, needOp(token)];
          }
          break;
        case 'closeP':
          switch (mode) {
            case 'left':
            case 'right':
              return [null, needExp(token)];
            case 'op':
              if (openParen == null) {
                return [null, makePosError(`Неожиданная закрывающая скобка`, token.position)];
              }
              return [compose(operators, operands), null];
          }
          break;
      } // switch
    } // while
    if (mode !== 'op') {
      return [null, 'Неожиданный конец выражения'];
    }
    if (openParen != null) {
      return [null, makePosError(`Не закрыта скобка`, openParen.position)];
    }
    return [compose(operators, operands), null];
  }

  return parse();
}

function show(node: Node): string {
  switch (node.type) {
    case 'binary':
      return `${show(node.values[0])} ${node.tokens[0].strValue} ${show(node.values[1])}`;
    case 'number':
      return node.tokens[0].strValue!;
    case 'paren':
      return `(${show(node.values[0])})`;
    case 'unary':
      return `${node.tokens[0].strValue}${show(node.values[0])}`;
  }
}

function evaluate(node: Node): number {
  function evaluateBinary(op: string, a: number, b: number): number {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
      case '^':
        return Math.pow(a, b);
      default:
        throw new Error(`Unrecognized binary op: ${op}`);
    }
  }

  function evaluateUnary(op: string, a: number): number {
    switch (op) {
      case '-':
        return -a;
      default:
        throw new Error(`Unrecognized unary op: ${op}`);
    }
  }

  switch (node.type) {
    case 'binary':
      return evaluateBinary(node.tokens[0].strValue!, evaluate(node.values[0]), evaluate(node.values[1]));
    case 'number':
      return node.tokens[0].numValue!;
    case 'paren':
      return evaluate(node.values[0]);
    case 'unary':
      return evaluateUnary(node.tokens[0].strValue!, evaluate(node.values[0]));
  }
}
