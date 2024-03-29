import request from 'request';
import { JSDOM } from 'jsdom';
import { Console } from 'console';
import { Transform } from 'stream';
import * as fs from 'fs';

const Node = new JSDOM('').window.Node;
//const { window } = new jsdom.JSDOM(``, { runScripts: "outside-only" });

const url = 'https://www.moto.it/listino/kawasaki/ninja-400/ninja-400-2023/cl07Kc';

request(url, (error, response, body) => {
   const response_window = (new JSDOM(body, "text/html")).window;

   let HTMLDataSheetSection = response_window.document.querySelector('section.datasheet');
   let ObjDataSheet = {};
   Objectify(HTMLDataSheetSection, ObjDataSheet)
   // let Table = AsciiTableFrom(ObjDataSheet);
   let Table = HTMLTableFrom(ObjDataSheet);
   Write(Table, './output.txt');

   // console.log(Table);
   // console.log(ObjDataSheet);
});

function Objectify(HTMLNode, ObjVessel) {
   (HTMLNode.childNodes).forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE || node.nodeName == 'SCRIPT') return;

      let header = node.textContent.split('\n')[2];
      if (header === undefined) return;
      header = TitleCase(header);

      ObjVessel[header] = {};
      (node.childNodes).forEach(child => {
         if (child.nodeType !== Node.ELEMENT_NODE || child.nodeName == 'H2') return;

         let content = child.textContent.split('\n');
         Fill(ObjVessel[header], content);
      });
   });
}

function TitleCase(string) {
   string = string.trimStart();
   let tmpArr = string.split(' ');
   for (let i = 0; i < tmpArr.length; i++) {
      tmpArr[i] = tmpArr[i].charAt(0).toUpperCase() + tmpArr[i].slice(1);
   }
   return tmpArr.join(' ');
}

function Fill(EmptyObject, StringArr) {
   let isKey = true, lastKeyIdx = 0;
   for (let i = 0; i < StringArr.length; i++) {
      StringArr[i] = StringArr[i].trimStart();
      
      // Filter Measurament Units 
      if (  StringArr[i] == 'mm'
         || StringArr[i] == 'pollici'
         || StringArr[i] == 'Kg'
         || StringArr[i] == 'cc'
         || StringArr[i] == 'cc'
         || StringArr[i] == 'km/l'
         || StringArr[i] == 'lt') {
         EmptyObject[StringArr[lastKeyIdx]] += ' ' + StringArr[i];
         StringArr[i] = ''
      }

      if (StringArr[i] == '') continue;

      // Assign Correct Key-Value Relations
      if (isKey) {
         EmptyObject[StringArr[i]] = '.';
         lastKeyIdx = i;
         isKey = false;
      } else {
         EmptyObject[StringArr[lastKeyIdx]] = StringArr[i];
         isKey = true;
      }
   }
}

function AsciiTableFrom(ComplexObject) {
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
   Object.keys(ComplexObject).forEach(category => {

      let maxKeyWidth = 0, maxValueWidth = 0;
      Object.keys(ComplexObject[category]).forEach(key => {
         if (key.length > maxKeyWidth) maxKeyWidth = key.length;
         if (ComplexObject[category][key].length > maxValueWidth) maxValueWidth = ComplexObject[category][key].length;
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
      logger.table(ComplexObject[category]);
      const tableLines = (ts.read() || '').toString().split(/[\r\n]+/);
      let consoleTable = '';
      for (let i = 0; i < tableLines.length; i++) {
         if (i == 0 || i == 1 || i == 2) continue;
         consoleTable += `${tableLines[i]}\n`;
      }

      output += title + consoleTable;
   });

   return output;
}

function HTMLTableFrom(ComplexObject) {
   let output = '';
   for (const category in ComplexObject) {
      // console.log(category);
      output += '<table class="bike-datasheet">\n'
      output += `<tr><th class="datasheet-category" colspan="2">${category}</th></tr>\n`
      for (const key in ComplexObject[category]) {
         // console.log(`\t${key} ::: ${ComplexObject[category][key]}`);
         const value = ComplexObject[category][key];
         output += `<tr><td class="key">${key}</td><td class="value">${value}</td></tr>\n`
      }
      output += '</table>\n'
   }
   return output;
}

function Write(String, Destination) {
   try {
      fs.writeFileSync(Destination, String);
   } catch (err) {
      console.error(err);
   }
}
