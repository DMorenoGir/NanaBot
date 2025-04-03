import OpenAI from "openai";
import config from "../config/env.js";

const client = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const openAiService = async (message) => {
  try {
    // Pre-filtro para evitar llamadas innecesarias al modelo (saludos simples)
    const lowerMessage = message.trim().toLowerCase();
    const saludos = ['hola', 'buenas', 'hello', 'hi', 'hey'];
    if (saludos.includes(lowerMessage)) {
      return "¿En qué puedo ayudarte con tu mascota?";
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres un veterinario con experiencia. Responde preguntas de forma directa, clara y en lenguaje sencillo, como si fueras un bot conversacional. No saludes ni generes conversación.',
        },
        {
          role: 'user',
          content: `${message}\nResponde en máximo 2 frases.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 250,
      frequency_penalty: 0.2,
      presence_penalty: 0,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error en openAiService:', error);
    return "Hubo un error procesando tu solicitud.";
  }
};

export default openAiService;