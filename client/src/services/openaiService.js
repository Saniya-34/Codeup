// OpenAI API service

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!API_KEY) {
  console.error("OpenAI API Key is not defined. Please check your environment variables.");
}

export const fetchAifyResponse = async (prompt) => {
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
        max_tokens: 3000,
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

// Speech-to-Text using OpenAI Whisper
export const transcribeAudio = async (audioFile) => {
  const url = "https://api.openai.com/v1/audio/transcriptions";
  
  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model", "whisper-1");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Transcription failed");
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

// Text-to-Speech using OpenAI TTS
export const generateSpeech = async (text) => {
  const url = "https://api.openai.com/v1/audio/speech";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "alloy",
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error("Speech generation failed");
    }

    return response.blob();
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};
