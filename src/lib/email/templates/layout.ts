type EmailLayoutParams = {
  previewText: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

/** Հիմնական transactional layout — հայերեն, Tend.am բրենդ։ */
export function renderEmailLayout(params: EmailLayoutParams): string {
  const cta =
    params.ctaLabel && params.ctaUrl
      ? `
      <tr>
        <td style="padding: 28px 32px 8px;">
          <a href="${params.ctaUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 999px;">
            ${params.ctaLabel}
          </a>
        </td>
      </tr>`
      : "";

  const footer = params.footerNote
    ? `<p style="margin: 16px 0 0; font-size: 13px; line-height: 22px; color: #64748b;">${params.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.title}</title>
</head>
<body style="margin: 0; padding: 0; background: #f7f4ee; font-family: 'Segoe UI', Roboto, Arial, sans-serif;">
  <span style="display: none; max-height: 0; overflow: hidden;">${params.previewText}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f7f4ee; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #f59e0b 140%); padding: 28px 32px;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 44px; height: 44px; line-height: 44px; text-align: center; background: #ffffff; color: #0f172a; font-weight: 900; font-size: 18px; border-radius: 14px;">T</span>
                    <span style="margin-left: 12px; font-size: 22px; font-weight: 900; color: #ffffff; vertical-align: middle;">Tend.am</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <h1 style="margin: 0; font-size: 26px; line-height: 1.2; font-weight: 900; color: #ffffff;">${params.title}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 8px; color: #334155; font-size: 15px; line-height: 26px;">
              ${params.bodyHtml}
              ${footer}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding: 24px 32px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; line-height: 20px; color: #94a3b8;">
                © ${new Date().getFullYear()} Tend.am · Մրցույթների հարթակ Հայաստանում
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
