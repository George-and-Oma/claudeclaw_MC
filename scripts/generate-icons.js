const fs = require('fs');
const path = require('path');

// Create a simple colored square PNG with text
function createPNG(size) {
  // PNG header and IHDR chunk for a simple solid color image
  const width = size;
  const height = size;

  // We'll create a simple single-color PNG
  // Purple color: #8b5cf6 = RGB(139, 92, 246)

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);

  // IDAT chunk - raw image data
  const zlib = require('zlib');
  const rawData = Buffer.alloc(height * (1 + width * 3));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      // Create a circular icon with gradient effect
      const cx = width / 2;
      const cy = height / 2;
      const radius = width * 0.45;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist < radius) {
        // Inside circle - purple gradient
        const factor = 1 - (dist / radius) * 0.2;
        rawData[offset++] = Math.floor(139 * factor); // R
        rawData[offset++] = Math.floor(92 * factor);  // G
        rawData[offset++] = Math.floor(246 * factor); // B
      } else {
        // Outside circle - dark background
        rawData[offset++] = 13; // R
        rawData[offset++] = 13; // G
        rawData[offset++] = 13; // B
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressed.length, 0);
  const idatChunk = Buffer.concat([
    idatLength,
    Buffer.from('IDAT'),
    compressed,
    idatCrc
  ]);

  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    iendCrc
  ]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  const result = Buffer.alloc(4);
  result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, 0);
  return result;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

sizes.forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconDir, `icon-${size}.png`), png);
  console.log(`Created icon-${size}.png`);
});

// Also create apple-touch-icon
const applePng = createPNG(180);
fs.writeFileSync(path.join(iconDir, '../apple-touch-icon.png'), applePng);
console.log('Created apple-touch-icon.png');
