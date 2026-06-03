package main

import (
	"context"

	"encoding/binary"

	"encoding/json"

	"fmt"

	"io"

	"log"

	"net/http"

	"os"

	"os/exec"

	"os/signal"

	"path/filepath"

	"sync"

	"syscall"

	"time"

	"github.com/gorilla/websocket"

	"github.com/joho/godotenv"
)

// ── Config & State ────────────────────────────────────────────────────

type Agent struct {
	ID string

	Name string

	Email string

	AgentID string
}

type Session struct {
	mu sync.RWMutex

	screenshotPath string

	controlSession *exec.Cmd

	controlStdin io.WriteCloser

	controlStdout io.ReadCloser

	frameChannel chan []byte

	lastScreenshot []byte

	lastScreentime time.Time
}

var (
	agent *Agent

	session *Session
)

// ── WebSocket Clients ────────────────────────────────────────────────────

var (
	wsUpgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

	wsClients = make(map[*websocket.Conn]bool)

	wsMu sync.RWMutex
)

func init() {

	godotenv.Load()

	session = &Session{}

}

// ── Screen Capture ────────────────────────────────────────────────────

func captureScreen() error {

	screenshotsDir := filepath.Join(os.TempDir(), "kitchenhub-screenshots")

	os.MkdirAll(screenshotsDir, 0755)

	// Start control.go session if not already running

	if session.controlSession == nil {

		cmd := exec.Command(

			filepath.Join("agent-portal", "bin", "control.exe"),

			"session",
		)

		// attempt to get stdin pipe so we can send input commands

		if stdin, err := cmd.StdinPipe(); err == nil {

			session.controlStdin = stdin

		} else {

			log.Printf("[CONTROL] Warning: could not get stdin pipe: %v\n", err)

		}

		// get stdout pipe for binary frame data

		if stdout, err := cmd.StdoutPipe(); err == nil {

			session.controlStdout = stdout

		} else {

			log.Printf("[CONTROL] Warning: could not get stdout pipe: %v\n", err)

		}

		if err := cmd.Start(); err != nil {

			log.Printf("[CONTROL] Warning: failed to start control.exe: %v (continuing)\n", err)

			// Don't fail - we'll use dummy screenshots

		} else {

			session.controlSession = cmd

			session.frameChannel = make(chan []byte, 30) // 30-frame buffer

			log.Println("[CONTROL] Virtual desktop session started")

			// Start frame reader goroutine

			go readFramesFromStdout()

		}

	}

	session.screenshotPath = filepath.Join(screenshotsDir, "backstage.jpg")

	return nil

}

// readFramesFromStdout reads binary frames from control.exe stdout

func readFramesFromStdout() {

	if session.controlStdout == nil {

		return

	}

	defer session.controlStdout.Close()

	sizeBuf := make([]byte, 4)

	for {

		// Read frame size (4 bytes)

		_, err := io.ReadFull(session.controlStdout, sizeBuf)

		if err != nil {

			log.Printf("[FRAME] Error reading frame size: %v\n", err)

			return

		}

		frameSize := binary.LittleEndian.Uint32(sizeBuf)

		// Read frame data

		frameData := make([]byte, frameSize)

		_, err = io.ReadFull(session.controlStdout, frameData)

		if err != nil {

			log.Printf("[FRAME] Error reading frame data: %v\n", err)

			return

		}

		// Send to channel (non-blocking to avoid deadlock)

		select {

		case session.frameChannel <- frameData:

		default:

			// Channel full, drop frame (backpressure)

		}

	}

}

// ── Remote Input Handler ────────────────────────────────────────────────────

func handleRemoteInput(data map[string]interface{}) {

	msgType, ok := data["type"].(string)

	if !ok {

		return

	}

	switch msgType {

	case "mouse_move":

		if x, ok := data["x"].(float64); ok {

			if y, ok := data["y"].(float64); ok {

				log.Printf("[INPUT] Mouse move: %d, %d\n", int(x), int(y))

				if session.controlStdin != nil {

					cmd := fmt.Sprintf("mouse_move %d %d\n", int(x), int(y))

					if _, err := session.controlStdin.Write([]byte(cmd)); err != nil {

						log.Printf("[CONTROL] stdin write error: %v\n", err)

					}

				}

			}

		}

	case "mouse_down":

		if button, ok := data["button"].(string); ok {

			log.Printf("[INPUT] Mouse down: %s\n", button)

			if session.controlStdin != nil {

				cmd := fmt.Sprintf("mouse_down %s\n", button)

				if _, err := session.controlStdin.Write([]byte(cmd)); err != nil {

					log.Printf("[CONTROL] stdin write error: %v\n", err)

				}

			}

		}

	case "mouse_up":

		if button, ok := data["button"].(string); ok {

			log.Printf("[INPUT] Mouse up: %s\n", button)

			if session.controlStdin != nil {

				cmd := fmt.Sprintf("mouse_up %s\n", button)

				if _, err := session.controlStdin.Write([]byte(cmd)); err != nil {

					log.Printf("[CONTROL] stdin write error: %v\n", err)

				}

			}

		}

	case "key_down":

		if key, ok := data["key"].(string); ok {

			log.Printf("[INPUT] Key down: %s\n", key)

			if session.controlStdin != nil {

				cmd := fmt.Sprintf("key_down %s\n", key)

				if _, err := session.controlStdin.Write([]byte(cmd)); err != nil {

					log.Printf("[CONTROL] stdin write error: %v\n", err)

				}

			}

		}

	case "key_up":

		if key, ok := data["key"].(string); ok {

			log.Printf("[INPUT] Key up: %s\n", key)

			if session.controlStdin != nil {

				cmd := fmt.Sprintf("key_up %s\n", key)

				if _, err := session.controlStdin.Write([]byte(cmd)); err != nil {

					log.Printf("[CONTROL] stdin write error: %v\n", err)

				}

			}

		}

	}

}

