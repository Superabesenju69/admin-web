import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Helper to get the admin client
const getAdminSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { periodId } = body;

        if (!periodId) {
            return NextResponse.json({ error: 'Missing periodId' }, { status: 400 });
        }

        // Get tenant ID from headers or cookies
        const tenantId = req.headers.get('x-tenant-id') || req.cookies.get('pos_tenant_id')?.value || '7488df63-4fa8-4444-9c59-b1d5565f121d';

        const supabase = getAdminSupabase();

        // 1. Fetch period details
        const { data: period, error: perErr } = await supabase
            .from('payroll_periods')
            .select('*')
            .eq('id', periodId)
            .eq('tenant_id', tenantId)
            .single();

        if (perErr || !period) {
            return NextResponse.json({ error: perErr?.message || 'Payroll period not found' }, { status: 404 });
        }

        // 2. Fetch payroll entries joined with employee (usuario) profiles
        const { data: entries, error: entErr } = await supabase
            .from('payroll_entries')
            .select('*, usuarios(nombre, apellido, role, email)')
            .eq('period_id', periodId)
            .eq('tenant_id', tenantId);

        if (entErr || !entries) {
            return NextResponse.json({ error: entErr?.message || 'No payroll entries found' }, { status: 404 });
        }

        // 3. Configure Transporter
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT) || 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASSWORD;
        let smtpFrom = process.env.SMTP_FROM || 'Restaurant OS <noreply@restaurantos.com>';

        const isMockMode = !smtpHost || !smtpUser || !smtpPass;
        let transporter: nodemailer.Transporter | null = null;

        if (isMockMode) {
            console.log('⚠️ [SMTP CONFIG MISSING] - Generating Ethereal Test SMTP credentials.');
            try {
                const testAccount = await nodemailer.createTestAccount();
                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                smtpFrom = `Restaurant OS <${testAccount.user}>`;
                console.log(`🔑 [ETHEREAL ACCOUNT CREATED] User: ${testAccount.user}`);
            } catch (err) {
                console.error('Failed to create Ethereal SMTP account:', err);
            }
        } else {
            transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
        }

        let sentCount = 0;
        let skippedCount = 0;
        const skippedDetails: Array<{ id: string; name: string; reason: string }> = [];
        const testUrls: Array<{ email: string; url: string }> = [];

        // 4. Send email payslips
        for (const entry of entries) {
            const user = entry.usuarios;
            const userEmail = user?.email;

            if (!userEmail) {
                skippedCount++;
                skippedDetails.push({
                    id: entry.user_id,
                    name: `${user?.nombre || ''} ${user?.apellido || 'Employee'}`.trim(),
                    reason: 'No email address configured in employee profile'
                });
                continue;
            }

            const nombre = user.nombre || '';
            const apellido = user.apellido || '';
            const role = (user.role || '').replace('_', ' ').toUpperCase();
            const contract_type = entry.contract_type || 'laboral';

            const ordinary_hours = Number(entry.ordinary_hours || 0);
            const overtime_hours = Number(entry.overtime_hours || 0);
            const hourly_rate = Number(entry.hourly_rate || 0);
            
            const gross_salary = Number(entry.gross_salary || 0).toFixed(2);
            const inss_laboral = Number(entry.inss_laboral || 0).toFixed(2);
            const ir_retention = Number(entry.ir_retention || 0).toFixed(2);
            const deductions = Number(entry.deductions || 0).toFixed(2);
            const net_salary = Number(entry.net_salary || 0).toFixed(2);
            const aguinaldo_accrual = Number(entry.aguinaldo_accrual || 0).toFixed(2);
            const vacation_accrual = Number(entry.vacation_accrual || 0).toFixed(2);

            // HTML Email Template matching Nicaraguan guidelines
            const emailHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Boleta de Pago</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
        <!-- Header -->
        <div style="background-color: #0d9488; background-image: linear-gradient(135deg, #0d9488, #0f766e); padding: 32px; text-align: center; color: #ffffff;">
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.85; display: block; margin-bottom: 6px;">Boleta de Pago Oficial</span>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.025em;">Restaurant OS</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 500; opacity: 0.9;">Período: ${period.start_date} al ${period.end_date}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
            <!-- Employee Card -->
            <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 800; color: #111827;">${nombre} ${apellido}</h3>
                <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Rol: ${role} &middot; Contrato: ${contract_type === 'profesional' ? 'Servicios Profesionales (Sin INSS)' : 'Laboral (Con INSS)'}
                </div>
            </div>

            <!-- Summary Badges -->
            <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 12px 0; margin: 0 -12px 24px -12px;">
                <div style="display: table-cell; width: 50%; background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 16px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 10px; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Ingresos Brutos</span>
                    <span style="font-size: 20px; font-weight: 900; color: #0f766e;">C$ ${gross_salary}</span>
                </div>
                <div style="display: table-cell; width: 50%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Neto a Recibir</span>
                    <span style="font-size: 20px; font-weight: 900; color: #0f172a;">C$ ${net_salary}</span>
                </div>
            </div>

            <!-- Breakdown Table -->
            <h4 style="margin: 20px 0 12px 0; font-size: 13px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">Desglose Detallado</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                <thead>
                    <tr style="border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 800;">
                        <th style="padding: 10px 0;">Concepto</th>
                        <th style="padding: 10px 0; text-align: right;">Cálculo / Cantidad</th>
                        <th style="padding: 10px 0; text-align: right;">Monto (C$)</th>
                    </tr>
                </thead>
                <tbody style="color: #4b5563;">
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 12px 0; font-weight: 600; color: #111827;">Horas Ordinarias</td>
                        <td style="padding: 12px 0; text-align: right; font-family: monospace;">${ordinary_hours.toFixed(2)} hrs @ C$ ${hourly_rate.toFixed(2)}/hr</td>
                        <td style="padding: 12px 0; text-align: right; color: #111827; font-weight: 600;">C$ ${(ordinary_hours * hourly_rate).toFixed(2)}</td>
                    </tr>
                    ${overtime_hours > 0 ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 12px 0; font-weight: 600; color: #111827;">Horas Extras</td>
                        <td style="padding: 12px 0; text-align: right; font-family: monospace;">${overtime_hours.toFixed(2)} hrs @ C$ ${(hourly_rate * 2.0).toFixed(2)}/hr</td>
                        <td style="padding: 12px 0; text-align: right; color: #111827; font-weight: 600;">C$ ${(overtime_hours * hourly_rate * 2.0).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-bottom: 1px solid #f3f4f6; background-color: #fafafa;">
                        <td style="padding: 12px 8px; font-weight: 700; color: #111827;">Salario Bruto</td>
                        <td style="padding: 12px 8px; text-align: right;"></td>
                        <td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 700;">C$ ${gross_salary}</td>
                    </tr>
                    ${contract_type === 'laboral' ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 12px 0; font-weight: 600; color: #dc2626;">Deducción INSS Laboral (7%)</td>
                        <td style="padding: 12px 0; text-align: right;">Deducción obligatoria</td>
                        <td style="padding: 12px 0; text-align: right; color: #dc2626; font-weight: 600;">- C$ ${inss_laboral}</td>
                    </tr>
                    ` : ''}
                    ${Number(ir_retention) > 0 ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 12px 0; font-weight: 600; color: #dc2626;">Retención de IR</td>
                        <td style="padding: 12px 0; text-align: right;">${contract_type === 'profesional' ? '10% Retención de Ley' : 'Tabla Progresiva Anual'}</td>
                        <td style="padding: 12px 0; text-align: right; color: #dc2626; font-weight: 600;">- C$ ${ir_retention}</td>
                    </tr>
                    ` : ''}
                    ${Number(deductions) > 0 ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 12px 0; font-weight: 600; color: #dc2626;">Otras Deducciones</td>
                        <td style="padding: 12px 0; text-align: right;">Descuentos manuales</td>
                        <td style="padding: 12px 0; text-align: right; color: #dc2626; font-weight: 600;">- C$ ${deductions}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-top: 2px solid #e5e7eb; background-color: #f0fdfa;">
                        <td style="padding: 16px 8px; font-weight: 900; color: #0d9488; font-size: 15px;">Salario Neto Recibido</td>
                        <td style="padding: 16px 8px; text-align: right;"></td>
                        <td style="padding: 16px 8px; text-align: right; color: #0f766e; font-weight: 900; font-size: 16px;">C$ ${net_salary}</td>
                    </tr>
                </tbody>
            </table>

            ${contract_type === 'laboral' ? `
            <!-- Legal Accruals Details -->
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e5e7eb;">
                <span style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">Provisiones de Ley Acumuladas en este Período</span>
                <div style="font-size: 12px; color: #4b5563;">
                    <div style="margin-bottom: 4px;">&bull; <strong>Aguinaldo (13er Mes):</strong> C$ ${aguinaldo_accrual}</div>
                    <div>&bull; <strong>Provisión de Vacaciones:</strong> C$ ${vacation_accrual}</div>
                </div>
            </div>
            ` : ''}
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.5;">
            Esta boleta contiene información laboral confidencial y cumple con el Código del Trabajo y la Ley de Concertación Tributaria (Ley 822) de la República de Nicaragua.<br>
            &copy; 2026 Restaurant OS. Todos los derechos reservados.
        </div>
    </div>
</body>
</html>`;

            if (transporter) {
                const info = await transporter.sendMail({
                    from: smtpFrom,
                    to: userEmail,
                    subject: `Boleta de Pago Detallada - Período ${period.start_date} al ${period.end_date}`,
                    html: emailHtml,
                });
                sentCount++;
                if (isMockMode) {
                    const testUrl = nodemailer.getTestMessageUrl(info);
                    if (testUrl) {
                        testUrls.push({ email: userEmail, url: testUrl });
                        console.log(`✉️ [ETHEREAL EMAIL SENT] To: ${userEmail} | Preview Link: ${testUrl}`);
                    }
                }
            } else {
                console.log(`\n==================================================`);
                console.log(`[MOCK EMAIL DISPATCH FALLBACK]`);
                console.log(`From: ${smtpFrom}`);
                console.log(`To: ${userEmail}`);
                console.log(`Subject: Boleta de Pago Detallada - Período ${period.start_date} al ${period.end_date}`);
                console.log(`--- Body Preview ---`);
                console.log(`Estimado(a) ${nombre} ${apellido}, se ha liquidado tu nómina.`);
                console.log(`Salario Bruto: C$ ${gross_salary} | Neto a Recibir: C$ ${net_salary}`);
                console.log(`==================================================\n`);
                sentCount++;
            }
        }

        return NextResponse.json({
            success: true,
            isMockMode,
            sentCount,
            skippedCount,
            skippedDetails,
            testUrls: testUrls.length > 0 ? testUrls : null
        });

    } catch (e: any) {
        console.error('Failed to send payslip emails:', e);
        return NextResponse.json({ error: e.message || 'Server error occurred' }, { status: 500 });
    }
}
