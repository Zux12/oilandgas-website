'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const letter=fs.readFileSync(path.join(root,'letter.html'),'utf8');
const verify=fs.readFileSync(path.join(root,'verify-letter.html'),'utf8');
const qr=fs.readFileSync(path.join(root,'vendor/qrcode.min.js'),'utf8');
test('recognition letter remains A4 portrait and fully justified',()=>{
 assert.match(letter,/@page\s*\{\s*size:\s*A4 portrait;/);
 assert.match(letter,/\.letter p\s*\{[^}]*text-align:justify/);
 assert.match(letter,/id="reference"/);
 assert.match(letter,/id="author"/);
 assert.match(letter,/id="title"/);
 assert.match(letter,/id="period"/);
});
test('printed QR links to permanent verified recognition, not private tracking tokens',()=>{
 assert.match(letter,/src="\/vendor\/qrcode\.min\.js"/);
 assert.match(letter,/new QRCode\(/);
 assert.match(letter,/new URL\('verify-letter\.html',location\.origin\)/);
 assert.match(letter,/verification\.searchParams\.set\('id',record\.id\)/);
 assert.doesNotMatch(letter,/verification\.searchParams\.set\('visit'/);
 assert.match(qr,/QRCode/);
});
test('approved permanent-history footer appears on recognition letter',()=>{
 assert.match(letter,/This recognition remains permanently recorded in the Oil &amp; Gas historical recognition archive/);
});
test('scan page confirms original recognition date and publication title',()=>{
 assert.match(verify,/id="recognized-date"/);
 assert.match(verify,/id="title"/);
 assert.match(verify,/id="author"/);
 assert.match(verify,/id="category"/);
 assert.match(verify,/originallyRecognizedAt/);
 assert.match(verify,/recognized-with-notice/);
});
test('offline or nonverified record is not shown as authentic',()=>{
 assert.match(verify,/VERIFICATION UNAVAILABLE/);
 assert.match(verify,/NOT FOUND/);
 assert.match(verify,/NOT VERIFIED/);
});
test('website recognition code has valid parseable inline JavaScript',()=>{
 for(const html of [letter,verify]){
  for(const block of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
   if(block[1].trim())assert.doesNotThrow(()=>new Function(block[1]));
  }
 }
});

test('specimen A4 letter and demo QR cannot masquerade as an official award',()=>{
 const demo=fs.readFileSync(path.join(root,'letter-demo.html'),'utf8');
 const verification=fs.readFileSync(path.join(root,'verify-letter-demo.html'),'utf8');
 assert.match(demo,/@page\s*\{\s*size:A4 portrait/);
 assert.match(demo,/SPECIMEN — NOT AN ISSUED AWARD/);
 assert.match(demo,/verify-letter-demo\.html/);
 assert.doesNotMatch(demo,/recognition\/verify\//);
 assert.match(verification,/NO REAL RECOGNITION ISSUED/);
 assert.match(verification,/DEMO QR SCAN SUCCESSFUL/);
 assert.doesNotMatch(verification,/recognition\/verify\//);
});
