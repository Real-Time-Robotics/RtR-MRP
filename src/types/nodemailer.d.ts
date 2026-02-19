// Nodemailer is an optional dependency - this declaration prevents TS errors
// for dynamic imports that are wrapped in try/catch blocks
declare module 'nodemailer' {
  interface Transporter {
    sendMail(options: unknown): Promise<{ messageId: string }>;
    verify(): Promise<void>;
  }
  export function createTransport(options: unknown): Transporter;
}
