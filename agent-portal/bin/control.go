package main

import (
	"fmt"
	"os"
	"strconv"
	"syscall"
	"unsafe"
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	procSetCursorPos = user32.NewProc("SetCursorPos")
	procMouseEvent   = user32.NewProc("mouse_event")
	procSendInput    = user32.NewProc("SendInput")
)

const (
	MOUSEEVENTF_LEFTDOWN = 0x0002
	MOUSEEVENTF_LEFTUP   = 0x0004
	INPUT_KEYBOARD       = 1
	KEYEVENTF_UNICODE    = 0x0004
	KEYEVENTF_KEYUP      = 0x0008
)

// input64 represents the tagINPUT structure on Windows x64.
// Size is 40 bytes due to the union alignment (largest member MOUSEINPUT is 32 bytes).
type input64 struct {
	inputType uint32
	_         uint32 // padding
	wVk       uint16
	wScan     uint16
	dwFlags   uint32
	time      uint32
	_         uint32 // padding
	extraInfo uintptr
	_         uint64 // padding to 40 bytes
}

func click(x, y int) {
	// SetCursorPos
	procSetCursorPos.Call(uintptr(x), uintptr(y))
	// Mouse down
	procMouseEvent.Call(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
	// Mouse up
	procMouseEvent.Call(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
}

func typeString(text string) {
	runes := []rune(text)
	for _, r := range runes {
		// Send key down
		sendKeyUnicode(uint16(r), false)
		// Send key up
		sendKeyUnicode(uint16(r), true)
	}
}

func sendKeyUnicode(val uint16, isKeyUp bool) {
	var flags uint32 = KEYEVENTF_UNICODE
	if isKeyUp {
		flags |= KEYEVENTF_KEYUP
	}

	inp := input64{
		inputType: INPUT_KEYBOARD,
		wVk:       0,
		wScan:     val,
		dwFlags:   flags,
		time:      0,
		extraInfo: 0,
	}

	procSendInput.Call(
		1,
		uintptr(unsafe.Pointer(&inp)),
		uintptr(unsafe.Sizeof(inp)),
	)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: control <command> [args...]")
		fmt.Println("Commands:")
		fmt.Println("  click <x> <y>")
		fmt.Println("  type <text>")
		os.Exit(1)
	}

	cmd := os.Args[1]
	switch cmd {
	case "click":
		if len(os.Args) < 4 {
			fmt.Println("Usage: control click <x> <y>")
			os.Exit(1)
		}
		x, err1 := strconv.Atoi(os.Args[2])
		y, err2 := strconv.Atoi(os.Args[3])
		if err1 != nil || err2 != nil {
			fmt.Println("Invalid coordinates")
			os.Exit(1)
		}
		click(x, y)
		fmt.Printf("Clicked at %d, %d\n", x, y)

	case "type":
		if len(os.Args) < 3 {
			fmt.Println("Usage: control type <text>")
			os.Exit(1)
		}
		text := os.Args[2]
		typeString(text)
		fmt.Printf("Typed string: %s\n", text)

	default:
		fmt.Printf("Unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
