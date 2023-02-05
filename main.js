import request from 'request';
import { JSDOM } from 'jsdom';
import { Console } from 'console';
import { Transform } from 'stream';
import * as fs from 'fs';

const Node = new JSDOM('').window.Node;
//const { window } = new jsdom.JSDOM(``, { runScripts: "outside-only" });

const url = 'https://www.moto.it/listino/kawasaki/z-650/z-650-2021-22/jHoVaT';

request(url, (error, response, body) => {
   const response_window = (new JSDOM(body, "text/html")).window;
   let datasheet = response_window.document.querySelector('section.datasheet');

   let table = {};

   let nodes = datasheet.childNodes;
   nodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE || node.nodeName == 'SCRIPT') return;

      let header = node.textContent.split('\n')[2];
      if (header === undefined) return;
      header = header.trimStart();
      [...header].forEach((char, index, headerCopy) => {
         if (char == ' ') {
            headerCopy[index + 1] = header[index + 1].toUpperCase();
         }
         if (index == header.length - 1) header = headerCopy.join('');
      });

      
      table[header] = {};

      node.childNodes.forEach(child => {
         if (child.nodeType !== Node.ELEMENT_NODE || child.nodeName == 'H2') return;

         let content = child.textContent.split('\n');
         let isKey = true, lastKeyIdx = 0;
         for (let i = 0; i < content.length; i++) {
            content[i] = content[i].trimStart();
            
            // Filter Measurament Units 
            if (content[i] == 'mm'
               || content[i] == 'pollici'
               || content[i] == 'Kg'
               || content[i] == 'cc'
               || content[i] == 'cc'
               || content[i] == 'km/l'
               || content[i] == 'lt') {
               table[header][content[lastKeyIdx]] += ' ' + content[i];
               content[i] = ''
            }

            if (content[i] == '') continue;

            // Assign Correct Key - Value Relations
            if (isKey) {
               table[header][content[i]] = '.';
               lastKeyIdx = i;
               isKey = false;
            } else {
               table[header][content[lastKeyIdx]] = content[i];
               isKey = true;
            }
         }
      });
   });
   // console.log(table);
   Asciify(table);
});

function Asciify(table) {
   const corner = {
      topLeft: '┌', topRight: '┐',
      bottomRight: '┘', bottomLeft: '└'
   }
   const line = {
      horizontal: '─', vertical: '│',
   }
   const cross = {
      middle: '┼',
      top: '┬', right: '┤',
      bottom: '┴', left: '├',
   }

   let output = '';
   Object.keys(table).forEach(category => {
      let maxKeyWidth = 0, maxValueWidth = 0;
      Object.keys(table[category]).forEach(key => {
         if (key.length > maxKeyWidth) maxKeyWidth = key.length;
         if (table[category][key].length > maxValueWidth) maxValueWidth = table[category][key].length;
      });
      const maxTableWidth = maxKeyWidth + maxValueWidth + 9;

      // Creating Table Title
      let title = '';
      title += corner.topLeft;
      for (let i = 0; i < maxTableWidth - 2; i++) title += line.horizontal;
      title += corner.topRight + '\n';
      
      let spaces = (maxTableWidth - 2 - category.length) / 2;
      title += line.vertical;
      for (let i = 0; i < spaces; i++) title += ' ';
      title += category; // Main Title
      for (let i = 0; i < spaces; i++) title += ' ';
      title += line.vertical + '\n';
      if (title.split('\n')[1].length > maxTableWidth) title = title.substring(0, title.length - 3) + line.vertical + '\n';

      title += cross.left;
      for (let i = 0; i < maxKeyWidth + 2; i++) title += line.horizontal;
      title += cross.top;
      for (let i = 0; i < maxValueWidth + 4; i++) title += line.horizontal;
      title += cross.right + '\n';

      // Finalizing Table
      const ts = new Transform({ transform(chunk, enc, cb) { cb(null, chunk) } });
      const logger = new Console({ stdout: ts });
      logger.table(table[category]);
      const tableLines = (ts.read() || '').toString().split(/[\r\n]+/);
      let consoleTable = '';
      for (let i = 0; i < tableLines.length; i++) {
         if (i == 0 || i == 1 || i == 2) continue;
         consoleTable += `${tableLines[i]}\n`;
      }

      output += title + consoleTable;
   });
   
   // Writing in File
   try {
      fs.writeFileSync('./output.txt', output);
   } catch (err) {
      console.error(err);
   }
   console.log(output)
}
