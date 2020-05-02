import { Component, OnInit, ChangeDetectorRef, AfterViewChecked } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewChecked {
  allLines: string[] = [];
  allWords: string[] = [];
  currentAddress = 0;
  currentSegment: string = null;
  lastSegmentInit = '';
  loading = false;
  files: File[] = [];
  mustEnd = false;
  mustEndWord = false;
  selectedFile: any;
  showFileSelector = true;
  showTable = false;
  reservedWords = [
    'aam',
    'cmpsb',
    'jg',
    'jnb',
    'sti',
    'popf',
    'int',
    'not',
    'and',
    'cmp',
    'jnle',
    'ja'
  ];
  registros = ['ax', 'bx', 'cx', 'dx', 'ah', 'al', 'bl', 'bh', 'ch', 'cl', 'dh', 'dl', 'di', 'si', 'bp', 'sp'];
  sRegs = ['ds', 'es', 'ss', 'cs'];
  table = [];
  tags = [];

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
  }

  ngAfterViewChecked() {
    this.cdRef.detectChanges();
  }

  onShowFileSelectorChange() {
    this.showFileSelector = !this.showFileSelector;
  }

  onShowTableChange() {
    this.showTable = !this.showTable;
  }

  onSelect(event) {
    this.loading = true;
    console.log(event);
    this.files.push(...event.addedFiles);
    const file = this.files[0];
    const reader = new FileReader();

    reader.onload = (ev: any) => {
      console.log('Event is ready: ', ev);
      const ff = ev.target.result;
      console.log(ff);
      this.selectedFile = ff;
      const allLines = ff.toString().split(/\r\n|\n/);
      this.allLines = allLines;
      allLines.forEach((line) => {
        line.trim();
        const isComment = line.charAt(0) === ';';
        if (isComment) {
          return;
        }
        const isCompound = (line.valueOf() === 'data segment')
        || (line.valueOf() === 'code segment')
        || (line.valueOf() === 'stack segment');
        if (isCompound) {
          this.allWords.push(line);
          return;
        }
        let commentFound = false;
        let leftLine = '';
        for (let index = 0; index < line.length; index++) {
          if (line.charAt(index) !== ';') {
            if (commentFound === false) {
              leftLine += line.charAt(index);
            }
          } else if (line.charAt(index) === ';') {
            commentFound = true;
          }
        }
        let newWord = '';
        let mustClose = false;
        for (let index = 0; index < String(leftLine).length; index++) {
          if (mustClose === false) {
            if (String(leftLine).charAt(index) === ' ' || String(leftLine).charAt(index) === ',') {
              this.allWords.push(newWord);
              newWord = '';
            } else if (index === String(leftLine).length - 1) {
              newWord += String(leftLine).charAt(index);
              this.allWords.push(newWord);
              newWord = '';
            } else {
              if (String(leftLine).charAt(index) === '"') {
                mustClose = true;
              }
              newWord += String(leftLine).charAt(index);
            }
          } else {
            if (String(leftLine).charAt(index) === '"') {
              newWord += String(leftLine).charAt(index);
              if (String(leftLine).charAt(index + 1) && String(leftLine).charAt(index + 1) === ')') {
                console.log('The next element is ), current saved words are: ', newWord);
                mustClose = false;
              } else {
                mustClose = false;
                this.allWords.push(newWord);
                newWord = '';
              }
            } else if (index === String(leftLine).length - 1) {
              newWord += String(leftLine).charAt(index);
              console.log('Will have to push new word since line ended with " activated', newWord);
              this.allWords.push(newWord);
              newWord = '';
            } else {
              newWord += String(leftLine).charAt(index);
            }
          }
        }
      });
    };

    reader.onerror = (ev) => {
        alert(ev.target);
    };

    reader.readAsText(file);
    this.showFileSelector = false;
    this.showTable = true;
    this.loading = false;
  }

  onRemove(event) {
    console.log(event);
    this.files.splice(this.files.indexOf(event), 1);
  }

  contains(obj) {
    let contains = false;
    // tslint:disable-next-line: prefer-for-of
    for (let index = 0; index < this.table.length; index++) {
      if (this.table[index].symbol === obj.symbol) {
        contains = true;
      }
    }
    return contains;
  }

  isCompound(word) {
    return (word.valueOf().toLowerCase() === 'data segment')
    || (word.valueOf().toLowerCase() === 'code segment')
    || (word.valueOf().toLowerCase() === 'stack segment');
  }

  isEnd(word) {
    return (word.valueOf().toLowerCase() === 'ends');
  }

  isImmediate(word) {
    const isConstNumByteNegative = /^[-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0\s*$/gm.test(word);
    const isConstNumByte = /^[0-2]?[0-5]?[0-5]\s*$/gm.test(word);
    const isConstNumHexa = /^(\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})\b\s*$|^0x[0-9a-fA-F]{1,4}$)/gm.test(word);
    let isValidHexa = false;
    if (isConstNumHexa) {
      isValidHexa = parseInt(word, 16) > 255;
    }
    return isConstNumByte || isConstNumByteNegative || (isConstNumHexa && isValidHexa);
  }

  isMemory(word) {
    // tslint:disable-next-line: max-line-length
    const isMemoryT1 = /^(\[BX \+ SI( \+ d8)?\]|\[BX \+ DI( \+ d8)?\]|\[BP \+ SI( \+ d8)?\]|\[BP \+ DI( \+ d8)?\])|(\[SI\]|\[DI\]|d16|\[BX\])$/gm.test(word);
    // tslint:disable-next-line: max-line-length
    const isMemoryT2 = /^(\[BX \+ SI( \+ d16)?\]|\[BX \+ DI( \+ d16)?\]|\[BP \+ SI( \+ d16)?\]|\[BP \+ DI( \+ d16)?\])|(\[SI( \+ (d8|d16))\]|\[DI( \+ (d8|d16))\]|\[BP( \+ (d8|d16))\]|\[BX( \+ (d8|d16))\])$/gm.test(word);
    const isVar = this.isVar(word);
    return isMemoryT1 || isMemoryT2 || isVar;
  }

  isReg(word) {
    return this.registros.includes(word.toLowerCase());
  }

  isSReg(word) {
    return this.sRegs.includes(word.toLowerCase());
  }

  isVar(word) {
    const isVar = /^[a-zA-Z]{1}[a-zA-Z0-9]{0,9}\s*?$/gm.test(word);
    if (isVar) {
      if (this.registros.includes(word.toLowerCase())) {
        return false;
      }
      if (this.sRegs.includes(word.toLowerCase())) {
        return false;
      }
      return true;
    }
  }

  isWhiteSpace(word) {
    return /^\s*$/gm.test(word);
  }


  addToTable(symbol) {
    if (symbol.type === 'Constante') {
      this.table.push(symbol);
    } else {
      console.log('Current address is: ', this.currentAddress);
      console.log('Current address IN HEX is: ', this.currentAddress.toString(16));
      this.table.push({
        address: this.currentAddress,
        ...symbol
      });
      const size = symbol.size === 'db' ? 1 : 2;
      console.log('Symbol will be added, ', symbol);

      // tslint:disable-next-line: max-line-length
      const valor = symbol.value.length === 1 ? (isNaN(symbol.value[0]) ? (String(symbol.value[0]).length - 2) : size) : (size * symbol.value[0]);
      console.log('Valor añadido es: ', valor);
      this.currentAddress += valor;
    }
  }

  addDSLineToTable(untrimmedLine) {
    const line = untrimmedLine.trim();
    const wordsInLine = [];
    let newWord = '';
    let mustClose = false;
    const lineSize = line.length;
    for (let index = 0; index < line.length; index++) {
      const element = String(line).charAt(index);
      if (element === ' ') {
        if (mustClose === true) {
          newWord += element;
        } else {
          wordsInLine.push(newWord);
          newWord = '';
        }
      } else if (element === '"') {
        if (mustClose === false) {
          mustClose = true;
          newWord += element;
        } else {
          newWord += element;
          wordsInLine.push(newWord);
          newWord = '';
        }
      } else {
        if (index === (lineSize - 1)) {
          newWord += element;
          wordsInLine.push(newWord);
        } else {
          newWord += element;
        }
      }
    }
    let symbol = {};
    console.log('Words in line are:', wordsInLine);
    if (wordsInLine[1] === 'equ') {
      symbol = {
        symbol: wordsInLine[0],
        type: 'Constante',
        value: [wordsInLine[2]],
        size: wordsInLine[1]
      };
    } else {
      symbol = {
        symbol: wordsInLine[0],
        type: 'Variable',
        value: wordsInLine[3] ? [wordsInLine[2], wordsInLine[3]] : [wordsInLine[2]],
        size: wordsInLine[1]
      };
    }
    if (!this.contains(symbol)) {
      this.addToTable(symbol);
    }
    console.log('Got into addDSLine, new table is: ', this.table);
  }

  addCSLineToTable(untrimmedLine) {
    /* const wordsInLine = [];
    let newWord = '';
    let mustClose = false;
    console.log('WILL ADD LINE TO TABLE: ', line);
    const lineSize = line.length;
    console.log('Tmaño: ', lineSize);
    for (let index = 0; index < line.length; index++) {
      const element = String(line).charAt(index);
      console.log('Char verifying: ', element);
      if (element === ' ') {
        if (mustClose === true) {
          newWord += element;
        } else {
          console.log('Will push: ', newWord);
          wordsInLine.push(newWord);
          newWord = '';
        }
      } else if (element === '"') {
        if (mustClose === false) {
          mustClose = true;
          newWord += element;
        } else {
          newWord += element;
          wordsInLine.push(newWord);
          newWord = '';
        }
      } else {
        if (index === (lineSize - 1)) {
          newWord += element;
          wordsInLine.push(newWord);
        } else {
          newWord += element;
        }
      }
    } */
    const wordsInLine = untrimmedLine.trim().split(/\s+/g);
    const isUniqueInstruction = /^(AAM|CMPSB|POPF|STI)$/gm.test(wordsInLine[0]);
    console.log('IS UNIQUE INSTRUCTION: ', untrimmedLine, isUniqueInstruction);
    if (isUniqueInstruction) {
      const symbol = {
        symbol: wordsInLine[0],
        type: 'Instrucción',
        value: [0],
        size: '-'
      };
      this.addToTable(symbol);
    }
  }

  analizeWord(word) {
    console.log('Word is: ', word, this.mustEndWord);
    word.trim();
    if (this.isWhiteSpace(word)) {
      return;
    }
    const isComment = word.charAt(0) === ';';
    if (isComment) {
      return;
    }
    if (this.isCompound(word)) {
      if (this.mustEndWord === true) {
        return word + ' Debe de contener un ends antes de abrir un nuevo segmento';
      } else {
        this.mustEndWord = true;
        this.currentSegment = word.valueOf();
        return word + ' inicio de segmento';
      }
    }
    if (this.isEnd(word)) {
      if (this.mustEndWord === true) {
        this.mustEndWord = false;
        return word + ' fin de segmento';
      } else {
        return word + ' LÍNEA INVÁLIDA, para usar fin de segmento se necesita iniciar un segmento';
      }
    }
    if (this.currentSegment !== null) {
      if (this.currentSegment === 'code segment') {
        if (String(word).charAt(word.length - 1) === ',') {
          let newWord = '';
          for (let index = 0; index < word.length; index++) {
            if (index !== (word.length - 1)) {
              newWord += String(word).charAt(index);
            }
          }
          return this.analizeCodeSegmentWord(newWord);
        }
        return this.analizeCodeSegmentWord(word);
      } else {
        return this.analizeWordWithRegex(word);
      }
    }
  }

  analizeCodeSegmentWord(word) {
    // const regex = line.matches("[a-zA-Z][a-zA-Z]+\\s(db|dw|equ),*\\s[A-Z][a-zA-Z]*");
    if (this.reservedWords.includes(word.toLowerCase())) {
      return word + ' -- es una INSTRUCCIÓN';
    }
    if (this.registros.includes(word.toLowerCase())) {
      return word + ' -- es un REG';
    }
    if (this.sRegs.includes(word.toLowerCase())) {
      return word + ' -- es un SREG';
    }
    // tslint:disable-next-line: max-line-length
    const isMemoryT1 = /^(\[BX \+ SI( \+ d8)?\]|\[BX \+ DI( \+ d8)?\]|\[BP \+ SI( \+ d8)?\]|\[BP \+ DI( \+ d8)?\])|(\[SI\]|\[DI\]|d16|\[BX\])$/gm.test(word);
    if (isMemoryT1) {
      return word + ' -- es una REFERENCIA DE MEMORIA';
    }
    // tslint:disable-next-line: max-line-length
    const isMemoryT2 = /^(\[BX \+ SI( \+ d16)?\]|\[BX \+ DI( \+ d16)?\]|\[BP \+ SI( \+ d16)?\]|\[BP \+ DI( \+ d16)?\])|(\[SI( \+ (d8|d16))\]|\[DI( \+ (d8|d16))\]|\[BP( \+ (d8|d16))\]|\[BX( \+ (d8|d16))\])$/gm.test(word);
    if (isMemoryT2) {
      return word + ' -- es una REFERENCIA DE MEMORIA';
    }
    const isVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}$/gm.test(word);
    if (isVar) {
      return word + ' -- es una VARIABLE';
    }
    const isTag = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}:$/gm.test(word);
    if (isTag) {
      return word + ' -- es una ETIQUETA';
    }
    const isConstNumByteNegative = /^[-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0\s*$/gm.test(word);
    if (isConstNumByteNegative === true) { return word + ' -- es un INMEDIATO'; }
    const isConstNumByte = /^[0-2]?[0-5]?[0-5]\s*$/gm.test(word);
    if (isConstNumByte === true) { return word + ' -- es un INMEDIATO'; }
    const isConstNumHexa = /^(\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})\b\s*$|^0x[0-9a-fA-F]{1,4}$)/gm.test(word);
    if (isConstNumHexa === true) {
      if (parseInt(word, 16) > 255) {
        return word + ' -- es un inmediato';
      }
      return word + ' -- es un inmediato';
    }
    const isConstString = /"[^"]*"\s*$|'[^']*'\s*$/gm.test(word);
    if (isConstString === true) { return word + ' -- es una constante caractér'; }
    return word + ' -- es un símbolo desconocido';
  }

  analizeWordWithRegex(word) {
    const isDupWithByte = /dup\(([-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0|[0-2]?[0-5]?[0-5])\)\s*$/gm.test(word);
    if (isDupWithByte === true) {
      return word + ' -- es un dup o elemento compuesto con byte';
    }
    const isDupWithChar = /dup\(("[^"]*"|'[^']*')\)\s*$/gm.test(word);
    if (isDupWithChar === true) { return word + ' -- es un dup o elemento compuesto con caracter'; }
    const isDupWithHexa = /dup\((\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})\b\s*|^0x[0-9a-fA-F]{1,4})\)\s*$/gm.test(word);
    if (isDupWithHexa === true) { return word + ' -- es un dup o elemento compuesto con hexadecimal'; }
    const isSize = /(db|dw|equ)/gm.test(word);
    if (isSize === true) { return word + ' -- es un símbolo de tamaño'; }
    const isVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}$/gm.test(word);
    if (isVar === true) { return word + ' -- es un símbolo de variable'; }
    const isConstNumByteNegative = /^[-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0\s*$/gm.test(word);
    if (isConstNumByteNegative === true) { return word + ' -- es una constante numérica'; }
    const isConstNumByte = /^[0-2]?[0-5]?[0-5]\s*$/gm.test(word);
    if (isConstNumByte === true) { return word + ' -- es una constante numérica'; }
    const isConstNumHexa = /^(\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})\b\s*$|^0x[0-9a-fA-F]{1,4}$)/gm.test(word);
    if (isConstNumHexa === true) {
      if (parseInt(word, 16) > 255) {
        return word + ' -- es una constante numérica inválida';
      }
      return word + ' -- es una constante numérica';
    }
    const isConstString = /"[^"]*"\s*$|'[^']*'\s*$/gm.test(word);
    if (isConstString === true) { return word + ' -- es una constante caractér'; }
    return word + ' -- elemento inválido';
  }

  analizeLine(line) {
    line.trim();
    if (this.isWhiteSpace(line)) {
      return;
    }
    const isComment = line.charAt(0) === ';';
    if (isComment) {
      return;
    }
    if (this.isCompound(line) === true) {
      if (this.mustEnd === true) {
        return line + ' -- Debe de contener un ends antes de abrir un nuevo segmento \n';
      } else {
        this.mustEnd = true;
        this.currentSegment = line.valueOf();
        return line + ' inicio de segmento \n';
      }
    }
    if (this.isEnd(line)) {
      if (this.mustEnd === true) {
        this.mustEnd = false;
        return line + ' fin de segmento \n';
      } else {
        return line + ' -- Error: Para usar fin de segmento se necesita iniciar un segmento \n';
      }
    }
    if (this.currentSegment !== null) {
      let commentFound = false;
      let leftLine = '';
      for (let index = 0; index < line.length; index++) {
        if (line.charAt(index) !== ';') {
          if (commentFound === false) {
            leftLine += line.charAt(index);
          }
        } else if (line.charAt(index) === ';') {
          commentFound = true;
        }
      }
      if (this.currentSegment === 'data segment') {
        return this.analizaDataSegment(leftLine);
      } else if (this.currentSegment === 'stack segment') {
        return this.analizaStackSegment(leftLine);
      } else if (this.currentSegment === 'code segment') {
        return this.analizaCodeSegment(leftLine);
      }
    }
    return line + ' es correcta';
  }

  analizaCodeSegment(line) {
    // const regex = line.matches("[a-zA-Z][a-zA-Z]+\\s(db|dw|equ),*\\s[A-Z][a-zA-Z]*");
    const regex = /^(AAM|CMPSB|POPF|STI)\s*?$/gm.test(line);
    const isTag = /^[a-zA-Z]{1}[a-zA-Z0-9]{0,9}:\s*?$/gm.test(line);
    const isJNBorJG = /^(JNB\s[a-zA-Z]{1}[a-zA-Z0-9]{0,9}|JG\s[a-zA-Z]{1}[a-zA-Z0-9]{0,9})\s*?$/gm.test(line);
    if (isTag === true) {
      this.tags.push(line);
      return line + ' linea válida';
    }
    if (regex === true) {
      return line + ' LÍNEA VÁLIDA';
    }
    if (isJNBorJG) {
      const wordsInLine = line.trim().split(/\s+/g);
      if (this.sRegs.includes(wordsInLine[1].toLowerCase()) || this.registros.includes(wordsInLine[1].toLowerCase())) {
        // tslint:disable-next-line: max-line-length
        return `${line} -- Error: Se esperaba una etiqueta, en cambio hay un ${this.sRegs.includes(wordsInLine[1].toLowerCase()) ? 'SREG' : 'REG' }`;
      }
      if (!this.tags.includes(wordsInLine[1] + ':')) {
        return `${line} -- Etiqueta no definida`;
      }
      return line + ' LÍNEA VÁLIDA';
    }
    // tslint:disable-next-line: max-line-length
    const isInt = /^INT\s([-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0|[0-2]?[0-5]?[0-5]|(([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})|0x[0-9a-fA-F]{1,4})(h|H)?\s*)$/gm.test(line);
    if (isInt) {
      const wordsInLine = line.trim().split(/\s+/g);
      const isConstNumHexa = /^(([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})|0x[0-9a-fA-F]{1,4})(h|H)?\s*?$/gm.test(wordsInLine[1]);
      if (isConstNumHexa === true) {
        if (parseInt(wordsInLine[1], 16) > 255) {
          return line + ' -- ERROR: Constante numérica inválida';
        }
        return line + ' LÍNEA VÁLIDA';
      }
    }

    // NOT CHECK
    const isNotWReg = /^NOT\s((A|B|C|D|S)(X|H|L|I|P))\s*$/gm.test(line);
    if (isNotWReg) {
      return line + ' LÍNEA VÁLIDA';
    }
    const isNotWMem = /^NOT\s[^\s]*\s*$/gm.test(line);
    if (isNotWMem) {
      const wordsInLine = line.trim().split(/\s+/g);
      if (wordsInLine.length > 2) {
        return line + ' -- ERROR: La instrucción NOT debe de contener sólo un parámetro';
      }
      const isVar = /^[a-zA-Z]{1}[a-zA-Z0-9]{0,9}\s*?$/gm.test(wordsInLine[1]);
      if (isVar) {
        if (this.registros.includes(wordsInLine[1].toLowerCase())) {
          return `${line} -- ERROR: Parámetro inválido para instrucción NOT, no puede ser un registro`;
        }
        if (this.sRegs.includes(wordsInLine[1].toLowerCase())) {
          return `${line} -- ERROR: Parámetro inválido para instrucción NOT, no puede ser un SREG`;
        }
        return `${line} LÍNEA VÁLIDA`;
      }
      if (this.isMemory(wordsInLine[1])) {
        return `${line} LÍNEA VÁLIDA`;
      }
      return `${line} -- ERROR: El parámetro de la instrucción NOT es inválido, debe de contener un registro o memoria`;
    }
    const isAnd = /^AND\s[^\s]+\s*,\s*[^\s]+\s*$/gm.test(line);
    if (isAnd) {
      const wordsInLine = line.trim().split(/\s+|,/g);
      console.log('Words for ISAND', wordsInLine);
      if (wordsInLine.length > 3) {
        return `${line} -- ERROR: La instrucción AND solo puede tener 2 parámetros `;
      }
      if (this.isReg(wordsInLine[1])) {
        if (this.isReg(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        } else if (this.isMemory(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        } else if (this.isImmediate(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        }
        return `${line} -- ERROR: ${wordsInLine[2]} es un parámetro inválido`;
      } else if (this.isMemory(wordsInLine[1])) {
        if (this.isReg(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        } else if (this.isImmediate(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        }
        return `${line} -- ERROR: ${wordsInLine[2]} es un parámetro inválido`;
      }
      return `${line} -- ERROR: ${wordsInLine[1]} es un parámetro inválido`;
    }
    const isCmp = /^CMP\s[^\s]+\s*,\s*[^\s]+\s*$/gm.test(line);
    if (isCmp) {
      const wordsInLine = line.trim().split(/\s+|,/g);
      console.log('Words for Cmp', wordsInLine);
      if (wordsInLine.length > 3) {
        return `${line} -- ERROR: La instrucción CMP solo puede tener 2 parámetros `;
      }
      if (this.isReg(wordsInLine[1])) {
        if (this.isReg(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        } else if (this.isMemory(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        } else if (this.isImmediate(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        }
        return `${line} -- ERROR: ${wordsInLine[2]} es un parámetro inválido`;
      } else if (this.isMemory(wordsInLine[1])) {
        if (this.isReg(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        } else if (this.isImmediate(wordsInLine[2])) {
          return `${line} LÍNEA VÁLIDA`;
        }
        return `${line} -- ERROR: ${wordsInLine[2]} es un parámetro inválido`;
      }
    }
    this.addCSLineToTable(line);
    return this.analizeCodeSegmentLine(line);
  }

  analizeCodeSegmentLine(line) {
    const wordsInLine = line.trim().split(/\s+/g);
    const isNoParamInst = /^(AAM|CMPSB|POPF|STI)$/gm.test(wordsInLine[0]);
    if (isNoParamInst === true) {
      return `${line} -- ERROR: Parámetros inesperados : ${wordsInLine.filter((w, index) => index !== 0 && w)}`;
    }
    const isJNBorJG = /^JNB|JG$/gm.test(wordsInLine[0]);
    if (isJNBorJG === true) {
      if (wordsInLine.length > 2) {
        return `${line} -- ERROR: Parámetros inesperados : ${wordsInLine.filter((w, index) => index !== 0 && w)}`;
      }
      console.log(`${line} -- ERROR: Variable incorrecta`);
      return `${line} -- ERROR: Variable incorrecta`;
    }
    console.log('In code segment, words are: ', wordsInLine);
    return line + ' linea incorrecta';
  }

  analizaDataSegment(line) {
    // tslint:disable-next-line: max-line-length
    const regex = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}\s(db\s(dup\(([-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$|"[^"]*"|'[^']*'|[-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0|[0-2]?[0-5]?[0-5]|(?:[a-fA-F0–9]{6}|[a-fA-F0–9]{3}))\s*?$|dw\s(("[^"]*"|'[^']*')|("[^"]*"|'[^']*')\sdup\(("[^"]*"|'[^']*')\))\s*?$|equ\s("[^"]*"|'[^']*')\s*$)/gm.test(line);
    console.log('Regex is: ', regex, ' for line: ', line);
    if (regex === false) {
      return this.analizeLineWithDataSegment(line);
    }
    this.addDSLineToTable(line);
    return line + ' LÍNEA VÁLIDA';
  }

  analizeLineWithDataSegment(line) {
    const wordsInLine = line.trim().split(/\s+/g);
    console.log('WORDS IN LINEFOR SYNTATIC are: ', wordsInLine);

    const badVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}$/gm.test(wordsInLine[0]);
    const badSize = /(db|dw)$/gm.test(wordsInLine[1]);
    // tslint:disable-next-line: max-line-length
    const badConst = /^"[^"]*"\s*$|^'[^']*'\s*$|^[-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0\s*$|^[0-2]?[0-5]?[0-5]\s*$|^\b([a-fA-F0–9]{6}|^[a-fA-F0–9]{3})\b\s*$/gm.test(wordsInLine[2]);
    const badEquConst = /("[^"]*"|'[^']*')\s*$/gm.test(wordsInLine[2]);
    if (wordsInLine.length === 3) {
      console.log('After reviewing ', wordsInLine, ' barVar, barSize and badConst are:', badVar, badSize, badConst);
      if (wordsInLine[1] === 'equ') {
        if (badVar === false) {
          return line + ' -- Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
        } else if (badEquConst === false) {
          return line + ' -- Error en: ' + wordsInLine[2] + ', constante inválida';
        }
      } else {
        if (badVar === false) {
          return line + ' -- Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
        } else if (badSize === false) {
          return line + ' -- Error en: ' + wordsInLine[1] + ', el tamaño declarado no es válido';
        } else if (badConst === false) {
          return line + ' -- Error en: ' + wordsInLine[2] + ', constante inválida';
        }
      }
    } else if (wordsInLine.length === 4) {
      const badDup = /dup\(([-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$/gm.test(wordsInLine[3]);
      console.log('After reviewing ', wordsInLine, ' barVar, barSize, badConst and badDup are:', badVar, badSize, badConst, badDup);
      if (badVar === false) {
        return line + ' -- Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
      } else if (badSize === false) {
        return line + ' -- Error en: ' + wordsInLine[1] + ', el tamaño es inválido';
      } else if (badConst === false) {
        return line + ' -- Error en: ' + wordsInLine[2] + ', constante inválida';
      } else if (badDup === false) {
        return line + ' -- Error en: ' + wordsInLine[3] + ', DUP inválida';
      }
    } else if (wordsInLine.length > 4) {
      const badDup = /dup\(([-+]?([1-9] | [1-9] [0-9] | 1 [01] [0-9] | 12 [0-7])|0|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$/gm.test(wordsInLine[3]);
      console.log('After reviewing ', wordsInLine, ' barVar, barSize, badConst and badDup are:', badVar, badSize, badConst, badDup);
      if (badVar === false) {
        return line + ' -- Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
      } else if (badSize === false) {
        return line + ' -- Error en: ' + wordsInLine[1] + ', el tamaño es inválido';
      } else if (badConst === false) {
        return line + ' -- Error en: ' + wordsInLine[2] + ', constante inválida';
      } else if (badDup === false) {
        return line + ' -- Error en: ' + wordsInLine[3] + ', DUP inválida';
      }
    }

    return line + ' LÍNEA INVÁLIDA';
  }

  analizaStackSegment(line) {
    const regex = /^\s*?dw\s+("[^"]*"\s*|'[^']*'\s*|\d{1,5})\s*dup\(("[^"]*"\s*|'[^']*'\s*|\d{1,5})\)\s*$/gm.test(line);
    console.log('Regex is: ', regex, ' for line: ', line);
    if (regex === false) {
      return this.analizeLineWithStackSegment(line);
    }
    return line + ' LÍNEA VÁLIDA';
  }

  analizaStackSegmentWords(line) {
    const regex = /^\s*?dw\s+("[^"]*"\s*|'[^']*'\s*|\d{1,5})\s*dup\(("[^"]*"\s*|'[^']*'\s*|\d{1,5})\)\s*$/gm.test(line);
    console.log('Regex is: ', regex, ' for line: ', line);
    if (regex === false) {
      return this.analizeLineWithStackSegment(line);
    }
    return regex === true ? (line + ' LÍNEA VÁLIDA') : (line + ' LÍNEA INVÁLIDA, no se pudo analizar');
  }

  analizeLineWithStackSegment(line) {
    const wordsInLine = line.trim().split(/\s/g).filter(a => a !== '');
    console.log('Words in stack segment: ', wordsInLine);
    if (wordsInLine.length === 3) {
      const badSize = /^dw$/gm.test(wordsInLine[0]);
      const badConst = /("[^"]*"|'[^']*'|\d{1,5})/gm.test(wordsInLine[1]);
      const badDup = /dup\(("[^"]*"\s*|'[^']*'\s*|\d{1,5})\)/gm.test(wordsInLine[1]);
      if (badSize === false) {
        return line + ' -- Error en: ' + wordsInLine[0] + ' tamaño inválido';
      } else if (badConst === false) {
        return line + ' -- Error en: ' + wordsInLine[1] + ' constante inválida';
      } else if (badDup === false) {
        return line + ' -- Error en: ' + wordsInLine[2] + ' DUP inválido';
      }
    }
    return line + ' LÍNEA INVÁLIDA';
  }
}
