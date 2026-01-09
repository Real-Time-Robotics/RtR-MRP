const RRP = require('react-resizable-panels');
console.log('Keys exported:', Object.keys(RRP));
try {
    console.log('PanelGroup:', !!RRP.PanelGroup);
    console.log('Group:', !!RRP.Group);
} catch (e) {
    console.error(e);
}
