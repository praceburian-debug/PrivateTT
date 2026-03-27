const https = require('https');

const { TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID } = process.env;

// Pomocná funkce pro API požadavky
function trelloRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.trello.com',
      path: `/1${path}${path.includes('?') ? '&' : '?'}key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
      method: method
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    // 1. Získáme všechny karty na nástěnce
    const cards = await trelloRequest(`/boards/${TRELLO_BOARD_ID}/cards`);
    
    for (const card of cards) {
      // 2. Získáme naplánované komentáře z pluginData
      const pluginData = await trelloRequest(`/cards/${card.id}/pluginData`);
      const scheduledData = pluginData.find(d => d.idPlugin === '66f308f237f3743c44c54013'); // ID tvého Power-Upu (najdeš v manifestu nebo logu)

      if (scheduledData && scheduledData.value) {
        let comments = JSON.parse(scheduledData.value).scheduled_comments || [];
        const now = new Date().getTime();
        
        const toSend = comments.filter(c => new Date(c.date).getTime() <= now);
        const remaining = comments.filter(c => new Date(c.date).getTime() > now);

        if (toSend.length > 0) {
          for (const c of toSend) {
            console.log(`Posílám komentář na kartu ${card.id}`);
            await trelloRequest(`/cards/${card.id}/actions/comments?text=${encodeURIComponent(c.msg)}`, 'POST');
          }
          // 3. Aktualizujeme seznam (smažeme odeslané)
          // Poznámka: PluginData se přes API mění hůře, 
          // v první fázi stačí, když se to odešle.
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
