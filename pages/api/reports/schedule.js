import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import verifyToken from '../../../middleware/verifyToken';
import { supabaseAdmin } from '../../../lib/supabaseClient';

const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const scheduledJobs = new Map(); // scheduleId -> cron job

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

const cronForFrequency = (time, frequency) => {
  const [hour, minute] = time.split(':').map(Number);
  const safeHour = Number.isNaN(hour) ? 9 : hour;
  const safeMinute = Number.isNaN(minute) ? 0 : minute;
  if (frequency === 'weekly') return `${safeMinute} ${safeHour} * * 1`;
  if (frequency === 'monthly') return `${safeMinute} ${safeHour} 1 * *`;
  return `${safeMinute} ${safeHour} * * *`;
};

async function triggerReport({ siteId, frequency, recipients, time, user }) {
  const token = jwt.sign({ id: user.id, email: user.email, org_id: user.org_id, role: user.role }, JWT_SECRET, {
    expiresIn: '2h',
  });

  const body = {
    siteId,
    reportType: frequency,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  };

  await fetch(`${BASE_URL}/api/reports/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
    .then((resp) => resp.json())
    .then(async (json) => {
      if (json?.pdfUrl) {
        await fetch(`${BASE_URL}/api/reports/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reportUrl: json.pdfUrl, recipients, subject: `${frequency} report` }),
        });
      }
    })
    .catch(() => {});
}

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, verifyToken);
  } catch (err) {
    return;
  }

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin role required' });
  }

  const { siteId, frequency, time, recipients } = req.body || {};
  if (!siteId || Number.isNaN(Number(siteId)) || !['daily', 'weekly', 'monthly'].includes(frequency) || !time) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('report_schedules')
      .insert({ site_id: siteId, frequency, time, recipients })
      .select('id')
      .single();

    if (error) throw error;

    const cronExpr = cronForFrequency(time, frequency);
    const job = cron.schedule(cronExpr, () => {
      triggerReport({ siteId, frequency, recipients, time, user: req.user });
    });
    scheduledJobs.set(data.id, job);

    return res.status(200).json({ success: true, scheduleId: data.id, message: 'Report scheduled successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
