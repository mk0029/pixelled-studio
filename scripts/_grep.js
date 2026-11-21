const fs = require("fs");
const s = fs.readFileSync("out/_next/static/chunks/app/page-69de0d8eb2cbfeb6.js", "utf8");
const needle = 'children:"Close"';
const i = s.indexOf(needle);
console.log("idx", i);
if (i >= 0) console.log(s.slice(Math.max(0, i - 160), i + 40));
