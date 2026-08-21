import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generateAndSharePDF = async (title, htmlContent) => {
  try {
    const defaultHtml = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #2563eb; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; color: #475569; font-weight: bold; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; width: 30%; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; margin-top: 5px; }
            .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${htmlContent}
          <div class="footer">Generated on ${new Date().toLocaleString()} by One Click Business</div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: defaultHtml,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  } catch (error) {
    console.error("Failed to generate or share PDF", error);
  }
};
