// mark_read.go — use case for marking in-app notifications as read.
// Called by the console API routes when the user opens the notification bell
// or clicks "Mark all read".
package usecases

import (
	"context"
	"fmt"

	"watcher24/notifier/internal/ports"
)

// MarkReadUseCase handles marking one or all in-app notifications as read.
type MarkReadUseCase struct {
	inApp ports.InAppStore
}

// NewMarkReadUseCase constructs the use case with the in-app store dependency.
func NewMarkReadUseCase(inApp ports.InAppStore) *MarkReadUseCase {
	return &MarkReadUseCase{inApp: inApp}
}

// MarkOne marks a single notification as read.
// orgID is included to prevent an org from marking another org's notifications.
func (uc *MarkReadUseCase) MarkOne(ctx context.Context, id, orgID string) error {
	if err := uc.inApp.MarkRead(ctx, id, orgID); err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	return nil
}

// MarkAll marks every notification for the org as read.
func (uc *MarkReadUseCase) MarkAll(ctx context.Context, orgID string) error {
	if err := uc.inApp.MarkAllRead(ctx, orgID); err != nil {
		return fmt.Errorf("mark all read: %w", err)
	}
	return nil
}
