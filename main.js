import request from 'request';
import { JSDOM } from 'jsdom';
import { Console } from 'console';
import { Transform } from 'stream';
import * as fs from 'fs';

const Node = new JSDOM('').window.Node;
//const { window } = new jsdom.JSDOM(``, { runScripts: "outside-only" });

const url = 'https://www.moto.it/listino/husqvarna/sm-125/sm-125-2010-12/Fp0QVP';

request(url, (error, response, body) => {
   const response_window = (new JSDOM(body, "text/html")).window;

   let HTMLDataSheetSection = response_window.document.querySelector('section.datasheet');
   let ObjDataSheet = {};
   Objectify(HTMLDataSheetSection, ObjDataSheet)
   let Table = AsciiTableFrom(ObjDataSheet);
   Write(Table, './output.txt');

   // console.log(Table);
   // console.log(ObjDataSheet);
});

function Objectify(HTMLNode, ObjVessel) {
   let nodes = HTMLNode.childNodes;
   nodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE || node.nodeName == 'SCRIPT') return;

      let header = node.textContent.split('\n')[2]; // ]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
      if (header === undefined) return;
      
      header = header.trimStart();
      let tmpArr = header.split(' ');
      for (let i = 0; i < tmpArr.length; i++) {
         tmpArr[i] = tmpArr[i].charAt(0).toUpperCase() + tmpArr[i].slice(1);
      }
      header = tmpArr.join(' ');
      

      ObjVessel[header] = {};
      node.childNodes.forEach(child => {
         if (child.nodeType !== Node.ELEMENT_NODE || child.nodeName == 'H2') return;

         let content = child.textContent.split('\n');
         let isKey = true, lastKeyIdx = 0;
         for (let i = 0; i < content.length; i++) {
            content[i] = content[i].trimStart();
            
            // Filter Measurament Units 
            if (  content[i] == 'mm'
               || content[i] == 'pollici'
               || content[i] == 'Kg'
               || content[i] == 'cc'
               || content[i] == 'cc'
               || content[i] == 'km/l'
               || content[i] == 'lt') {
                  ObjVessel[header][content[lastKeyIdx]] += ' ' + content[i];
               content[i] = ''
            }

            if (content[i] == '') continue;

            // Assign Correct Key-Value Relations
            if (isKey) {
               ObjVessel[header][content[i]] = '.';
               lastKeyIdx = i;
               isKey = false;
            } else {
               ObjVessel[header][content[lastKeyIdx]] = content[i];
               isKey = true;
            }
         }
      });
   });
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

function Write(String, Destination) {
   try {
      fs.writeFileSync(Destination, String);
   } catch (err) {
      console.error(err);
   }
}
