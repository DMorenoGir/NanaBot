import whatsappService from './whatsappService.js';
import openAiService from './openAiService.js';

class MessageHandler {
  constructor() {
    this.appointmentState = {};
    this.assistantState = {};
    this.userUsage = {}; // Registro de uso diario de ChatGPT por usuario
  }

  checkUsageLimit(userId) {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  
    if (!this.userUsage[userId] || this.userUsage[userId].date !== today) {
      this.userUsage[userId] = { count: 0, date: today };
    }
  
    if (this.userUsage[userId].count >= 3) { // Límite de 3 consultas al día
      return false;
    }
  
    this.userUsage[userId].count += 1;
    return true;
  }  

  async handleIncomingMessage(message, senderInfo) {
    if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();

      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(message.from, message.id, senderInfo);
        await this.sendWelcomeMenu(message.from);
      } else if (incomingMessage === 'media') {
        await this.sendMedia(message.from);
      } else if (this.appointmentState[message.from]) {
        await this.handleAppointmentFlow(message.from, incomingMessage);
      } else if (this.assistantState[message.from]) {
        await this.handleAssistantFlow(message.from, incomingMessage);
      } else {
        await this.handleMenuOption(message.from, incomingMessage);
      }
      await whatsappService.markAsRead(message.id);
    } else if (message?.type === 'interactive') {
      const option = message?.interactive?.button_reply?.id;
      await this.handleMenuOption(message.from, option);
      await whatsappService.markAsRead(message.id);
    }
  }

  isGreeting(message) {
    const greetings = [
      "hola", "hello", "hi", "buenas", "buenos días", "buenas tardes", "buenas noches",
      "buen día", "holi", "qué más", "saludos"
    ];
    return greetings.some(greet => message.includes(greet));
  }

  getFirstName(senderInfo) {
    const fullName = senderInfo.profile?.name || senderInfo.wa_id;
    return fullName.split(' ')[0];
  }

  async sendWelcomeMessage(to, messageId, senderInfo) {
    const firstName = this.getFirstName(senderInfo);
    const welcomeMessage = `¡Hola ${firstName}! 💖 Bienvenida a *Nana's Beauty Bar Spa de Uñas* 💅✨\n\nEstoy aquí para ayudarte a consentirte como mereces. ¿Con qué te puedo colaborar hoy? 😊`;
    await whatsappService.sendMessage(to, welcomeMessage, messageId);
  }

  async sendWelcomeMenu(to) {
    const menuMessage = "Por favor, elige una opción:";
    const buttons = [
      { type: 'reply', reply: { id: 'option_1', title: 'Agendar cita' } },
      { type: 'reply', reply: { id: 'option_2', title: 'Consultar' } },
      { type: 'reply', reply: { id: 'option_3', title: 'Ubicación' } }
    ];
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async sendConsultationMenu(to) {
    const menuMessage = "¿Qué tipo de consulta deseas?";
    const buttons = [
      { type: 'reply', reply: { id: 'option_4', title: 'Recomendación' } },
      { type: 'reply', reply: { id: 'option_5', title: 'Asesoría' } },
      { type: 'reply', reply: { id: 'option_6', title: 'Servicios' } }
    ];
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async handleMenuOption(to, option) {
    let response;
    switch (option) {
      case 'option_1':
        this.appointmentState[to] = { step: 'name' };
        response = "Perfecto 💕 Empecemos tu agendamiento. ¿Cuál es tu nombre completo?";
        break;
      case 'option_2':
        await this.sendConsultationMenu(to);
        return;
      case 'option_3':
        response = 'Nuestra ubicación es la siguiente:';
        await this.sendLocation(to);
        break;
      case 'option_4':
        this.assistantState[to] = { step: 'recommendation' };
        response = "Cuéntame brevemente cómo están tus uñas actualmente (quebradizas, débiles, cortas, etc.), para darte la mejor recomendación 💅✨.";
        break;
      case 'option_5':
        this.assistantState[to] = { step: 'advice' };
        response = "¿Te gustaría ideas sobre colores, diseños o tendencias actuales? 🎨✨ Cuéntame qué estás buscando.";
        break;
      case 'option_6':
        this.assistantState[to] = { step: 'services' };
        response = "Aquí tienes algunos de nuestros servicios destacados con precios:\n\n" +
          "💅 *Esmaltado Tradicional*: $25.000 (manicure o pedicure) / $44.000 ambos.\n" +
          "💅 *Semipermanente*: $45.000 color plano / $50.000 con decoración.\n" +
          "🛡️ *Forrados*: Dipping y Rubber Base, ideales para uñas frágiles.\n" +
          "🌟 *Polygel*: $90.000 | *Acrílico*: $100.000.\n" +
          "✨ *Alargamiento Press On*: $115.000 (¡Nuestra especialidad!).\n" +
          "🦶 *PEDILUXE*: Ritual completo para relajar y consentir tus pies 💆‍♀️\n\n" +
          "Si quieres más detalles, ¡pregúntame sin pena! 💖";
        break;
      default:
        response = "Lo siento 😅 no entendí tu selección. Por favor, elige una opción del menú.";
    }
    await whatsappService.sendMessage(to, response);
  }

  async handleAppointmentFlow(to, message) {
    const state = this.appointmentState[to];
    let response;
  
    switch (state.step) {
      case 'name':
        state.name = message;
        state.step = 'email';
        response = "✨ Gracias. ¿Cuál es tu correo electrónico?";
        break;
      case 'email':
        state.email = message;
        state.step = 'technique';
        response = "💅 Genial. ¿Qué técnica deseas realizarte? (Ej: semipermanente, press on, polygel, etc.)";
        break;
      case 'technique':
        state.technique = message;
        state.step = 'wantsPedicure';
        response = "🦶¿Deseas realizarte también pedicure? Nuestro servicio es en barra, donde realizamos ambos servicios al tiempo. Responde *sí* o *no*.";
        break;
      case 'wantsPedicure':
        state.wantsPedicure = message.toLowerCase();
        if (state.wantsPedicure === 'sí' || state.wantsPedicure === 'si') {
          state.step = 'pedicureType';
          response = "✨ Perfecto. ¿Deseas pedicure con maquillaje *tradicional* o *semipermanente*?";
        } else {
          state.step = 'appointmentDate';
          response = "📆 ¿Para qué día y hora deseas tu cita?";
        }
        break;
      case 'pedicureType':
        state.pedicureType = message;
        state.step = 'appointmentDate';
        response = "📆 ¿Para qué día y hora deseas tu cita?";
        break;
      case 'appointmentDate':
        state.appointmentDate = message;
        state.step = 'professional';
        response = "👩‍🦰 ¿Con quién deseas agendar? Puedes escribir el nombre de la profesional o decir 'cualquiera'.";
        break;
      case 'professional':
        state.professional = message;
        response = this.completeAppointment(to);
        break;
    }
  
    await whatsappService.sendMessage(to, response);
  }   

  completeAppointment(to) {
    const a = this.appointmentState[to];
    delete this.appointmentState[to];
  
    const resumen = `
  ✅ *Resumen de tu cita en Nana's Beauty Bar Spa de Uñas:*
  
  📱 Teléfono: ${to}
  👤 Nombre: ${a.name}
  📧 Correo: ${a.email}
  💅 Técnica: ${a.technique}
  🦶 Pedicure: ${a.wantsPedicure === 'sí' || a.wantsPedicure === 'si' ? `Sí (${a.pedicureType})` : 'No'}
  📆 Fecha y hora deseada: ${a.appointmentDate}
  👩‍🦰 Profesional: ${a.professional}
  🕒 Fecha de registro: ${new Date().toLocaleString('es-CO')}
  `;
  
    return `Gracias por agendar tu cita. ${resumen}
  
  Nos pondremos en contacto contigo pronto para confirmar la disponibilidad y asignarte la hora. 💖`;
  }   

  async handleAssistantFlow(to, message) {
    const state = this.assistantState[to];
  
    // Validación del límite diario
    const allowed = this.checkUsageLimit(to);
    if (!allowed) {
      const limitMsg = "🚫 Has alcanzado el límite de consultas con nuestra asesora virtual por hoy. Inténtalo mañana o agenda tu cita directamente. 💖";
      await whatsappService.sendMessage(to, limitMsg);
      return;
    }
  
    let prompt;
    if (state.step === 'recommendation') {
      prompt = `Soy una experta en cuidado de uñas. Con base en el estado que menciona el cliente, se breve con las recomendaciones y adopta una personalidad para que parezca una conversación natural. Mensaje del cliente: "${message}"`;
    } else if (state.step === 'advice') {
      prompt = `Soy asesora en tendencias de uñas. Recomienda colores o diseños actuales basados en la consulta del cliente: "${message}"`;
    } else if (state.step === 'services') {
      prompt = `Responde con información sobre los servicios del spa relacionados a: "${message}". Incluye precios si aplica.`;
    }
  
    const response = await openAiService(prompt);
    delete this.assistantState[to];
  
    const followUp = "¿Hay algo más en lo que pueda ayudarte? 😊";
    const buttons = [
      { type: 'reply', reply: { id: 'option_2', title: 'Consultar otra cosa' } },
      { type: 'reply', reply: { id: 'option_3', title: 'Ver ubicación' } }
    ];
  
    await whatsappService.sendMessage(to, response);
    await whatsappService.sendInteractiveButtons(to, followUp, buttons);
  }      

  async sendLocation(to) {
    const latitude = 6.176034669023148;
    const longitude = -75.58333291532335;
    const name = 'Nanas Beauty Bar';
    const address = 'Trv. 32sur #32 - 64, La Magnolia - Envigado, Antioquia.';
    await whatsappService.sendLocationMessage(to, latitude, longitude, name, address);
  }

  async sendMedia(to) {
    const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-file.pdf';
    const caption = '¡Esto es un PDF!';
    const type = 'document';
    await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
  }
}

export default new MessageHandler();