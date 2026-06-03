package main

import (
	"log"
	"time"
)

func init() {
	go listenSupabase()
}

// listenSupabase is a lightweight stub that will be expanded to
// subscribe to Supabase realtime events. For now it periodically
// logs to show the background worker is active.
func listenSupabase() {
	log.Println("[SUPABASE] Supabase listener stub starting")
	for {
		// Placeholder: connect and listen to Supabase realtime channel here.
		log.Println("[SUPABASE] waiting for events... (stub)")
		time.Sleep(30 * time.Second)
	}
}
