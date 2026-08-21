const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function run() {
  const tempPath = process.argv[2];
  if (!tempPath || !fs.existsSync(tempPath)) {
    process.exit(1);
  }
  const buf = fs.readFileSync(tempPath);
  try {
    const parser = new PDFParse(new Uint8Array(buf));
    const data = await parser.getText();
    process.stdout.write(data.text);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
