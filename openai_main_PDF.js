require('dotenv').config();
const fs = require('fs');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function uploadFile(filePath) {
    const file = fs.createReadStream(filePath);
    const uploaded = await openai.files.create({
        file,
        purpose: 'assistants',
    });
    console.log('✅ File geüpload:', uploaded.filename);
    return uploaded.id;
}

async function createVectorStore(fileId) {
    const store = await openai.vectorStores.create({
        name: 'Chat Vector Store',
        file_ids: [fileId],
    });

    let status = store.status;
    while (status !== 'completed') {
        console.log('⏳ Wachten op indexering...');
        await new Promise((r) => setTimeout(r, 2000));
        const updated = await openai.vectorStores.retrieve(store.id);
        status = updated.status;
    }

    console.log('🧠 Vector store klaar:', store.id);
    console.log(store.id)
    return store.id;
}

async function askWithFileSearchPDF(question) {
    // alleen nodig als er nog geen assistant is
// const assistant = await openai.beta.assistants.create({
    //   name: "Vector Store Assistant",
    //   instructions: "Gebruik file search om vragen te beantwoorden op basis van de vector store.",
    //   tools: [{ type: "file_search" }],
    //   model: "gpt-4-turbo-preview",
    // });
    //
    // const assistantId = assistant.id;
    //
    // console.log("🔑 Assistant aangemaakt:", assistantId);

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: question,
    });

    const vectorStoreId = "vs_68027c2314908191a16b7f5c033bb56a" //pdf file

    // const vectorStoreId = "vs_6808aedb70fc8191aca36ebb94e22800" // json file
    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: "asst_Tn90LiVxYANFIurECdSCTGlY",
        tool_choice: 'auto',
        tool_resources: {
            file_search: {
                vector_store_ids: [vectorStoreId],
            },
        },
        model: 'gpt-4-turbo-preview',
    });

    let status;
    do {
        await new Promise((r) => setTimeout(r, 1500));
        const current = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        status = current.status;
        console.log('⏳ Status:', status);
    } while (status !== 'completed');

    const messages = await openai.beta.threads.messages.list(thread.id);
    const last = messages.data.find((msg) => msg.role === 'assistant');

    console.log('\n💬 Antwoord:');
    console.log(last.content?.[0]?.text?.value || 'Geen antwoord gevonden.');
    return last.content?.[0]?.text?.value || 'Geen antwoord gevonden';
}


async function main(){
    // Alleen nodig als je nieuwe file wilt uploaden en nieuwe vectorstore wilt aanmaken.
    try {
        const fileId = await uploadFile('your-json-file.json');
        const vectorStoreId = await createVectorStore(fileId);
        console.log(vectorStoreId);
        await askWithFileSearchPDF(vectorStoreId, 'Waarvoor wordt Amoxicilline gebruikt?');
    } catch (e) {
        console.error('❌ Fout:', e);
    }
}

module.exports = {
    askWithFileSearchPDF
};