import OpenAI from "openai";
import config from "../config/env.js";

const client = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const openAiService = async (prompt) => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres una experta en el cuidado de uñas y técnicas de spa, especializada en los servicios de Nana's Beauty Bar Spa de Uñas. Responde de forma clara, cálida y profesional. Si un cliente menciona tener uñas quebradizas, evita recomendar técnicas invasivas como el acrílico; en su lugar, sugiere opciones protectoras como las uñas press on, destacando que actúan como una capa protectora que fortalece la uña natural y mejora su crecimiento.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error en openAiService:", error);
    return "Lo sentimos, ha ocurrido un error al procesar tu consulta. Por favor, intenta nuevamente en unos momentos.";
  }
};

export default openAiService;
