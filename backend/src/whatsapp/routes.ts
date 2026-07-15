import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { whatsappService } from './service';
import { logger } from '../utils/logger';

export const whatsappRouter = Router();

const accountSid  = process.env.TWILIO_ACCOUNT_SID;
const authToken   = process.env.TWILIO_AUTH_TOKEN;
const fromNumber  = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// Only init Twilio client if credentials are set
const twilioClient = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null;

if (!twilioClient) {
  logger.warn('Twilio credentials not set — WhatsApp integration disabled');
}

/**
 * POST /api/whatsapp/webhook
 * Twilio calls this endpoint when a WhatsApp message is received.
 * Must be publicly accessible — use ngrok in development.
 */
whatsappRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { Body: messageBody, From: fromWhatsApp } = req.body;

    if (!messageBody || messageBody.trim().length < 3) {
      // Send usage instructions for empty/short messages
      await sendReply(fromWhatsApp, getHelpMessage());
      res.status(200).send('OK');
      return;
    }

    logger.info(`WhatsApp message from ${fromWhatsApp}: "${messageBody.substring(0, 80)}..."`);

    // Analyze the forwarded message
    const analysis = await whatsappService.analyzeMessage(messageBody);

    // Send the reply back
    await sendReply(fromWhatsApp, analysis.reply);

    res.status(200).send('OK');
  } catch (err) {
    logger.error('WhatsApp webhook error:', err);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/whatsapp/analyze
 * REST endpoint for analyzing text directly (used by the web app).
 */
whatsappRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length < 3) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const analysis = await whatsappService.analyzeMessage(message);

    res.json({
      success: true,
      data: {
        detectedPhones:   analysis.detectedPhones,
        detectedTills:    analysis.detectedTills,
        detectedPaybills: analysis.detectedPaybills,
        detectedAmount:   analysis.detectedAmount,
        aiAnalysis:       analysis.aiAnalysis,
        sellerResults:    analysis.sellerResults,
        reply:            analysis.reply,
      },
    });
  } catch (err) {
    logger.error('WhatsApp analyze error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

async function sendReply(to: string, body: string) {
  if (!twilioClient) {
    logger.info(`[WhatsApp reply to ${to}]:\n${body}`);
    return;
  }
  await twilioClient.messages.create({ from: fromNumber, to, body });
}

function getHelpMessage(): string {
  return [
    '🛡️ *Welcome to ScamChek WhatsApp Bot*',
    '',
    'Forward any seller message to me and I will:',
    '• Detect phone numbers, till & paybill numbers',
    '• Check them against the scam database',
    '• Analyze the message for scam patterns',
    '• Give you a trust verdict instantly',
    '',
    'Simply forward the seller\'s message to this number!',
    '',
    '🌐 Full platform: https://scamchek.co.ke',
  ].join('\n');
}
