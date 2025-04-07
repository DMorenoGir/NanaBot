import path from 'path';
import { google } from 'googleapis';

const sheets = google.sheets('v4');

async function addRowToSheet(auth, spreadsheetId, values) {
    const request = {
        spreadsheetId,
        range: 'reservas',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            values: [values],
        },
        auth,
    }

    try {
        const response = (await sheets.spreadsheets.values.append(request).data);
        return response;
    } catch (error) {
        console.error(error)
    }
}

const appendToSheet = async (data) => {
    try {
      console.log("🌐 GOOGLE_CREDENTIALS:", process.env.GOOGLE_CREDENTIALS?.slice(0, 100) + '...');
  
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
  
      const authClient = await auth.getClient();
      const spreadsheetId = '1PZW_S1GhNKxulscy5zW1yj7hiNsl-5kHOTlRbXoJq6M';
  
      await addRowToSheet(authClient, spreadsheetId, data);
      return 'Datos correctamente agregados';
    } catch (error) {
      console.error(error);
    }
  };
  

export default appendToSheet;