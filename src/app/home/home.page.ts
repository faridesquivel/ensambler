import { Component, OnInit, ChangeDetectorRef, AfterViewChecked } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewChecked {
  allLines: string[] = [];
  allWords: string[] = [];
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
    'popf',
    'sti',
    'int',
    'not',
    'and',
    'cmp',
    'jg',
    'jnb',
    'jnle',
    'ja'
  ];
  registros = ['AX', 'BX', 'CX', 'DX', 'AH', 'AL', 'BL', 'BH', 'CH', 'CL', 'DH', 'DL', 'DI', 'SI', 'BP', 'SP'];
  sRegs = ['DS', 'ES', 'SS', 'CS'];
  table = [];

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
            if (String(leftLine).charAt(index) === ' ') {
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

  analizeWord(word) {
    console.log('Word is: ', word, this.mustEndWord);
    word.trim();
    if (word.valueOf() === '') {
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
        return word + ' es un PSEUDÓNIMO';
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
    if (this.reservedWords.includes(word)) {
      return word + ' es una palabra reservada';
    }
    if (this.registros.includes(word.toUpperCase())) {
      return word + ' es un REG';
    }
    if (this.sRegs.includes(word.toUpperCase())) {
      return word + ' es un SREG';
    }
    const isMemoryT1 = /^(\[BX \+ SI( \+ d8)?\]|\[BX \+ DI( \+ d8)?\]|\[BP \+ SI( \+ d8)?\]|\[BP \+ DI( \+ d8)?\])|(\[SI\]|\[DI\]|d16|\[BX\])$/gm.test(word);
    if (isMemoryT1) {
      return word + ' es una referencia de memoria';
    }
    const isMemoryT2 = /^(\[BX \+ SI( \+ d16)?\]|\[BX \+ DI( \+ d16)?\]|\[BP \+ SI( \+ d16)?\]|\[BP \+ DI( \+ d16)?\])|(\[SI( \+ (d8|d16))\]|\[DI( \+ (d8|d16))\]|\[BP( \+ (d8|d16))\]|\[BX( \+ (d8|d16))\])$/gm.test(word);
    if (isMemoryT2) {
      return word + ' es una referencia de memoria';
    }
    const isVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}$/gm.test(word);
    if (isVar) {
      return word + ' es una variable';
    }
    const isConstNumByteNegative = /^[-+]?[01]?[0-2]?[0-8]\s*$/gm.test(word);
    if (isConstNumByteNegative === true) { return word + ' es un inmediato'; }
    const isConstNumByte = /^[0-2]?[0-5]?[0-5]\s*$/gm.test(word);
    if (isConstNumByte === true) { return word + ' es un inmediato'; }
    const isConstNumHexa = /^(\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})\b\s*$|^0x[0-9a-fA-F]{1,4}$)/gm.test(word);
    if (isConstNumHexa === true) {
      if (parseInt(word, 16) > 255) {
        return word + ' es un inmediato';
      }
      return word + ' es un inmediato';
    }
    const isConstString = /"[^"]*"\s*$|'[^']*'\s*$/gm.test(word);
    if (isConstString === true) { return word + ' es una constante caractér'; }
    return word + ' es un símbolo desconocido';
  }

  analizeWordWithRegex(word) {
    const isDupWithByte = /dup\(([-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5])\)\s*$/gm.test(word);
    if (isDupWithByte === true) {
      return word + ' es un dup o elemento compuesto con byte';
    }
    const isDupWithChar = /dup\(("[^"]*"|'[^']*')\)\s*$/gm.test(word);
    if (isDupWithChar === true) return word + ' es un dup o elemento compuesto con caracter';
    const isDupWithHexa = /dup\((\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})\b\s*|^0x[0-9a-fA-F]{1,4})\)\s*$/gm.test(word);
    if (isDupWithHexa === true) return word + ' es un dup o elemento compuesto con hexadecimal';
    const isSize = /(db|dw|equ)/gm.test(word);
    if (isSize === true) return word + ' es un símbolo de tamaño';
    const isVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}$/gm.test(word);
    if (isVar === true) return word + ' es un símbolo de variable';
    const isConstNumByteNegative = /^[-+]?[01]?[0-2]?[0-8]\s*$/gm.test(word);
    if (isConstNumByteNegative === true) return word + ' es una constante numérica';
    const isConstNumByte = /^[0-2]?[0-5]?[0-5]\s*$/gm.test(word);
    if (isConstNumByte === true) return word + ' es una constante numérica';
    const isConstNumHexa = /^(\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3}|[0-9a-fA-F]{2,6})\b\s*$|^0x[0-9a-fA-F]{1,4}$)/gm.test(word);
    if (isConstNumHexa === true) {
      if (parseInt(word, 16) > 255) {
        return word + ' es una constante numérica inválida';
      }
      return word + ' es una constante numérica';
    }
    const isConstString = /"[^"]*"\s*$|'[^']*'\s*$/gm.test(word);
    if (isConstString === true) return word + ' es una constante caractér';
    return word + ' elemento inválido';
  }

  analizeLine(line) {
    console.log('Linea: ', line , this.mustEnd);
    line.trim();
    if (line.valueOf() === '') {
      return;
    }
    const isComment = line.charAt(0) === ';';
    if (isComment) {
      return;
    }
    const isCompound = (line.valueOf() === 'data segment')
    || (line.valueOf() === 'code segment')
    || (line.valueOf() === 'stack segment');
    if (isCompound === true) {
      console.log('Is compound', isCompound);
      console.log('mustEND:!', this.mustEnd);
      if (this.mustEnd === true) {
        return line + ' Debe de contener un ends antes de abrir un nuevo segmento \n';
      } else {
        this.mustEnd = true;
        this.currentSegment = line.valueOf();
        return line + ' inicio de segmento \n';
      }
    }
    const isEnd = line.valueOf() === 'ends';
    if (isEnd) {
      if (this.mustEnd === true) {
        this.mustEnd = false;
        return line + ' fin de segmento \n';
      } else {
        return line + ' LÍNEA INVÁLIDA, para usar fin de segmento se necesita iniciar un segmento \n';
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
    const regex = /^(AAM|CMPSB|POPF|STI|JNB\s[a-zA-Z]{1}[a-zA-Z0-9]{0,9}|JG\s[a-zA-Z]{1}[a-zA-Z0-9]{0,9})$/gm.test(line);
    if (regex === true) {
      console.log('Linea es válida: ', line);
      return line + ' LÍNEA VÁLIDA';
    }
    console.log('Linea NO FUE válida: ', line);
    return this.analizeCodeSegmentLine(line);
  }

  analizeCodeSegmentLine(line) {
    const wordsInLine = line.trim().split(/\s+/g);
    console.log('In code segment, words are: ', wordsInLine);
    return line + ' linea incorrecta';
  }

  analizaDataSegment(line) {
    const regex = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}\s(db\s(dup\(([-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$|"[^"]*"|'[^']*'|[-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|(?:[a-fA-F0–9]{6}|[a-fA-F0–9]{3}))\s*?$|dw\s(("[^"]*"|'[^']*')|("[^"]*"|'[^']*')\sdup\(("[^"]*"|'[^']*')\))\s*?$|equ\s("[^"]*"|'[^']*')\s*$)/gm.test(line);
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
    const badConst = /^"[^"]*"\s*$|^'[^']*'\s*$|^[-+]?[01]?[0-2]?[0-8]\s*$|^[0-2]?[0-5]?[0-5]\s*$|^\b([a-fA-F0–9]{6}|^[a-fA-F0–9]{3})\b\s*$/gm.test(wordsInLine[2]);
    const badEquConst = /("[^"]*"|'[^']*')\s*$/gm.test(wordsInLine[2]);
    if (wordsInLine.length === 3) {
      console.log('After reviewing ', wordsInLine, ' barVar, barSize and badConst are:', badVar, badSize, badConst);
      if (wordsInLine[1] === 'equ') {
        if (badVar === false) {
          return line + ' Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
        } else if (badEquConst === false) {
          return line + ' Error en: ' + wordsInLine[2] + ', constante inválida';
        }
      } else {
        if (badVar === false) {
          return line + ' Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
        } else if (badSize === false) {
          return line + ' Error en: ' + wordsInLine[1] + ', el tamaño declarado no es válido';
        } else if (badConst === false) {
          return line + ' Error en: ' + wordsInLine[2] + ', constante inválida';
        }
      }
    } else if (wordsInLine.length === 4) {
      const badDup = /dup\(([-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$/gm.test(wordsInLine[3]);
      console.log('After reviewing ', wordsInLine, ' barVar, barSize, badConst and badDup are:', badVar, badSize, badConst, badDup);
      if (badVar === false) {
        return line + ' Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
      } else if (badSize === false) {
        return line + ' Error en: ' + wordsInLine[1] + ', el tamaño es inválido';
      } else if (badConst === false) {
        return line + ' Error en: ' + wordsInLine[2] + ', constante inválida';
      } else if (badDup === false) {
        return line + ' Error en: ' + wordsInLine[3] + ', DUP inválida';
      }
    } else if (wordsInLine.length > 4) {
      const badDup = /dup\(([-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$/gm.test(wordsInLine[3]);
      console.log('After reviewing ', wordsInLine, ' barVar, barSize, badConst and badDup are:', badVar, badSize, badConst, badDup);
      if (badVar === false) {
        return line + ' Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
      } else if (badSize === false) {
        return line + ' Error en: ' + wordsInLine[1] + ', el tamaño es inválido';
      } else if (badConst === false) {
        return line + ' Error en: ' + wordsInLine[2] + ', constante inválida';
      } else if (badDup === false) {
        return line + ' Error en: ' + wordsInLine[3] + ', DUP inválida';
      }
    }

    return line + ' LÍNEA INVÁLIDA';
  }

  addDSLineToTable(line) {
    const wordsInLine = line.trim().split(/\s+/g);
    let symbol = {};
    if (wordsInLine[1] === 'equ') {
      symbol = {
        symbol: wordsInLine[0],
        type: 'Constante',
        value: wordsInLine[2],
        size: wordsInLine[1]
      };
    } else {
      symbol = {
        symbol: wordsInLine[0],
        type: 'Variable',
        value: wordsInLine[2],
        size: wordsInLine[1]
      };
    }
    if (!this.contains(symbol)) {
      this.table.push(symbol);
    }
    console.log('Got into addDSLine, new table is: ', this.table);
  }

  analizaStackSegment(line) {
    const regex = /^\s*?dw\s+("[^"]*"\s*|'[^']*'\s*|\d{1,5})\s*dup\(("[^"]*"\s*|'[^']*'\s*|\d{1,5})\)\s*$/gm.test(line);
    console.log('Regex is: ', regex, ' for line: ', line);
    if (regex === false) {
      return this.analizeLineWithStackSegment(line);
    }
    return regex === true ? (line + ' LÍNEA VÁLIDA') : (line + ' LÍNEA INVÁLIDA, no se pudo analizar');
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
        return line + ' Error en: ' + wordsInLine[0] + ' tamaño inválido';
      } else if (badConst === false) {
        return line + ' Error en: ' + wordsInLine[1] + ' constante inválida';
      } else if (badDup === false) {
        return line + ' Error en: ' + wordsInLine[2] + ' DUP inválido';
      }
    }
    return line + ' LÍNEA INVÁLIDA';
  }
}
