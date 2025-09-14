import fetch from "node-fetch";

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error("OPENAI_API_KEY is not defined in environment variables.");
}

export const generateQuestionsFromGemini = async (prompt) => {
  const url = "https://api.openai.com/v1/chat/completions";

  const messageToSend = [
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        model: "gpt-3.5-turbo",
        messages: messageToSend,
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const resjson = await response.json();
    const generatedText = resjson.choices[0].message.content.trim();
    return generatedText;
  } catch (error) {
    console.error("Error fetching data from OpenAI API:", error);
    throw error;
  }
};