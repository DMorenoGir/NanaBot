import OpenAI from "openai";
import config from "../config/env.js";

const client = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const openAiService = async (message) => {
  try {
    const lowerMessage = message.trim().toLowerCase();
    const saludos = ['hola', 'buenas', 'hello', 'hi', 'hey'];
    if (saludos.includes(lowerMessage)) {
      return "¿En qué puedo ayudarte con tu cita o con nuestros servicios de uñas? 💅";
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres una experta en uñas y belleza. Responde con naturalidad, brevedad y empatía. Evita párrafos largos. Imita una conversación fluida como si fueras una asesora del spa por WhatsApp.',
        },
        {
          role: 'user',
          content: `${message}\nResponde en máximo 2 frases.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 120,
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error en openAiService:', error);
    return "Hubo un error procesando tu solicitud.";
  }
};

export default openAiService;