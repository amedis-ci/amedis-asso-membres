(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // shims/buffer.js
  var require_buffer = __commonJS({
    "shims/buffer.js"(exports, module) {
      "use strict";
      init_inject();
      var Buffer3 = class _Buffer extends Uint8Array {
        static from(x, enc) {
          if (typeof x === "string") {
            if (enc === "base64") {
              const s = atob(x);
              const b3 = new _Buffer(s.length);
              for (let i = 0; i < s.length; i++) b3[i] = s.charCodeAt(i);
              return b3;
            }
            if (enc === "latin1" || enc === "binary") {
              const b3 = new _Buffer(x.length);
              for (let i = 0; i < x.length; i++) b3[i] = x.charCodeAt(i) & 255;
              return b3;
            }
            const u = new TextEncoder().encode(x);
            const b2 = new _Buffer(u.length);
            b2.set(u);
            return b2;
          }
          const b = new _Buffer(x.length);
          b.set(x);
          return b;
        }
        static alloc(n) {
          return new _Buffer(n);
        }
        static isBuffer(x) {
          return x instanceof _Buffer;
        }
        static concat(l) {
          const n = l.reduce((t, x) => t + x.length, 0), b = new _Buffer(n);
          let p = 0;
          for (const x of l) {
            b.set(x, p);
            p += x.length;
          }
          return b;
        }
        readUInt16LE(i) {
          return this[i] | this[i + 1] << 8;
        }
        readUInt32LE(i) {
          return (this[i] | this[i + 1] << 8 | this[i + 2] << 16) + this[i + 3] * 16777216;
        }
        writeUInt16LE(v, i) {
          this[i] = v & 255;
          this[i + 1] = v >>> 8 & 255;
          return i + 2;
        }
        writeUInt32LE(v, i) {
          v = v >>> 0;
          this[i] = v & 255;
          this[i + 1] = v >>> 8 & 255;
          this[i + 2] = v >>> 16 & 255;
          this[i + 3] = v >>> 24 & 255;
          return i + 4;
        }
        slice(a, b) {
          const s = this.subarray(a, b);
          const r = new _Buffer(s.length);
          r.set(s);
          return r;
        }
        toString(enc) {
          if (enc === "base64") {
            let s = "";
            for (let i = 0; i < this.length; i += 32768) s += String.fromCharCode.apply(null, this.subarray(i, i + 32768));
            return btoa(s);
          }
          if (enc === "latin1" || enc === "binary") {
            let s = "";
            for (let i = 0; i < this.length; i += 32768) s += String.fromCharCode.apply(null, this.subarray(i, i + 32768));
            return s;
          }
          return new TextDecoder("utf-8").decode(this);
        }
      };
      module.exports = { Buffer: Buffer3 };
    }
  });

  // shims/inject.js
  var import_buffer;
  var init_inject = __esm({
    "shims/inject.js"() {
      import_buffer = __toESM(require_buffer());
    }
  });

  // shims/zlib.js
  var require_zlib = __commonJS({
    "shims/zlib.js"(exports, module) {
      "use strict";
      init_inject();
      var { Buffer: Buffer3 } = require_buffer();
      module.exports = {
        inflateRawSync: (b) => Buffer3.from(window.AmedisNatif.inflateRaw(Buffer3.from(b).toString("base64")), "base64"),
        deflateRawSync: (b) => Buffer3.from(window.AmedisNatif.deflateRaw(Buffer3.from(b).toString("base64")), "base64")
      };
    }
  });

  // ../../asso/app/lib/xlsx.js
  var require_xlsx = __commonJS({
    "../../asso/app/lib/xlsx.js"(exports, module) {
      "use strict";
      init_inject();
      var zlib = require_zlib();
      function lireZip(buf) {
        let eocd = -1;
        for (let i = buf.length - 22; i >= Math.max(0, buf.length - 7e4); i--) {
          if (buf.readUInt32LE(i) === 101010256) {
            eocd = i;
            break;
          }
        }
        if (eocd < 0) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx / .xlsm) valide.");
        const nb = buf.readUInt16LE(eocd + 10);
        let p = buf.readUInt32LE(eocd + 16);
        const fichiers = {};
        for (let k = 0; k < nb; k++) {
          if (buf.readUInt32LE(p) !== 33639248) break;
          const methode = buf.readUInt16LE(p + 10);
          const tailleC = buf.readUInt32LE(p + 20);
          const lnom = buf.readUInt16LE(p + 28), lext = buf.readUInt16LE(p + 30), lcom = buf.readUInt16LE(p + 32);
          const offLocal = buf.readUInt32LE(p + 42);
          const nom = buf.slice(p + 46, p + 46 + lnom).toString("utf8");
          fichiers[nom] = { methode, tailleC, offLocal };
          p += 46 + lnom + lext + lcom;
        }
        return {
          noms: Object.keys(fichiers),
          lire(nom) {
            const f = fichiers[nom];
            if (!f) return null;
            const l = f.offLocal;
            const debut = l + 30 + buf.readUInt16LE(l + 26) + buf.readUInt16LE(l + 28);
            const data = buf.slice(debut, debut + f.tailleC);
            return (f.methode === 0 ? data : zlib.inflateRawSync(data)).toString("utf8");
          }
        };
      }
      function decoderXml(s) {
        return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, "&");
      }
      function colIndex(ref) {
        const m = /^([A-Z]+)/.exec(ref);
        let n = 0;
        for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
        return n - 1;
      }
      function lireClasseur(buf) {
        const z = lireZip(buf);
        const partages = [];
        const ss = z.lire("xl/sharedStrings.xml");
        if (ss) {
          for (const si of ss.match(/<si>[\s\S]*?<\/si>/g) || []) {
            const t = (si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((x) => decoderXml(x.replace(/<[^>]+>/g, ""))).join("");
            partages.push(t);
          }
        }
        const wb = z.lire("xl/workbook.xml") || "";
        const rels = z.lire("xl/_rels/workbook.xml.rels") || "";
        const cibles = {};
        for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
          const id = /Id="([^"]+)"/.exec(m[0]), t = /Target="([^"]+)"/.exec(m[0]);
          if (id && t) cibles[id[1]] = t[1].replace(/^\/?xl\//, "").replace(/^\//, "");
        }
        const feuilles = [];
        for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
          const nom = decoderXml((/name="([^"]*)"/.exec(m[0]) || [])[1] || "");
          const rid = (/r:id="([^"]+)"/.exec(m[0]) || [])[1];
          const xml = z.lire("xl/" + cibles[rid]);
          if (!xml) continue;
          const lignes = [];
          for (const row of xml.match(/<row\b[\s\S]*?<\/row>|<row\b[^>]*\/>/g) || []) {
            const rn = +(/\br="(\d+)"/.exec(row) || [])[1];
            const ligne = [];
            for (const c of row.match(/<c\b[^>]*\/>|<c\b[\s\S]*?<\/c>/g) || []) {
              const ref = (/\br="([A-Z]+\d+)"/.exec(c) || [])[1];
              if (!ref) continue;
              const t = (/\bt="([^"]+)"/.exec(c) || [])[1];
              const v = /<v>([\s\S]*?)<\/v>/.exec(c);
              let val = null;
              if (t === "s" && v) val = partages[+v[1]];
              else if (t === "inlineStr") val = decoderXml((/<t[^>]*>([\s\S]*?)<\/t>/.exec(c) || [, ""])[1]);
              else if (t === "str" && v) val = decoderXml(v[1]);
              else if (t === "b" && v) val = v[1] === "1";
              else if (t === "e") val = null;
              else if (v) val = Number(v[1]);
              ligne[colIndex(ref)] = val;
            }
            lignes[rn - 1] = ligne;
          }
          for (let i = 0; i < lignes.length; i++) if (!lignes[i]) lignes[i] = [];
          feuilles.push({ nom, lignes });
        }
        return { feuilles };
      }
      var TABLE_CRC = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
          let c = n;
          for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
          t[n] = c >>> 0;
        }
        return t;
      })();
      function crc32(buf) {
        let c = 4294967295;
        for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 255] ^ c >>> 8;
        return (c ^ 4294967295) >>> 0;
      }
      function ecrireZip(entrees) {
        const locaux = [], centraux = [];
        let offset = 0;
        for (const { nom, contenu } of entrees) {
          const data = import_buffer.Buffer.isBuffer(contenu) ? contenu : import_buffer.Buffer.from(contenu, "utf8");
          const comp = zlib.deflateRawSync(data), bnom = import_buffer.Buffer.from(nom, "utf8"), crc = crc32(data);
          const h = import_buffer.Buffer.alloc(30);
          h.writeUInt32LE(67324752, 0);
          h.writeUInt16LE(20, 4);
          h.writeUInt16LE(2048, 6);
          h.writeUInt16LE(8, 8);
          h.writeUInt32LE(0, 10);
          h.writeUInt32LE(crc, 14);
          h.writeUInt32LE(comp.length, 18);
          h.writeUInt32LE(data.length, 22);
          h.writeUInt16LE(bnom.length, 26);
          h.writeUInt16LE(0, 28);
          locaux.push(h, bnom, comp);
          const c = import_buffer.Buffer.alloc(46);
          c.writeUInt32LE(33639248, 0);
          c.writeUInt16LE(20, 4);
          c.writeUInt16LE(20, 6);
          c.writeUInt16LE(2048, 8);
          c.writeUInt16LE(8, 10);
          c.writeUInt32LE(0, 12);
          c.writeUInt32LE(crc, 16);
          c.writeUInt32LE(comp.length, 20);
          c.writeUInt32LE(data.length, 24);
          c.writeUInt16LE(bnom.length, 28);
          c.writeUInt32LE(offset, 42);
          centraux.push(c, bnom);
          offset += 30 + bnom.length + comp.length;
        }
        const central = import_buffer.Buffer.concat(centraux);
        const fin = import_buffer.Buffer.alloc(22);
        fin.writeUInt32LE(101010256, 0);
        fin.writeUInt16LE(entrees.length, 8);
        fin.writeUInt16LE(entrees.length, 10);
        fin.writeUInt32LE(central.length, 12);
        fin.writeUInt32LE(offset, 16);
        return import_buffer.Buffer.concat([...locaux, central, fin]);
      }
      function echapper(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
      }
      function nomCol(i) {
        let s = "";
        i++;
        while (i > 0) {
          const r = (i - 1) % 26;
          s = String.fromCharCode(65 + r) + s;
          i = Math.floor((i - 1) / 26);
        }
        return s;
      }
      function ecrireClasseur(feuilles) {
        const entrees = [];
        const ct = [
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
          '<Default Extension="xml" ContentType="application/xml"/>',
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        ];
        feuilles.forEach((f, i) => ct.push(`<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`));
        ct.push("</Types>");
        entrees.push({ nom: "[Content_Types].xml", contenu: ct.join("") });
        entrees.push({ nom: "_rels/.rels", contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
        entrees.push({ nom: "xl/workbook.xml", contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + feuilles.map((f, i) => `<sheet name="${echapper(String(f.nom).replace(/[\\/?*\[\]:]/g, " ").slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") + "</sheets></workbook>" });
        entrees.push({ nom: "xl/_rels/workbook.xml.rels", contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + feuilles.map((f, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") + `<Relationship Id="rId${feuilles.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` });
        entrees.push({ nom: "xl/styles.xml", contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/><xf borderId="1" applyBorder="1"/></cellXfs></styleSheet>' });
        feuilles.forEach((f, i) => {
          const cols = (f.largeurs || []).map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join("");
          const rows = f.lignes.map((l, r) => '<row r="' + (r + 1) + '">' + l.map((v, c) => {
            if (v === null || v === void 0 || v === "") return "";
            const ref = nomCol(c) + (r + 1), s = r === 0 ? ' s="1"' : ' s="2"';
            if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
            return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${echapper(v)}</t></is></c>`;
          }).join("") + "</row>").join("");
          entrees.push({ nom: `xl/worksheets/sheet${i + 1}.xml`, contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + (cols ? "<cols>" + cols + "</cols>" : "") + "<sheetData>" + rows + "</sheetData></worksheet>" });
        });
        return ecrireZip(entrees);
      }
      module.exports = { lireClasseur, ecrireClasseur };
    }
  });

  // ../../asso/app/lib/qrcode/QRMode.js
  var require_QRMode = __commonJS({
    "../../asso/app/lib/qrcode/QRMode.js"(exports, module) {
      init_inject();
      module.exports = {
        MODE_NUMBER: 1 << 0,
        MODE_ALPHA_NUM: 1 << 1,
        MODE_8BIT_BYTE: 1 << 2,
        MODE_KANJI: 1 << 3
      };
    }
  });

  // ../../asso/app/lib/qrcode/QR8bitByte.js
  var require_QR8bitByte = __commonJS({
    "../../asso/app/lib/qrcode/QR8bitByte.js"(exports, module) {
      init_inject();
      var QRMode = require_QRMode();
      function QR8bitByte(data) {
        this.mode = QRMode.MODE_8BIT_BYTE;
        this.data = data;
      }
      QR8bitByte.prototype = {
        getLength: function() {
          return this.data.length;
        },
        write: function(buffer) {
          for (var i = 0; i < this.data.length; i++) {
            buffer.put(this.data.charCodeAt(i), 8);
          }
        }
      };
      module.exports = QR8bitByte;
    }
  });

  // ../../asso/app/lib/qrcode/QRMath.js
  var require_QRMath = __commonJS({
    "../../asso/app/lib/qrcode/QRMath.js"(exports, module) {
      init_inject();
      var QRMath = {
        glog: function(n) {
          if (n < 1) {
            throw new Error("glog(" + n + ")");
          }
          return QRMath.LOG_TABLE[n];
        },
        gexp: function(n) {
          while (n < 0) {
            n += 255;
          }
          while (n >= 256) {
            n -= 255;
          }
          return QRMath.EXP_TABLE[n];
        },
        EXP_TABLE: new Array(256),
        LOG_TABLE: new Array(256)
      };
      for (i = 0; i < 8; i++) {
        QRMath.EXP_TABLE[i] = 1 << i;
      }
      var i;
      for (i = 8; i < 256; i++) {
        QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
      }
      var i;
      for (i = 0; i < 255; i++) {
        QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
      }
      var i;
      module.exports = QRMath;
    }
  });

  // ../../asso/app/lib/qrcode/QRPolynomial.js
  var require_QRPolynomial = __commonJS({
    "../../asso/app/lib/qrcode/QRPolynomial.js"(exports, module) {
      init_inject();
      var QRMath = require_QRMath();
      function QRPolynomial(num, shift) {
        if (num.length === void 0) {
          throw new Error(num.length + "/" + shift);
        }
        var offset = 0;
        while (offset < num.length && num[offset] === 0) {
          offset++;
        }
        this.num = new Array(num.length - offset + shift);
        for (var i = 0; i < num.length - offset; i++) {
          this.num[i] = num[i + offset];
        }
      }
      QRPolynomial.prototype = {
        get: function(index) {
          return this.num[index];
        },
        getLength: function() {
          return this.num.length;
        },
        multiply: function(e) {
          var num = new Array(this.getLength() + e.getLength() - 1);
          for (var i = 0; i < this.getLength(); i++) {
            for (var j = 0; j < e.getLength(); j++) {
              num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
            }
          }
          return new QRPolynomial(num, 0);
        },
        mod: function(e) {
          if (this.getLength() - e.getLength() < 0) {
            return this;
          }
          var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
          var num = new Array(this.getLength());
          for (var i = 0; i < this.getLength(); i++) {
            num[i] = this.get(i);
          }
          for (var x = 0; x < e.getLength(); x++) {
            num[x] ^= QRMath.gexp(QRMath.glog(e.get(x)) + ratio);
          }
          return new QRPolynomial(num, 0).mod(e);
        }
      };
      module.exports = QRPolynomial;
    }
  });

  // ../../asso/app/lib/qrcode/QRMaskPattern.js
  var require_QRMaskPattern = __commonJS({
    "../../asso/app/lib/qrcode/QRMaskPattern.js"(exports, module) {
      init_inject();
      module.exports = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7
      };
    }
  });

  // ../../asso/app/lib/qrcode/QRUtil.js
  var require_QRUtil = __commonJS({
    "../../asso/app/lib/qrcode/QRUtil.js"(exports, module) {
      init_inject();
      var QRMode = require_QRMode();
      var QRPolynomial = require_QRPolynomial();
      var QRMath = require_QRMath();
      var QRMaskPattern = require_QRMaskPattern();
      var QRUtil = {
        PATTERN_POSITION_TABLE: [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50],
          [6, 30, 54],
          [6, 32, 58],
          [6, 34, 62],
          [6, 26, 46, 66],
          [6, 26, 48, 70],
          [6, 26, 50, 74],
          [6, 30, 54, 78],
          [6, 30, 56, 82],
          [6, 30, 58, 86],
          [6, 34, 62, 90],
          [6, 28, 50, 72, 94],
          [6, 26, 50, 74, 98],
          [6, 30, 54, 78, 102],
          [6, 28, 54, 80, 106],
          [6, 32, 58, 84, 110],
          [6, 30, 58, 86, 114],
          [6, 34, 62, 90, 118],
          [6, 26, 50, 74, 98, 122],
          [6, 30, 54, 78, 102, 126],
          [6, 26, 52, 78, 104, 130],
          [6, 30, 56, 82, 108, 134],
          [6, 34, 60, 86, 112, 138],
          [6, 30, 58, 86, 114, 142],
          [6, 34, 62, 90, 118, 146],
          [6, 30, 54, 78, 102, 126, 150],
          [6, 24, 50, 76, 102, 128, 154],
          [6, 28, 54, 80, 106, 132, 158],
          [6, 32, 58, 84, 110, 136, 162],
          [6, 26, 54, 82, 110, 138, 166],
          [6, 30, 58, 86, 114, 142, 170]
        ],
        G15: 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0,
        G18: 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0,
        G15_MASK: 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1,
        getBCHTypeInfo: function(data) {
          var d = data << 10;
          while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= QRUtil.G15 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15);
          }
          return (data << 10 | d) ^ QRUtil.G15_MASK;
        },
        getBCHTypeNumber: function(data) {
          var d = data << 12;
          while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= QRUtil.G18 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18);
          }
          return data << 12 | d;
        },
        getBCHDigit: function(data) {
          var digit = 0;
          while (data !== 0) {
            digit++;
            data >>>= 1;
          }
          return digit;
        },
        getPatternPosition: function(typeNumber) {
          return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
        },
        getMask: function(maskPattern, i, j) {
          switch (maskPattern) {
            case QRMaskPattern.PATTERN000:
              return (i + j) % 2 === 0;
            case QRMaskPattern.PATTERN001:
              return i % 2 === 0;
            case QRMaskPattern.PATTERN010:
              return j % 3 === 0;
            case QRMaskPattern.PATTERN011:
              return (i + j) % 3 === 0;
            case QRMaskPattern.PATTERN100:
              return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
            case QRMaskPattern.PATTERN101:
              return i * j % 2 + i * j % 3 === 0;
            case QRMaskPattern.PATTERN110:
              return (i * j % 2 + i * j % 3) % 2 === 0;
            case QRMaskPattern.PATTERN111:
              return (i * j % 3 + (i + j) % 2) % 2 === 0;
            default:
              throw new Error("bad maskPattern:" + maskPattern);
          }
        },
        getErrorCorrectPolynomial: function(errorCorrectLength) {
          var a = new QRPolynomial([1], 0);
          for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
          }
          return a;
        },
        getLengthInBits: function(mode, type) {
          if (1 <= type && type < 10) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 10;
              case QRMode.MODE_ALPHA_NUM:
                return 9;
              case QRMode.MODE_8BIT_BYTE:
                return 8;
              case QRMode.MODE_KANJI:
                return 8;
              default:
                throw new Error("mode:" + mode);
            }
          } else if (type < 27) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 12;
              case QRMode.MODE_ALPHA_NUM:
                return 11;
              case QRMode.MODE_8BIT_BYTE:
                return 16;
              case QRMode.MODE_KANJI:
                return 10;
              default:
                throw new Error("mode:" + mode);
            }
          } else if (type < 41) {
            switch (mode) {
              case QRMode.MODE_NUMBER:
                return 14;
              case QRMode.MODE_ALPHA_NUM:
                return 13;
              case QRMode.MODE_8BIT_BYTE:
                return 16;
              case QRMode.MODE_KANJI:
                return 12;
              default:
                throw new Error("mode:" + mode);
            }
          } else {
            throw new Error("type:" + type);
          }
        },
        getLostPoint: function(qrCode) {
          var moduleCount = qrCode.getModuleCount();
          var lostPoint = 0;
          var row = 0;
          var col = 0;
          for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount; col++) {
              var sameCount = 0;
              var dark = qrCode.isDark(row, col);
              for (var r = -1; r <= 1; r++) {
                if (row + r < 0 || moduleCount <= row + r) {
                  continue;
                }
                for (var c = -1; c <= 1; c++) {
                  if (col + c < 0 || moduleCount <= col + c) {
                    continue;
                  }
                  if (r === 0 && c === 0) {
                    continue;
                  }
                  if (dark === qrCode.isDark(row + r, col + c)) {
                    sameCount++;
                  }
                }
              }
              if (sameCount > 5) {
                lostPoint += 3 + sameCount - 5;
              }
            }
          }
          for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
              var count = 0;
              if (qrCode.isDark(row, col)) count++;
              if (qrCode.isDark(row + 1, col)) count++;
              if (qrCode.isDark(row, col + 1)) count++;
              if (qrCode.isDark(row + 1, col + 1)) count++;
              if (count === 0 || count === 4) {
                lostPoint += 3;
              }
            }
          }
          for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
              if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
                lostPoint += 40;
              }
            }
          }
          for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
              if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
                lostPoint += 40;
              }
            }
          }
          var darkCount = 0;
          for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
              if (qrCode.isDark(row, col)) {
                darkCount++;
              }
            }
          }
          var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
          lostPoint += ratio * 10;
          return lostPoint;
        }
      };
      module.exports = QRUtil;
    }
  });

  // ../../asso/app/lib/qrcode/QRErrorCorrectLevel.js
  var require_QRErrorCorrectLevel = __commonJS({
    "../../asso/app/lib/qrcode/QRErrorCorrectLevel.js"(exports, module) {
      init_inject();
      module.exports = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
      };
    }
  });

  // ../../asso/app/lib/qrcode/QRRSBlock.js
  var require_QRRSBlock = __commonJS({
    "../../asso/app/lib/qrcode/QRRSBlock.js"(exports, module) {
      init_inject();
      var QRErrorCorrectLevel = require_QRErrorCorrectLevel();
      function QRRSBlock(totalCount, dataCount) {
        this.totalCount = totalCount;
        this.dataCount = dataCount;
      }
      QRRSBlock.RS_BLOCK_TABLE = [
        // L
        // M
        // Q
        // H
        // 1
        [1, 26, 19],
        [1, 26, 16],
        [1, 26, 13],
        [1, 26, 9],
        // 2
        [1, 44, 34],
        [1, 44, 28],
        [1, 44, 22],
        [1, 44, 16],
        // 3
        [1, 70, 55],
        [1, 70, 44],
        [2, 35, 17],
        [2, 35, 13],
        // 4		
        [1, 100, 80],
        [2, 50, 32],
        [2, 50, 24],
        [4, 25, 9],
        // 5
        [1, 134, 108],
        [2, 67, 43],
        [2, 33, 15, 2, 34, 16],
        [2, 33, 11, 2, 34, 12],
        // 6
        [2, 86, 68],
        [4, 43, 27],
        [4, 43, 19],
        [4, 43, 15],
        // 7		
        [2, 98, 78],
        [4, 49, 31],
        [2, 32, 14, 4, 33, 15],
        [4, 39, 13, 1, 40, 14],
        // 8
        [2, 121, 97],
        [2, 60, 38, 2, 61, 39],
        [4, 40, 18, 2, 41, 19],
        [4, 40, 14, 2, 41, 15],
        // 9
        [2, 146, 116],
        [3, 58, 36, 2, 59, 37],
        [4, 36, 16, 4, 37, 17],
        [4, 36, 12, 4, 37, 13],
        // 10		
        [2, 86, 68, 2, 87, 69],
        [4, 69, 43, 1, 70, 44],
        [6, 43, 19, 2, 44, 20],
        [6, 43, 15, 2, 44, 16],
        // 11
        [4, 101, 81],
        [1, 80, 50, 4, 81, 51],
        [4, 50, 22, 4, 51, 23],
        [3, 36, 12, 8, 37, 13],
        // 12
        [2, 116, 92, 2, 117, 93],
        [6, 58, 36, 2, 59, 37],
        [4, 46, 20, 6, 47, 21],
        [7, 42, 14, 4, 43, 15],
        // 13
        [4, 133, 107],
        [8, 59, 37, 1, 60, 38],
        [8, 44, 20, 4, 45, 21],
        [12, 33, 11, 4, 34, 12],
        // 14
        [3, 145, 115, 1, 146, 116],
        [4, 64, 40, 5, 65, 41],
        [11, 36, 16, 5, 37, 17],
        [11, 36, 12, 5, 37, 13],
        // 15
        [5, 109, 87, 1, 110, 88],
        [5, 65, 41, 5, 66, 42],
        [5, 54, 24, 7, 55, 25],
        [11, 36, 12],
        // 16
        [5, 122, 98, 1, 123, 99],
        [7, 73, 45, 3, 74, 46],
        [15, 43, 19, 2, 44, 20],
        [3, 45, 15, 13, 46, 16],
        // 17
        [1, 135, 107, 5, 136, 108],
        [10, 74, 46, 1, 75, 47],
        [1, 50, 22, 15, 51, 23],
        [2, 42, 14, 17, 43, 15],
        // 18
        [5, 150, 120, 1, 151, 121],
        [9, 69, 43, 4, 70, 44],
        [17, 50, 22, 1, 51, 23],
        [2, 42, 14, 19, 43, 15],
        // 19
        [3, 141, 113, 4, 142, 114],
        [3, 70, 44, 11, 71, 45],
        [17, 47, 21, 4, 48, 22],
        [9, 39, 13, 16, 40, 14],
        // 20
        [3, 135, 107, 5, 136, 108],
        [3, 67, 41, 13, 68, 42],
        [15, 54, 24, 5, 55, 25],
        [15, 43, 15, 10, 44, 16],
        // 21
        [4, 144, 116, 4, 145, 117],
        [17, 68, 42],
        [17, 50, 22, 6, 51, 23],
        [19, 46, 16, 6, 47, 17],
        // 22
        [2, 139, 111, 7, 140, 112],
        [17, 74, 46],
        [7, 54, 24, 16, 55, 25],
        [34, 37, 13],
        // 23
        [4, 151, 121, 5, 152, 122],
        [4, 75, 47, 14, 76, 48],
        [11, 54, 24, 14, 55, 25],
        [16, 45, 15, 14, 46, 16],
        // 24
        [6, 147, 117, 4, 148, 118],
        [6, 73, 45, 14, 74, 46],
        [11, 54, 24, 16, 55, 25],
        [30, 46, 16, 2, 47, 17],
        // 25
        [8, 132, 106, 4, 133, 107],
        [8, 75, 47, 13, 76, 48],
        [7, 54, 24, 22, 55, 25],
        [22, 45, 15, 13, 46, 16],
        // 26
        [10, 142, 114, 2, 143, 115],
        [19, 74, 46, 4, 75, 47],
        [28, 50, 22, 6, 51, 23],
        [33, 46, 16, 4, 47, 17],
        // 27
        [8, 152, 122, 4, 153, 123],
        [22, 73, 45, 3, 74, 46],
        [8, 53, 23, 26, 54, 24],
        [12, 45, 15, 28, 46, 16],
        // 28
        [3, 147, 117, 10, 148, 118],
        [3, 73, 45, 23, 74, 46],
        [4, 54, 24, 31, 55, 25],
        [11, 45, 15, 31, 46, 16],
        // 29
        [7, 146, 116, 7, 147, 117],
        [21, 73, 45, 7, 74, 46],
        [1, 53, 23, 37, 54, 24],
        [19, 45, 15, 26, 46, 16],
        // 30
        [5, 145, 115, 10, 146, 116],
        [19, 75, 47, 10, 76, 48],
        [15, 54, 24, 25, 55, 25],
        [23, 45, 15, 25, 46, 16],
        // 31
        [13, 145, 115, 3, 146, 116],
        [2, 74, 46, 29, 75, 47],
        [42, 54, 24, 1, 55, 25],
        [23, 45, 15, 28, 46, 16],
        // 32
        [17, 145, 115],
        [10, 74, 46, 23, 75, 47],
        [10, 54, 24, 35, 55, 25],
        [19, 45, 15, 35, 46, 16],
        // 33
        [17, 145, 115, 1, 146, 116],
        [14, 74, 46, 21, 75, 47],
        [29, 54, 24, 19, 55, 25],
        [11, 45, 15, 46, 46, 16],
        // 34
        [13, 145, 115, 6, 146, 116],
        [14, 74, 46, 23, 75, 47],
        [44, 54, 24, 7, 55, 25],
        [59, 46, 16, 1, 47, 17],
        // 35
        [12, 151, 121, 7, 152, 122],
        [12, 75, 47, 26, 76, 48],
        [39, 54, 24, 14, 55, 25],
        [22, 45, 15, 41, 46, 16],
        // 36
        [6, 151, 121, 14, 152, 122],
        [6, 75, 47, 34, 76, 48],
        [46, 54, 24, 10, 55, 25],
        [2, 45, 15, 64, 46, 16],
        // 37
        [17, 152, 122, 4, 153, 123],
        [29, 74, 46, 14, 75, 47],
        [49, 54, 24, 10, 55, 25],
        [24, 45, 15, 46, 46, 16],
        // 38
        [4, 152, 122, 18, 153, 123],
        [13, 74, 46, 32, 75, 47],
        [48, 54, 24, 14, 55, 25],
        [42, 45, 15, 32, 46, 16],
        // 39
        [20, 147, 117, 4, 148, 118],
        [40, 75, 47, 7, 76, 48],
        [43, 54, 24, 22, 55, 25],
        [10, 45, 15, 67, 46, 16],
        // 40
        [19, 148, 118, 6, 149, 119],
        [18, 75, 47, 31, 76, 48],
        [34, 54, 24, 34, 55, 25],
        [20, 45, 15, 61, 46, 16]
      ];
      QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
        var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
        if (rsBlock === void 0) {
          throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
        }
        var length = rsBlock.length / 3;
        var list = [];
        for (var i = 0; i < length; i++) {
          var count = rsBlock[i * 3 + 0];
          var totalCount = rsBlock[i * 3 + 1];
          var dataCount = rsBlock[i * 3 + 2];
          for (var j = 0; j < count; j++) {
            list.push(new QRRSBlock(totalCount, dataCount));
          }
        }
        return list;
      };
      QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
        switch (errorCorrectLevel) {
          case QRErrorCorrectLevel.L:
            return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
          case QRErrorCorrectLevel.M:
            return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
          case QRErrorCorrectLevel.Q:
            return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
          case QRErrorCorrectLevel.H:
            return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
          default:
            return void 0;
        }
      };
      module.exports = QRRSBlock;
    }
  });

  // ../../asso/app/lib/qrcode/QRBitBuffer.js
  var require_QRBitBuffer = __commonJS({
    "../../asso/app/lib/qrcode/QRBitBuffer.js"(exports, module) {
      init_inject();
      function QRBitBuffer() {
        this.buffer = [];
        this.length = 0;
      }
      QRBitBuffer.prototype = {
        get: function(index) {
          var bufIndex = Math.floor(index / 8);
          return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
        },
        put: function(num, length) {
          for (var i = 0; i < length; i++) {
            this.putBit((num >>> length - i - 1 & 1) == 1);
          }
        },
        getLengthInBits: function() {
          return this.length;
        },
        putBit: function(bit) {
          var bufIndex = Math.floor(this.length / 8);
          if (this.buffer.length <= bufIndex) {
            this.buffer.push(0);
          }
          if (bit) {
            this.buffer[bufIndex] |= 128 >>> this.length % 8;
          }
          this.length++;
        }
      };
      module.exports = QRBitBuffer;
    }
  });

  // ../../asso/app/lib/qrcode/index.js
  var require_qrcode = __commonJS({
    "../../asso/app/lib/qrcode/index.js"(exports, module) {
      init_inject();
      var QR8bitByte = require_QR8bitByte();
      var QRUtil = require_QRUtil();
      var QRPolynomial = require_QRPolynomial();
      var QRRSBlock = require_QRRSBlock();
      var QRBitBuffer = require_QRBitBuffer();
      function QRCode(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
      }
      QRCode.prototype = {
        addData: function(data) {
          var newData = new QR8bitByte(data);
          this.dataList.push(newData);
          this.dataCache = null;
        },
        isDark: function(row, col) {
          if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
            throw new Error(row + "," + col);
          }
          return this.modules[row][col];
        },
        getModuleCount: function() {
          return this.moduleCount;
        },
        make: function() {
          if (this.typeNumber < 1) {
            var typeNumber = 1;
            for (typeNumber = 1; typeNumber < 40; typeNumber++) {
              var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
              var buffer = new QRBitBuffer();
              var totalDataCount = 0;
              for (var i = 0; i < rsBlocks.length; i++) {
                totalDataCount += rsBlocks[i].dataCount;
              }
              for (var x = 0; x < this.dataList.length; x++) {
                var data = this.dataList[x];
                buffer.put(data.mode, 4);
                buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                data.write(buffer);
              }
              if (buffer.getLengthInBits() <= totalDataCount * 8)
                break;
            }
            this.typeNumber = typeNumber;
          }
          this.makeImpl(false, this.getBestMaskPattern());
        },
        makeImpl: function(test, maskPattern) {
          this.moduleCount = this.typeNumber * 4 + 17;
          this.modules = new Array(this.moduleCount);
          for (var row = 0; row < this.moduleCount; row++) {
            this.modules[row] = new Array(this.moduleCount);
            for (var col = 0; col < this.moduleCount; col++) {
              this.modules[row][col] = null;
            }
          }
          this.setupPositionProbePattern(0, 0);
          this.setupPositionProbePattern(this.moduleCount - 7, 0);
          this.setupPositionProbePattern(0, this.moduleCount - 7);
          this.setupPositionAdjustPattern();
          this.setupTimingPattern();
          this.setupTypeInfo(test, maskPattern);
          if (this.typeNumber >= 7) {
            this.setupTypeNumber(test);
          }
          if (this.dataCache === null) {
            this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
          }
          this.mapData(this.dataCache, maskPattern);
        },
        setupPositionProbePattern: function(row, col) {
          for (var r = -1; r <= 7; r++) {
            if (row + r <= -1 || this.moduleCount <= row + r) continue;
            for (var c = -1; c <= 7; c++) {
              if (col + c <= -1 || this.moduleCount <= col + c) continue;
              if (0 <= r && r <= 6 && (c === 0 || c === 6) || 0 <= c && c <= 6 && (r === 0 || r === 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        },
        getBestMaskPattern: function() {
          var minLostPoint = 0;
          var pattern = 0;
          for (var i = 0; i < 8; i++) {
            this.makeImpl(true, i);
            var lostPoint = QRUtil.getLostPoint(this);
            if (i === 0 || minLostPoint > lostPoint) {
              minLostPoint = lostPoint;
              pattern = i;
            }
          }
          return pattern;
        },
        createMovieClip: function(target_mc, instance_name, depth) {
          var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
          var cs = 1;
          this.make();
          for (var row = 0; row < this.modules.length; row++) {
            var y = row * cs;
            for (var col = 0; col < this.modules[row].length; col++) {
              var x = col * cs;
              var dark = this.modules[row][col];
              if (dark) {
                qr_mc.beginFill(0, 100);
                qr_mc.moveTo(x, y);
                qr_mc.lineTo(x + cs, y);
                qr_mc.lineTo(x + cs, y + cs);
                qr_mc.lineTo(x, y + cs);
                qr_mc.endFill();
              }
            }
          }
          return qr_mc;
        },
        setupTimingPattern: function() {
          for (var r = 8; r < this.moduleCount - 8; r++) {
            if (this.modules[r][6] !== null) {
              continue;
            }
            this.modules[r][6] = r % 2 === 0;
          }
          for (var c = 8; c < this.moduleCount - 8; c++) {
            if (this.modules[6][c] !== null) {
              continue;
            }
            this.modules[6][c] = c % 2 === 0;
          }
        },
        setupPositionAdjustPattern: function() {
          var pos = QRUtil.getPatternPosition(this.typeNumber);
          for (var i = 0; i < pos.length; i++) {
            for (var j = 0; j < pos.length; j++) {
              var row = pos[i];
              var col = pos[j];
              if (this.modules[row][col] !== null) {
                continue;
              }
              for (var r = -2; r <= 2; r++) {
                for (var c = -2; c <= 2; c++) {
                  if (Math.abs(r) === 2 || Math.abs(c) === 2 || r === 0 && c === 0) {
                    this.modules[row + r][col + c] = true;
                  } else {
                    this.modules[row + r][col + c] = false;
                  }
                }
              }
            }
          }
        },
        setupTypeNumber: function(test) {
          var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
          var mod;
          for (var i = 0; i < 18; i++) {
            mod = !test && (bits >> i & 1) === 1;
            this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
          }
          for (var x = 0; x < 18; x++) {
            mod = !test && (bits >> x & 1) === 1;
            this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
          }
        },
        setupTypeInfo: function(test, maskPattern) {
          var data = this.errorCorrectLevel << 3 | maskPattern;
          var bits = QRUtil.getBCHTypeInfo(data);
          var mod;
          for (var v = 0; v < 15; v++) {
            mod = !test && (bits >> v & 1) === 1;
            if (v < 6) {
              this.modules[v][8] = mod;
            } else if (v < 8) {
              this.modules[v + 1][8] = mod;
            } else {
              this.modules[this.moduleCount - 15 + v][8] = mod;
            }
          }
          for (var h = 0; h < 15; h++) {
            mod = !test && (bits >> h & 1) === 1;
            if (h < 8) {
              this.modules[8][this.moduleCount - h - 1] = mod;
            } else if (h < 9) {
              this.modules[8][15 - h - 1 + 1] = mod;
            } else {
              this.modules[8][15 - h - 1] = mod;
            }
          }
          this.modules[this.moduleCount - 8][8] = !test;
        },
        mapData: function(data, maskPattern) {
          var inc = -1;
          var row = this.moduleCount - 1;
          var bitIndex = 7;
          var byteIndex = 0;
          for (var col = this.moduleCount - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            while (true) {
              for (var c = 0; c < 2; c++) {
                if (this.modules[row][col - c] === null) {
                  var dark = false;
                  if (byteIndex < data.length) {
                    dark = (data[byteIndex] >>> bitIndex & 1) === 1;
                  }
                  var mask = QRUtil.getMask(maskPattern, row, col - c);
                  if (mask) {
                    dark = !dark;
                  }
                  this.modules[row][col - c] = dark;
                  bitIndex--;
                  if (bitIndex === -1) {
                    byteIndex++;
                    bitIndex = 7;
                  }
                }
              }
              row += inc;
              if (row < 0 || this.moduleCount <= row) {
                row -= inc;
                inc = -inc;
                break;
              }
            }
          }
        }
      };
      QRCode.PAD0 = 236;
      QRCode.PAD1 = 17;
      QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
        var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
        var buffer = new QRBitBuffer();
        for (var i = 0; i < dataList.length; i++) {
          var data = dataList[i];
          buffer.put(data.mode, 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
          data.write(buffer);
        }
        var totalDataCount = 0;
        for (var x = 0; x < rsBlocks.length; x++) {
          totalDataCount += rsBlocks[x].dataCount;
        }
        if (buffer.getLengthInBits() > totalDataCount * 8) {
          throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
        }
        if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
          buffer.put(0, 4);
        }
        while (buffer.getLengthInBits() % 8 !== 0) {
          buffer.putBit(false);
        }
        while (true) {
          if (buffer.getLengthInBits() >= totalDataCount * 8) {
            break;
          }
          buffer.put(QRCode.PAD0, 8);
          if (buffer.getLengthInBits() >= totalDataCount * 8) {
            break;
          }
          buffer.put(QRCode.PAD1, 8);
        }
        return QRCode.createBytes(buffer, rsBlocks);
      };
      QRCode.createBytes = function(buffer, rsBlocks) {
        var offset = 0;
        var maxDcCount = 0;
        var maxEcCount = 0;
        var dcdata = new Array(rsBlocks.length);
        var ecdata = new Array(rsBlocks.length);
        for (var r = 0; r < rsBlocks.length; r++) {
          var dcCount = rsBlocks[r].dataCount;
          var ecCount = rsBlocks[r].totalCount - dcCount;
          maxDcCount = Math.max(maxDcCount, dcCount);
          maxEcCount = Math.max(maxEcCount, ecCount);
          dcdata[r] = new Array(dcCount);
          for (var i = 0; i < dcdata[r].length; i++) {
            dcdata[r][i] = 255 & buffer.buffer[i + offset];
          }
          offset += dcCount;
          var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
          var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
          var modPoly = rawPoly.mod(rsPoly);
          ecdata[r] = new Array(rsPoly.getLength() - 1);
          for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
            ecdata[r][x] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
          }
        }
        var totalCodeCount = 0;
        for (var y = 0; y < rsBlocks.length; y++) {
          totalCodeCount += rsBlocks[y].totalCount;
        }
        var data = new Array(totalCodeCount);
        var index = 0;
        for (var z = 0; z < maxDcCount; z++) {
          for (var s = 0; s < rsBlocks.length; s++) {
            if (z < dcdata[s].length) {
              data[index++] = dcdata[s][z];
            }
          }
        }
        for (var xx = 0; xx < maxEcCount; xx++) {
          for (var t = 0; t < rsBlocks.length; t++) {
            if (xx < ecdata[t].length) {
              data[index++] = ecdata[t][xx];
            }
          }
        }
        return data;
      };
      module.exports = QRCode;
    }
  });

  // libs-entry.js
  init_inject();
  window.LibsNode = {
    xlsx: require_xlsx(),
    QRCode: require_qrcode(),
    QRErrorCorrectLevel: require_QRErrorCorrectLevel(),
    Buffer: require_buffer().Buffer
  };
})();
