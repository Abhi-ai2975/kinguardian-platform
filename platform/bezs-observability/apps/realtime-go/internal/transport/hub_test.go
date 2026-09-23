package transport_test

import (
	"context"
	"testing"
	"time"

	"watcher24/realtime/internal/transport"
)

// fakeSubscriber is a test double for ports.EventSubscriber.
// It sends the pre-configured messages then blocks until ctx is cancelled.
type fakeSubscriber struct {
	messages [][]byte
}

func (f *fakeSubscriber) Subscribe(ctx context.Context, _ string) (<-chan []byte, error) {
	ch := make(chan []byte, len(f.messages))
	for _, m := range f.messages {
		ch <- m
	}
	go func() {
		<-ctx.Done()
		close(ch)
	}()
	return ch, nil
}

func TestHub_Register_StartsSubscription(t *testing.T) {
	payload := []byte(`{"event_type":"log","message":"hello"}`)
	sub := &fakeSubscriber{messages: [][]byte{payload}}
	hub := transport.NewHub(sub)

	conn := hub.Register("org_1", nil) // nil websocket — we read from Send() directly

	select {
	case got := <-conn.Send():
		if string(got) != string(payload) {
			t.Errorf("expected %s, got %s", payload, got)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("timed out waiting for event")
	}
}

func TestHub_Unregister_ClosesChannel(t *testing.T) {
	sub := &fakeSubscriber{}
	hub := transport.NewHub(sub)

	conn := hub.Register("org_1", nil)
	hub.Unregister("org_1", conn)

	// The send channel should be closed after unregister.
	select {
	case _, ok := <-conn.Send():
		if ok {
			t.Error("expected channel to be closed")
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("timed out waiting for channel close")
	}
}

func TestHub_MultipleConnections_BothReceiveEvent(t *testing.T) {
	payload := []byte(`{"event_type":"audit","message":"login"}`)
	sub := &fakeSubscriber{messages: [][]byte{payload}}
	hub := transport.NewHub(sub)

	conn1 := hub.Register("org_1", nil)
	conn2 := hub.Register("org_1", nil)

	assertReceives := func(t *testing.T, ch <-chan []byte) {
		t.Helper()
		select {
		case got := <-ch:
			if string(got) != string(payload) {
				t.Errorf("expected %s, got %s", payload, got)
			}
		case <-time.After(200 * time.Millisecond):
			t.Fatal("timed out waiting for event")
		}
	}

	assertReceives(t, conn1.Send())
	assertReceives(t, conn2.Send())
}

func TestHub_DifferentOrgs_DoNotReceiveEachOthersEvents(t *testing.T) {
	payloadA := []byte(`{"org":"a"}`)
	payloadB := []byte(`{"org":"b"}`)

	// Two separate subscribers, one per org.
	subA := &fakeSubscriber{messages: [][]byte{payloadA}}
	subB := &fakeSubscriber{messages: [][]byte{payloadB}}

	// Use two separate hubs to simulate different org subscriptions.
	hubA := transport.NewHub(subA)
	hubB := transport.NewHub(subB)

	connA := hubA.Register("org_a", nil)
	connB := hubB.Register("org_b", nil)

	select {
	case got := <-connA.Send():
		if string(got) != string(payloadA) {
			t.Errorf("org_a got wrong payload: %s", got)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("timed out for org_a")
	}

	select {
	case got := <-connB.Send():
		if string(got) != string(payloadB) {
			t.Errorf("org_b got wrong payload: %s", got)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("timed out for org_b")
	}
}
