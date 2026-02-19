// Stub for nodemailer (optional dependency, not installed)
export default {
  createTransport: () => ({
    sendMail: async () => ({ messageId: 'mock-id' }),
    verify: async () => undefined,
  }),
};
