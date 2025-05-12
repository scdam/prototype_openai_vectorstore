const express = require('express');
const path = require('path');
const { askWithFileSearchJSON } = require('./openai_main');
const { askWithFileSearchPDF } = require('./openai_main_PDF');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Geen bericht ontvangen.' });
  }

  try {
    console.log(`💬 Gebruiker zegt: ${message}`);
    const response = await askWithFileSearchPDF(message);
    res.json({ response });
  } catch (error) {
    console.error('❌ Fout bij AI-antwoord:', error);
    res.status(500).json({ error: 'Er ging iets mis met het AI-antwoord.' });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Server draait op http://localhost:${PORT}`);
});