import whatsappService from './whatsappService.js';
import openAiService from './openAiService.js';

class MessageHandler {

  constructor() {
    this.appointmentState = {};
    this.assistandState = {};
  }

  async handleIncomingMessage(message, senderInfo) {
    if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();

      if(this.isGreeting(incomingMessage)){
        await this.sendWelcomeMessage(message.from, message.id, senderInfo);
        await this.sendWelcomeMenu(message.from);
      } else if(incomingMessage === 'media') {
        await this.sendMedia(message.from);
      } else if (this.appointmentState[message.from]) {
        await this.handleAppointmentFlow(message.from, incomingMessage);
      } else if (this.assistandState[message.from]) {
        await this.handleAssistandFlow(message.from, incomingMessage);
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
    const greetings = ["hola", "hello", "hi", "buenas tardes"];
    return greetings.includes(message);
  }

  getSenderName(senderInfo) {
    return senderInfo.profile?.name || senderInfo.wa_id;
  }

  async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const welcomeMessage = `Hola ${name}, Bienvenido a MEDPET, Tu tienda de mascotas en línea. ¿En qué puedo ayudarte hoy?`;
    await whatsappService.sendMessage(to, welcomeMessage, messageId);
  }

  async sendWelcomeMenu(to) {
    const menuMessage = "Elige una Opción";
    const buttons = [
      { type: 'reply', reply: { id: 'option_1', title: 'Agendar' }},
      { type: 'reply', reply: { id: 'option_2', title: 'Consultar' }},
      { type: 'reply', reply: { id: 'option_3', title: 'Ubicación' }}
    ];
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async handleMenuOption(to, option) {
    let response;
    switch (option) {
      case 'option_1':
        this.appointmentState[to] = { step: 'name' };
        response = "Por favor, ingresa tu nombre:";
        break;
      case 'option_2':
        this.assistandState[to] = { step: 'question' };
        response = "Realiza tu consulta";
        break;
      case 'option_3': 
        response = 'Esta es nuestra Ubicación';
        await this.sendLocation(to);
        break;
      case 'option_6':
        response = "Si esto es una emergencia, te invitamos a llamar a nuestra línea de atención.";
        await this.sendContact(to);
        break;
      default: 
        response = "Lo siento, no entendí tu selección. Por favor, elige una de las opciones del menú.";
    }
    await whatsappService.sendMessage(to, response);
  }

  async sendMedia(to) {
    const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-file.pdf';
    const caption = '¡Esto es un PDF!';
    const type = 'document';
    await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
  }

  completeAppointment(to) {
    const appointment = this.appointmentState[to];
    delete this.appointmentState[to];

    const resumen = `
✅ *Resumen de tu cita:*

📱 Teléfono: ${to}
👤 Nombre: ${appointment.name}
🐾 Mascota: ${appointment.petName}
🐶 Tipo: ${appointment.petType}
📝 Motivo: ${appointment.reason}
🕒 Fecha: ${new Date().toLocaleString('es-CO')}
`;

    return `Gracias por agendar tu cita. ${resumen} 

Nos pondremos en contacto contigo pronto para confirmar la fecha y hora de tu cita.`;
  }

  async handleAppointmentFlow(to, message) {
    const state = this.appointmentState[to];
    let response;

    switch (state.step) {
      case 'name':
        state.name = message;
        state.step = 'petName';
        response = "Gracias. ¿Cuál es el nombre de tu Mascota?";
        break;
      case 'petName':
        state.petName = message;
        state.step = 'petType';
        response = '¿Qué tipo de mascota es? (Ej: perro, gato, hurón...)';
        break;
      case 'petType':
        state.petType = message;
        state.step = 'reason';
        response = '¿Cuál es el motivo de la Consulta?';
        break;
      case 'reason':
        state.reason = message;
        response = this.completeAppointment(to);
        break;
    }
    await whatsappService.sendMessage(to, response);
  }

  async handleAssistandFlow(to, message) {
    const state = this.assistandState[to];
    let response;

    const menuMessage = "¿La respuesta fue de tu ayuda?";
    const buttons = [
      { type: 'reply', reply: { id: 'option_4', title: "Sí, gracias" }},
      { type: 'reply', reply: { id: 'option_5', title: 'Hacer otra pregunta' }},
      { type: 'reply', reply: { id: 'option_6', title: 'Emergencia' }}
    ];

    if (state.step === 'question') {
      response = await openAiService(message);
    }

    delete this.assistandState[to];
    await whatsappService.sendMessage(to, response);
    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async sendContact(to) {
    const contact = {
      addresses: [{
        street: "Transversal 32sur N32 - 64",
        city: "Envigado",
        state: "Antioquia",
        zip: "055422",
        country: "Colombia",
        country_code: "Co",
        type: "WORK"
      }],
      emails: [{ email: "nanasbeautybar@gmail.com", type: "WORK" }],
      name: {
        formatted_name: "Nanas Contacto",
        first_name: "Nanas",
        last_name: "Beauty Bar",
        middle_name: "",
        suffix: "",
        prefix: ""
      },
      org: {
        company: "Nanas Beauty Bar",
        department: "Atención al Cliente",
        title: "Representante"
      },
      phones: [{ phone: "+573042730056", wa_id: "573042730056", type: "WORK" }],
      urls: [{ url: "https://nanasbeautybar.site.agendapro.com/co", type: "WORK" }]
    };
    await whatsappService.sendContactMessage(to, contact);
  }

  async sendLocation(to) {
    const latitude = 6.176034669023148;
    const longitude = -75.58333291532335;
    const name = 'Nanas Beauty Bar';
    const address = 'Trv. 32sur #32 - 64, La Magnolia - Envigado, Antioquia.';
    await whatsappService.sendLocationMessage(to, latitude, longitude, name, address);
  }

}

export default new MessageHandler();