// app/api/whatsapp/route.ts
// ============================================================
// WhatsApp Integration — Placeholder
// ─────────────────────────────────────────────────────────────
// This file is ready to connect to:
//   • Twilio WhatsApp API (simplest for Zimbabwe)
//   • Meta Cloud API (official, free)
//   • WhatApp Business API via any provider
//
// To enable: set WHATSAPP_PROVIDER=twilio|meta in .env
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface SendMessagePayload {
  lead_id: string
  message: string
  template?: string
  template_params?: string[]
}

// POST /api/whatsapp — send a message to a lead
export async function POST(req: NextRequest) {
  try {
    const body: SendMessagePayload = await req.json()
    const { lead_id, message } = body

    // Fetch lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('id, full_name, whatsapp_number, whatsapp_opt_in')
      .eq('id', lead_id)
      .single()

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.whatsapp_opt_in || !lead.whatsapp_number) {
      return NextResponse.json({ error: 'Lead has not opted in to WhatsApp' }, { status: 400 })
    }

    const provider = process.env.WHATSAPP_PROVIDER || 'placeholder'

    let result: { success: boolean; message_id?: string } = { success: false }

    if (provider === 'twilio') {
      result = await sendViaTwilio(lead.whatsapp_number, message)
    } else if (provider === 'meta') {
      result = await sendViaMeta(lead.whatsapp_number, message)
    } else {
      // Placeholder — log it but don't actually send
      console.log(`[WhatsApp PLACEHOLDER] To: ${lead.whatsapp_number} | Message: ${message}`)
      result = { success: true, message_id: `placeholder_${Date.now()}` }
    }

    if (result.success) {
      // Log in DB
      await supabaseAdmin.from('whatsapp_messages').insert({
        lead_id,
        direction: 'outbound',
        message_body: message,
        status: 'sent',
      })

      await supabaseAdmin
        .from('leads')
        .update({ last_whatsapp_at: new Date().toISOString() })
        .eq('id', lead_id)

      await supabaseAdmin.from('activities').insert({
        lead_id,
        type: 'whatsapp_sent',
        description: `WhatsApp message sent via ${provider}`,
        metadata: { message_id: result.message_id },
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('WhatsApp send error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// GET /api/whatsapp/webhook — Meta/Twilio webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge)
  }

  return NextResponse.json({ error: 'Invalid verification' }, { status: 403 })
}

// ── Provider Implementations ──────────────────────────────────

async function sendViaTwilio(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_WHATSAPP_FROM! // e.g. "whatsapp:+14155238886"

  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: formattedTo, From: from, Body: message }),
    }
  )

  const data = await response.json()
  return { success: response.ok, message_id: data.sid }
}

async function sendViaMeta(to: string, message: string) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID!
  const accessToken = process.env.META_ACCESS_TOKEN!

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'text',
        text: { body: message },
      }),
    }
  )

  const data = await response.json()
  return { success: response.ok, message_id: data.messages?.[0]?.id }
}

// ── Message Templates ──────────────────────────────────────────
const WHATSAPP_TEMPLATES = {
  welcome: (name: string) =>
    `Hi ${name}! 👋 Thank you for your interest in studying abroad with Varsity Visa. We've received your details and a consultant will contact you within 24 hours. Reply STOP to opt out.`,

  followUp: (name: string, destination: string) =>
    `Hi ${name}! 🎓 Following up on your ${destination.toUpperCase()} study inquiry. Are you still interested? We have new scholarship opportunities available. Reply YES to learn more!`,

  documentReminder: (name: string) =>
    `Hi ${name}! 📄 Quick reminder — please upload your documents to speed up your application. You're missing: passport, transcripts, or English test results. Reply HELP for assistance.`,

  visaApproved: (name: string) =>
    `🎉 Congratulations ${name}! Your visa has been approved! Please contact us immediately to proceed with your enrollment. We're so proud of you!`,

  appointmentReminder: (name: string, date: string) =>
    `Hi ${name}! 📅 Reminder: Your consultation with Varsity Visa is scheduled for ${date}. Reply CONFIRM to confirm or RESCHEDULE to change the time.`,
}
