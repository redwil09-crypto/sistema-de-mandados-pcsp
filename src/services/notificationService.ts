
import emailjs from '@emailjs/browser';

// CONFIGURAÇÃO FÁCIL:
// 1. Crie conta em emailjs.com
// 2. Pegue essas 3 chaves no painel deles
const EMAILJS_SERVICE_ID = 'service_kzfw67r'; // Seu Service ID
const EMAILJS_TEMPLATE_ID = 'template_0mtexdb'; // Seu Template ID
const EMAILJS_PUBLIC_KEY = 'XGCQY7oJijCOcp_hL'; // Sua Public Key

export const notificationService = {
    async sendApprovalEmail(userEmail: string, userName: string) {
        try {
            const templateParams = {
                to_email: userEmail,
                to_name: userName,
                admin_name: 'William Castro', // Seu nome
                system_url: 'https://sistema-de-mandados-pcsp.vercel.app'
            };

            const response = await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams,
                EMAILJS_PUBLIC_KEY
            );

            return { success: true, data: response };
        } catch (error) {
            console.error('Erro ao enviar e-mail via EmailJS:', error);
            return { success: false, error };
        }
    }
};
