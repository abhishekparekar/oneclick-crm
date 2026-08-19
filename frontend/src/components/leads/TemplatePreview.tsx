import React from 'react';

interface TemplatePreviewProps {
  template: {
    name: string;
    bodyText: string;
    headerContent?: string | null;
    headerType?: string | null;
    footerText?: string | null;
    buttonsJson?: any;
    variablesJson?: any;
  } | null;
  variableMapping?: Record<string, string>;
}

export default function TemplatePreview({ template, variableMapping = {} }: TemplatePreviewProps) {
  if (!template) {
    return (
      <div style={{
        border: '1px dashed #E5E7EB', borderRadius: 10, padding: 24,
        textAlign: 'center', color: '#9CA3AF', fontSize: 13,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120,
        background: '#FAFAFA',
      }}>
        <p style={{ fontWeight: 500 }}>No template selected</p>
        <p style={{ fontSize: 12, marginTop: 4, color: '#D1D5DB' }}>Choose an approved template to preview</p>
      </div>
    );
  }

  const renderBody = () => {
    let text = template.bodyText;
    const vars = (template.variablesJson as string[]) || [];
    vars.forEach((v) => {
      const placeholder = variableMapping[v] || `{{${v}}}`;
      text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), placeholder);
    });
    return text.split('\n').map((line, idx) => (
      <React.Fragment key={idx}>{line}<br /></React.Fragment>
    ));
  };

  const getButtons = () => {
    try {
      const btnObj = typeof template.buttonsJson === 'string'
        ? JSON.parse(template.buttonsJson)
        : template.buttonsJson;
      return btnObj?.buttons || [];
    } catch (_) { return []; }
  };

  const buttons = getButtons();

  return (
    <div style={{
      background: '#E5DDD5', borderRadius: 12, padding: 12,
      border: '1px solid #D1D5DB', maxWidth: 320, margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* WhatsApp bubble */}
      <div style={{
        background: '#FFFFFF', borderRadius: '12px 12px 12px 4px',
        padding: '10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        marginRight: 24, display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Header */}
        {template.headerType === 'TEXT' && template.headerContent && (
          <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', paddingBottom: 6, borderBottom: '1px solid #F3F4F6' }}>
            {template.headerContent}
          </p>
        )}
        {template.headerType && template.headerType !== 'TEXT' && (
          <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '12px 8px', textAlign: 'center', fontSize: 11, color: '#6B7280', fontWeight: 600, border: '1px solid #E5E7EB' }}>
            {template.headerType === 'IMAGE' && variableMapping.headerMediaUrl ? (
              <img src={variableMapping.headerMediaUrl} alt="Header" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            ) : null}
            <p style={{ marginTop: template.headerType === 'IMAGE' && variableMapping.headerMediaUrl ? 4 : 0 }}>
              {template.headerType === 'IMAGE' ? '🖼️ Image' : template.headerType === 'VIDEO' ? '🎥 Video' : '📄 Document'}
            </p>
          </div>
        )}

        {/* Body */}
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{renderBody()}</p>

        {/* Footer */}
        {template.footerText && (
          <p style={{ fontSize: 11, color: '#9CA3AF', borderTop: '1px solid #F9FAFB', paddingTop: 4 }}>
            {template.footerText}
          </p>
        )}

        {/* Timestamp */}
        <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginTop: 2 }}>10:00 AM ✓✓</p>
      </div>

      {/* Buttons */}
      {buttons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, marginRight: 24 }}>
          {buttons.map((btn: any, idx: number) => (
            <div key={idx} style={{
              background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 10,
              padding: '8px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600,
              color: '#0EA5E9', cursor: 'default', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}>
              {btn.type === 'PHONE_NUMBER' && '📞 '}
              {btn.type === 'URL' && '🔗 '}
              {btn.type === 'QUICK_REPLY' && '💬 '}
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

