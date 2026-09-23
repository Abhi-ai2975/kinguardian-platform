// Package smtp implements the Sender port for email delivery via SMTP.
//
// Phase 1 uses Gmail SMTP with an app password (STARTTLS on port 587).
// Swapping to Resend or any other SMTP provider only requires changing
// the SMTPOptions fields — the interface stays the same.
//
// The adapter wraps Go's stdlib net/smtp — no external email library needed.
package smtp

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"

	"watcher24/notifier/internal/domain"
	"watcher24/notifier/internal/ports"
)

// SMTPOptions holds the connection and auth settings for the SMTP server.
type SMTPOptions struct {
	Host     string // e.g. "smtp.gmail.com"
	Port     string // e.g. "587"
	Email    string // authenticated sender address
	Password string // app password or SMTP password
	FromName string // display name, e.g. "Watcher24"
}

// EmailSender implements ports.Sender for the email channel.
// It dials SMTP, upgrades to TLS via STARTTLS, authenticates, and sends.
type EmailSender struct {
	opts ports.ChannelConfigStore // used to look up the org's notification email
	smtp SMTPOptions
}

// NewEmailSender creates an EmailSender with the given SMTP settings.
// channelCfg is used at send-time to look up the org's configured email address.
func NewEmailSender(smtpOpts SMTPOptions, channelCfg ports.ChannelConfigStore) *EmailSender {
	return &EmailSender{opts: channelCfg, smtp: smtpOpts}
}

// Channel implements ports.Sender — this sender handles the email channel.
func (s *EmailSender) Channel() domain.Channel {
	return domain.ChannelEmail
}

// Send delivers the rendered notification to the org's configured email address.
// If no email is configured in notification_channels, falls back to the
// SMTP_EMAIL address as the recipient (useful in development).
func (s *EmailSender) Send(ctx context.Context, req *domain.NotificationRequest, msg *domain.RenderedMessage) error {
	toAddr, err := s.resolveRecipient(ctx, req)
	if err != nil {
		return fmt.Errorf("email sender: resolve recipient: %w", err)
	}

	body := buildMIMEMessage(
		fmt.Sprintf("%s <%s>", s.smtp.FromName, s.smtp.Email),
		toAddr,
		msg.Subject,
		msg.Body,
	)

	if err := s.sendSMTP(toAddr, body); err != nil {
		return fmt.Errorf("email sender: smtp send: %w", err)
	}

	return nil
}

// resolveRecipient looks up the org's configured email address from the channel
// config store. If none is set, falls back to the data["email"] field from the
// request (set by transactional triggers like welcome_email).
func (s *EmailSender) resolveRecipient(ctx context.Context, req *domain.NotificationRequest) (string, error) {
	cfg, err := s.opts.GetConfig(ctx, req.OrgID, domain.ChannelEmail)
	if err != nil {
		return "", err
	}
	if cfg != nil {
		if addr, ok := cfg["email"].(string); ok && addr != "" {
			return addr, nil
		}
	}

	// Transactional emails include the recipient in the data map.
	if addr, ok := req.Data["email"].(string); ok && addr != "" {
		return addr, nil
	}

	return "", fmt.Errorf("no email address configured for org %s", req.OrgID)
}

// sendSMTP dials the SMTP server, negotiates STARTTLS, authenticates,
// and sends the raw MIME message.
func (s *EmailSender) sendSMTP(toAddr string, body []byte) error {
	addr := net.JoinHostPort(s.smtp.Host, s.smtp.Port)

	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("dial %s: %w", addr, err)
	}

	client, err := smtp.NewClient(conn, s.smtp.Host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close() //nolint:errcheck

	// STARTTLS upgrades the connection to TLS.
	tlsCfg := &tls.Config{ServerName: s.smtp.Host}
	if err := client.StartTLS(tlsCfg); err != nil {
		return fmt.Errorf("starttls: %w", err)
	}

	auth := smtp.PlainAuth("", s.smtp.Email, s.smtp.Password, s.smtp.Host)
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}

	if err := client.Mail(s.smtp.Email); err != nil {
		return fmt.Errorf("smtp MAIL FROM: %w", err)
	}
	if err := client.Rcpt(toAddr); err != nil {
		return fmt.Errorf("smtp RCPT TO: %w", err)
	}

	wc, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp DATA: %w", err)
	}
	if _, err := wc.Write(body); err != nil {
		return fmt.Errorf("smtp write body: %w", err)
	}
	return wc.Close()
}

// buildMIMEMessage constructs a minimal RFC 2822 + MIME email message.
// The body is plain text; HTML wrapping can be added later when Resend is adopted.
func buildMIMEMessage(from, to, subject, body string) []byte {
	var b bytes.Buffer
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	b.WriteString("\r\n")
	// Normalize line endings for SMTP.
	b.WriteString(strings.ReplaceAll(body, "\n", "\r\n"))
	return b.Bytes()
}
