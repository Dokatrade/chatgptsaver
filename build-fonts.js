const fs = require('fs');

// Read font files and convert to base64
const robotoRegular = fs.readFileSync('./node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf');
const robotoBold = fs.readFileSync('./node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf');
const notoEmoji = fs.readFileSync('./lib/NotoEmoji-Regular.ttf');

const vfs = {
    'Roboto-Regular.ttf': robotoRegular.toString('base64'),
    'Roboto-Medium.ttf': robotoBold.toString('base64'),
    'Roboto-Italic.ttf': robotoRegular.toString('base64'),
    'Roboto-MediumItalic.ttf': robotoBold.toString('base64'),
    'NotoEmoji-Regular.ttf': notoEmoji.toString('base64')
};

const output = `var pdfMakeFonts = {
    vfs: ${JSON.stringify(vfs)},
    fonts: {
        Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        },
        NotoEmoji: {
            normal: 'NotoEmoji-Regular.ttf',
            bold: 'NotoEmoji-Regular.ttf',
            italics: 'NotoEmoji-Regular.ttf',
            bolditalics: 'NotoEmoji-Regular.ttf'
        }
    }
};

if (typeof pdfMake !== 'undefined') {
    pdfMake.vfs = pdfMakeFonts.vfs;
    pdfMake.fonts = pdfMakeFonts.fonts;
}
`;

fs.writeFileSync('./lib/vfs_fonts_custom.js', output);
console.log('Custom fonts VFS created! Size:', (output.length / 1024 / 1024).toFixed(2), 'MB');
