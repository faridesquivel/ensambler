import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  allLines: string[] = [];
  allWords: string[] = [];
  currentSegment: string = null;
  lastSegmentInit = '';
  files: File[] = [];
  mustEnd = false;
  selectedFile: any;
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
  constructor() {}

  ngOnInit() {
  }

  onSelect(event) {
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
              this.allWords.push(newWord);
              newWord = '';
              mustClose = false;
            } else if (index === String(leftLine).length - 1) {
              newWord += String(leftLine).charAt(index);
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
  }

  onRemove(event) {
    console.log(event);
    this.files.splice(this.files.indexOf(event), 1);
  }

  analizeWord(word) {
    const isCompound = (word === 'data segment')
    || (word.valueOf() === 'code segment')
    || (word.valueOf() === 'stack segment');
    if (isCompound) {
      return word + ' COMPUESTO';
    }

    const isRegister = (word === 'ax') || (word === 'bx') || (word === 'cx') || (word === 'dx')
    || (word === 'ax,') || (word === 'bx,') || (word === 'cx,') || (word === 'dx,');

    if (isRegister) {
      return word + ' ES UN REGISTRO';
    }
    if (this.reservedWords.includes(word)) {
      return word + ' ES UNA INSTRUCCIÓN';
    } else if (word !== '') {
      if (String(word).charAt(0) === '"' && String(word).charAt((String(word).length - 1)) === '"') {
        return word + ' ES UNA CONSTANTE CARACTER';
      } else if (String(word).charAt(0) === '"' && String(word).charAt((String(word).length - 1)) !== '"') {
        return word + ' ERROR, SE DEBE DE CERRAR LAS COMILLAS PARA SER CONSTANTE';
      }
      const isConst = /byte ptr|word ptr|dup\(("[^"]*"\s*|'[^']*'\s*|\d{1,5})\)|\[("[^"]*"\s*|'[^']*'\s*|\d{1,5})\]|"("[^"]*"\s*|'[^']*'\s*|\d{1,5})"|'("[^"]*"\s*|'[^']*'\s*|\d{1,5})'/gm.test(word);

      if (isConst) {
        return word + ' Es una constante';
      }
      return word + ' Elemento no identificado';
    }
    return null;
  }

  analizeByWords(line) {
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
    if (isCompound) {
      if (this.mustEnd === true) {
        return line + ' Debe de contener un ends antes de abrir un nuevo segmento';
      } else {
        this.mustEnd = true;
        this.currentSegment = line.valueOf();
        return line + ' inicio de segmento';
      }
    }
    const isEnd = line.valueOf() === 'ends';
    if (isEnd) {
      if (this.mustEnd === true) {
        this.mustEnd = false;
        return line + ' fin de segmento';
      } else {
        return line + ' LÍNEA INVÁLIDA, para usar fin de segmento se necesita iniciar un segmento';
      }
    }
    if (this.currentSegment !== null) {
      if (this.currentSegment === 'data segment') {
        return this.analizaDataSegment(line);
      } else if (this.currentSegment === 'stack segment') {
        return this.analizaStackSegment(line);
      } else if (this.currentSegment === 'code segment') {
        return this.analizaCodeSegment(line);
      }
    }
  }

  analizeLine(line) {
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
    if (isCompound) {
      if (this.mustEnd === true) {
        return line + ' Debe de contener un ends antes de abrir un nuevo segmento';
      } else {
        this.mustEnd = true;
        this.currentSegment = line.valueOf();
        return line + ' inicio de segmento';
      }
    }
    const isEnd = line.valueOf() === 'ends';
    if (isEnd) {
      if (this.mustEnd === true) {
        this.mustEnd = false;
        return line + ' fin de segmento';
      } else {
        return line + ' LÍNEA INVÁLIDA, para usar fin de segmento se necesita iniciar un segmento';
      }
    }
    if (this.currentSegment !== null) {
      if (this.currentSegment === 'data segment') {
        return this.analizaDataSegment(line);
      } else if (this.currentSegment === 'stack segment') {
        return this.analizaStackSegment(line);
      } else if (this.currentSegment === 'code segment') {
        return this.analizaCodeSegment(line);
      }
    }
    return line + ' es correcta';
  }

  analizeWords(line) {
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
    if (isCompound) {
      if (this.mustEnd === true) {
        return line + ' Debe de contener un ends antes de abrir un nuevo segmento';
      } else {
        this.mustEnd = true;
        this.currentSegment = line.valueOf();
        return line + ' es un pseudónimo';
      }
    }
    const isEnd = line.valueOf() === 'ends';
    if (isEnd) {
      if (this.mustEnd === true) {
        this.mustEnd = false;
        return line + ' fin de segmento';
      } else {
        return line + ' LÍNEA INVÁLIDA, para usar fin de segmento se necesita iniciar un segmento';
      }
    }
    if (this.currentSegment !== null) {
      if (this.currentSegment === 'data segment') {
        return this.analizaDataSegmentWords(line);
      } else if (this.currentSegment === 'stack segment') {
        return this.analizaStackSegmentWords(line);
      } else if (this.currentSegment === 'code segment') {
        return this.analizaCodeSegmentWords(line);
      }
    }
    return line + ' es correcta';
  }

  analizaCodeSegment(line) {
    // const regex = line.matches("[a-zA-Z][a-zA-Z]+\\s(db|dw|equ),*\\s[A-Z][a-zA-Z]*");

    return line + ' LÍNEA VÁLIDA';
  }

  analizaCodeSegmentWords(line) {
    // const regex = line.matches("[a-zA-Z][a-zA-Z]+\\s(db|dw|equ),*\\s[A-Z][a-zA-Z]*");

    return line + ' LÍNEA VÁLIDA';
  }

  analizaDataSegment(line) {
    const regex = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}\s(db\s(dup\(([-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$|"[^"]*"|'[^']*'|[-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|(?:[a-fA-F0–9]{6}|[a-fA-F0–9]{3}))\s*?$|dw\s[a-z]*|equ\s[a-z]*)/gm.test(line);
    console.log('Regex is: ', regex, ' for line: ', line);
    if (regex === false) {
      return this.analizeLineWithDataSegment(line);
    }
    return regex === true ? (line + ' LÍNEA VÁLIDA') : (line + ' LÍNEA INVÁLIDA');
  }

  analizaDataSegmentWords(line) {
    const regex = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}\s(db\s(dup\(([-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|"[^"]*"|'[^']*')\)\s*$|"[^"]*"|'[^']*'|[-+]?[01]?[0-2]?[0-8]|[0-2]?[0-5]?[0-5]|(?:[a-fA-F0–9]{6}|[a-fA-F0–9]{3}))\s*?$|dw\s[a-z]*|equ\s[a-z]*)/gm.test(line);
    console.log('Regex is: ', regex, ' for line: ', line);
    if (regex === false) {
      return this.analizeLineWithDataSegment(line);
    }
    return regex === true ? (line + ' PALABRA VÁLIDA') : (line + ' PALABRA INVÁLIDA');
  }

  analizeLineWithDataSegment(line) {
    const wordsInLine = line.trim().split(/\s/g);
    if (wordsInLine.length === 3) {
      const badVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}/gm.test(wordsInLine[0]);
      const badSize = /(db|dw|equ)/gm.test(wordsInLine[1]);
      const badConst = /("[^"]*")\s*$|"[^"]*"\s*$|'[^']*'\s*$|[-+]?[01]?[0-2]?[0-8]\s*$|[0-2]?[0-5]?[0-5]\s*$|\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3})\b\s*$/gm.test(wordsInLine[2]);
      console.log('After reviewing ', wordsInLine, ' barVar, barSize and badConst are:', badVar, badSize, badConst);
      if (badVar === false) {
        return line + ' Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
      } else if (badSize === false) {
        return line + ' Error en: ' + wordsInLine[1] + ', el tamaño declarado no es válido';
      } else if (badConst === false) {
        return line + ' Error en: ' + wordsInLine[2] + ', constante inválida';
      }
    } else if (wordsInLine.length === 4) {
      const badVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}/gm.test(wordsInLine[0]);
      const badSize = /(db|dw|equ)/gm.test(wordsInLine[1]);
      const badConst = /"[^"]*"\s*$|'[^']*'\s*$|[-+]?[01]?[0-2]?[0-8]\s*$|[0-2]?[0-5]?[0-5]\s*$|\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3})\b\s*$/gm.test(wordsInLine[2]);
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
      const badVar = /^\s*?[a-zA-Z]{1}[a-zA-Z0-9]{0,9}/gm.test(wordsInLine[0]);
      const badSize = /(db|dw|equ)/gm.test(wordsInLine[1]);
      const badConst = /"[^"]*"\s*$|'[^']*'\s*$|[-+]?[01]?[0-2]?[0-8]\s*$|[0-2]?[0-5]?[0-5]\s*$|\b([a-fA-F0–9]{6}|[a-fA-F0–9]{3})\b\s*$/gm.test(wordsInLine[2]);
      if (badVar === false) {
        return line + ' Error en: ' + wordsInLine[0] + ', el nombre de la variable es inválido';
      } else if (badSize === false) {
        return line + ' Error en: ' + wordsInLine[1] + ', el tamaño es inválido';
      } else if (badConst === false) {
        return line + ' Error en: ' + wordsInLine[2] + ', constante inválida';
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
