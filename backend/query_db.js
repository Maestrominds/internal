const pool = require('./src/config/db');

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function test() {
  try {
    const result = await pool.query('SELECT id, client_name, client_phone FROM reports');
    console.log('--- ALL REPORTS ---');
    console.log(result.rows);

    const rows = result.rows;
    const clientsMap = {};
    const nameOnlyClients = new Set();

    for (const row of rows) {
      const phone = row.client_phone ? row.client_phone.trim() : null;
      const name = row.client_name ? toTitleCase(row.client_name.trim()) : '';

      if (phone) {
        if (!clientsMap[phone] || (name && !clientsMap[phone].client_name)) {
          clientsMap[phone] = { client_name: name, client_phone: phone };
        }
      } else if (name) {
        nameOnlyClients.add(name);
      }
    }

    console.log('--- CLIENTS MAP ---', clientsMap);
    console.log('--- NAME ONLY CLIENTS ---', Array.from(nameOnlyClients));

    const clientsList = [];
    for (const phone in clientsMap) {
      clientsList.push(clientsMap[phone]);
    }
    const existingNames = new Set(
      Object.values(clientsMap).map(c => c.client_name.toLowerCase())
    );
    for (const name of nameOnlyClients) {
      if (!existingNames.has(name.toLowerCase())) {
        clientsList.push({ client_name: name, client_phone: null });
      }
    }

    console.log('--- FINAL CLIENTS LIST ---', clientsList);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
