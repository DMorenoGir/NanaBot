import whatsappService from './whatsappService.js';
import appendToSheet from './googleSheetsService.js';
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
    const menuMessage = "Elige una Opción"
    const buttons = [
      {
        type: 'reply', reply: { id: 'option_1', title: 'Agendar' }
      },
      {
        type: 'reply', reply: { id: 'option_2', title: 'Consultar'}
      },
      {
        type: 'reply', reply: { id: 'option_3', title: 'Ubicación'}
      }
    ];

    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async handleMenuOption(to, option) {
    let response;
    switch (option) {
      case 'option_1':
        this.appointmentState[to] = { step: 'name' }
        response = "Por favor, ingresa tu nombre:";
        break;
      case 'option_2':
        this.assistandState[to] = { step: 'question' };
        response = "Realiza tu consulta";
        break
      case 'option_3': 
       response = 'Esta es nuestra Ubicación';
       await this.sendLocation(to);
       break
      case 'option_6':
        response = "Si esto es una emergencia, te invitamos a llamar a nuestra linea de atención"
        await this.sendContact(to);
      default: 
       response = "Lo siento, no entendí tu selección, Por Favor, elige una de las opciones del menú."
    }
    await whatsappService.sendMessage(to, response);
  }

  async sendMedia(to) {
    // const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-audio.aac';
    // const caption = 'Bienvenida';
    // const type = 'audio';

    // const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-imagen.png';
    // const caption = '¡Esto es una Imagen!';
    // const type = 'image';

    // const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-video.mp4';
    // const caption = '¡Esto es una video!';
    // const type = 'video';

    const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-file.pdf';
    const caption = '¡Esto es un PDF!';
    const type = 'document';

    await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
  }

  async completeAppointment(to) {
    const appointment = this.appointmentState[to];
    delete this.appointmentState[to];
  
    const userData = [
      to,
      appointment.name,
      appointment.petName,
      appointment.petType,
      appointment.reason,
      new Date().toISOString()
    ];
  
    console.log("📋 Datos a guardar en Sheets:", userData); // 👈 Imprime antes de guardar
  
    await appendToSheet(userData); // 👈 Aquí se intenta guardar
  
    return `Gracias por agendar tu cita. 
    Resumen de tu cita:
    
    Nombre: ${appointment.name}
    Nombre de la mascota: ${appointment.petName}
    Tipo de mascota: ${appointment.petType}
    Motivo: ${appointment.reason}
    
    Nos pondremos en contacto contigo pronto para confirmar la fecha y hora de tu cita.`;
  }  
  


  async handleAppointmentFlow(to, message) {
    const state = this.appointmentState[to];
    let response;
  
    try {
      switch (state.step) {
        case 'name':
          state.name = message;
          state.step = 'petName';
          response = "Gracias, Ahora, ¿Cuál es el nombre de tu Mascota?";
          break;
  
        case 'petName':
          state.petName = message;
          state.step = 'petType';
          response = '¿Qué tipo de mascota es? (por ejemplo: perro, gato, huron, etc.)';
          break;
  
        case 'petType':
          state.petType = message;
          state.step = 'reason';
          response = '¿Cuál es el motivo de la Consulta?';
          break;
  
        case 'reason':
          state.reason = message;
          response = await this.completeAppointment(to); // ✅ Aquí era el error original
          break;
      }
  
      await whatsappService.sendMessage(to, response); // ✅ Asegurado dentro del mismo bloque
    } catch (error) {
      console.error('❌ Error en handleAppointmentFlow:', error);
      await whatsappService.sendMessage(to, "Lo siento, ocurrió un error mientras registrábamos tu cita. Intenta de nuevo más tarde.");
    }
  }   

  async handleAssistandFlow(to, message) {
    const state = this.assistandState[to];
    let response;

    const menuMessage = "¿La respuesta fue de tu ayuda?"
    const buttons = [
      { type: 'reply', reply: { id: 'option_4', title: "Si, Gracias" } },
      { type: 'reply', reply: { id: 'option_5', title: 'Hacer otra pregunta'}},
      { type: 'reply', reply: { id: 'option_6', title: 'Emergencia'}}
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
      addresses: [
        {
          street: "Transversal 32sur N32 - 64",
          city: "Envigado",
          state: "Antioquia",
          zip: "055422",
          country: "Colombia",
          country_code: "Co",
          type: "WORK"
        }
      ],
      emails: [
        {
          email: "nanasbeautybar@gmail.com",
          type: "WORK"
        }
      ],
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
      phones: [
        {
          phone: "+573042730056",
          wa_id: "573042730056",
          type: "WORK"
        }
      ],
      urls: [
        {
          url: "https://nanasbeautybar.site.agendapro.com/co",
          type: "WORK"
        }
      ]
    };

    await whatsappService.sendContactMessage(to, contact);
  }

  async sendLocation(to) {
    const latitude = 6.176034669023148 ;
    const longitude = -75.58333291532335;
    const name = 'Nanas Beauty Bar';
    const address = 'Trv. 32sur #32 - 64, La Magnolia - Envigado, Antioquia.'

    await whatsappService.sendLocationMessage(to, latitude, longitude, name, address);
  }

}

export default new MessageHandler();