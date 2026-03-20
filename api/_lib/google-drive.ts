import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/gmail.send'
]

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
const IMPERSONATED_EMAIL = process.env.GOOGLE_IMPERSONATED_EMAIL

const getAuthClient = async () => {
  try {
    let credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    } else {
      // Fallback for Vercel if reading from a file path
      // Note: Ideally you set GOOGLE_APPLICATION_CREDENTIALS_JSON in Vercel to bypass fs.readFileSync
      const fs = await import('fs')
      const path = await import('path')
      const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './server/service-account.json'
      const keyFilePath = path.resolve(process.cwd(), CREDENTIALS_PATH)
      credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'))
    }

    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
      subject: IMPERSONATED_EMAIL,
    })

    await jwtClient.authorize()
    return jwtClient
  } catch (error) {
    console.error('Authentication error:', error)
    throw error
  }
}

export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    const authClient = await getAuthClient()
    const gmail = google.gmail({ version: 'v1', auth: authClient as any })

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`
    const messageParts = [
      `From: Aquifer Auth <${IMPERSONATED_EMAIL}>`,
      `To: ${to}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      body
    ]
    const message = messageParts.join('\n')

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    })
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export const createSheet = async (name: string, description?: string) => {
  if (!FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables')
  }

  const authClient = await getAuthClient()
  const drive = google.drive({ version: 'v3', auth: authClient as any })
  const sheets = google.sheets({ version: 'v4', auth: authClient as any })

  const fileMetadata = {
    name,
    description,
    parents: [FOLDER_ID],
    mimeType: 'application/vnd.google-apps.spreadsheet',
  }

  const file = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, webViewLink',
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: file.data.id!,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['first_name', 'last_name', 'email', 'link', 'reference_id']],
    },
  })

  return file.data
}

export const appendToSheet = async (spreadsheetId: string, data: any[][]) => {
  const authClient = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth: authClient as any })

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A2',
    valueInputOption: 'RAW',
    requestBody: {
      values: data,
    },
  })
}

export const deleteFile = async (fileId: string) => {
  const authClient = await getAuthClient()
  const drive = google.drive({ version: 'v3', auth: authClient as any })

  await drive.files.delete({
    fileId: fileId,
  })
}

export const readSheet = async (spreadsheetId: string, range: string = 'A:Z') => {
  const authClient = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth: authClient as any })

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return result.data.values || []
}
