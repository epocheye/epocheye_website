import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import verifyToken from '../../../middleware/verifyToken';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

const drawTrend = (doc, analytics, startY) => {
  if (!analytics.length) return startY;
  const max = Math.max(...analytics.map((a) => (a.domestic || 0) + (a.foreign || 0)), 1);
  const chartWidth = 160;
  const chartHeight = 40;
  const originX = 25;
  const originY = startY + chartHeight;

  doc.setDrawColor(100);
  doc.line(originX, originY, originX + chartWidth, originY);
  doc.line(originX, originY, originX, originY - chartHeight);

  analytics.forEach((point, idx) => {
    const total = (point.domestic || 0) + (point.foreign || 0);
    const x = originX + (chartWidth / Math.max(analytics.length - 1, 1)) * idx;
    const y = originY - (total / max) * chartHeight;
    if (idx > 0) {
      const prevTotal = (analytics[idx - 1].domestic || 0) + (analytics[idx - 1].foreign || 0);
      const prevX = originX + (chartWidth / Math.max(analytics.length - 1, 1)) * (idx - 1);
      const prevY = originY - (prevTotal / max) * chartHeight;
      doc.line(prevX, prevY, x, y);
    }
    doc.circle(x, y, 0.7, 'F');
  });
  return originY + 6;
};

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

  const { siteId, reportType, startDate, endDate } = req.body || {};
  if (!siteId || Number.isNaN(Number(siteId)) || !reportType || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  try {
    const { data: siteData } = await supabaseAdmin
      .from('sites')
      .select('name')
      .eq('id', siteId)
      .maybeSingle();

    const { data: analytics, error } = await supabaseAdmin
      .from('visitor_analytics')
      .select('date, domestic, foreign_visitors')
      .eq('site_id', siteId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    const totals = (analytics || []).map((a) => (a.domestic || 0) + (a.foreign_visitors || 0));
    const totalVisitors = totals.reduce((s, v) => s + v, 0);
    const peak = (analytics || []).reduce(
      (acc, curr) => {
        const total = (curr.domestic || 0) + (curr.foreign_visitors || 0);
        return total > acc.total ? { date: curr.date, total } : acc;
      },
      { date: 'N/A', total: 0 },
    );
    const avgVisitors = analytics?.length ? totalVisitors / analytics.length : 0;

    const domesticSum = (analytics || []).reduce((s, a) => s + (a.domestic || 0), 0);
    const foreignSum = (analytics || []).reduce((s, a) => s + (a.foreign_visitors || 0), 0);
    const demographics = {
      domestic: domesticSum,
      foreign: foreignSum,
      domestic_pct: domesticSum + foreignSum === 0 ? 0 : (domesticSum / (domesticSum + foreignSum)) * 100,
      foreign_pct: domesticSum + foreignSum === 0 ? 0 : (foreignSum / (domesticSum + foreignSum)) * 100,
    };

    let revenue = 'N/A';
    try {
      const { data: ticketsData } = await supabaseAdmin
        .from('tickets')
        .select('amount')
        .eq('site_id', siteId)
        .gte('date', startDate)
        .lte('date', endDate);
      if (ticketsData) {
        const sum = ticketsData.reduce((s, row) => s + (row.amount || 0), 0);
        revenue = sum;
      }
    } catch (err) {
      revenue = 'N/A';
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`EpochEye Report - ${siteData?.name || 'Site ' + siteId}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Type: ${reportType} | Range: ${startDate} to ${endDate}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Value']],
      body: [
        ['Total Visitors', String(totalVisitors)],
        ['Peak Day', `${peak.date} (${peak.total})`],
        ['Average / Day', avgVisitors.toFixed(2)],
        ['Revenue', typeof revenue === 'number' ? revenue.toString() : 'N/A'],
      ],
      theme: 'striped',
    });

    let nextY = doc.lastAutoTable.finalY + 10;
    doc.text('Visitor Trend', 14, nextY);
    nextY = drawTrend(doc, analytics || [], nextY + 4);

    doc.text('Demographics', 14, nextY + 6);
    autoTable(doc, {
      startY: nextY + 8,
      head: [['Segment', 'Value']],
      body: [
        ['Domestic (%)', demographics.domestic_pct.toFixed(2)],
        ['Foreign (%)', demographics.foreign_pct.toFixed(2)],
      ],
      theme: 'plain',
    });

    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toISOString()}`, 14, 285);
    doc.text('EpochEye', 170, 285, { align: 'right' });

    const fileName = `report_${siteId}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const filePath = path.join(process.cwd(), 'public', 'reports', fileName);
    const pdfBytes = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfBytes));

    const pdfUrl = `/reports/${fileName}`;
    return res.status(200).json({ success: true, pdfUrl, downloadUrl: pdfUrl });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
