// template.go defines the notification template registry.
// Templates are embedded as Go strings — no external CMS or file loading.
// Phase 1 covers only the templates needed for email + in-app delivery.
// New templates are added here as new notification types are built.
package domain

import (
	"bytes"
	"fmt"
	"text/template"
)

// templateDef holds the subject (for email) and body for a named template.
type templateDef struct {
	subject string
	body    string // plain text; EmailSender wraps in minimal HTML
	title   string // short title for in-app notifications
}

// templates is the registry of all notification templates.
// Keys match the `template` field on NotificationRequest.
var templates = map[string]templateDef{
	"welcome_email": {
		subject: "Welcome to Watcher24",
		title:   "Welcome to Watcher24",
		body: `Hi {{.name}},

Welcome to Watcher24! Your account is ready.

Start sending telemetry by installing one of our SDKs:
  • JavaScript: npm install @watcher/node
  • Python: pip install watcher-sdk
  • Go: go get github.com/watcher24/sdk-go

If you have any questions, reply to this email.

— The Watcher24 team`,
	},

	"alert_notification": {
		subject: "[{{.severity | upper}}] Alert: {{.rule_name}}",
		title:   "Alert fired: {{.rule_name}}",
		body: `An alert rule has fired for your organization.

Rule:      {{.rule_name}}
Severity:  {{.severity}}
Condition: {{.condition}}
Time:      {{.fired_at}}

{{if .details}}Details:
{{.details}}{{end}}

View your alerts at {{.console_url}}/settings/alerts

— Watcher24`,
	},

	"api_key_created": {
		subject: "New API key created",
		title:   "New API key created",
		body: `A new API key was created for your organization.

Key name: {{.key_name}}
Created:  {{.created_at}}

If you did not create this key, revoke it immediately at {{.console_url}}/settings/api-keys

— Watcher24`,
	},

	"team_invitation": {
		subject: "You've been invited to join {{.org_name}} on Watcher24",
		title:   "Team invitation from {{.org_name}}",
		body: `{{.inviter_name}} has invited you to join {{.org_name}} on Watcher24.

Accept your invitation:
{{.invite_url}}

This link expires in 48 hours.

— Watcher24`,
	},
}

// Render looks up the named template, executes it with the provided data map,
// and returns a RenderedMessage ready for delivery.
// Returns an error if the template name is unknown or template execution fails.
func Render(templateName string, data map[string]any) (*RenderedMessage, error) {
	def, ok := templates[templateName]
	if !ok {
		return nil, fmt.Errorf("template %q not found", templateName)
	}

	// Add a helper func for uppercasing strings in templates.
	funcs := template.FuncMap{
		"upper": func(s string) string {
			out := []byte(s)
			for i, b := range out {
				if b >= 'a' && b <= 'z' {
					out[i] = b - 32
				}
			}
			return string(out)
		},
	}

	subject, err := renderString(def.subject, data, funcs)
	if err != nil {
		return nil, fmt.Errorf("render subject for %q: %w", templateName, err)
	}

	title, err := renderString(def.title, data, funcs)
	if err != nil {
		return nil, fmt.Errorf("render title for %q: %w", templateName, err)
	}

	body, err := renderString(def.body, data, funcs)
	if err != nil {
		return nil, fmt.Errorf("render body for %q: %w", templateName, err)
	}

	return &RenderedMessage{
		Subject: subject,
		Title:   title,
		Body:    body,
	}, nil
}

func renderString(tmplStr string, data map[string]any, funcs template.FuncMap) (string, error) {
	t, err := template.New("").Funcs(funcs).Parse(tmplStr)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