// ── HTTP Routes ────────────────────────────────────────────────────────

func handleStatus(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(map[string]interface{}{

		"agent_id": agent.AgentID,

		"status": "connected",

		"has_session": session.controlSession != nil,

		"timestamp": time.Now(),
	})

}

func handleScreenshot(w http.ResponseWriter, r *http.Request) {

	session.mu.RLock()

	defer session.mu.RUnlock()

	if len(session.lastScreenshot) == 0 {

		http.Error(w, "No screenshot available", http.StatusNotFound)

		return

	}

	w.Header().Set("Content-Type", "image/jpeg")

	w.Write(session.lastScreenshot)

}

func handleVideoStream(w http.ResponseWriter, r *http.Request) {

	conn, err := wsUpgrader.Upgrade(w, r, nil)

	if err != nil {

		log.Printf("[WS] Upgrade error: %v\n", err)

		return

	}

	defer func() {

		wsMu.Lock()

		delete(wsClients, conn)

		wsMu.Unlock()

		conn.Close()

	}()

	wsMu.Lock()

	wsClients[conn] = true

	wsMu.Unlock()

	log.Println("[WS] Client connected")

	// Goroutine 1: Send screenshots continuously from channel

	stopCh := make(chan bool)

	frameCount := 0

	go func() {

		for {

			select {

			case <-stopCh:

				return

			case frameData := <-session.frameChannel:

				frameCount++

				// Send binary frame directly (no base64, no JSON)

				err = conn.WriteMessage(websocket.BinaryMessage, frameData)

				if err != nil {

					log.Printf("[WS] Write error on frame %d: %v\n", frameCount, err)

					return

				}

				if frameCount%30 == 0 {

					log.Printf("[WS] Sent %d frames (size: %d bytes)\n", frameCount, len(frameData))

				}

			}

		}

	}()

	// Goroutine 2: Receive input from client

	for {

		var msg map[string]interface{}

		err := conn.ReadJSON(&msg)

		if err != nil {

			log.Printf("[WS] Read error: %v\n", err)

			break

		}

		handleRemoteInput(msg)

	}

	stopCh <- true

}

// ── Main ────────────────────────────────────────────────────────────────────

func main() {

	// Parse agent identity

	agent = &Agent{

		AgentID: os.Getenv("AGENT_ID"),

		Name: os.Getenv("AGENT_NAME"),

		Email: os.Getenv("AGENT_EMAIL"),
	}

	if agent.AgentID == "" {

		agent.AgentID = "BSK-AG-41139" // Default for testing

	}

	log.Printf("[BACKEND] Starting for agent: %s\n", agent.AgentID)

	// Initialize screenshot path

	screenshotsDir := filepath.Join(os.TempDir(), "kitchenhub-screenshots")

	os.MkdirAll(screenshotsDir, 0755)

	session.screenshotPath = filepath.Join(screenshotsDir, "backstage.jpg")

	// Create dummy screenshot if doesn't exist

	if _, err := os.Stat(session.screenshotPath); os.IsNotExist(err) {

		dummyJPEG := []byte{

			0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,

			0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,

			0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,

			0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,

			0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,

			0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,

			0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,

			0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,

			0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,

			0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,

			0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,

			0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,

			0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,

			0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,

			0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,

			0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,

			0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,

			0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,

			0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,

			0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,

			0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,

			0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,

			0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,

			0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,

			0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,

			0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,

			0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,

			0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD1, 0xFF, 0xD9,
		}

		os.WriteFile(session.screenshotPath, dummyJPEG, 0644)

	}

	// Start capture session

	if err := captureScreen(); err != nil {

		log.Printf("[CAPTURE] Error: %v\n", err)

	}

	// HTTP Routes

	http.HandleFunc("/status", handleStatus)

	http.HandleFunc("/screenshot", handleScreenshot)

	http.HandleFunc("/ws/video", handleVideoStream)

	// Start server
	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "3000"
	}
	server := &http.Server{Addr: ":" + port}

	go func() {

		log.Println("[HTTP] Server listening on :3000")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {

			log.Fatalf("[HTTP] Server error: %v", err)

		}

	}()

	// Graceful shutdown

	sigChan := make(chan os.Signal, 1)

	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan

	log.Println("[BACKEND] Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

	defer cancel()

	server.Shutdown(ctx)

	if session.controlSession != nil {

		session.controlSession.Process.Kill()

	}

}
